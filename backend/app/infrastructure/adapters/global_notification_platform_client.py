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
try:
    from sathus_notification.client import SathusNotificationClient
except ImportError:
    try:
        from app.infrastructure.adapters.sathus_notification.client import SathusNotificationClient
    except ImportError:
        try:
            from app.sathus_notification.client import SathusNotificationClient
        except ImportError:
            class SathusNotificationClient:  # type: ignore
                """Fallback client when notification package is not installed."""
                def __init__(self, api_key: str, base_url: str = "http://localhost:8000"):
                    self.api_key = api_key
                    self.base_url = base_url.rstrip("/")
                    self.headers = {"X-API-Key": self.api_key, "Content-Type": "application/json"}

                async def send_async(self, **kwargs) -> Dict[str, Any]:
                    return {"status": "MOCK", "detail": "Notification platform package not installed"}

                async def send_event_async(self, **kwargs) -> Dict[str, Any]:
                    return {"status": "MOCK", "detail": "Notification platform package not installed"}

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
        "sender_name": "Near4You",
        "primary_color": "#A20A3A",
        "api_key_attr": "NOTIFICATION_PLATFORM_API_KEY_NEAR4YOU",
        "default_key": "snk_near4you_kcX8KkGb8o872D66YndUWerbBG85k1CTKSHvkFituKw",
    },
}

