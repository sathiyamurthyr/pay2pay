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
from fastapi import APIRouter, Depends, HTTPException, status, Request
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
    retailer_id: Optional[Union[uuid.UUID, str]] = Field(None, description="Retailer ID")
    tenant_id: Optional[Union[uuid.UUID, str]] = Field(None, description="Tenant ID")
    amount: float = Field(..., gt=0, description="Payout Transfer Amount")
    mpin: str = Field(..., description="Customer Security MPIN")
    mode: str = Field("IMPS", description="Transfer Mode (IMPS, NEFT, RTGS, UPI)")
    idempotency_key: Optional[str] = Field(None, description="Unique Idempotency Key")


@router.post("/initiate", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def initiate_bulkpe_payout(
    req: InitiateBulkPePayoutRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates a BulkPe Payout transaction with full ACID wallet debit, dynamic pricing,
    security MPIN validation, and automatic reversal engine on failures.
    """
    tenant_id = req.tenant_id or uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
    retailer_id = req.retailer_id or uuid.UUID("a46ec999-57db-4138-a79b-a208a6d75109")

    return await BulkPePayoutEngine.process_payout(
        db=db,
        customer_id=req.customer_id,
        beneficiary_id=req.beneficiary_id,
        retailer_id=retailer_id,
        tenant_id=tenant_id,
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
