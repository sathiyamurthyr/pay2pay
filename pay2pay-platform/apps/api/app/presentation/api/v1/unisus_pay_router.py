"""
Enterprise Unisus Pay Router.
Exposes:
1. Public Webhook Endpoint for Unisus Pay callbacks:
   - Event 'QR_CALLBACK': Synchronizes and replaces stored QR codes.
   - Event 'PAYMENT_REQUEST_STATUS': Auto-settles and credits approved wallet requests.
2. Authenticated Sathus Network Endpoints (SD, Dist, Retailer):
   - GET /api/v1/unisus/qrs: Fetches active Unisus Pay collection QRs.
   - POST /api/v1/unisus/submit-payment-request: Submits payment request & generates linked topup request.
3. Admin Endpoints:
   - GET /api/v1/admin/unisus/balance: Queries live partner balance.
   - POST /api/v1/admin/unisus/sync-qrs: Forces manual QR sync from partner API.
   - GET /api/v1/admin/unisus/payment-requests: Audit log of submitted payment requests.

STRICT GOVERNANCE RULE:
Unisus Pay QR is EXCLUSIVELY available to Sathus Company (Company Ref #2)
and authorized Super Distributors, Distributors, and Retailers.
All other companies and roles are strictly rejected with HTTP 403.
"""

import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import (
    get_current_token_payload, get_optional_token_payload, get_current_tenant_id
)
from app.infrastructure.db.unisus_pay_models import (
    UnisusPayQrCodeModel, UnisusPayPaymentRequestModel, UnisusPayConfigModel,
    SATHUS_COMPANY_ID, SATHUS_COMPANY_REF_ID, DEFAULT_TENANT_ID
)
from app.infrastructure.db.models import (
    RetailerModel, DistributorModel, SuperDistributorModel,
    RetailerWalletModel, AdminUserModel, CompanyModel
)
from app.infrastructure.db.topup_request_model import TopupRequestModel
from app.application.unisus_pay_service import unisus_pay_service

logger = logging.getLogger("unisus_pay_router")