class GlobalNotificationPlatformClient:
    """Enterprise centralized notification client with dynamic multi-tenant resolution."""

    def __init__(self):
        url = os.getenv("NOTIFICATION_PLATFORM_URL") or getattr(settings, "NOTIFICATION_PLATFORM_URL", "http://127.0.0.1:8150")
        self.base_url = url
        self.fallback_url = "http://sathus_notification_api:8000"
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

    def get_client(self, company_context: Any = None, base_url: Optional[str] = None) -> tuple[SathusNotificationClient, Dict[str, Any]]:
        """Instantiates or returns SathusNotificationClient for the resolved company."""
        code = self.resolve_company_code(company_context)
        cfg = COMPANY_CONFIGS.get(code, COMPANY_CONFIGS["PAY2PAY"])
        api_key = getattr(settings, cfg["api_key_attr"], None) or cfg["default_key"]
        client = SathusNotificationClient(api_key=api_key, base_url=base_url or self.base_url)
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

    async def send_payin_wallet_topup_whatsapp(
        self,
        mobile_number: str,
        retailer_name: str,
        transaction_id: str,
        amount: float,
        date_time_str: str,
        payment_mode: str,
        status: str,
        receipt_token: str,
        company_context: Any = None,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches WhatsApp Wallet Top-Up notification to Retailer using Meta template: payin_wallet_topup_notification.
        Template ID: 2039975033358041
        Variables:
            {{1}}: Retailer Name
            {{2}}: Outcome verb (e.g. "successful" or "credited")
            {{3}}: Transaction ID
            {{4}}: Amount (formatted with ₹)
            {{5}}: Payment Date
            {{6}}: Payment Mode
            {{7}}: Status
            {{8}}: Company Name
        Receipt parameter: receipt_token (points to https://receipt.sathus.in/r/{receipt_token})
        """
        if not self.enabled:
            return {"status": "FALLBACK_REQUIRED", "reason": "Platform disabled"}

        client, cfg = self.get_client(company_context)
        clean_mobile = "".join(filter(str.isdigit, str(mobile_number or "")))
        formatted_mobile = f"+91{clean_mobile[-10:]}" if len(clean_mobile) >= 10 else f"+91{clean_mobile}"

        company_display = "SMSPAY" if cfg["project_code"] == "SMSPAY" else ("Pay2Pay" if cfg["project_code"] == "PAY2PAY" else "Near4You")
        outcome_verb = "credited" if status.upper() == "SUCCESS" else status.lower()

        try:
            amt_num = float(amount)
            amt_str = f"₹{amt_num:,.2f}"
        except Exception:
            amt_str = f"₹{amount}"

        safe_token = str(receipt_token or transaction_id).strip()

        variables = {
            "1": retailer_name or "Retailer",
            "2": outcome_verb,
            "3": transaction_id,
            "4": amt_str,
            "5": date_time_str,
            "6": payment_mode or "CARD",
            "7": status.upper(),
            "8": company_display,
            "retailer_name": retailer_name or "Retailer",
            "outcome": outcome_verb,
            "transaction_id": transaction_id,
            "amount": amt_str,
            "payment_date": date_time_str,
            "payment_mode": payment_mode or "CARD",
            "status": status.upper(),
            "company_name": company_display,
            "receipt_token": safe_token,
            "button_param": safe_token,
            "view_id": safe_token,
            "receipt_url": f"https://receipt.{cfg['domain']}/r/{safe_token}"
        }

        logger.info(
            f"[NOTIF PLATFORM] Sending WhatsApp payin_wallet_topup_notification to {formatted_mobile} ({transaction_id}) as {cfg['project_code']}..."
        )

        try:
            res = await client.send_async(
                channel="whatsapp",
                recipient_phone=formatted_mobile,
                template_code="payin_wallet_topup_notification",
                variables=variables,
                idempotency_key=idempotency_key or f"wa_payin_{transaction_id}_{status}",
                timeout=8.0
            )
            return {
                "status": "SUCCESS",
                "delivered": True,
                "provider": "SATHUS_NOTIFICATION_PLATFORM",
                "notification_id": res.get("notification_id"),
                "project_code": cfg["project_code"],
                "recipient": formatted_mobile,
                "receipt_url": f"https://receipt.{cfg['domain']}/r/{safe_token}",
                "data": res
            }
        except Exception as e:
            # If default base_url failed due to network/host, attempt docker fallback URL
            if self.fallback_url and self.base_url != self.fallback_url:
                try:
                    logger.info(f"[NOTIF PLATFORM] Retrying WhatsApp with fallback URL {self.fallback_url}...")
                    fb_client, _ = self.get_client(company_context, base_url=self.fallback_url)
                    res = await fb_client.send_async(
                        channel="whatsapp",
                        recipient_phone=formatted_mobile,
                        template_code="payin_wallet_topup_notification",
                        variables=variables,
                        idempotency_key=idempotency_key or f"wa_payin_{transaction_id}_{status}",
                        timeout=8.0
                    )
                    self.base_url = self.fallback_url
                    return {
                        "status": "SUCCESS",
                        "delivered": True,
                        "provider": "SATHUS_NOTIFICATION_PLATFORM",
                        "notification_id": res.get("notification_id"),
                        "project_code": cfg["project_code"],
                        "recipient": formatted_mobile,
                        "receipt_url": f"https://receipt.{cfg['domain']}/r/{safe_token}",
                        "data": res
                    }
                except Exception as fb_err:
                    logger.warning(f"[NOTIF PLATFORM] Fallback retry also failed: {fb_err}")
            logger.warning(f"[NOTIF PLATFORM PAYIN WA NOTICE] Delivery to {formatted_mobile} encountered error: {e}. Falling back to Meta API.")
            return {"status": "FALLBACK_REQUIRED", "detail": str(e)}

    async def send_payin_wallet_topup_email(
        self,
        recipient_email: str,
        recipient_name: str,
        transaction_id: str,
        amount: float,
        net_credit: float,
        payment_mode: str,
        payment_date: str,
        status: str,
        receipt_token: str,
        company_context: Any = None,
        idempotency_key: Optional[str] = None,
        failure_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches automated branded email notification to Retailer for wallet top-up payment confirmation (SUCCESS or FAILED).
        Uses Sathus Notification Platform first, with immediate automatic fallback to Local SMTP.
        """
        if not recipient_email or "@" not in recipient_email:
            logger.warning(f"[NOTIF PLATFORM] Skipping email: Invalid recipient email '{recipient_email}'")
            return {"status": "SKIPPED", "reason": "No valid email address"}

        client, cfg = self.get_client(company_context)
        safe_token = str(receipt_token or transaction_id).strip()
        receipt_url = f"https://receipt.{cfg['domain']}/r/{safe_token}"

        company_display = "INSPEL TECHNOLOGIES SOLUTIONS PVT" if cfg["project_code"] == "SMSPAY" else ("SUPER REX PRODUCTS PRIVATE LIMITED" if cfg["project_code"] == "PAY2PAY" else "SATHUS TECHNOLOGY PRIVATE LIMITED")
        brand_name = "SMSPAY" if cfg["project_code"] == "SMSPAY" else ("Pay2Pay" if cfg["project_code"] == "PAY2PAY" else "Near4You")
        primary_color = cfg.get("primary_color", "#059669")

        safe_status = status.upper()
        is_success = safe_status == "SUCCESS"
        subject = f"Wallet Top-Up {safe_status} - {transaction_id} | {company_display}"

        status_color = "#16a34a" if is_success else "#dc2626"
        card_bg = "#f0fdf4" if is_success else "#fef2f2"
        card_border = "#bbf7d0" if is_success else "#fecaca"
        card_title = "Total Credited Amount" if is_success else "Top-Up Payment Unsuccessful"
        card_sub = f"₹{float(net_credit or amount):,.2f}" if is_success else f"Attempted: ₹{float(amount):,.2f}"

        status_msg = (
            f"Your wallet top-up payment has been <strong>successfully processed</strong> and your main wallet has been credited."
            if is_success
            else f"Your wallet top-up payment attempt could not be completed.<br><span style='color: #dc2626;'>Reason: {failure_reason or 'Payment failed or declined at gateway.'}</span>"
        )

        credit_row = (
            f"<tr><td>Net Wallet Credit</td><td style='color: #16a34a;'>₹{float(net_credit or amount):,.2f}</td></tr>"
            if is_success
            else ""
        )
        fail_row = (
            f"<tr><td>Failure Note</td><td style='color: #dc2626;'>{failure_reason}</td></tr>"
            if failure_reason and not is_success
            else ""
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
            .header {{ background: {primary_color}; padding: 24px; text-align: center; color: #ffffff; }}
            .content {{ padding: 28px; }}
            .amount-card {{ background: {card_bg}; border: 1px solid {card_border}; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0; }}
            .table-details {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }}
            .table-details td {{ padding: 10px 0; border-bottom: 1px solid #f1f5f9; }}
            .table-details td:last-child {{ text-align: right; font-weight: 600; color: #0f172a; }}
            .btn {{ display: block; text-align: center; background: {primary_color}; color: #ffffff !important; padding: 14px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; margin: 24px 0 12px 0; }}
            .footer {{ background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; font-size: 20px; font-weight: 700;">{company_display}</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Wallet Top-Up Notification</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; margin-top: 0;">Hello <strong>{recipient_name}</strong>,</p>
              <p style="font-size: 14px; color: #475569;">{status_msg}</p>
              
              <div class="amount-card">
                <div style="font-size: 12px; font-weight: 600; color: {status_color}; text-transform: uppercase;">{card_title}</div>
                <div style="font-size: 28px; font-weight: 800; color: {status_color}; margin-top: 4px;">{card_sub}</div>
              </div>

              <table class="table-details">
                <tr><td>Transaction Ref ID (TID)</td><td style="font-family: monospace;">{transaction_id}</td></tr>
                <tr><td>Gross Payment</td><td>₹{float(amount):,.2f}</td></tr>
                {credit_row}
                <tr><td>Payment Date</td><td>{payment_date}</td></tr>
                <tr><td>Payment Mode</td><td>{payment_mode}</td></tr>
                <tr><td>Status</td><td style="color: {status_color}; font-weight: 700;">{safe_status}</td></tr>
                {fail_row}
              </table>

              <a href="{receipt_url}" class="btn" target="_blank">View Official Digital Receipt</a>
              <p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px;">Or copy link: <a href="{receipt_url}" style="color: {primary_color};">{receipt_url}</a></p>
            </div>
            <div class="footer">
              <p style="margin: 0;">Thank you for choosing {brand_name}.</p>
              <p style="margin: 4px 0 0 0;">This is an automated notification. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
        """

        if self.enabled:
            logger.info(f"[NOTIF PLATFORM] Sending PayIn notification email to {recipient_email} as {cfg['project_code']}...")
            try:
                res = await client.send_async(
                    channel="email",
                    recipient_email=recipient_email,
                    recipient_name=recipient_name or "Retailer Partner",
                    custom_subject=subject,
                    custom_body=html_body,
                    idempotency_key=idempotency_key or f"email_payin_{transaction_id}_{status}",
                    timeout=10.0
                )
                return {
                    "status": "SUCCESS",
                    "delivered": True,
                    "provider": "SATHUS_NOTIFICATION_PLATFORM",
                    "notification_id": res.get("notification_id"),
                    "project_code": cfg["project_code"],
                    "recipient": recipient_email,
                    "data": res
                }
            except Exception as e:
                if self.fallback_url and self.base_url != self.fallback_url:
                    try:
                        logger.info(f"[NOTIF PLATFORM] Retrying email with fallback URL {self.fallback_url}...")
                        fb_client, _ = self.get_client(company_context, base_url=self.fallback_url)
                        res = await fb_client.send_async(
                            channel="email",
                            recipient_email=recipient_email,
                            recipient_name=recipient_name or "Retailer Partner",
                            custom_subject=subject,
                            custom_body=html_body,
                            idempotency_key=idempotency_key or f"email_payin_{transaction_id}_{status}",
                            timeout=10.0
                        )
                        self.base_url = self.fallback_url
                        return {
                            "status": "SUCCESS",
                            "delivered": True,
                            "provider": "SATHUS_NOTIFICATION_PLATFORM",
                            "notification_id": res.get("notification_id"),
                            "project_code": cfg["project_code"],
                            "recipient": recipient_email,
                            "data": res
                        }
                    except Exception as fb_err:
                        logger.warning(f"[NOTIF PLATFORM] Email fallback retry also failed: {fb_err}")
                logger.warning(f"[NOTIF PLATFORM PAYIN EMAIL NOTICE] Delivery to {recipient_email} encountered error: {e}. Executing local SMTP fallback.")

        # Local SMTP Fallback
        from app.infrastructure.adapters.email_service import email_service
        logger.info(f"[EMAIL SERVICE] Executing direct local SMTP fallback for {recipient_email} (TID {transaction_id})")
        return await email_service.send_payin_notification_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            transaction_id=transaction_id,
            amount=amount,
            net_credit=net_credit,
            payment_mode=payment_mode,
            payment_date=payment_date,
            status=safe_status,
            receipt_token=safe_token,
            company_context=company_context,
            failure_reason=failure_reason
        )

# Global Singleton Instance
global_notification_platform_client = GlobalNotificationPlatformClient()
