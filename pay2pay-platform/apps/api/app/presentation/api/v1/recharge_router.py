"""
Mobile Recharge API Endpoints.

Enterprise REST API for Pay2Pay Mobile Recharge Module:
- GET /api/v1/recharge/operators
- GET /api/v1/recharge/plans
- POST /api/v1/recharge/validate
- POST /api/v1/recharge/confirm
- GET /api/v1/recharge/reports/retailer
- GET /api/v1/recharge/reports/admin
- GET /api/v1/recharge/receipt/{transaction_id}

ARCHITECTURE:
Frontend -> API -> Service Layer -> Stored Procedure (SP) -> Database.
Zero direct SQL from endpoints or frontend.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload, get_current_user
from app.infrastructure.db.models import AdminUserModel, RetailerModel
from app.presentation.api.v1.topup_router import get_authenticated_retailer
from app.application.recharge_service import RechargeService

logger = logging.getLogger("pay2pay.recharge.router")

router = APIRouter(prefix="/recharge", tags=["Mobile Recharge"])


# ---------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ---------------------------------------------------------------------
class RechargeValidateRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=10, description="10-digit mobile number")
    operator_code: str = Field(..., description="Operator code e.g. JIO, AIRTEL, VI, BSNL, MTNL")
    recharge_amount: float = Field(..., gt=0, description="Recharge amount in INR")
    circle: Optional[str] = Field(None, description="Telecom Circle")


class RechargeConfirmRequest(BaseModel):
    mobile_number: str = Field(..., min_length=10, max_length=10)
    operator_code: str = Field(...)
    circle: Optional[str] = Field("All India")
    recharge_amount: float = Field(..., gt=0)
    plan_id: Optional[uuid.UUID] = None
    plan_type: Optional[str] = "CUSTOM"
    plan_description: Optional[str] = None
    idempotency_key: Optional[str] = None


# ---------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------
@router.get("/operators", response_model=Dict[str, Any])
async def get_operators(
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch active telecom operators with logos and supported circles via SP.
    """
    try:
        operators = await RechargeService.get_operators(db)
        return {
            "success": True,
            "data": operators
        }
    except Exception as e:
        logger.error(f"Error fetching operators: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch telecom operators: {str(e)}"
        )


@router.get("/plans", response_model=Dict[str, Any])
async def get_plans(
    operator_code: str = Query(..., description="Operator code e.g. JIO, AIRTEL, VI"),
    circle: Optional[str] = Query(None, description="Telecom circle"),
    plan_type: Optional[str] = Query(None, description="Plan category e.g. POPULAR, 5G, DATA, VALIDITY"),
    search: Optional[str] = Query(None, description="Search query or amount"),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch operator plans catalog via Stored Procedure sp_recharge_get_plans.
    """
    try:
        plans = await RechargeService.get_plans(
            session=db,
            operator_code=operator_code,
            circle=circle,
            plan_type=plan_type,
            search_query=search
        )
        return {
            "success": True,
            "data": plans,
            "count": len(plans)
        }
    except Exception as e:
        logger.error(f"Error fetching plans: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recharge plans: {str(e)}"
        )


@router.post("/validate", response_model=Dict[str, Any])
async def validate_recharge(
    body: RechargeValidateRequest,
    request: Request,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Pre-execution validation via Stored Procedure sp_recharge_validate_request.
    Returns:
    - is_valid
    - opening_balance
    - recharge_amount (DR)
    - commission_amount (CR)
    - tax_amount (DR)
    - net_wallet_debit
    - closing_balance
    - operator_name
    """
    retailer = await get_authenticated_retailer(request, payload, db)
    if not retailer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated retailer session not found."
        )

    val_res = await RechargeService.validate_request(
        session=db,
        retailer_id=retailer.public_id,
        mobile_number=body.mobile_number,
        operator_code=body.operator_code,
        recharge_amount=body.recharge_amount
    )

    if not val_res.get("is_valid"):
        return {
            "success": False,
            "is_valid": False,
            "error_code": val_res.get("error_code"),
            "error_message": val_res.get("error_message"),
            "data": val_res
        }

    return {
        "success": True,
        "is_valid": True,
        "data": val_res
    }


