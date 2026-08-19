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
        if clean_digits.startswith("91") and len(clean_digits) == 12:
            clean_mobile = clean_digits[2:]
        elif clean_digits.startswith("0") and len(clean_digits) == 11:
            clean_mobile = clean_digits[1:]
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
            print(f"\n==================================================================")
            print(f"📲 [WHATSAPP OTP DISPATCH] Destination: +{formatted_mobile} | Code: {otp_code}")
            print(f"==================================================================\n")
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

whatsapp_service = WhatsAppService()
