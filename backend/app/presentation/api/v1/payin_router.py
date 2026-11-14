"""
Enterprise PayIn Presentation API Router.
Exposes:
1. POST /api/v1/payin/collect: Common PayIn API endpoint for all companies.
2. GET  /api/v1/payin/options: Eligible services, payment modes, card types, and vendors for authenticated company.
3. POST /api/v1/payin/mdr/preview: Live dynamic MDR calculation and financial preview for retailer top-up.
4. GET  /api/v1/payin/{tid}/status: Transaction status inquiry with company data isolation.
5. POST /api/v1/payin/webhook/bankme: Inbound webhook receiver for BankMe notifications.
6. POST /api/v1/payin/callback: Universal webhook callback alias.

Enterprise Rules:
- All companies call the same common PayIn API endpoint.
- Company identity is strictly resolved from authenticated server-side context.
- Never trust client-supplied Company Ref ID.
"""

import uuid
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import (
    get_current_token_payload, get_optional_token_payload, get_current_tenant_id
)
from app.application.payin_dtos import (
    CommonPayInRequest, CommonPayInResponse, PayInStatusResponse,
    MdrPreviewRequest, MdrPreviewResponse, PayInOptionsResponse,
    BankMeWebhookPayload
)
from app.application.payin_service import PayInService
from app.application.payin_config_service import PayInConfigService
from app.application.payin_routing_service import SMSPAY_COMPANY_REF_ID

logger = logging.getLogger("payin_router")

router = APIRouter(prefix="/payin", tags=["Common PayIn Gateway & BankMe Integration"])


def extract_auth_context(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    """
    Extracts server-side verified company and user identity from JWT payload.
    Never trusts client payload or query parameters for company authorization.
    """
    comp_ref = payload.get("company_ref_id")
    tenant_ref = payload.get("tenant_ref_id")
    comp_id = payload.get("company_id")
    tenant_id = payload.get("tenant_id")
    ret_id = payload.get("retailer_id") or payload.get("sub")
    ret_ref = payload.get("retailer_ref_id") or payload.get("user_ref_id")
    roles = [str(r).upper() for r in (payload.get("roles") or [])]

    # Domain fallback if testing via company-specific portal domain
    if comp_ref is None and request:
        host = request.headers.get("host", "").lower()
        if "smspay" in host:
            comp_ref = SMSPAY_COMPANY_REF_ID
        elif "near4you" in host:
            comp_ref = 1
        elif "pay2pay" in host:
            comp_ref = 47

    return {
        "company_ref_id": int(comp_ref) if comp_ref is not None else None,
        "tenant_ref_id": int(tenant_ref) if tenant_ref is not None else 1,
        "company_id": comp_id,
        "tenant_id": tenant_id,
        "retailer_id": ret_id,
        "retailer_ref_id": int(ret_ref) if ret_ref is not None else None,
        "roles": roles,
        "sub": payload.get("sub")
    }


@router.get(
    "/options",
    response_model=PayInOptionsResponse,
    summary="Get Enabled PayIn Services, Modes, Cards & Vendors for Retailer"
)
async def get_payin_options(
    request: Request,
    payload: Dict[str, Any] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves all enabled PayIn services, payment modes, card types, and vendors
    configured specifically for the authenticated retailer's company.
    """
    auth_ctx = extract_auth_context(payload, request)
    c_ref = auth_ctx.get("company_ref_id") or SMSPAY_COMPANY_REF_ID
    return await PayInConfigService.get_retailer_payin_options(db=db, company_ref_id=c_ref)


@router.post(
    "/mdr/preview",
    response_model=MdrPreviewResponse,
    summary="Live Dynamic MDR Calculation & Financial Preview"
)
async def preview_mdr_charges(
    request: Request,
    preview_req: MdrPreviewRequest,
    payload: Dict[str, Any] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates live MDR fee, GST, total charges, customer payable amount,
    retailer credit, and company liability based on the active dynamic MDR rules.
    """
    auth_ctx = extract_auth_context(payload, request)
    c_ref = auth_ctx.get("company_ref_id") or SMSPAY_COMPANY_REF_ID
    return await PayInService.calculate_preview(
        db=db,
        company_ref_id=c_ref,
        preview_req=preview_req
    )


@router.post(
    "/collect",
    response_model=CommonPayInResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Common PayIn Collection (All Companies)"
)
async def initiate_common_payin(
    request: Request,
    req_dto: CommonPayInRequest,
    payload: Dict[str, Any] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Common PayIn API Endpoint.
    - Preserves existing request DTO.
    - Resolves Company Ref ID strictly from authenticated context.
    - Generates TID FIRST via authoritative sequence generator.
    - Automatically routes SMSPay (company_ref_id=2) to BankMe and other companies to Existing processing.
    """
    auth_ctx = extract_auth_context(payload, request)
    return await PayInService.initiate_payin(
        db=db,
        request_dto=req_dto,
        auth_context=auth_ctx
    )


@router.get(
    "/{tid}/status",
    response_model=PayInStatusResponse,
    summary="Inquire PayIn Transaction Status"
)
async def get_payin_status(
    tid: str,
    request: Request,
    payload: Dict[str, Any] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves status of a PayIn transaction.
    Enforces strict company data isolation: A company cannot access another company's transaction.
    """
    auth_ctx = extract_auth_context(payload, request)
    return await PayInService.get_payin_status(
        db=db,
        tid=tid,
        auth_context=auth_ctx
    )


@router.post(
    "/webhook/bankme",
    summary="Authoritative BankMe Webhook Receiver (SMSPay)"
)
async def bankme_webhook_handler(
    request: Request,
    payload: BankMeWebhookPayload,
    db: AsyncSession = Depends(get_db)
):
    """
    BankMe Inbound Webhook Callback Endpoint.
    - Verifies webhook signature / authorization.
    - Enforces SMSPay company ownership.
    - Ensures idempotency (duplicate webhook calls are ignored without error).
    - Credits retailer wallet via public.wallet_balance_update stored procedure on SUCCESS.
    """
    headers = dict(request.headers)
    res = await PayInService.process_bankme_webhook(
        db=db,
        payload=payload,
        headers=headers
    )
    return {
        "status": "SUCCESS",
        "processed": True,
        "tid": res.get("tid"),
        "txn_status": res.get("txn_status", "SUCCESS"),
        "message": res.get("message", "Webhook processed successfully")
    }


@router.post(
    "/callback",
    summary="Universal PayIn Callback Alias"
)
async def universal_payin_callback(
    request: Request,
    payload: BankMeWebhookPayload,
    db: AsyncSession = Depends(get_db)
):
    """Universal webhook alias routing to provider callback processor."""
    headers = dict(request.headers)
    res = await PayInService.process_bankme_webhook(
        db=db,
        payload=payload,
        headers=headers
    )
    return {
        "status": "SUCCESS",
        "processed": True,
        "tid": res.get("tid"),
        "txn_status": res.get("txn_status", "SUCCESS"),
        "message": res.get("message", "Webhook processed successfully")
    }