@router.post("/confirm", response_model=Dict[str, Any])
async def confirm_recharge(
    body: RechargeConfirmRequest,
    request: Request,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Full End-to-End Mobile Recharge Execution:
    1. sp_recharge_create_transaction (Idempotent initialization)
    2. sp_recharge_execute_accounting (Atomic 3-step wallet movements: DR recharge, CR commission, DR tax)
    3. Vendor Dispatch
    4. sp_recharge_finalize_transaction OR sp_recharge_reverse_transaction (Automatic atomic refund on failure)
    """
    retailer = await get_authenticated_retailer(request, payload, db)
    if not retailer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated retailer session not found."
        )

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Pay2Pay-Web")

    result = await RechargeService.execute_recharge(
        session=db,
        retailer_id=retailer.public_id,
        mobile_number=body.mobile_number,
        operator_code=body.operator_code,
        circle=body.circle or "All India",
        recharge_amount=body.recharge_amount,
        plan_id=body.plan_id,
        plan_type=body.plan_type,
        plan_description=body.plan_description,
        idempotency_key=body.idempotency_key,
        ip_address=client_ip,
        user_agent=user_agent
    )

    if not result.get("success"):
        # Return 200 with success: false so the UI can gracefully display reversal and failure details
        return {
            "success": False,
            "status": result.get("status", "FAILED"),
            "error_message": result.get("error_message") or result.get("message"),
            "data": result
        }

    return {
        "success": True,
        "status": "SUCCESS",
        "data": result
    }


@router.get("/reports/retailer", response_model=Dict[str, Any])
async def get_retailer_report(
    request: Request,
    status_filter: Optional[str] = Query(None, alias="status"),
    mobile_number: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Retailer's own recharge transaction history with running balances and totals via SP.
    """
    retailer = await get_authenticated_retailer(request, payload, db)
    if not retailer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated retailer session not found."
        )

    report = await RechargeService.get_retailer_report(
        session=db,
        retailer_id=retailer.public_id,
        status=status_filter,
        mobile_number=mobile_number,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size
    )

    return {
        "success": True,
        "data": report
    }


