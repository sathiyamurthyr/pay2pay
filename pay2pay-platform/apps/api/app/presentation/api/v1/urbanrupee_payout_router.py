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
from fastapi.responses import JSONResponse
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


from app.application.urbanrupee_status_poller_service import UrbanRupeeStatusPollerService


@router.post("/status", summary="Check Status of an UrbanRupee Payout")
async def check_urbanrupee_status(
    req: UrbanRupeeStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Polls the real-time status of a payout transaction from UrbanRupee.
    Updates the payout record in the database before responding, and automatically
    triggers wallet reversal for the retailer if the status is FAILED.
    """
    status_res = await UrbanRupeeApiClient.check_status(merchant_ref=req.orderid)
    raw_res = status_res.get("raw_response") if isinstance(status_res.get("raw_response"), dict) else {}

    # Synchronize database state and execute automatic reversal if failed
    callback_payload = {
        "orderid": req.orderid,
        "client_txn_id": req.orderid,
        **raw_res
    }

    cb_res = await PayoutCallbackService.process_callback(
        db=db,
        vendor_hint="urbanrupee",
        payload=callback_payload,
        query_params={}
    )

    return {
        "status": cb_res.get("payout_status", status_res.get("status")),
        "orderid": req.orderid,
        "transaction_number": cb_res.get("transaction_number"),
        "is_reversed": cb_res.get("is_reversed", False),
        "is_matched": cb_res.get("is_matched", False),
        "utr": cb_res.get("utr") or status_res.get("utr"),
        "message": cb_res.get("message") or status_res.get("message"),
        "gateway_response": status_res,
        "reconciliation_result": cb_res
    }


@router.post("/check-pending", summary="Run Automated Status Polling Cycle for Pending Payouts")
async def trigger_check_pending_payouts(
    limit: int = Query(50, ge=1, le=100, description="Max pending records to process"),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually or programmatically triggers the 5-minute status poller cycle for PENDING payouts.
    Only processes if UrbanRupee priority is configured as 1.
    Reverses failed payouts to retailer wallets and records UTR for successful payouts.
    """
    report = await UrbanRupeeStatusPollerService.poll_pending_urbanrupee_payouts(db=db, max_records=limit)
    return report


@router.get("/pending", summary="View All Pending Payout Transactions")
async def list_pending_payout_transactions(
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves real-time list of pending payout transactions from PostgreSQL View:
    public.view_pending_payout_transactions.
    """
    from sqlalchemy import text
    query = text("""
        SELECT 
            transaction_number,
            order_id,
            gateway_reference,
            bank_reference,
            vendor_name,
            status,
            amount,
            net_debit,
            retailer_id,
            retailer_name,
            retailer_code,
            created_date,
            processed_time
        FROM public.view_pending_payout_transactions
        ORDER BY created_date DESC
        LIMIT :limit
    """)
    result = await db.execute(query, {"limit": limit})
    rows = [dict(r) for r in result.mappings().all()]
    return {
        "status": "SUCCESS",
        "total_pending": len(rows),
        "transactions": rows
    }


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

    return JSONResponse(status_code=status.HTTP_200_OK, content=result)
