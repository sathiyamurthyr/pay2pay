"""
REST API Router for BulkPe Enterprise Payout Engine.
Endpoints:
- POST /api/v1/payout/bulkpe/initiate
- GET /api/v1/payout/bulkpe/status/{transaction_number}
- POST /api/v1/payout/bulkpe/webhook
- GET /api/v1/payout/bulkpe/dashboard/counters
"""

import uuid
from typing import Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.application.bulkpe_payout_engine import BulkPePayoutEngine
from app.infrastructure.db.payout_workflow_models import PayoutWorkflowTransactionModel
from app.infrastructure.db.models import RetailerWalletModel

router = APIRouter(prefix="/payout/bulkpe", tags=["BulkPe Payout Engine"])


class InitiateBulkPePayoutRequest(BaseModel):
    customer_id: Union[uuid.UUID, str] = Field(..., description="Customer ID or Mobile Number")
    beneficiary_id: Union[uuid.UUID, str] = Field(..., description="Beneficiary ID or Account Number")
    account_number: Optional[str] = Field(None, description="Explicit Beneficiary Account Number")
    ifsc_code: Optional[str] = Field(None, description="Explicit Beneficiary IFSC Code")
    account_holder_name: Optional[str] = Field(None, description="Explicit Beneficiary Name")
    bank_name: Optional[str] = Field(None, description="Explicit Beneficiary Bank Name")
    user_ref_id: Optional[int] = Field(None, description="Standard User Reference ID (BIGINT)")
    user_type_ref_id: Optional[int] = Field(2, description="Standard User Type Reference ID (BIGINT)")
    retailer_ref_id: Optional[int] = Field(None, description="Alternative Retailer Reference ID (BIGINT)")
    retailer_id: Optional[Union[uuid.UUID, str]] = Field(None, description="Retailer ID")
    tenant_id: Optional[Union[uuid.UUID, str]] = Field(None, description="Tenant ID")
    amount: float = Field(..., gt=0, description="Payout Transfer Amount")
    mpin: str = Field(..., description="Customer Security MPIN")
    mode: str = Field("IMPS", description="Transfer Mode (IMPS, NEFT, RTGS, UPI)")
    idempotency_key: Optional[str] = Field(None, description="Unique Idempotency Key")


