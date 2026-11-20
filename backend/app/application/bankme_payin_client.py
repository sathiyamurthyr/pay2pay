"""
Official BankMe PayIn API Client.
Handles secure API communication with BankMe payment gateway.
Adheres strictly to BankMe Developer Documentation: https://bankme.co.in/developers.html

Endpoints:
- POST /v1/payin/orders          (Create a payment collection order)
- GET  /v1/payin/orders/{refId}  (Fetch payment status by referenceId/TID)
- Headers: x-api-key: pk_..., x-api-secret: sk_...
"""

import os
import re
import time
import logging
import httpx
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.payin_models import PayinApiLogModel
from app.core.company_resolver import resolve_return_base_url

logger = logging.getLogger("bankme_payin_client")


def mask_sensitive_headers(headers: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive authentication headers like API keys and secrets in audit logs."""
    masked = {}
    for k, v in headers.items():
        k_lower = k.lower()
        if any(secret_word in k_lower for secret_word in ["key", "secret", "auth", "token", "password"]):
            if isinstance(v, str) and len(v) > 8:
                masked[k] = f"{v[:4]}****{v[-4:]}"
            else:
                masked[k] = "********"
        else:
            masked[k] = v
    return masked


def mask_sensitive_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive customer and credential fields in payloads for audit logs."""
    if not isinstance(data, dict):
        return data
    masked = dict(data)
    for k in ["api_key", "secretKey", "secret_key", "token", "key", "x-api-secret", "x-api-key", "authkey"]:
        if k in masked and isinstance(masked[k], str):
            masked[k] = f"{masked[k][:4]}****{masked[k][-4:]}" if len(masked[k]) > 8 else "********"
    for k in ["customer_mobile", "mobile", "phone"]:
        if k in masked and isinstance(masked[k], str):
            masked[k] = f"XXXXXX{masked[k][-4:]}" if len(masked[k]) >= 4 else "XXXX"
    for k in ["customer_email", "email"]:
        if k in masked and isinstance(masked[k], str) and "@" in masked[k]:
            parts = masked[k].split("@")
            masked[k] = f"{parts[0][:2]}***@{parts[1]}"
    if "customer" in masked and isinstance(masked["customer"], dict):
        masked["customer"] = mask_sensitive_payload(masked["customer"])
    return masked


async def record_payin_api_audit_log(
    tid: str,
    company_ref_id: int,
    retailer_ref_id: Optional[int],
    vendor_ref_id: Optional[int],
    vendor_name: str,
    api_type: str,
    endpoint: str,
    http_method: str,
    req_headers: Dict[str, Any],
    req_payload: Optional[Dict[str, Any]],
    res_status_code: Optional[int],
    res_payload: Optional[Any],
    execution_duration_ms: float,
    vendor_order_id: Optional[str] = None,
    vendor_reference_id: Optional[str] = None,
    vendor_status: Optional[str] = None,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
    environment: str = "sandbox"
) -> None:
    """Safely persist vendor API transaction audit log into public.payin_api_logs."""
    try:
        async with AsyncSessionLocal() as session:
            log_entry = PayinApiLogModel(
                tid=tid,
                company_ref_id=company_ref_id,
                retailer_ref_id=retailer_ref_id,
                vendor_ref_id=vendor_ref_id or 1,
                vendor_name=vendor_name,
                api_type=api_type,
                endpoint=endpoint,
                http_method=http_method,
                req_headers=mask_sensitive_headers(req_headers),
                req_payload=mask_sensitive_payload(req_payload) if req_payload else None,
                res_status_code=res_status_code,
                res_payload=mask_sensitive_payload(res_payload) if isinstance(res_payload, dict) else res_payload,
                execution_duration_ms=round(execution_duration_ms, 2),
                vendor_order_id=vendor_order_id,
                vendor_reference_id=vendor_reference_id or tid,
                vendor_status=vendor_status,
                error_code=error_code,
                error_message=error_message,
                environment=environment
            )
            session.add(log_entry)
            await session.commit()
            logger.info("Persisted payin_api_log: TID=%s, API=%s, Status=%s", tid, api_type, res_status_code)
    except Exception as ex:
        logger.error("Failed to record payin_api_log for TID %s: %s", tid, ex)


class BankMePayInClient:
    """Official BankMe PayIn HTTP Client implementation."""

    @classmethod
    def get_credentials(cls) -> Tuple[str, str, str, str]:
        """
        Resolves active BankMe API Key ID, Secret, Webhook Secret, and Base URL.
        Conforms with https://bankme.co.in/developers.html
        """
        key_id = (
            getattr(settings, "SMSPAY_PAYIN_KEY", None)
            or getattr(settings, "BANKME_PAYIN_API_KEY_ID", None)
            or "pk_8bcb535627250637"
        )
        secret = (
            getattr(settings, "SMSPAY_PAYIN_AUTHKEY", None)
            or getattr(settings, "BANKME_PAYIN_API_SECRET", None)
            or getattr(settings, "BANKME_PAYIN_API_KEY", "sk_70c79e7ddb7b9f1adda195b0d9f9e6bd3e2343d7c99e9df7")
        )
        webhook_secret = getattr(settings, "BANKME_PAYIN_WEBHOOK_SECRET", secret)
        base_url = (getattr(settings, "BANKME_PAYIN_BASE_URL", "https://api.bankme.co.in") or "https://api.bankme.co.in").rstrip("/")
        return key_id, secret, webhook_secret, base_url

    @classmethod
    async def create_payin_order(
        cls,
        tid: str,
        amount: float,
        customer_name: str,
        customer_mobile: str,
        customer_email: Optional[str] = None,
        reference_id: Optional[str] = None,
        callback_url: Optional[str] = None,
        return_url: Optional[str] = None,
        payment_mode: str = "UPI",
        note: Optional[str] = None,
        company_ref_id: int = 2,
        retailer_ref_id: Optional[int] = None,
        vendor_ref_id: int = 1
    ) -> Dict[str, Any]:
        """
        Creates a PayIn order with BankMe API: POST /v1/payin/orders.
        Sends our authoritative TID as referenceId (idempotency key).
        Returns BankMe orderId, hosted paymentUrl, and status.
        Audit logs every outbound request and inbound response to payin_api_logs.
        """
        key_id, secret, _, base_url = cls.get_credentials()
        endpoint = f"{base_url}/v1/payin/orders"

        # Sanitize Indian 10-digit mobile number per BankMe specification
        raw_digits = re.sub(r"\D", "", str(customer_mobile or ""))
        clean_mobile = raw_digits[-10:] if len(raw_digits) >= 10 else "9876543210"

        # Resolve return URL dynamically using verified company domain
        if return_url and return_url.startswith("http"):
            valid_redirect_url = return_url
        elif callback_url and callback_url.startswith("http") and not callback_url.endswith("/api/v1/payin/callback") and not callback_url.endswith("/api/v1/payin/webhook/bankme"):
            valid_redirect_url = callback_url
        else:
            configured_base = getattr(settings, "BANKME_PAYIN_REDIRECT_BASE_URL", "")
            if configured_base and configured_base.startswith("http"):
                base_domain = configured_base.rstrip("/")
            else:
                base_domain = resolve_return_base_url(company_ref_id=company_ref_id)
            valid_redirect_url = f"{base_domain}/retailer/payin/status?referenceId={tid}"

        # Authoritative TID as BankMe referenceId (guarantees idempotency and unified status lookup)
        ref_id = tid
        payload = {
            "referenceId": ref_id,
            "amount": float(amount),
            "customer": {
                "name": (customer_name or "Retailer Customer")[:60],
                "mobile": clean_mobile
            },
            "redirectUrl": valid_redirect_url,
            "note": (note or f"PayIn {tid}")[:80]
        }

        headers = {
            "x-api-key": key_id,
            "x-api-secret": secret,
            "authkey": secret,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        logger.info(
            "Dispatching real BankMe PayIn initiation: TID=%s, Amount=%.2f, Endpoint=%s",
            tid, amount, endpoint
        )

        start_time = time.perf_counter()
        resp_status = None
        resp_data = None
        error_code = None
        error_msg = None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(endpoint, json=payload, headers=headers)
                duration_ms = (time.perf_counter() - start_time) * 1000
                resp_status = resp.status_code

                try:
                    resp_data = resp.json()
                except Exception:
                    resp_data = {"text": resp.text}

                if resp_status in (200, 201) and isinstance(resp_data, dict) and resp_data.get("success", False):
                    order = resp_data.get("order") if isinstance(resp_data.get("order"), dict) else resp_data
                    order_id = order.get("orderId") or resp_data.get("orderId")
                    payment_url = order.get("paymentUrl") or resp_data.get("paymentUrl")
                    vendor_status = (order.get("status") or resp_data.get("status") or "PENDING").upper()
                    env = resp_data.get("environment") or order.get("environment") or "sandbox"
                    fee = float(order.get("fee") or 0.0)
                    net_amount = float(order.get("netAmount") or amount)

                    # Record successful API audit log
                    await record_payin_api_audit_log(
                        tid=tid,
                        company_ref_id=company_ref_id,
                        retailer_ref_id=retailer_ref_id,
                        vendor_ref_id=vendor_ref_id,
                        vendor_name="BANKME",
                        api_type="CREATE_ORDER",
                        endpoint=endpoint,
                        http_method="POST",
                        req_headers=headers,
                        req_payload=payload,
                        res_status_code=resp_status,
                        res_payload=resp_data,
                        execution_duration_ms=duration_ms,
                        vendor_order_id=order_id,
                        vendor_reference_id=ref_id,
                        vendor_status=vendor_status,
                        environment=env
                    )

                    logger.info("BankMe live PayIn success: TID=%s, OrderId=%s, PaymentUrl=%s", tid, order_id, payment_url)
                    return {
                        "success": True,
                        "status": vendor_status,
                        "bankme_ref": order_id,
                        "order_id": order_id,
                        "payment_url": payment_url,
                        "qr_string": order.get("qr_string") or resp_data.get("qr_string"),
                        "qr_code_url": order.get("qr_code_url") or resp_data.get("qr_code_url"),
                        "fee": fee,
                        "net_amount": net_amount,
                        "environment": env,
                        "raw_response": resp_data
                    }
                else:
                    error_code = resp_data.get("code") if isinstance(resp_data, dict) else f"HTTP_{resp_status}"
                    error_msg = resp_data.get("message") if isinstance(resp_data, dict) else str(resp_data)
                    logger.warning("BankMe PayIn API returned error HTTP %d: %s", resp_status, error_msg)

                    await record_payin_api_audit_log(
                        tid=tid,
                        company_ref_id=company_ref_id,
                        retailer_ref_id=retailer_ref_id,
                        vendor_ref_id=vendor_ref_id,
                        vendor_name="BANKME",
                        api_type="CREATE_ORDER",
                        endpoint=endpoint,
                        http_method="POST",
                        req_headers=headers,
                        req_payload=payload,
                        res_status_code=resp_status,
                        res_payload=resp_data,
                        execution_duration_ms=duration_ms,
                        vendor_reference_id=ref_id,
                        error_code=str(error_code),
                        error_message=str(error_msg),
                        environment="sandbox"
                    )

                    return {
                        "success": False,
                        "status": "FAILED",
                        "message": f"BankMe API error ({error_code}): {error_msg}",
                        "error_code": error_code,
                        "raw_response": resp_data
                    }

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            error_code = type(exc).__name__
            error_msg = str(exc)
            logger.error("BankMe live call failed: %s", exc)

            await record_payin_api_audit_log(
                tid=tid,
                company_ref_id=company_ref_id,
                retailer_ref_id=retailer_ref_id,
                vendor_ref_id=vendor_ref_id,
                vendor_name="BANKME",
                api_type="CREATE_ORDER",
                endpoint=endpoint,
                http_method="POST",
                req_headers=headers,
                req_payload=payload,
                res_status_code=resp_status or 0,
                res_payload=resp_data or {"error": error_msg},
                execution_duration_ms=duration_ms,
                vendor_reference_id=ref_id,
                error_code=error_code,
                error_message=error_msg,
                environment="sandbox"
            )

            return {
                "success": False,
                "status": "FAILED",
                "message": f"BankMe connection failure: {error_msg}",
                "error_code": error_code,
                "raw_response": {"error": error_msg}
            }

    @classmethod
    async def check_order_status(
        cls,
        tid: str,
        bankme_ref: Optional[str] = None,
        reference_id: Optional[str] = None,
        company_ref_id: int = 2,
        retailer_ref_id: Optional[int] = None,
        vendor_ref_id: int = 1
    ) -> Dict[str, Any]:
        """
        Inquires payment status from BankMe API: GET /v1/payin/orders/{referenceId}.
        BankMe official status endpoint fetches by merchant referenceId (our TID).
        Audit logs the status check request/response to payin_api_logs.
        """
        key_id, secret, _, base_url = cls.get_credentials()
        lookup_ref = tid or reference_id
        endpoint = f"{base_url}/v1/payin/orders/{lookup_ref}"

        headers = {
            "x-api-key": key_id,
            "x-api-secret": secret,
            "Accept": "application/json"
        }

        start_time = time.perf_counter()
        resp_status = None
        resp_data = None
        error_code = None
        error_msg = None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(endpoint, headers=headers)
                duration_ms = (time.perf_counter() - start_time) * 1000
                resp_status = resp.status_code

                try:
                    resp_data = resp.json()
                except Exception:
                    resp_data = {"text": resp.text}

                if resp_status == 200 and isinstance(resp_data, dict):
                    order = resp_data.get("order") if isinstance(resp_data.get("order"), dict) else resp_data
                    raw_status = (order.get("status") or resp_data.get("status") or "").lower()
                    order_id = order.get("orderId") or resp_data.get("orderId") or bankme_ref
                    utr = order.get("utr") or resp_data.get("utr")
                    settlement_status = order.get("settlementStatus")
                    payment_method = order.get("paymentMethod")
                    env = resp_data.get("environment") or order.get("environment") or "sandbox"

                    mapped_status = "PENDING"
                    if raw_status in ("success", "settled"):
                        mapped_status = "SUCCESS"
                    elif raw_status in ("failed", "expired", "cancelled"):
                        mapped_status = "FAILED"

                    await record_payin_api_audit_log(
                        tid=tid,
                        company_ref_id=company_ref_id,
                        retailer_ref_id=retailer_ref_id,
                        vendor_ref_id=vendor_ref_id,
                        vendor_name="BANKME",
                        api_type="CHECK_STATUS",
                        endpoint=endpoint,
                        http_method="GET",
                        req_headers=headers,
                        req_payload={"referenceId": tid},
                        res_status_code=resp_status,
                        res_payload=resp_data,
                        execution_duration_ms=duration_ms,
                        vendor_order_id=order_id,
                        vendor_reference_id=tid,
                        vendor_status=mapped_status,
                        environment=env
                    )

                    return {
                        "success": True,
                        "status": mapped_status,
                        "tid": order.get("referenceId") or resp_data.get("referenceId") or tid,
                        "bankme_ref": order_id,
                        "utr": utr,
                        "amount": order.get("amount") or resp_data.get("amount"),
                        "net_amount": order.get("netAmount") or resp_data.get("netAmount"),
                        "fee": order.get("fee") or resp_data.get("fee"),
                        "reason": order.get("reason"),
                        "settlement_status": settlement_status,
                        "payment_method": payment_method,
                        "environment": env,
                        "raw_response": resp_data
                    }
                else:
                    error_code = resp_data.get("code") if isinstance(resp_data, dict) else f"HTTP_{resp_status}"
                    error_msg = resp_data.get("message") if isinstance(resp_data, dict) else str(resp_data)

                    await record_payin_api_audit_log(
                        tid=tid,
                        company_ref_id=company_ref_id,
                        retailer_ref_id=retailer_ref_id,
                        vendor_ref_id=vendor_ref_id,
                        vendor_name="BANKME",
                        api_type="CHECK_STATUS",
                        endpoint=endpoint,
                        http_method="GET",
                        req_headers=headers,
                        req_payload={"referenceId": tid},
                        res_status_code=resp_status,
                        res_payload=resp_data,
                        execution_duration_ms=duration_ms,
                        vendor_reference_id=tid,
                        error_code=str(error_code),
                        error_message=str(error_msg),
                        environment="sandbox"
                    )

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            error_code = type(exc).__name__
            error_msg = str(exc)
            logger.warning("BankMe status inquiry failed: %s", exc)

            await record_payin_api_audit_log(
                tid=tid,
                company_ref_id=company_ref_id,
                retailer_ref_id=retailer_ref_id,
                vendor_ref_id=vendor_ref_id,
                vendor_name="BANKME",
                api_type="CHECK_STATUS",
                endpoint=endpoint,
                http_method="GET",
                req_headers=headers,
                req_payload={"referenceId": tid},
                res_status_code=resp_status or 0,
                res_payload=resp_data or {"error": error_msg},
                execution_duration_ms=duration_ms,
                vendor_reference_id=tid,
                error_code=error_code,
                error_message=error_msg,
                environment="sandbox"
            )

        return {
            "success": False,
            "status": "PENDING",
            "tid": tid,
            "bankme_ref": bankme_ref,
            "error_code": error_code,
            "message": error_msg or "Status inquiry received"
        }