@router.get("/reports/admin", response_model=Dict[str, Any])
async def get_admin_report(
    status_filter: Optional[str] = Query(None, alias="status"),
    operator_code: Optional[str] = Query(None),
    retailer_code: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin enterprise recharge transaction ledger via SP.
    """
    report = await RechargeService.get_admin_report(
        session=db,
        status=status_filter,
        operator_code=operator_code,
        retailer_code=retailer_code,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size
    )

    return {
        "success": True,
        "data": report
    }


# ---------------------------------------------------------------------
# Route Aliases & Direct Endpoints Matching Spec
# ---------------------------------------------------------------------
@router.post("/initiate", response_model=Dict[str, Any])
async def initiate_recharge(
    body: RechargeConfirmRequest,
    request: Request,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Alias endpoint for initiating mobile recharge.
    """
    return await confirm_recharge(body, request, payload, db)


@router.get("/status/{transaction_reference}", response_model=Dict[str, Any])
@router.get("/transaction/{transaction_reference}", response_model=Dict[str, Any])
async def get_transaction_status(
    transaction_reference: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch status and details of a recharge transaction by reference.
    """
    txn = await RechargeService.get_transaction(db, transaction_reference)
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recharge transaction not found."
        )
    return {
        "success": True,
        "data": txn
    }


@router.get("/retailer-report", response_model=Dict[str, Any])
async def get_retailer_report_alias(
    request: Request,
    status_filter: Optional[str] = Query(None, alias="status"),
    mobile_number: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Alias for /reports/retailer
    """
    return await get_retailer_report(request, status_filter, mobile_number, start_date, end_date, page, page_size, payload, db)


@router.get("/admin-report", response_model=Dict[str, Any])
async def get_admin_report_alias(
    status_filter: Optional[str] = Query(None, alias="status"),
    operator_code: Optional[str] = Query(None),
    retailer_code: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Alias for /reports/admin
    """
    return await get_admin_report(status_filter, operator_code, retailer_code, start_date, end_date, page, page_size, current_user, db)


class RechargeRefundRequest(BaseModel):
    transaction_id: str
    reason: str = "Admin requested reversal"


@router.post("/refund", response_model=Dict[str, Any])
async def refund_recharge(
    body: RechargeRefundRequest,
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Authorized refund / reversal of a recharge transaction via SP sp_recharge_reverse_transaction.
    """
    res = await RechargeService.reverse_transaction(db, body.transaction_id, body.reason)
    return {
        "success": res.get("success", True),
        "data": res
    }


# ---------------------------------------------------------------------
# Common Universal Recharge Webhook Callback Endpoint
# ---------------------------------------------------------------------
class CommonRechargeCallbackPayload(BaseModel):
    Status: Optional[str] = None
    status: Optional[str] = None
    Description: Optional[str] = None
    description: Optional[str] = None
    CustomerId: Optional[str] = None
    customer_id: Optional[str] = None
    Amount: Optional[str] = None
    amount: Optional[str] = None
    OpRefId: Optional[str] = None
    op_ref_id: Optional[str] = None
    operator_ref: Optional[str] = None
    TransId: Optional[str] = None
    trans_id: Optional[str] = None
    vendor_txn_id: Optional[str] = None
    RequestId: Optional[str] = None
    request_id: Optional[str] = None
    reference_id: Optional[str] = None
    TxnDate: Optional[str] = None
    Balance: Optional[str] = None
    ServiceName: Optional[str] = None
    ServiceId: Optional[str] = None
    ReverseDate: Optional[str] = None


@router.post("/callback", response_model=Dict[str, Any])
@router.post("/callback/utkal", response_model=Dict[str, Any])
async def common_recharge_callback(
    request: Request,
    body: Optional[CommonRechargeCallbackPayload] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Universal Asynchronous Webhook Callback Receiver for Telecom Recharge Gateways.
    Endpoint: POST /api/v1/recharge/callback
    """
    raw_data: Dict[str, Any] = {}
    try:
        raw_data = await request.json()
    except Exception:
        pass

    # Extract fields supporting both standard and vendor-specific key variations
    status_val = (
        (body.Status if body and body.Status else None) or
        (body.status if body and body.status else None) or
        raw_data.get("Status") or raw_data.get("status") or ""
    )
    request_id = (
        (body.RequestId if body and body.RequestId else None) or
        (body.request_id if body and body.request_id else None) or
        (body.reference_id if body and body.reference_id else None) or
        raw_data.get("RequestId") or raw_data.get("request_id") or raw_data.get("reference_id")
    )
    trans_id = (
        (body.TransId if body and body.TransId else None) or
        (body.trans_id if body and body.trans_id else None) or
        (body.vendor_txn_id if body and body.vendor_txn_id else None) or
        raw_data.get("TransId") or raw_data.get("trans_id") or raw_data.get("vendor_txn_id")
    )
    op_ref_id = (
        (body.OpRefId if body and body.OpRefId else None) or
        (body.op_ref_id if body and body.op_ref_id else None) or
        (body.operator_ref if body and body.operator_ref else None) or
        raw_data.get("OpRefId") or raw_data.get("op_ref_id") or raw_data.get("operator_ref")
    )
    desc = (
        (body.Description if body and body.Description else None) or
        (body.description if body and body.description else None) or
        raw_data.get("Description") or raw_data.get("description") or raw_data.get("message") or ""
    )

    logger.info(
        f"[RECHARGE-COMMON-CALLBACK] Webhook notification received: "
        f"RequestId={request_id}, TransId={trans_id}, Status={status_val}, OpRefId={op_ref_id}, Desc={desc}"
    )

    try:
        result = await RechargeService.process_vendor_callback(
            session=db,
            request_id=str(request_id) if request_id else None,
            vendor_trans_id=str(trans_id) if trans_id else None,
            status_str=str(status_val),
            op_ref_id=str(op_ref_id) if op_ref_id else None,
            description=str(desc) if desc else None
        )
        return {
            "status": "SUCCESS" if result.get("success") else "FAILED",
            "Status": "Success" if result.get("success") else "Failed",
            "message": result.get("message", "Callback processed successfully"),
            "Description": result.get("message", "Callback processed successfully"),
            "request_id": request_id,
            "RequestId": request_id
        }
    except Exception as e:
        logger.error(f"[RECHARGE-COMMON-CALLBACK] Error handling callback: {str(e)}", exc_info=True)
        return {
            "status": "FAILED",
            "Status": "Failed",
            "message": f"Internal callback error: {str(e)}",
            "Description": f"Internal callback error: {str(e)}",
            "request_id": request_id,
            "RequestId": request_id
        }

