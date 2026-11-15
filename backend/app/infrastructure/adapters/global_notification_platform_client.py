"""
Sathus Global Notification Platform Client Adapter
===================================================
Centralized, multi-company, multi-domain notification client connecting Pay2Pay,
SMSPAY, and Near4You to the Sathus Notification Platform (mail.sathus.in & Meta WhatsApp).

Features:
- Dynamic Project & Domain Resolution (SMSPAY, Near4You, Pay2Pay)
- DKIM & SPF Compliant Sender Identity (donotreply@{verified_domain})
- Dynamic Responsive Branded Email Templates & Base64 PDF Attachments
- Approved Meta WhatsApp Templates (ss_auth_otp_v1, txn_status, topup_request_admin, topup_status_retailer)
- Resilient non-blocking fallback to local services if platform is unreachable
"""

import os
import uuid
import base64
import logging
from typing import Dict, Any, Optional, Union, List

import httpx
from sathus_notification.client import SathusNotificationClient
from app.core.config import settings

logger = logging.getLogger("global_notification_platform")

# Company Metadata Presets
COMPANY_CONFIGS = {
    "PAY2PAY": {
        "project_code": "PAY2PAY",
        "name": "Pay2Pay Enterprise Platform",
        "domain": "pay2pay.in",
        "sender_email": "donotreply@pay2pay.in",
        "sender_name": "Pay2Pay Enterprise",
        "primary_color": "#2563EB",
        "api_key_attr": "NOTIFICATION_PLATFORM_API_KEY_PAY2PAY",
        "default_key": "snk_pay2pay_dAU78TfCYeD-cE9YEFtPmVOGidLpf5ItmaKoGXPEsno",
    },
    "SMSPAY": {
        "project_code": "SMSPAY",
        "name": "SMSPAY Digital Payments",
        "domain": "smspay.store",
        "sender_email": "donotreply@smspay.store",
        "sender_name": "SMSPAY",
        "primary_color": "#059669",
        "api_key_attr": "NOTIFICATION_PLATFORM_API_KEY_SMSPAY",
        "default_key": "snk_smspay_7iCbkmylRX0nOJyAteGKfG2Sl_OeezwWhZjGFAaQl_I",
    },
    "NEAR4YOU": {
        "project_code": "NEAR4YOU",
        "name": "Near4You Hyperlocal Retail",
        "domain": "near4you.store",
        "sender_email": "donotreply@near4you.store",
        "sender_name": "Near4You Platform",
        "primary_color": "#A20A3A",
        "api_key_attr": "NOTIFICATION_PLATFORM_API_KEY_NEAR4YOU",
        "default_key": "snk_near4you_kcX8KkGb8o872D66YndUWerbBG85k1CTKSHvkFituKw",
    },
}

