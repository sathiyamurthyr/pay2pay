"""
Meta WhatsApp Business Cloud API Adapter Service (v21.0)
Centralized reusable service for dispatching WhatsApp OTPs, notifications, and template messages.
Approved Production Template: ss_auth_otp_v1
"""

import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("whatsapp_service")

class WhatsAppService:
    """Centralized Meta WhatsApp Business Cloud API Service Adapter."""

    def __init__(
        self,
        api_url: Optional[str] = None,
        phone_number_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ):
        self.api_url = api_url or settings.WHATSAPP_API_URL
        self.phone_number_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
        self.auth_token = auth_token or settings.WHATSAPP_AUTH_TOKEN

    async def send_otp(
        self,
        mobile_number: str,
        otp_code: str,
        template_name: str = "ss_auth_otp_v1",
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Dispatch WhatsApp Authentication OTP using official approved Meta template.
        Default Template: ss_auth_otp_v1
        """
        # Normalize mobile number to exact 10 digits
        clean_digits = "".join(filter(str.isdigit, str(mobile_number)))
        if len(clean_digits) >= 10:
            clean_mobile = clean_digits[-10:]
        else:
            clean_mobile = clean_digits

        formatted_mobile = f"91{clean_mobile}" if len(clean_mobile) == 10 else clean_mobile

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_mobile,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": otp_code}]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [{"type": "text", "text": otp_code}]
                    }
                ]
            }
        }

        target_url = f"{self.api_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

        try:
            logger.info(f"[WHATSAPP OTP DISPATCH] Destination: +{formatted_mobile} | Code: {otp_code}")
            print(f"[WHATSAPP OTP DISPATCH] Destination: +{formatted_mobile} | Code: {otp_code}")
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(target_url, headers=headers, json=payload)
                if res.status_code == 200:
                    res_data = res.json()
                    msg_id = res_data.get("messages", [{}])[0].get("id", "N/A")
                    logger.info(f"WhatsApp API 200 OK | Delivered to {formatted_mobile} | ID: {msg_id}")
                    return {
                        "status": "SUCCESS",
                        "delivered": True,
                        "status_code": 200,
                        "target_url": target_url,
                        "recipient": formatted_mobile,
                        "message_id": msg_id,
                        "otp_code": otp_code,
                        "meta_response": res_data
                    }
                else:
                    logger.warning(f"WhatsApp API HTTP {res.status_code}: {res.text}")
                    return {
                        "status": "SUCCESS",
                        "delivered": False,
                        "status_code": res.status_code,
                        "target_url": target_url,
                        "recipient": formatted_mobile,
                        "otp_code": otp_code,
                        "detail": res.text,
                        "meta_response": res.text
                    }
        except Exception as ex:
            logger.error(f"WhatsApp API Connection Exception: {ex}")
            return {
                "status": "SUCCESS",
                "delivered": False,
                "status_code": 500,
                "target_url": target_url,
                "recipient": formatted_mobile,
                "otp_code": otp_code,
                "detail": str(ex)
            }

    async def send_text(self, mobile_number: str, message: str) -> Dict[str, Any]:
        """Dispatch freeform WhatsApp text message."""
        clean_mobile = "".join(filter(str.isdigit, mobile_number))
        formatted_mobile = f"91{clean_mobile}" if len(clean_mobile) == 10 else clean_mobile

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_mobile,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message
            }
        }

        target_url = f"{self.api_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(target_url, headers=headers, json=payload)
                return {
                    "status": "SUCCESS" if res.status_code == 200 else "FAILED",
                    "status_code": res.status_code,
                    "response": res.json() if res.status_code == 200 else res.text
                }
        except Exception as ex:
            return {"status": "FAILED", "detail": str(ex)}

    async def send_payout_status_notification(
        self,
        mobile_number: str,
        customer_name: str,
        amount: float,
        transaction_id: str,
        date_time_str: str,
        status: str,
        receipt_token: str,
        template_name: str = "txn_status",
        template_id: str = "1608819390633911",
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Dispatch WhatsApp Payout Status Notification using approved Meta template:
        Template ID: 1608819390633911 (Name: txn_status)
        Body:
        Hi {{1}},
        Your payment of ₹{{2}} has been successfully completed.
        Transaction ID: {{3}}
        Date & Time: {{4}}
        Status: {{5}}
        Thank you for using Pay2Pay.
        Receipt Button: https://receipt.pay2pay.in/r/{{1}}
        """
        clean_digits = "".join(filter(str.isdigit, str(mobile_number or "")))
        if len(clean_digits) >= 10:
            clean_mobile = clean_digits[-10:]
        else:
            clean_mobile = clean_digits

        formatted_mobile = f"91{clean_mobile}" if len(clean_mobile) == 10 else clean_mobile

        # Normalize status string for customer readability (e.g. SUCCESS, PENDING, FAILED)
        status_up = str(status or "SUCCESS").upper().strip()
        if status_up in ("COMPLETED", "PROCESSED", "SUCCESSFUL"):
            status_display = "SUCCESS"
        elif status_up in ("FAILURE", "REJECTED", "ERROR", "DECLINED"):
            status_display = "FAILED"
        elif status_up in ("REVERSED", "REFUNDED"):
            status_display = "REVERSED"
        else:
            status_display = status_up

        amount_str = f"{float(amount):.2f}"
        safe_customer_name = (customer_name or "Customer").strip()[:50]
        safe_txn_id = str(transaction_id or "")[:50]
        safe_dt = str(date_time_str or "")[:50]
        safe_token = str(receipt_token or "").strip()

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_mobile,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": safe_customer_name},
                            {"type": "text", "text": amount_str},
                            {"type": "text", "text": safe_txn_id},
                            {"type": "text", "text": safe_dt},
                            {"type": "text", "text": status_display}
                        ]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [
                            {"type": "text", "text": safe_token}
                        ]
                    }
                ]
            }
        }

        target_url = f"{self.api_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

        receipt_url = f"https://receipt.pay2pay.in/r/{safe_token}"

        try:
            logger.info(
                f"[WHATSAPP PAYOUT NOTIFICATION] Destination: +{formatted_mobile} | Txn: {safe_txn_id} | Status: {status_display} | Receipt: {receipt_url}"
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(target_url, headers=headers, json=payload)
                if res.status_code == 200:
                    res_data = res.json()
                    msg_id = res_data.get("messages", [{}])[0].get("id", "N/A")
                    logger.info(f"WhatsApp API 200 OK | Payout delivered to +{formatted_mobile} | MsgID: {msg_id}")
                    return {
                        "status": "SUCCESS",
                        "delivered": True,
                        "status_code": 200,
                        "recipient": formatted_mobile,
                        "message_id": msg_id,
                        "template_id": template_id,
                        "template_name": template_name,
                        "receipt_token": safe_token,
                        "receipt_url": receipt_url,
                        "meta_response": res_data
                    }
                else:
                    logger.warning(f"WhatsApp API HTTP {res.status_code}: {res.text}")
                    return {
                        "status": "FAILED",
                        "delivered": False,
                        "status_code": res.status_code,
                        "recipient": formatted_mobile,
                        "template_id": template_id,
                        "template_name": template_name,
                        "receipt_token": safe_token,
                        "receipt_url": receipt_url,
                        "detail": res.text,
                        "meta_response": res.text
                    }
        except Exception as ex:
            logger.error(f"WhatsApp API Exception during payout notification: {ex}")
            return {
                "status": "FAILED",
                "delivered": False,
                "status_code": 500,
                "recipient": formatted_mobile,
                "template_id": template_id,
                "template_name": template_name,
                "receipt_token": safe_token,
                "receipt_url": receipt_url,
                "detail": str(ex)
            }

whatsapp_service = WhatsAppService()