router = APIRouter(prefix="/unisus", tags=["Unisus Pay Partner Integration"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class UnisusPaymentRequestSubmit(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount in INR (minimum ₹1.00)")
    reference_no: str = Field(..., min_length=4, max_length=100, description="Unique Bank UTR / Reference No")
    qr_id: str = Field(..., min_length=4, max_length=100, description="QR ID collected against")
    receipt_image: str = Field(..., description="Base64-encoded receipt/screenshot image")
    note: Optional[str] = Field(None, max_length=500, description="Optional payment remark / note")


# ==============================================================================
# SATHUS COMPANY & ROLE SECURITY GUARD
# ==============================================================================

async def verify_sathus_network_member(
    request: Request,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Authoritative Governance Guard:
    Ensures that the calling user strictly belongs to SATHUS Company (Company Ref #2)
    AND holds the role of Super Distributor, Distributor, or Retailer (or Admin).
    Non-Sathus companies are immediately rejected with 403 Forbidden.
    """
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    roles = [str(r).upper() for r in (payload.get("roles") or [])]
    user_type = str(payload.get("user_type") or "").upper()
    jwt_sub = str(payload.get("sub") or "")

    # Admin bypass for governance & audit
    is_admin = any(r in ("ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "COMPANY_ADMIN") for r in roles)

    # 1. Inspect Company Identity from JWT claims
    company_ref_id = payload.get("company_ref_id")
    company_id_str = payload.get("company_id")
    company_name = str(payload.get("company_name") or "")

    # Resolve company from DB if needed
    is_sathus_company = False
    if company_ref_id is not None and int(company_ref_id) == SATHUS_COMPANY_REF_ID:
        is_sathus_company = True
    elif company_id_str and str(company_id_str).lower() == str(SATHUS_COMPANY_ID).lower():
        is_sathus_company = True
    elif "SATHUS" in company_name.upper():
        is_sathus_company = True

    # 2. Check Entity in Database to confirm company & role
    caller_entity = None
    caller_role = None
    caller_user_id = None
    caller_code = None

    try:
        sub_uuid = uuid.UUID(jwt_sub) if jwt_sub else None
    except Exception:
        sub_uuid = None

    # Check Retailer
    if not caller_entity and sub_uuid:
        r_stmt = select(RetailerModel).where(
            RetailerModel.public_id == sub_uuid,
            RetailerModel.is_deleted == False
        )
        r_res = await db.execute(r_stmt)
        ret = r_res.scalars().first()
        if ret:
            caller_entity = ret
            caller_role = "RETAILER"
            caller_user_id = ret.public_id
            caller_code = ret.retailer_code
            if getattr(ret, "company_ref_id", None) == SATHUS_COMPANY_REF_ID or getattr(ret, "company_id", None) == SATHUS_COMPANY_ID:
                is_sathus_company = True

    # Check Distributor
    if not caller_entity and sub_uuid:
        d_stmt = select(DistributorModel).where(
            DistributorModel.public_id == sub_uuid,
            DistributorModel.is_deleted == False
        )
        d_res = await db.execute(d_stmt)
        dist = d_res.scalars().first()
        if dist:
            caller_entity = dist
            caller_role = "DISTRIBUTOR"
            caller_user_id = dist.public_id
            caller_code = dist.distributor_code
            if getattr(dist, "company_ref_id", None) == SATHUS_COMPANY_REF_ID or getattr(dist, "company_id", None) == SATHUS_COMPANY_ID:
                is_sathus_company = True

    # Check Super Distributor
    if not caller_entity and sub_uuid:
        sd_stmt = select(SuperDistributorModel).where(
            SuperDistributorModel.public_id == sub_uuid,
            SuperDistributorModel.is_deleted == False
        )
        sd_res = await db.execute(sd_stmt)
        sd = sd_res.scalars().first()
        if sd:
            caller_entity = sd
            caller_role = "SUPER_DISTRIBUTOR"
            caller_user_id = sd.public_id
            caller_code = sd.super_distributor_code
            if getattr(sd, "company_ref_id", None) == SATHUS_COMPANY_REF_ID or getattr(sd, "company_id", None) == SATHUS_COMPANY_ID:
                is_sathus_company = True

    # Fallback role inference
    if not caller_role:
        if "RETAILER" in roles or user_type == "RETAILER":
            caller_role = "RETAILER"
        elif "DISTRIBUTOR" in roles or user_type == "DISTRIBUTOR":
            caller_role = "DISTRIBUTOR"
        elif "SUPER_DISTRIBUTOR" in roles or "SD" in roles or user_type == "SUPER_DISTRIBUTOR":
            caller_role = "SUPER_DISTRIBUTOR"
        elif is_admin:
            caller_role = "ADMIN"

    # Enforce Company Boundary: STRICTLY SATHUS ONLY
    if not is_sathus_company and not is_admin:
        logger.warning(f"[UnisusPayGuard] Access blocked for non-Sathus company: {company_name} (ref: {company_ref_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Unisus Pay QR collection is exclusively available for Sathus Company."
        )

    # Enforce Role Boundary: SD, DIST, RET (or ADMIN)
    allowed_roles = ("SUPER_DISTRIBUTOR", "SD", "DISTRIBUTOR", "DIST", "RETAILER", "RET", "ADMIN")
    if caller_role not in allowed_roles:
        logger.warning(f"[UnisusPayGuard] Access blocked for unauthorized role: {caller_role}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Unisus Pay QR is available only to Super Distributors, Distributors, and Retailers."
        )

    return {
        "user_id": caller_user_id or sub_uuid,
        "user_type": caller_role,
        "user_code": caller_code,
        "company_id": SATHUS_COMPANY_ID,
        "company_ref_id": SATHUS_COMPANY_REF_ID,
        "is_admin": is_admin
    }


# ==============================================================================
# 1. PUBLIC WEBHOOK ENDPOINT (NO AUTH - CALLED BY UNISUS PAY)
# ==============================================================================

@router.post("/webhook", summary="Unisus Pay Webhook Receiver")
@router.post("/callback", summary="Unisus Pay Webhook Receiver (Alias)")
async def unisus_pay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives events from Unisus Pay:
    - QR_CALLBACK: Replaces stored QR list.
    - PAYMENT_REQUEST_STATUS: Auto-settles and credits approved wallet requests.
    """
    try:
        body = await request.json()
    except Exception as e:
        logger.error(f"[UnisusWebhook] Failed to parse JSON body: {e}")
        return {"code": 400, "msg": "Invalid JSON body", "data": None}

    logger.info(f"[UnisusWebhook] Received webhook payload: {body}")

    try:
        result = await unisus_pay_service.process_webhook(payload=body, db=db)
        return {"code": 200, "data": result, "msg": "Webhook processed successfully"}
    except Exception as e:
        logger.exception(f"[UnisusWebhook] Webhook processing exception: {e}")
        return {"code": 500, "data": None, "msg": f"Internal processing error: {str(e)}"}


# ==============================================================================
# 2. SATHUS NETWORK QR CODE RETRIEVAL (SD, DIST, RET ONLY)
# ==============================================================================

@router.get("/qrs", summary="Get Active Unisus Pay Collection QRs for Sathus Company")
async def get_unisus_qrs(
    caller: dict = Depends(verify_sathus_network_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns available collection QR codes for Sathus Company members.
    Strictly isolated to Sathus Company Super Distributors, Distributors, and Retailers.
    """
    qrs = await unisus_pay_service.get_active_qrs_for_sathus(db=db)
    return {
        "code": 200,
        "success": True,
        "company": "SATHUS PRIVATE LIMITED",
        "user_role": caller["user_type"],
        "count": len(qrs),
        "data": {
            "qrs": qrs
        },
        "msg": "Active QR codes retrieved successfully."
    }


# ==============================================================================
# 3. SUBMIT PAYMENT REQUEST (SD, DIST, RET ONLY)
# ==============================================================================

@router.post("/submit-payment-request", summary="Submit Unisus Pay Payment Request")
async def submit_payment_request(
    req: UnisusPaymentRequestSubmit,
    caller: dict = Depends(verify_sathus_network_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits payment request to Unisus Pay (/api/apiclient/payment-request)
    and automatically registers a corresponding TopupRequestModel in the system.
    """
    clean_ref = req.reference_no.strip()
    clean_img = req.receipt_image.strip()

    # 1. Prevent duplicate reference_no in pending/success requests
    dup_stmt = select(TopupRequestModel).where(
        TopupRequestModel.payment_reference == clean_ref,
        TopupRequestModel.status.in_(("PENDING", "UNDER_REVIEW", "APPROVED"))
    )
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Payment reference / UTR '{clean_ref}' has already been submitted."
        )

    # 2. Generate unique internal Topup Request ID
    seq_suffix = uuid.uuid4().hex[:8].upper()
    topup_req_id = f"TOPUP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{seq_suffix}"

    # 3. Create initial TopupRequestModel in topup_requests table
    user_type_code = caller["user_type"]
    user_id = caller["user_id"]

    topup_entry = TopupRequestModel(
        topup_request_id=topup_req_id,
        tenant_id=DEFAULT_TENANT_ID,
        company_id=SATHUS_COMPANY_ID,
        company_ref_id=SATHUS_COMPANY_REF_ID,
        requested_amount=req.amount,
        payment_reference=clean_ref,
        payment_method="UNISUS_PAY_QR",
        payment_date=datetime.now(timezone.utc),
        status="UNDER_REVIEW",
        retailer_remarks=f"Unisus Pay QR Collection [QR: {req.qr_id}]. {req.note or ''}".strip(),
        retailer_id=user_id if user_type_code == "RETAILER" else None,
        distributor_id=user_id if user_type_code == "DISTRIBUTOR" else None,
        user_ref_id=None,
        user_type_ref_id=2 if user_type_code == "RETAILER" else (3 if user_type_code == "DISTRIBUTOR" else 4),
        created_by=caller.get("user_code") or "UNISUS_PAY",
        updated_by=caller.get("user_code") or "UNISUS_PAY"
    )
    db.add(topup_entry)
    await db.commit()

    # 4. Dispatch to Unisus Pay Partner API
    try:
        partner_res = await unisus_pay_service.submit_payment_request(
            amount=req.amount,
            reference_no=clean_ref,
            qr_id=req.qr_id,
            receipt_image_base64=clean_img,
            note=req.note,
            user_id=user_id,
            user_type=user_type_code,
            user_code=caller["user_code"],
            topup_request_id=topup_req_id,
            db=db
        )
    except Exception as e:
        logger.error(f"[UnisusPay] Payment submission to partner API failed: {e}")
        # Mark local topup as CANCELLED/ERROR
        topup_entry.status = "REJECTED"
        topup_entry.rejection_reason = f"Partner submission failed: {str(e)}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unisus Pay submission failed: {str(e)}"
        )

    return {
        "code": 200,
        "success": True,
        "topup_request_id": topup_req_id,
        "payment_request_id": partner_res.get("unisus_payment_request_id"),
        "reference_no": clean_ref,
        "amount": req.amount,
        "qr_id": req.qr_id,
        "status": partner_res.get("status", "PENDING"),
        "msg": "Payment Request Submitted Successfully to Unisus Pay. Auto-credit will execute upon bank verification."
    }


# ==============================================================================
# 4. ADMIN & MANAGEMENT ENDPOINTS
# ==============================================================================

@router.get("/balance", summary="Check Unisus Pay Partner Wallet Balance (Admin Only)")
async def get_unisus_balance(
    caller: dict = Depends(verify_sathus_network_member),
    db: AsyncSession = Depends(get_db)
):
    """Queries live partner wallet balance from Unisus Pay."""
    if not caller.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required.")

    balance = await unisus_pay_service.get_balance(db=db)
    return {
        "code": 200,
        "success": True,
        "balance": balance,
        "currency": "INR",
        "service": "UNISUSPAY",
        "msg": "Balance retrieved successfully"
    }


@router.post("/sync-qrs", summary="Force Manual QR Code Sync (Admin Only)")
async def sync_unisus_qrs(
    caller: dict = Depends(verify_sathus_network_member),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually triggers /api/apiclient/qr-code to sync all collection QRs.
    Use in case QR webhook callback was not received.
    """
    if not caller.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required.")

    qrs = await unisus_pay_service.fetch_and_sync_qr_codes(db=db)
    return {
        "code": 200,
        "success": True,
        "count": len(qrs),
        "data": qrs,
        "msg": "QR codes synchronized and updated successfully."
    }


@router.get("/payment-requests", summary="Audit Log of Unisus Pay Payment Requests")
async def list_unisus_payment_requests(
    status_filter: Optional[str] = Query(None, description="PENDING, SUCCESS, FAIL"),
    limit: int = Query(50, ge=1, le=200),
    caller: dict = Depends(verify_sathus_network_member),
    db: AsyncSession = Depends(get_db)
):
    """Lists submitted Unisus Pay payment requests."""
    stmt = select(UnisusPayPaymentRequestModel).where(
        UnisusPayPaymentRequestModel.company_id == SATHUS_COMPANY_ID
    )

    if not caller.get("is_admin"):
        stmt = stmt.where(UnisusPayPaymentRequestModel.user_id == caller["user_id"])

    if status_filter:
        stmt = stmt.where(UnisusPayPaymentRequestModel.status == status_filter.upper())

    stmt = stmt.order_by(desc(UnisusPayPaymentRequestModel.created_date)).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()

    return {
        "code": 200,
        "success": True,
        "count": len(items),
        "items": [
            {
                "id": str(i.public_id),
                "topup_request_id": i.topup_request_id,
                "unisus_payment_request_id": i.unisus_payment_request_id,
                "reference_no": i.reference_no,
                "qr_id": i.qr_id,
                "amount": float(i.amount),
                "status": i.status,
                "user_type": i.user_type,
                "user_code": i.user_code,
                "admin_remark": i.admin_remark,
                "created_date": i.created_date.isoformat() if i.created_date else None,
                "callback_received_at": i.callback_received_at.isoformat() if i.callback_received_at else None
            }
            for i in items
        ]
    }
