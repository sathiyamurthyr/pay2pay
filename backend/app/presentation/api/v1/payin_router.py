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
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.infrastructure.db.payin_models import PayinTransactionModel
from app.infrastructure.db.models import RetailerModel
from app.application.dependencies import (
    get_current_token_payload, get_optional_token_payload, get_current_tenant_id
)
from app.application.payin_dtos import (
    CommonPayInRequest, CommonPayInResponse, PayInStatusResponse,
    MdrPreviewRequest, MdrPreviewResponse, PayInOptionsResponse,
    BankMeWebhookPayload, CardSchemeMdrItem
)
from app.application.payin_service import PayInService
from app.application.payin_config_service import PayInConfigService
from app.application.payin_routing_service import SMSPAY_COMPANY_REF_ID
from app.application.bankme_payin_client import BankMePayInClient
from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO
from app.core.company_resolver import resolve_return_base_url, get_company_preset

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
    role = (auth_ctx.get("roles") or ["RETAILER"])[0] if auth_ctx.get("roles") else "RETAILER"
    return await PayInConfigService.get_retailer_payin_options(db=db, company_ref_id=c_ref, role=role)


@router.get(
    "/gateways",
    summary="Get Active Payment Gateways for Retailer Checkout"
)
async def get_payin_gateways(
    request: Request,
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves dynamically configured active payment gateways for the authenticated company.
    Vendor names are strictly masked to generic gateway identifiers (e.g. Gateway G-1, Gateway G-2).
    """
    auth_ctx = extract_auth_context(payload, request)
    c_ref = auth_ctx.get("company_ref_id") or SMSPAY_COMPANY_REF_ID
    role = (auth_ctx.get("roles") or ["RETAILER"])[0] if auth_ctx.get("roles") else "RETAILER"
    options = await PayInConfigService.get_retailer_payin_options(db=db, company_ref_id=c_ref, role=role)
    return {
        "success": True,
        "company_ref_id": c_ref,
        "company_name": options.company_name,
        "gateways": [
            {
                "id": f"gateway-{(v.gateway_code or 'g1').lower()}",
                "code": v.gateway_code or "G-1",
                "name": v.display_name or f"Gateway {v.gateway_code}",
                "subtitle": v.subtitle or v.description,
                "vendorCode": v.gateway_code or "G-1",
                "badge": v.badge or "Active",
                "badgeColor": v.badge_color or "#10B981",
                "iconText": v.gateway_code or "G-1",
                "isActive": v.is_active,
                "isRecommended": v.is_default,
                "displayOrder": v.display_order or 1,
                "description": v.description or v.subtitle,
                "supportedMethods": v.supported_methods
            } for v in options.vendors
        ]
    }


@router.get(
    "/card-schemes",
    summary="Get Admin-Configured MDR for Supported Card Schemes (Display Only)"
)
async def get_payin_card_schemes(
    request: Request,
    vendor_code: Optional[str] = Query(None, description="Optional vendor override"),
    active_only: bool = Query(True, description="Filter only active card schemes"),
    payload: Dict[str, Any] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the standard card schemes and their Admin-configured MDR rates
    strictly isolated by the authenticated retailer's Company Ref ID.
    Returns only active, enabled card types when active_only=True.
    """
    auth_ctx = extract_auth_context(payload, request)
    c_ref = auth_ctx.get("company_ref_id") or SMSPAY_COMPANY_REF_ID
    return await PayInConfigService.get_card_schemes_mdr(
        db=db,
        company_ref_id=c_ref,
        vendor_code=vendor_code,
        active_only=active_only
    )


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
    role = (auth_ctx.get("roles") or ["RETAILER"])[0] if auth_ctx.get("roles") else "RETAILER"
    return await PayInService.calculate_preview(
        db=db,
        company_ref_id=c_ref,
        preview_req=preview_req,
        role=role
    )


@router.post(
    "/collect",
    response_model=CommonPayInResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Common PayIn Collection (All Companies)"
)
@router.post(
    "/initiate",
    response_model=CommonPayInResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate PayIn Collection Alias"
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
    auth_ctx["request"] = request
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


@router.get(
    "/{tid}/audit",
    summary="Get Complete Request/Response API Audit Trail for PayIn Transaction"
)
async def get_payin_audit(
    tid: str,
    request: Request,
    payload: Dict[str, Any] = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full request and response audit logs for a transaction.
    Enforces strict company data isolation: A retailer or admin can only view
    the audit trail for transactions belonging to their authenticated company.
    """
    auth_ctx = extract_auth_context(payload, request)
    return await PayInService.get_transaction_audit(
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
    - Verifies webhook HMAC-SHA256 signature / authorization.
    - Enforces SMSPay company ownership.
    - Ensures idempotency (duplicate webhook calls are ignored without error).
    - Credits retailer wallet via public.wallet_balance_update stored procedure on SUCCESS.
    """
    headers = dict(request.headers)
    try:
        raw_body_bytes = await request.body()
        raw_body = raw_body_bytes.decode("utf-8", errors="ignore")
    except Exception:
        raw_body = None

    res = await PayInService.process_bankme_webhook(
        db=db,
        payload=payload,
        headers=headers,
        raw_body=raw_body
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
    try:
        raw_body_bytes = await request.body()
        raw_body = raw_body_bytes.decode("utf-8", errors="ignore")
    except Exception:
        raw_body = None

    res = await PayInService.process_bankme_webhook(
        db=db,
        payload=payload,
        headers=headers,
        raw_body=raw_body
    )
    return {
        "status": "SUCCESS",
        "processed": True,
        "tid": res.get("tid"),
        "txn_status": res.get("txn_status", "SUCCESS"),
        "message": res.get("message", "Webhook processed successfully")
    }


@router.get(
    "/callback",
    summary="Universal PayIn Browser Return / Callback Redirect"
)
async def universal_payin_browser_callback(
    request: Request,
    referenceId: Optional[str] = Query(None, description="Transaction Reference ID / TID"),
    reference_id: Optional[str] = Query(None, description="Alias for referenceId"),
    tid: Optional[str] = Query(None, description="Alias for referenceId"),
    status: Optional[str] = Query("success", description="Payment status: success | failed | pending"),
    orderId: Optional[str] = Query(None, description="Gateway order ID"),
    utr: Optional[str] = Query(None, description="Bank UTR"),
    db: AsyncSession = Depends(get_db)
):
    """
    Browser Return / Callback Handler.
    When a payment gateway (e.g. BankMe) redirects the customer's browser via HTTP GET to
    /api/v1/payin/callback?referenceId=...&status=..., this endpoint captures it, updates the
    transaction status if appropriate, and performs an HTTP 302 Redirect to the frontend
    receipt & landing page (/retailer/payin/status?referenceId=...&status=...).
    """
    resolved_ref = referenceId or reference_id or tid or ""
    resolved_status = (status or "success").strip().lower()

    target_company_ref_id = None
    # Reconcile if transaction exists and incoming status indicates success
    if resolved_ref:
        try:
            stmt = select(PayinTransactionModel).where(
                or_(
                    PayinTransactionModel.tid == resolved_ref,
                    PayinTransactionModel.merchant_ref_id == resolved_ref,
                    PayinTransactionModel.provider_ref_id == resolved_ref
                )
            )
            res = await db.execute(stmt)
            txn = res.scalars().first()
            if txn:
                target_company_ref_id = txn.company_ref_id
                if resolved_status == "success" and txn.txn_status != "SUCCESS":
                    wh_payload = BankMeWebhookPayload(
                        event="payin.success",
                        status="SUCCESS",
                        referenceId=resolved_ref,
                        tid=resolved_ref,
                        orderId=orderId or txn.provider_ref_id or txn.tid,
                        utr=utr or txn.provider_ref_id or f"UTR-{resolved_ref[-8:]}",
                        amount=float(txn.txn_amount),
                        signature="browser_return_sync"
                    )
                    await PayInService.process_bankme_webhook(
                        db=db,
                        payload=wh_payload,
                        headers=dict(request.headers)
                    )
        except Exception as e:
            logger.warning("Browser return sync notice for %s: %s", resolved_ref, e)

    # Dynamically resolve return base domain using the verified company context
    return_base = resolve_return_base_url(
        company_ref_id=target_company_ref_id,
        request=request
    )

    # Build clean frontend redirect target on originating domain
    redirect_target = f"{return_base}/retailer/payin/status?referenceId={resolved_ref}&status={resolved_status}"
    if orderId:
        redirect_target += f"&orderId={orderId}"
    if utr:
        redirect_target += f"&utr={utr}"

    return RedirectResponse(url=redirect_target, status_code=302)


@router.get(
    "/receipt/{reference_id}",
    summary="Get Public PayIn Receipt Details"
)
async def get_payin_receipt(
    reference_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Public receipt endpoint for sharing, downloading, and verifying PayIn transactions.
    Provides verified transaction details without requiring user authentication.
    """
    stmt = select(PayinTransactionModel).where(
        or_(
            PayinTransactionModel.tid == reference_id,
            PayinTransactionModel.merchant_ref_id == reference_id,
            PayinTransactionModel.provider_ref_id == reference_id
        )
    )
    res = await db.execute(stmt)
    txn = res.scalars().first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction receipt not found")

    # If status is pending/initiated and BankMe, check live gateway status
    if txn.txn_status in ("PENDING", "INITIATED") and txn.company_ref_id == SMSPAY_COMPANY_REF_ID:
        try:
            live_check = await BankMePayInClient.check_order_status(
                tid=txn.tid,
                bankme_ref=txn.provider_ref_id,
                company_ref_id=txn.company_ref_id,
                retailer_ref_id=txn.retailer_ref_id
            )
            if live_check.get("success") and live_check.get("status") in ("SUCCESS", "FAILED"):
                new_st = live_check.get("status")
                txn.txn_status = new_st
                txn.provider_status = new_st
                if live_check.get("utr"):
                    txn.provider_ref_id = live_check.get("utr")
                if new_st == "SUCCESS":
                    txn.completed_at = datetime.now(timezone.utc)
                await db.commit()

                # Perform wallet credit if needed
                if new_st == "SUCCESS" and not txn.ledger_txn_id:
                    try:
                        ret_stmt = select(RetailerModel).where(
                            RetailerModel.retailer_ref_id == txn.retailer_ref_id,
                            RetailerModel.company_ref_id == txn.company_ref_id
                        )
                        ret_res = await db.execute(ret_stmt)
                        ret_obj = ret_res.scalars().first()
                        credit_amount = float(txn.retailer_credit)
                        adj_dto = WalletAdjustmentDTO(
                            user_ref_id=txn.retailer_ref_id,
                            retailer_id=str(ret_obj.public_id) if ret_obj else None,
                            retailer_code=ret_obj.retailer_code if ret_obj else None,
                            company_ref_id=txn.company_ref_id,
                            user_type_ref_id=2,
                            entry_type="CREDIT",
                            amount=credit_amount,
                            payout_amount=credit_amount,
                            charge_amount=0.0,
                            gst_amount=0.0,
                            service_name="PAYIN_TOPUP",
                            wallet_type="MAIN",
                            user_type="RETAILER",
                            txn_id=txn.tid,
                            ref_id=live_check.get("utr") or txn.provider_ref_id or txn.tid,
                            narration=f"PayIn Wallet Top-Up via BankMe (TID: {txn.tid})"
                        )
                        adj_res = await WalletBalanceAdjustmentService.execute_wallet_balance_update(db=db, dto=adj_dto)
                        if adj_res and adj_res.success:
                            txn.ledger_txn_id = adj_res.txn_id
                            await db.commit()
                    except Exception as w_err:
                        logger.error("Wallet credit error during receipt sync: %s", w_err)
        except Exception as sync_err:
            logger.warning("Receipt sync warning for TID %s: %s", txn.tid, sync_err)

    preset = get_company_preset(txn.company_ref_id) or {}
    company_code = preset.get("company_code", "SMSPAY" if txn.company_ref_id == 2 else "NEAR4YOU")
    company_name = preset.get("display_name", "SMSPAY" if txn.company_ref_id == 2 else "Near4You")
    domain = (preset.get("domains") or ["smspay.store"])[0]

    raw_mob = txn.cust_mobile or ""
    formatted_mob = f"+91 {raw_mob[-10:]}" if len(raw_mob) >= 10 else raw_mob

    return {
        "success": True,
        "data": {
            "tid": txn.tid,
            "reference_id": txn.tid,
            "merchant_ref_id": txn.merchant_ref_id,
            "provider_ref_id": txn.provider_ref_id,
            "order_id": (txn.response_ref or {}).get("order_id") if isinstance(txn.response_ref, dict) else None,
            "status": txn.txn_status,
            "amount": float(txn.txn_amount),
            "customer_payable": float(txn.customer_payable or txn.txn_amount),
            "retailer_credit": float(txn.retailer_credit or txn.txn_amount),
            "mdr_amount": float(txn.mdr_amount or 0),
            "tax_amount": float(txn.tax_amount or 0),
            "total_charges": float(txn.total_charges or 0),
            "customer_name": txn.cust_name or "Retailer Partner",
            "customer_mobile": formatted_mob,
            "provider": "SMSPAY Exclusive Gateway G-1" if txn.company_ref_id == 2 else "Primary Gateway",
            "card_network": txn.card_network or "Card / Net Banking / UPI",
            "payment_mode": "CARD",
            "company_code": company_code,
            "company_name": company_name,
            "domain": domain,
            "created_at": txn.created_at.isoformat() if txn.created_at else None,
            "completed_at": txn.completed_at.isoformat() if txn.completed_at else None,
            "utr": txn.provider_ref_id or txn.tid,
            "failure_reason": txn.failure_reason
        }
    }


@router.post(
    "/{tid}/send-notifications",
    summary="Dispatch PayIn Wallet Top-Up WhatsApp and Email Notifications"
)
async def dispatch_payin_notifications_endpoint(
    tid: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers or resends PayIn success notifications (WhatsApp & Email) for a transaction.
    Uses official WhatsApp template payin_wallet_topup_notification (2039975033358041)
    and receipt verification link https://receipt.sathus.in/r/{tid}.
    """
    stmt = select(PayinTransactionModel).where(
        or_(
            PayinTransactionModel.tid == tid,
            PayinTransactionModel.merchant_ref_id == tid,
            PayinTransactionModel.provider_ref_id == tid
        )
    )
    res = await db.execute(stmt)
    txn = res.scalars().first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    ret_obj = None
    if txn.retailer_ref_id:
        from app.infrastructure.db.models import RetailerModel
        ret_stmt = select(RetailerModel).where(RetailerModel.retailer_ref_id == txn.retailer_ref_id)
        ret_obj = (await db.execute(ret_stmt)).scalars().first()

    results = await PayInService.dispatch_payin_success_notifications(
        db=db,
        txn=txn,
        ret_obj=ret_obj
    )
    return {
        "success": True,
        "tid": txn.tid,
        "results": results
    }