@router.post("/initiate", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def initiate_bulkpe_payout(
    req: InitiateBulkPePayoutRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates a BulkPe Payout transaction with full ACID wallet debit, dynamic pricing,
    security MPIN validation, and automatic reversal engine on failures.
    """
    from app.infrastructure.db.models import RetailerModel

    ret_obj = None

    # 1. Attempt JWT auth token/cookie context resolution
    try:
        from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
        ctx = await resolve_retailer_context(request, req.retailer_id, db=db)
        if ctx and ctx.get("public_id"):
            stmt = select(RetailerModel).where(RetailerModel.public_id == ctx.get("public_id"), RetailerModel.is_deleted == False)
            ret_obj = (await db.execute(stmt)).scalars().first()
    except Exception:
        pass

    # 2. Direct indexed BIGINT resolution via user_ref_id / retailer_ref_id
    if not ret_obj:
        eff_ref_id = req.user_ref_id or req.retailer_ref_id or request.headers.get("x-user-ref-id")
        if eff_ref_id:
            try:
                ref_int = int(eff_ref_id)
                stmt = select(RetailerModel).where(RetailerModel.retailer_ref_id == ref_int, RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()
            except (ValueError, TypeError):
                pass

    # 3. Resolution via retailer identifier (UUID, retailer_code)
    if not ret_obj:
        ret_identifier = req.retailer_id or request.headers.get("x-retailer-code") or request.headers.get("x-retailer-id")
        if ret_identifier:
            try:
                parsed_uuid = uuid.UUID(str(ret_identifier))
                stmt = select(RetailerModel).where(RetailerModel.public_id == parsed_uuid, RetailerModel.is_deleted == False)
                ret_obj = (await db.execute(stmt)).scalars().first()
            except Exception:
                pass

        if not ret_obj and ret_identifier:
            stmt = select(RetailerModel).where(RetailerModel.retailer_code == str(ret_identifier).strip().upper(), RetailerModel.is_deleted == False)
            ret_obj = (await db.execute(stmt)).scalars().first()

    # 4. Fallback to primary active platform retailer P2P-R404667
    if not ret_obj:
        stmt = select(RetailerModel).where(RetailerModel.retailer_code == "P2P-R404667", RetailerModel.is_deleted == False)
        ret_obj = (await db.execute(stmt)).scalars().first()
    if not ret_obj:
        stmt = select(RetailerModel).where(RetailerModel.retailer_ref_id == 24, RetailerModel.is_deleted == False)
        ret_obj = (await db.execute(stmt)).scalars().first()

    retailer_uuid = ret_obj.public_id if ret_obj else uuid.UUID("e238fb8b-beb3-4cd4-862b-319b5d05d24e")
    tenant_uuid = (ret_obj.tenant_id if ret_obj and ret_obj.tenant_id else None) or req.tenant_id or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
    if isinstance(tenant_uuid, str):
        try:
            tenant_uuid = uuid.UUID(tenant_uuid)
        except Exception:
            tenant_uuid = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")

    return await BulkPePayoutEngine.process_payout(
        db=db,
        customer_id=req.customer_id,
        beneficiary_id=req.beneficiary_id,
        retailer_id=retailer_uuid,
        tenant_id=tenant_uuid,
        amount=req.amount,
        mpin=req.mpin,
        mode=req.mode,
        idempotency_key=req.idempotency_key,
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        account_holder_name=req.account_holder_name,
        bank_name=req.bank_name
    )


@router.get("/status/{transaction_number}", response_model=Dict[str, Any])
async def get_bulkpe_transaction_status(
    transaction_number: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetches real-time status of a BulkPe payout transaction by transaction number or reference ID."""
    stmt = select(PayoutWorkflowTransactionModel).where(
        (PayoutWorkflowTransactionModel.transaction_number == transaction_number) |
        (PayoutWorkflowTransactionModel.reference_number == transaction_number)
    )
    tx = (await db.execute(stmt)).scalars().first()

    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payout transaction record not found."
        )

    return {
        "transaction_number": tx.transaction_number,
        "reference_number": tx.reference_number,
        "status": tx.status,
        "amount": tx.amount,
        "net_debit": tx.net_debit,
        "charges": tx.charges,
        "mode": tx.mode,
        "utr": tx.utr_number,
        "vendor_tx_id": tx.cashfree_transfer_id,
        "initiated_at": tx.initiated_at,
        "completed_at": tx.completed_at,
        "failure_reason": tx.failure_reason
    }


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def bulkpe_webhook_listener(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Official BulkPe Webhook Receiver for real-time payout status updates."""
    payload = await request.json()
    vendor_tx_id = payload.get("vendor_tx_id") or payload.get("data", {}).get("vendor_tx_id")
    event_status = (payload.get("status") or payload.get("event", "")).upper()
    utr = payload.get("utr") or payload.get("data", {}).get("utr")

    if not vendor_tx_id:
        return {"status": "ACK", "message": "No vendor_tx_id in payload"}

    stmt = select(PayoutWorkflowTransactionModel).where(
        PayoutWorkflowTransactionModel.cashfree_transfer_id == vendor_tx_id
    )
    tx = (await db.execute(stmt)).scalars().first()

    if tx:
        if "SUCCESS" in event_status:
            tx.status = "SUCCESS"
            if utr:
                tx.utr_number = utr
            await db.commit()
        elif "FAILED" in event_status or "REVERSED" in event_status:
            tx.status = "FAILED"
            tx.failure_reason = payload.get("message", "Vendor Webhook status FAILED")
            await db.commit()

    return {"status": "ACK", "message": "BulkPe Webhook processed"}


@router.get("/dashboard/counters", response_model=Dict[str, Any])
async def get_bulkpe_dashboard_counters(
    retailer_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches real-time dashboard statistics: Wallet Balance, Today's Payouts,
    Success/Failed/Pending/Refund counts and transaction metrics.
    """
    ret_id = retailer_id or uuid.UUID("a46ec999-57db-4138-a79b-a208a6d75109")

    # Fetch wallet balance
    stmt_w = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_id)
    wallet = (await db.execute(stmt_w)).scalars().first()
    wallet_balance = wallet.wallet_balance if wallet else 0.0

    # Aggregate counts by status
    stmt_counts = select(
        PayoutWorkflowTransactionModel.status,
        func.count(PayoutWorkflowTransactionModel.id),
        func.coalesce(func.sum(PayoutWorkflowTransactionModel.amount), 0.0)
    ).group_by(PayoutWorkflowTransactionModel.status)

    results = (await db.execute(stmt_counts)).all()

    stats = {
        "wallet_balance": wallet_balance,
        "success_count": 0,
        "success_amount": 0.0,
        "failed_count": 0,
        "failed_amount": 0.0,
        "pending_count": 0,
        "pending_amount": 0.0,
        "refund_count": 0,
        "refund_amount": 0.0,
        "total_payout_amount": 0.0
    }

    for status_str, count_val, sum_val in results:
        stats["total_payout_amount"] += sum_val
        if status_str == "SUCCESS":
            stats["success_count"] = count_val
            stats["success_amount"] = sum_val
        elif status_str in ("FAILED", "REVERSED"):
            stats["failed_count"] += count_val
            stats["failed_amount"] += sum_val
            stats["refund_count"] += count_val
            stats["refund_amount"] += sum_val
        elif status_str == "PENDING":
            stats["pending_count"] = count_val
            stats["pending_amount"] = sum_val

    return stats


@router.get("/generate-txn-id", response_model=Dict[str, Any])
async def get_next_payout_txn_id(
    vendor_name: Optional[str] = Query("UTKALDIGITAL"),
    db: AsyncSession = Depends(get_db)
):
    """Generates the next unique authoritative payout transaction ID via PostgreSQL stored procedure."""
    from app.core.transaction_id_generator import generate_payout_txn_id_via_sp
    txn_id = await generate_payout_txn_id_via_sp(db, vendor_name=vendor_name)
    return {
        "success": True,
        "txn_id": txn_id,
        "vendor_name": vendor_name
    }
