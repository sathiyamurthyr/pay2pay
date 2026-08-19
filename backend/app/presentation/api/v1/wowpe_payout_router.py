"""
Official WowPe Payout & Verification Router
Endpoints:
- POST /api/v1/payout/wowpe/initiate : Execute WowPe Payout Transfer
- POST /api/v1/payout/wowpe/status   : Check status of WowPe Payout
- POST /api/v1/payout/wowpe/account-validate : Account Name / Penny Drop Verification
- GET  /api/v1/payout/wowpe/balance  : Check live WowPe balance
- POST /api/v1/payout/wowpe/webhook  : Official Webhook Callback Receiver
- POST /api/PayoutAPI/Payoutnotify   : Default Webhook Callback Path as specified in WowPe docs
"""

import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.application.wowpe_client import WowPeApiClient
from app.application.bulkpe_payout_engine import BulkPePayoutEngine
from app.infrastructure.db.payout_workflow_models import (
    PayoutWorkflowTransactionModel,
    PayoutAuditModel
)
from datetime import datetime, timezone

logger = logging.getLogger("wowpe_payout_router")

router = APIRouter(prefix="/payout/wowpe", tags=["WowPe Payout Gateway"])


class WowPePayoutInitiateRequest(BaseModel):
    customer_id: str = Field(..., description="Customer ID / Mobile / UUID")
    beneficiary_id: str = Field(..., description="Beneficiary ID / UUID")
    retailer_id: Optional[str] = Field("93538c98-0b19-493c-a247-4cdb02a46c68", description="Retailer UUID")
    amount: float = Field(..., gt=0, description="Amount in INR")
    mpin: str = Field(..., min_length=4, max_length=6, description="Customer 4-6 digit MPIN")
    mode: str = Field("IMPS", description="Transfer mode: IMPS / NEFT / RTGS")
    idempotency_key: Optional[str] = Field(None, description="Unique merchant reference / client order id")


class WowPeStatusCheckRequest(BaseModel):
    client_order_id: Optional[str] = Field(None, description="Merchant transaction reference number")
    order_id: Optional[str] = Field(None, description="WowPe unique order ID")


class WowPeAccountValidateRequest(BaseModel):
    account_number: str = Field(..., description="Bank Account Number")
    ifsc_code: str = Field(..., description="11-character IFSC Code")
    mobile: Optional[str] = Field("9876543210", description="Customer Mobile Number")
    client_order_id: Optional[str] = Field(None, description="Client verification ref id")


@router.post("/initiate")
async def initiate_wowpe_payout(
    req: WowPePayoutInitiateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes a payout transaction specifically routed through WowPe.
    Maintains all ACID transaction semantics, MPIN validation, and wallet debit.
    """
    tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
    retailer_uuid = uuid.UUID(req.retailer_id) if req.retailer_id and len(req.retailer_id) == 36 else tenant_id

    result = await BulkPePayoutEngine.process_payout(
        db=db,
        customer_id=req.customer_id,
        beneficiary_id=req.beneficiary_id,
        retailer_id=retailer_uuid,
        tenant_id=tenant_id,
        amount=req.amount,
        mpin=req.mpin,
        mode=req.mode,
        idempotency_key=req.idempotency_key
    )
    return {"status": "SUCCESS", "data": result}


@router.post("/status")
async def check_wowpe_status(
    req: WowPeStatusCheckRequest
):
    """
    Checks the live status of a WowPe payout by client_order_id or order_id.
    """
    ref = req.client_order_id or req.order_id
    if not ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either client_order_id or order_id must be provided."
        )

    res = await WowPeApiClient.check_payout_status(
        client_order_id=req.client_order_id,
        order_id=req.order_id
    )
    return {"status": "SUCCESS", "data": res}


@router.post("/account-validate")
async def validate_bank_account(
    req: WowPeAccountValidateRequest
):
    """
    Validates a bank account number and IFSC code using WowPe Account Validation API.
    """
    res = await WowPeApiClient.verify_bank_account(
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        mobile=req.mobile or "9876543210",
        client_order_id=req.client_order_id
    )
    return {"status": "SUCCESS", "data": res}


@router.get("/balance")
async def get_wowpe_balance():
    """
    Retrieves live WowPe wallet balance.
    """
    res = await WowPeApiClient.check_balance()
    return {"status": "SUCCESS", "data": res}


@router.post("/webhook")
async def wowpe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Official WowPe Payout Webhook Receiver.
    Validates webhook payload and updates transaction status in DB.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    logger.info(f"[WOWPE WEBHOOK RECEIVED] Payload: {payload}")

    status_code = payload.get("statusCode")
    order_id = payload.get("orderId") or payload.get("order_id")
    client_order_id = payload.get("clientOrderId") or payload.get("client_order_id")
    utr = payload.get("utr")
    message = payload.get("message")
    checksum = payload.get("checksum")

    if not client_order_id and not order_id:
        return {"status": "SUCCESS", "message": "Ignored: No order reference in payload"}

    # Locate transaction in DB
    stmt = select(PayoutWorkflowTransactionModel).where(
        (PayoutWorkflowTransactionModel.reference_number == client_order_id) |
        (PayoutWorkflowTransactionModel.cashfree_transfer_id == str(order_id))
    )
    tx = (await db.execute(stmt)).scalars().first()

    if tx:
        if str(status_code) == "1" or payload.get("status") == 1 or payload.get("status") == "SUCCESS":
            if tx.status != "SUCCESS":
                tx.status = "SUCCESS"
                tx.utr_number = utr or tx.utr_number
                tx.completed_at = datetime.now(timezone.utc)
                await db.commit()
                logger.info(f"[WOWPE WEBHOOK] Transaction {tx.transaction_number} marked SUCCESS.")
        elif str(status_code) in ("0", "4") or payload.get("status") == 0:
            if tx.status not in ("FAILED", "REVERSED"):
                tx.status = "FAILED"
                tx.failure_reason = message or "Failed via WowPe Webhook notification"
                tx.completed_at = datetime.now(timezone.utc)
                await db.commit()
                logger.info(f"[WOWPE WEBHOOK] Transaction {tx.transaction_number} marked FAILED.")

    return {"status": "SUCCESS", "message": "Webhook processed successfully"}


# Also create fallback global path router for WowPe default webhook path
notify_router = APIRouter(tags=["WowPe Webhook Direct"])

@notify_router.post("/api/PayoutAPI/Payoutnotify")
async def wowpe_payout_notify_direct(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await wowpe_webhook(request, db)
