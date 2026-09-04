"""
Meta WhatsApp Business Cloud API Adapter Service (v21.0)
Centralized reusable service for dispatching WhatsApp OTPs, notifications, and template messages.
Approved Production Template: ss_auth_otp_v1
"""

import logging
from typing import Dict, Any, Optional, Union
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
    async def send_admin_topup_alert(
        self,
        mobile_number: str,
        retailer_name: str,
        retailer_id: str,
        request_id: str,
        amount: Union[float, str],
        payment_mode: str,
        date_time_str: str,
        status: str = "Pending Approval",
        view_id: Optional[str] = None,
        template_name: str = "topup_request_admin",
        template_id: str = "1043386768499813",
        language_code: str = "en",
        phone_number_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches WhatsApp Admin Top-Up Alert using Meta WhatsApp Cloud API template:
        Template ID: 1043386768499813 (Name: topup_request_admin)
        
        Body Parameters:
        {{1}}: Retailer Name
        {{2}}: Retailer ID
        {{3}}: Request ID
        {{4}}: Amount
        {{5}}: Payment Mode
        {{6}}: Requested Date & Time
        {{7}}: Status
        
        Button (URL index 0):
        url: https://receipt.pay2pay.in/r/{{1}} -> {{1}} is view_id (or request_id)
        """
        clean_digits = "".join(filter(str.isdigit, str(mobile_number or "")))
        if len(clean_digits) >= 10:
            clean_mobile = clean_digits[-10:]
        else:
            clean_mobile = clean_digits

        formatted_mobile = f"91{clean_mobile}" if len(clean_mobile) == 10 else clean_mobile

        try:
            amt_num = float(amount)
            amt_str = f"{amt_num:,.2f}".rstrip('0').rstrip('.') if amt_num.is_integer() else f"{amt_num:,.2f}"
        except Exception:
            amt_str = str(amount)

        safe_retailer_name = str(retailer_name or "Retailer").strip()[:60]
        safe_retailer_id = str(retailer_id or "").strip()[:50]
        safe_request_id = str(request_id or "").strip()[:50]
        safe_mode = str(payment_mode or "POS - Instant").strip()[:50]
        safe_dt = str(date_time_str or "").strip()[:50]
        safe_status = str(status or "Pending Approval").strip()[:50]
        safe_view_id = str(view_id or request_id or "").strip()

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
                            {"type": "text", "text": safe_retailer_name},
                            {"type": "text", "text": safe_retailer_id},
                            {"type": "text", "text": safe_request_id},
                            {"type": "text", "text": amt_str},
                            {"type": "text", "text": safe_mode},
                            {"type": "text", "text": safe_dt},
                            {"type": "text", "text": safe_status}
                        ]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [
                            {"type": "text", "text": safe_view_id}
                        ]
                    }
                ]
            }
        }

        active_phone_id = phone_number_id or self.phone_number_id
        target_url = f"{self.api_url}/{active_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

        receipt_url = f"https://receipt.pay2pay.in/r/{safe_view_id}"

        try:
            logger.info(
                f"[WHATSAPP ADMIN TOPUP ALERT] Destination: +{formatted_mobile} | ReqID: {safe_request_id} | Amount: ₹{amt_str} | Receipt: {receipt_url}"
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(target_url, headers=headers, json=payload)
                if res.status_code == 200:
                    res_data = res.json()
                    msg_id = res_data.get("messages", [{}])[0].get("id", "N/A")
                    logger.info(f"WhatsApp API 200 OK | Admin alert delivered to +{formatted_mobile} | MsgID: {msg_id}")
                    return {
                        "status": "SUCCESS",
                        "delivered": True,
                        "status_code": 200,
                        "recipient": formatted_mobile,
                        "message_id": msg_id,
                        "template_id": template_id,
                        "template_name": template_name,
                        "view_url": receipt_url,
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
                        "view_url": receipt_url,
                        "detail": res.text,
                        "meta_response": res.text
                    }
        except Exception as ex:
            logger.error(f"WhatsApp API Exception during admin topup alert: {ex}")
            return {
                "status": "FAILED",
                "delivered": False,
                "status_code": 500,
                "recipient": formatted_mobile,
                "template_id": template_id,
                "template_name": template_name,
                "view_url": receipt_url,
                "detail": str(ex)
            }

    async def send_retailer_topup_status_alert(
        self,
        mobile_number: str,
        retailer_name: str,
        request_id: str,
        amount_requested: Union[float, str],
        approved_amount: Union[float, str],
        wallet_credit: Union[float, str],
        payment_mode: str,
        transaction_id: str,
        approved_date_time: str,
        status: str,
        view_id: str,
        template_name: str = "topup_status_retailer",
        template_id: str = "1586618753193150",
        language_code: str = "en",
        phone_number_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches automated WhatsApp notification to Retailer when Admin updates top-up request status (Approved / Rejected).
        Approved Meta Template ID: 1586618753193150 (topup_status_retailer)
        Format:
          Body:
            Hi {{1}},
            Your wallet top-up request status is updated.
            Request ID: {{2}}
            Amount Requested: ₹{{3}}
            Approved Amount: ₹{{4}}
            Wallet Credit: ₹{{5}}
            Payment Mode: {{6}}
            Transaction ID: {{7}}
            Approved Date & Time: {{8}}
            Status: {{9}}
            Thank you for using Pay2Pay.
            SUPER REX PRODUCTS PRIVATE LIMITED
          Button:
            Receipt: https://receipt.pay2pay.in/r/{{1}}
        """
        clean_mobile = "".join(filter(str.isdigit, str(mobile_number)))
        if clean_mobile.startswith("91") and len(clean_mobile) == 12:
            formatted_mobile = clean_mobile
        elif len(clean_mobile) == 10:
            formatted_mobile = f"91{clean_mobile}"
        else:
            formatted_mobile = clean_mobile

        # Format numeric currencies
        try:
            req_amt_str = f"{float(amount_requested):,.2f}".rstrip("0").rstrip(".") if float(amount_requested) % 1 != 0 else f"{int(amount_requested)}"
        except Exception:
            req_amt_str = str(amount_requested)

        try:
            app_amt_str = f"{float(approved_amount):,.2f}".rstrip("0").rstrip(".") if float(approved_amount) % 1 != 0 else f"{int(approved_amount)}"
        except Exception:
            app_amt_str = str(approved_amount)

        try:
            w_credit_str = f"{float(wallet_credit):,.2f}".rstrip("0").rstrip(".") if float(wallet_credit) % 1 != 0 else f"{int(wallet_credit)}"
        except Exception:
            w_credit_str = str(wallet_credit)

        safe_ret_name = str(retailer_name or "Retailer").strip()
        safe_req_id = str(request_id or "TOP-REQ").strip()
        safe_mode = str(payment_mode or "POS - Instant").strip()
        safe_txn_id = str(transaction_id or safe_req_id).strip()
        safe_date_time = str(approved_date_time or "").strip()
        safe_status = str(status or "Updated").strip()
        safe_view_id = str(view_id or safe_req_id).strip()

        target_phone_id = phone_number_id or self.phone_number_id or "497102120160245"
        target_url = f"{self.api_url}/{target_phone_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_mobile,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code or "en"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": safe_ret_name},
                            {"type": "text", "text": safe_req_id},
                            {"type": "text", "text": req_amt_str},
                            {"type": "text", "text": app_amt_str},
                            {"type": "text", "text": w_credit_str},
                            {"type": "text", "text": safe_mode},
                            {"type": "text", "text": safe_txn_id},
                            {"type": "text", "text": safe_date_time},
                            {"type": "text", "text": safe_status}
                        ]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [
                            {"type": "text", "text": safe_view_id}
                        ]
                    }
                ]
            }
        }

        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

        receipt_url = f"https://receipt.pay2pay.in/r/{safe_view_id}"

        try:
            logger.info(
                f"[WHATSAPP RETAILER STATUS ALERT] Destination: +{formatted_mobile} | ReqID: {safe_req_id} | Status: {safe_status} | Receipt: {receipt_url}"
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(target_url, headers=headers, json=payload)
                if res.status_code == 200:
                    res_data = res.json()
                    msg_id = res_data.get("messages", [{}])[0].get("id", "N/A")
                    logger.info(f"WhatsApp API 200 OK | Retailer status alert delivered to +{formatted_mobile} | MsgID: {msg_id}")
                    return {
                        "status": "SUCCESS",
                        "delivered": True,
                        "status_code": 200,
                        "recipient": formatted_mobile,
                        "message_id": msg_id,
                        "template_id": template_id,
                        "template_name": template_name,
                        "view_url": receipt_url,
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
                        "view_url": receipt_url,
                        "detail": res.text,
                        "meta_response": res.text
                    }
        except Exception as ex:
            logger.error(f"WhatsApp API Exception during retailer topup status alert: {ex}")
            return {
                "status": "FAILED",
                "delivered": False,
                "status_code": 500,
                "recipient": formatted_mobile,
                "template_id": template_id,
                "template_name": template_name,
                "view_url": receipt_url,
                "detail": str(ex)
            }


whatsapp_service = WhatsAppService()


