"""
Official UrbanRupee Payout Router
Exposes dedicated endpoints for UrbanRupee Payout Gateway:
- POST /api/v1/payout/urbanrupee/initiate : Execute UrbanRupee Payout Transfer
- POST /api/v1/payout/urbanrupee/status   : Check status of UrbanRupee Payout
- GET  /api/v1/payout/urbanrupee/balance  : Check live UrbanRupee balance
- POST /api/v1/payout/urbanrupee/webhook  : Dedicated Webhook Callback Receiver
- POST /api/v1/payout/urbanrupee/callback : Alternative Callback Receiver
"""

import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.urbanrupee_client import UrbanRupeeApiClient
from app.application.payout_callback_service import PayoutCallbackService

logger = logging.getLogger("urbanrupee_payout_router")

router = APIRouter(prefix="/payout/urbanrupee", tags=["UrbanRupee Payout Gateway"])


class UrbanRupeeInitiateRequest(BaseModel):
    merchant_ref: str = Field(..., description="Unique client transaction order ID")
    account_number: str = Field(..., description="Beneficiary Bank Account / UPI ID")
    ifsc_code: str = Field(..., description="Beneficiary Bank IFSC")
    account_holder: str = Field(..., description="Beneficiary Full Name")
    amount: float = Field(..., gt=0.0, description="Transfer Amount in INR (₹10 - ₹2,00,000)")
    mobile: str = Field("9876543210", description="Beneficiary 10-digit mobile number")
    mode: str = Field("IMPS", description="Transfer Mode (IMPS / NEFT / RTGS / UPI)")


class UrbanRupeeStatusRequest(BaseModel):
    orderid: str = Field(..., description="Order ID / Merchant Ref to query")


@router.post("/initiate", summary="Execute Instant UrbanRupee Payout")
async def initiate_urbanrupee_payout(req: UrbanRupeeInitiateRequest):
    """
    Executes an instant bank transfer / UPI payout via UrbanRupee API.
    """
    res = await UrbanRupeeApiClient.initiate_payout(
        merchant_ref=req.merchant_ref,
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        account_holder=req.account_holder,
        amount=req.amount,
        mobile=req.mobile,
        mode=req.mode
    )
    if res.get("status") == "FAILED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res
        )
    return res


@router.post("/status", summary="Check Status of an UrbanRupee Payout")
async def check_urbanrupee_status(req: UrbanRupeeStatusRequest):
    """
    Polls the real-time status of a payout transaction from UrbanRupee.
    """
    res = await UrbanRupeeApiClient.check_status(merchant_ref=req.orderid)
    return res


@router.get("/balance", summary="Fetch Live UrbanRupee Payout Wallet Balance")
async def get_urbanrupee_balance():
    """
    Fetches real-time available settlement balance from UrbanRupee.
    """
    res = await UrbanRupeeApiClient.check_balance()
    return res


@router.post("/webhook", summary="Official UrbanRupee Webhook Callback")
@router.post("/callback", summary="Official UrbanRupee Callback Endpoint")
async def handle_urbanrupee_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Processes real-time payout status webhooks sent by UrbanRupee.
    Updates ledger entries, transaction status, and triggers reconciliation.
    """
    try:
        content_type = request.headers.get("content-type", "").lower()
        if "application/json" in content_type:
            payload = await request.json()
        elif "application/x-www-form-urlencoded" in content_type:
            form_data = await request.form()
            payload = dict(form_data)
        else:
            raw_body = await request.body()
            payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception as e:
        logger.error(f"[URBANRUPEE WEBHOOK] Error parsing payload: {e}")
        payload = {}

    query_params = dict(request.query_params)
    logger.info(f"[URBANRUPEE WEBHOOK] Received payload: {payload}, params: {query_params}")

    result = await PayoutCallbackService.process_callback(
        db=db,
        vendor_hint="urbanrupee",
        payload=payload,
        query_params=query_params
    )

    return {
        "status": True,
        "message": "Webhook processed successfully",
        "data": result
    }