class GlobalNotificationPlatformClient:
    """Enterprise centralized notification client with dynamic multi-tenant resolution."""

    def __init__(self):
        self.base_url = getattr(settings, "NOTIFICATION_PLATFORM_URL", "http://127.0.0.1:8150")
        self.enabled = getattr(settings, "NOTIFICATION_PLATFORM_ENABLED", True)

    def resolve_company_code(self, company_context: Any = None) -> str:
        """
        Dynamically resolves the company code ('PAY2PAY', 'SMSPAY', or 'NEAR4YOU')
        from string, integer company_ref_id, dict, or DB model.
        """
        if not company_context:
            return "PAY2PAY"

        # Check integer company_ref_id
        if isinstance(company_context, int):
            if company_context == 2:
                return "SMSPAY"
            if company_context == 1:
                return "NEAR4YOU"
            if company_context == 47:
                return "PAY2PAY"

        # Check string identifier
        if isinstance(company_context, str):
            clean = company_context.strip().upper()
            if "SMSPAY" in clean or "SMSPAY.STORE" in clean or "SMSPAY.IN" in clean:
                return "SMSPAY"
            if "NEAR4YOU" in clean or "NEAR 4 YOU" in clean or "NEAR4YOU.STORE" in clean:
                return "NEAR4YOU"
            if "PAY2PAY" in clean or "PAY2PAY.IN" in clean:
                return "PAY2PAY"
            # numeric string
            if clean == "2":
                return "SMSPAY"
            if clean == "1":
                return "NEAR4YOU"
            if clean == "47":
                return "PAY2PAY"

        # Check dictionary or model
        if isinstance(company_context, dict):
            code = str(company_context.get("company_code") or company_context.get("company_name") or company_context.get("domain") or "").upper()
            return self.resolve_company_code(code)

        # Check DB Model attributes
        for attr in ("company_code", "company_name", "website", "domain", "company_ref_id"):
            if hasattr(company_context, attr):
                val = getattr(company_context, attr)
                if val:
                    res = self.resolve_company_code(val)
                    if res != "PAY2PAY" or "PAY2PAY" in str(val).upper():
                        return res

        return "PAY2PAY"

    def get_client(self, company_context: Any = None) -> tuple[SathusNotificationClient, Dict[str, Any]]:
        """Instantiates or returns SathusNotificationClient for the resolved company."""
        code = self.resolve_company_code(company_context)
        cfg = COMPANY_CONFIGS.get(code, COMPANY_CONFIGS["PAY2PAY"])
        api_key = getattr(settings, cfg["api_key_attr"], None) or cfg["default_key"]
        client = SathusNotificationClient(api_key=api_key, base_url=self.base_url)
        return client, cfg

    # ── EMAIL DISPATCH METHODS ────────────────────────────────────────────────

    async def send_auth_otp_email(
        self,
        recipient_email: str,
        recipient_name: str,
        otp_code: str,
        valid_minutes: str = "10",
        company_context: Any = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches dynamic branded Auth OTP email via Sathus Notification Platform."""
        if not self.enabled:
            return {"status": "FALLBACK_REQUIRED", "reason": "Platform disabled"}

        client, cfg = self.get_client(company_context)
        logger.info(f"[NOTIF PLATFORM] Sending AUTH_OTP email to {recipient_email} as {cfg['project_code']}...")

        try:
            res = await client.send_event_async(
                event_type="AUTH_OTP",
                event_category="AUTH",
                channel="email",
                recipient_email=recipient_email,
                recipient_name=recipient_name or f"{cfg['name']} User",
                data={
                    "otp_code": otp_code,
                    "valid_minutes": valid_minutes,
                    "company_name": cfg["name"],
                    "project_code": cfg["project_code"],
                },
                idempotency_key=idempotency_key or f"otp_{recipient_email}_{otp_code}",
                timeout=8.0
            )
            return {
                "status": "SUCCESS",
                "delivered": True,
                "provider": "SATHUS_NOTIFICATION_PLATFORM",
                "notification_id": res.get("notification_id"),
                "project_code": cfg["project_code"],
                "sender": cfg["sender_email"],
                "recipient": recipient_email,
                "data": res
            }
        except Exception as e:
            logger.warning(f"[NOTIF PLATFORM EMAIL OTP NOTICE] Delivery to {recipient_email} encountered error: {e}. Falling back to local SMTP.")
            return {"status": "FALLBACK_REQUIRED", "detail": str(e)}

    async def send_password_reset_email(
        self,
        recipient_email: str,
        recipient_name: str,
        reset_link: str,
        company_context: Any = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches dynamic branded Password Reset email via Sathus Notification Platform."""
        if not self.enabled:
            return {"status": "FALLBACK_REQUIRED", "reason": "Platform disabled"}

        client, cfg = self.get_client(company_context)
        logger.info(f"[NOTIF PLATFORM] Sending PASSWORD_RESET email to {recipient_email} as {cfg['project_code']}...")

        try:
            res = await client.send_event_async(
                event_type="PASSWORD_RESET",
                event_category="AUTH",
                channel="email",
                recipient_email=recipient_email,
                recipient_name=recipient_name or f"{cfg['name']} User",
                data={
                    "reset_link": reset_link,
                    "company_name": cfg["name"],
                    "project_code": cfg["project_code"],
                },
                idempotency_key=idempotency_key or f"pwd_reset_{recipient_email}_{uuid.uuid4().hex[:8]}",
                timeout=8.0
            )
            return {
                "status": "SUCCESS",
                "delivered": True,
                "provider": "SATHUS_NOTIFICATION_PLATFORM",
                "notification_id": res.get("notification_id"),
                "project_code": cfg["project_code"],
                "sender": cfg["sender_email"],
                "recipient": recipient_email,
                "data": res
            }
        except Exception as e:
            logger.warning(f"[NOTIF PLATFORM PWD RESET NOTICE] Delivery to {recipient_email} encountered error: {e}. Falling back to local SMTP.")
            return {"status": "FALLBACK_REQUIRED", "detail": str(e)}

    async def send_statement_email(
        self,
        recipient_email: str,
        recipient_name: str,
        statement_date: str,
        opening_balance: float,
        total_credit: float,
        total_debit: float,
        closing_balance: float,
        pdf_bytes: bytes,
        filename: Optional[str] = None,
        password_hint: Optional[str] = None,
        company_context: Any = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches dynamic branded daily account statement with PDF attachment via platform."""
        if not self.enabled:
            return {"status": "FALLBACK_REQUIRED", "reason": "Platform disabled"}

        client, cfg = self.get_client(company_context)
        file_name = filename or f"{cfg['project_code']}_Statement_{statement_date}.pdf"
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8") if pdf_bytes else None

        attachments = []
        if pdf_b64:
            attachments.append({
                "filename": file_name,
                "content_base64": pdf_b64,
                "content_type": "application/pdf"
            })

        logger.info(f"[NOTIF PLATFORM] Sending ACCOUNT_STATEMENT email to {recipient_email} as {cfg['project_code']}...")

        try:
            res = await client.send_event_async(
                event_type="ACCOUNT_STATEMENT",
                event_category="FINANCIAL",
                channel="email",
                recipient_email=recipient_email,
                recipient_name=recipient_name or "Retailer",
                title=f"{cfg['name']} Daily Account Statement",
                data={
                    "statement_date": statement_date,
                    "opening_balance": opening_balance,
                    "total_credit": total_credit,
                    "total_debit": total_debit,
                    "closing_balance": closing_balance,
                    "password_hint": password_hint or "PAN Number in UPPERCASE",
                    "company_name": cfg["name"],
                    "project_code": cfg["project_code"],
                },
                attachments=attachments,
                idempotency_key=idempotency_key or f"stmt_{recipient_email}_{statement_date}",
                timeout=12.0
            )
            return {
                "status": "SUCCESS",
                "delivered": True,
                "provider": "SATHUS_NOTIFICATION_PLATFORM",
                "notification_id": res.get("notification_id"),
                "project_code": cfg["project_code"],
                "sender": cfg["sender_email"],
                "recipient": recipient_email,
                "data": res
            }
        except Exception as e:
            logger.warning(f"[NOTIF PLATFORM STATEMENT NOTICE] Delivery to {recipient_email} encountered error: {e}. Falling back to local SMTP.")
            return {"status": "FALLBACK_REQUIRED", "detail": str(e)}

    # ── WHATSAPP DISPATCH METHODS ─────────────────────────────────────────────

    async def send_auth_otp_whatsapp(
        self,
        mobile_number: str,
        otp_code: str,
        company_context: Any = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches WhatsApp Authentication OTP using official Meta template (ss_auth_otp_v1)."""
        if not self.enabled:
            return {"status": "FALLBACK_REQUIRED", "reason": "Platform disabled"}

        client, cfg = self.get_client(company_context)
        clean_mobile = "".join(filter(str.isdigit, str(mobile_number)))
        formatted_mobile = f"+91{clean_mobile[-10:]}" if len(clean_mobile) >= 10 else f"+91{clean_mobile}"

        logger.info(f"[NOTIF PLATFORM] Sending WhatsApp OTP to {formatted_mobile} as {cfg['project_code']}...")

        try:
            res = await client.send_async(
                channel="whatsapp",
                recipient_phone=formatted_mobile,
                template_code="ss_auth_otp_v1",
                variables={"otp_code": otp_code},
                idempotency_key=idempotency_key or f"wa_otp_{clean_mobile}_{otp_code}",
                timeout=8.0
            )
            return {
                "status": "SUCCESS",
                "delivered": True,
                "provider": "SATHUS_NOTIFICATION_PLATFORM",
                "notification_id": res.get("notification_id"),
                "project_code": cfg["project_code"],
                "recipient": formatted_mobile,
                "data": res
            }
        except Exception as e:
            logger.warning(f"[NOTIF PLATFORM WA OTP NOTICE] Delivery to {formatted_mobile} encountered error: {e}. Falling back to Meta API.")
            return {"status": "FALLBACK_REQUIRED", "detail": str(e)}

    async def send_payout_status_whatsapp(
        self,
        mobile_number: str,
        customer_name: str,
        amount: float,
        transaction_id: str,
        date_time_str: str,
        status: str,
        receipt_token: str,
        company_context: Any = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches WhatsApp Payout Status using official Meta template (txn_status)."""
        if not self.enabled:
            return {"status": "FALLBACK_REQUIRED", "reason": "Platform disabled"}

        client, cfg = self.get_client(company_context)
        clean_mobile = "".join(filter(str.isdigit, str(mobile_number)))
        formatted_mobile = f"+91{clean_mobile[-10:]}" if len(clean_mobile) >= 10 else f"+91{clean_mobile}"

        logger.info(f"[NOTIF PLATFORM] Sending WhatsApp Payout Status to {formatted_mobile} ({transaction_id}) as {cfg['project_code']}...")

        try:
            res = await client.send_async(
                channel="whatsapp",
                recipient_phone=formatted_mobile,
                template_code="txn_status",
                variables={
                    "customer_name": customer_name,
                    "amount": f"{amount:.2f}",
                    "transaction_id": transaction_id,
                    "date_time": date_time_str,
                    "status": status,
                    "receipt_token": receipt_token
                },
                idempotency_key=idempotency_key or f"wa_txn_{transaction_id}_{status}",
                timeout=8.0
            )
            return {
                "status": "SUCCESS",
                "delivered": True,
                "provider": "SATHUS_NOTIFICATION_PLATFORM",
                "notification_id": res.get("notification_id"),
                "project_code": cfg["project_code"],
                "recipient": formatted_mobile,
                "receipt_url": f"https://receipt.{cfg['domain']}/r/{receipt_token}",
                "data": res
            }
        except Exception as e:
            logger.warning(f"[NOTIF PLATFORM WA TXN NOTICE] Delivery to {formatted_mobile} encountered error: {e}. Falling back to Meta API.")
            return {"status": "FALLBACK_REQUIRED", "detail": str(e)}

    async def send_topup_alert_whatsapp(
        self,
        mobile_number: str,
        retailer_name: str,
        retailer_id: str,
        request_id: str,
        amount: float,
        payment_mode: str,
        requested_at: str,
        status: str,
        view_id: str,
        is_admin: bool = False,
        company_context: Any = None,
        idempotency_key: Optional[str] = None,
        extra_variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Dispatches WhatsApp Top-up Alert using Meta template (topup_request_admin or topup_status_retailer)."""
        if not self.enabled:
            return {"status": "FALLBACK_REQUIRED", "reason": "Platform disabled"}

        client, cfg = self.get_client(company_context)
        clean_mobile = "".join(filter(str.isdigit, str(mobile_number)))
        formatted_mobile = f"+91{clean_mobile[-10:]}" if len(clean_mobile) >= 10 else f"+91{clean_mobile}"
        template_name = "topup_request_admin" if is_admin else "topup_status_retailer"

        logger.info(f"[NOTIF PLATFORM] Sending WhatsApp Topup Alert ({template_name}) to {formatted_mobile} as {cfg['project_code']}...")

        if is_admin:
            variables = {
                "retailer_name": retailer_name,
                "retailer_id": retailer_id,
                "request_id": request_id,
                "amount": f"{amount:.2f}",
                "payment_mode": payment_mode,
                "requested_at": requested_at,
                "status": status,
                "view_id": view_id
            }
        else:
            extra = extra_variables or {}
            variables = {
                "retailer_name": retailer_name,
                "request_id": request_id,
                "amount_requested": str(extra.get("amount_requested") or f"{amount:.2f}"),
                "approved_amount": str(extra.get("approved_amount") or f"{amount:.2f}"),
                "wallet_credit": str(extra.get("wallet_credit") or f"{amount:.2f}"),
                "payment_mode": payment_mode,
                "transaction_id": str(extra.get("transaction_id") or request_id),
                "approved_at": str(extra.get("approved_at") or requested_at),
                "status": status,
                "view_id": view_id
            }

        try:
            res = await client.send_async(
                channel="whatsapp",
                recipient_phone=formatted_mobile,
                template_code=template_name,
                variables=variables,
                idempotency_key=idempotency_key or f"wa_topup_{request_id}_{status}",
                timeout=8.0
            )
            return {
                "status": "SUCCESS",
                "delivered": True,
                "provider": "SATHUS_NOTIFICATION_PLATFORM",
                "notification_id": res.get("notification_id"),
                "project_code": cfg["project_code"],
                "recipient": formatted_mobile,
                "data": res
            }
        except Exception as e:
            logger.warning(f"[NOTIF PLATFORM TOPUP WA NOTICE] Delivery to {formatted_mobile} encountered error: {e}. Falling back to Meta API.")
            return {"status": "FALLBACK_REQUIRED", "detail": str(e)}

# Global Singleton Instance
global_notification_platform_client = GlobalNotificationPlatformClient()
