"""
Universal REST API Router for All Payout Gateways Webhooks & Callbacks.
Endpoints:
- GET  /api/v1/payout/callback/urls               : Catalog of all vendor callback URLs
- GET  /api/v1/payout/webhook/urls                : Catalog of all vendor webhook URLs
- POST /api/v1/payout/callback                    : Universal auto-detect payout callback
- GET  /api/v1/payout/callback                    : Universal GET callback (for query-based redirects)
- POST /api/v1/payout/webhook                     : Universal webhook listener
- POST /api/v1/payout/callback/{vendor}           : Vendor-specific callback (bulkpe, wowpe, cashfree, etc.)
- GET  /api/v1/payout/callback/{vendor}           : Vendor-specific GET callback
- POST /api/v1/payout/webhook/{vendor}            : Vendor-specific webhook receiver
- GET  /api/v1/payout/webhook/{vendor}            : Vendor-specific GET webhook receiver
"""

import json
import logging
from typing import Dict, Any, Optional, Tuple
from fastapi import APIRouter, Depends, Request, status, Response, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.payout_callback_service import PayoutCallbackService

logger = logging.getLogger("payout_callback_router")

router = APIRouter(prefix="/payout", tags=["Universal Payout Callback & Webhook Gateway"])


async def extract_request_data(request: Request) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Safely extracts JSON or Form or Query params from incoming request."""
    query_params = dict(request.query_params)
    payload = {}

    content_type = request.headers.get("content-type", "").lower()
    try:
        if "application/json" in content_type:
            payload = await request.json()
        elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form_data = await request.form()
            payload = dict(form_data)
        else:
            # Fallback attempt to parse JSON body
            body_bytes = await request.body()
            if body_bytes:
                try:
                    payload = json.loads(body_bytes.decode("utf-8"))
                except Exception:
                    payload = {"raw_body": body_bytes.decode("utf-8", errors="ignore")}
    except Exception as err:
        logger.warning(f"[PAYOUT CALLBACK] Could not parse body payload: {err}")
        payload = {}

    return payload, query_params


# ── 1. CALLBACK & WEBHOOK URLS DIRECTORY ──
@router.get("/callback/urls", summary="Catalog of All Payout Gateway Callback URLs")
@router.get("/webhook/urls", summary="Catalog of All Payout Gateway Webhook URLs")
async def get_callback_urls(request: Request):
    """
    Returns full configuration catalog of webhook and callback URLs for all integrated
    payment and payout vendors (BulkPe, WowPe, Cashfree, Razorpay, Decentro, Easebuzz, PayU, SafeGold, etc.).
    Use these URLs in the respective vendor merchant / developer consoles.
    """
    base_url = str(request.base_url).rstrip("/")
    return PayoutCallbackService.get_all_callback_urls(base_url)


# ── 2. WEBHOOK AUDIT LOGS (FROM VIEW: public.view_payout_webhook_logs) ──
@router.get("/webhook/logs", summary="Fetch Payout Webhook Received Logs from View")
@router.get("/callback/logs", summary="Fetch Payout Callback Logs from View")
async def get_payout_webhook_logs(
    gateway: Optional[str] = Query(None, description="Filter by gateway code (e.g. URBANRUPEE, BULKPE)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (SUCCESS, FAILED, PENDING)"),
    search: Optional[str] = Query(None, description="Search client_txn_id, vendor_tx_id, transaction_number, retailer"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves real-time incoming webhook audit logs queried directly from public.view_payout_webhook_logs.
    Includes request payload, response payload, gateway reference, and status.
    """
    logs = await PayoutCallbackService.get_webhook_logs(
        db=db,
        gateway=gateway,
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset
    )
    return logs


# ── 3. UNIVERSAL AUTO-DETECT WEBHOOK & CALLBACK ──
@router.post("/callback", summary="Universal Payout Callback Receiver (POST)")
@router.post("/webhook", summary="Universal Payout Webhook Receiver (POST)")
async def handle_universal_callback_post(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Universal POST endpoint for all payout vendors. Auto-detects the provider and payload format.
    Always returns HTTP 200 after processing and recording in public.payout_webhook via SP.
    """
    payload, query_params = await extract_request_data(request)
    res = await PayoutCallbackService.process_callback(
        db=db,
        vendor_hint=None,
        payload=payload,
        query_params=query_params
    )
    return JSONResponse(status_code=status.HTTP_200_OK, content=res)


@router.get("/callback", summary="Universal Payout Callback Receiver (GET)")
@router.get("/webhook", summary="Universal Payout Webhook Receiver (GET)")
async def handle_universal_callback_get(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Universal GET endpoint for payout vendor redirects and query-based callbacks.
    """
    query_params = dict(request.query_params)
    res = await PayoutCallbackService.process_callback(
        db=db,
        vendor_hint=None,
        payload={},
        query_params=query_params
    )
    return res


# ── 3. VENDOR-SPECIFIC DEDICATED WEBHOOK & CALLBACK ──
@router.post("/callback/{vendor}", summary="Vendor-Specific Payout Callback (POST)")
@router.post("/webhook/{vendor}", summary="Vendor-Specific Payout Webhook (POST)")
async def handle_vendor_callback_post(
    vendor: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Vendor-specific POST callback receiver.
    Supported {vendor}: bulkpe, wowpe, cashfree, razorpay, decentro, easebuzz, payu, safegold, eko, paysprint, instantpay, generic.
    """
    payload, query_params = await extract_request_data(request)
    res = await PayoutCallbackService.process_callback(
        db=db,
        vendor_hint=vendor,
        payload=payload,
        query_params=query_params
    )

    # Some vendors (like WowPe legacy or Eko) expect standard plaintext or specific ACK format
    if vendor.lower() in ("wowpe", "eko"):
        return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "SUCCESS", "message": "Webhook processed successfully", "data": res})

    return JSONResponse(status_code=status.HTTP_200_OK, content=res)


@router.get("/callback/{vendor}", summary="Vendor-Specific Payout Callback (GET)")
@router.get("/webhook/{vendor}", summary="Vendor-Specific Payout Webhook (GET)")
async def handle_vendor_callback_get(
    vendor: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Vendor-specific GET callback receiver for URL redirect callbacks.
    """
    query_params = dict(request.query_params)
    res = await PayoutCallbackService.process_callback(
        db=db,
        vendor_hint=vendor,
        payload={},
        query_params=query_params
    )
    return res
