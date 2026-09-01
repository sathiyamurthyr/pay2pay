"""
Official UrbanRupee Payout API Client
Integrates official UrbanRupee REST API endpoints for:
1. Initiate Payout (POST /api/payout/initiate)
2. Check Payout Status (POST /api/payout/checkstatus)
3. Check Wallet Balance (POST /api/payout/balance)

Live Provider Details:
- Base URL: https://payout.urbanrupee.in
- User ID: UR6877 (dynamic from settings / env / db)
- API Token: pk_6955bdbab906ece296070e22307eac099ac90a75a19fcbfa0ab4f798848a9e8e (dynamic from settings / env / db)
"""

import os
import uuid
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("urbanrupee_client")

URBANRUPEE_BASE_URL = os.getenv("URBANRUPEE_BASE_URL", "https://payout.urbanrupee.in")
URBANRUPEE_USER_ID = os.getenv("URBANRUPEE_USER_ID", "UR6877")
URBANRUPEE_API_TOKEN = os.getenv("URBANRUPEE_API_TOKEN", "pk_6955bdbab906ece296070e22307eac099ac90a75a19fcbfa0ab4f798848a9e8e")


class UrbanRupeeApiClient:
    """Official UrbanRupee Payout API Client implementation."""

    @classmethod
    def get_credentials(
        cls,
        base_url: Optional[str] = None,
        user_id: Optional[str] = None,
        api_token: Optional[str] = None
    ) -> Dict[str, str]:
        """Resolves active UrbanRupee API credentials dynamically."""
        b_url = (base_url or getattr(settings, "URBANRUPEE_BASE_URL", None) or URBANRUPEE_BASE_URL).rstrip("/")
        u_id = user_id or getattr(settings, "URBANRUPEE_USER_ID", None) or URBANRUPEE_USER_ID
        tok = api_token or getattr(settings, "URBANRUPEE_API_TOKEN", None) or URBANRUPEE_API_TOKEN
        return {
            "base_url": b_url,
            "userid": u_id,
            "token": tok
        }

    @classmethod
    async def initiate_payout(
        cls,
        merchant_ref: str,
        account_number: str,
        ifsc_code: str,
        account_holder: str,
        amount: float,
        mobile: str = "9876543210",
        mode: str = "IMPS",
        base_url: Optional[str] = None,
        user_id: Optional[str] = None,
        api_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls official UrbanRupee Initiate Payout API:
        POST https://payout.urbanrupee.in/api/payout/initiate

        Request:
        {
            "token": "YOUR_API_TOKEN",
            "userid": "YOUR_USER_ID",
            "amount": "100",
            "mobile": "9876543210",
            "name": "Beneficiary Name",
            "number": "924010064720335",
            "ifsc": "UTIB0004497",
            "orderid": "order_1780033533"
        }
        """
        creds = cls.get_credentials(base_url, user_id, api_token)
        url = f"{creds['base_url']}/api/payout/initiate"

        clean_mobile = str(mobile or "9876543210").strip()
        if len(clean_mobile) > 10:
            clean_mobile = clean_mobile[-10:]

        payload = {
            "token": creds["token"],
            "userid": creds["userid"],
            "amount": str(int(amount) if float(amount).is_integer() else f"{amount:.2f}"),
            "mobile": clean_mobile,
            "name": str(account_holder or "Beneficiary").strip(),
            "number": str(account_number or "").strip(),
            "ifsc": str(ifsc_code or "").strip().upper(),
            "orderid": str(merchant_ref).strip()
        }

        logger.info(f"[URBANRUPEE INITIATE] Sending payout request to {url} for orderid: {merchant_ref}")
        logger.debug(f"[URBANRUPEE INITIATE] Payload (masked token): {{'userid': '{creds['userid']}', 'amount': '{payload['amount']}', 'orderid': '{payload['orderid']}', 'number': '***'}}")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                logger.info(f"[URBANRUPEE INITIATE] HTTP {response.status_code} response for {merchant_ref}")

                try:
                    res_json = response.json()
                except Exception:
                    res_json = {"raw_text": response.text}

                logger.info(f"[URBANRUPEE INITIATE] Response body: {res_json}")

                if response.status_code == 200:
                    is_status_true = res_json.get("status") is True or str(res_json.get("status")).lower() == "true"
                    curr_status = str(res_json.get("current_status") or "").lower()
                    msg = res_json.get("message") or "UrbanRupee Payout Response"
                    vendor_tx_id = res_json.get("transaction_id") or res_json.get("id") or merchant_ref
                    utr = res_json.get("utr") or ""

                    if is_status_true:
                        if curr_status == "success" or "settlement completed" in msg.lower() or "success" in msg.lower():
                            return {
                                "status": "SUCCESS",
                                "vendor_name": "UrbanRupee",
                                "vendor_tx_id": vendor_tx_id,
                                "reference_id": merchant_ref,
                                "utr": utr,
                                "message": msg,
                                "raw_response": res_json
                            }
                        else:
                            # Accepted / Pending
                            return {
                                "status": "PENDING",
                                "vendor_name": "UrbanRupee",
                                "vendor_tx_id": vendor_tx_id,
                                "reference_id": merchant_ref,
                                "utr": utr,
                                "message": msg,
                                "raw_response": res_json
                            }
                    else:
                        # Rejected (e.g. Insufficient balance, invalid account)
                        return {
                            "status": "FAILED",
                            "vendor_name": "UrbanRupee",
                            "vendor_tx_id": vendor_tx_id,
                            "reference_id": merchant_ref,
                            "utr": "",
                            "message": msg,
                            "raw_response": res_json
                        }
                else:
                    err_msg = res_json.get("message") or f"UrbanRupee HTTP {response.status_code} Error"
                    return {
                        "status": "FAILED",
                        "vendor_name": "UrbanRupee",
                        "vendor_tx_id": None,
                        "reference_id": merchant_ref,
                        "utr": None,
                        "message": err_msg,
                        "raw_response": res_json
                    }

        except httpx.TimeoutException:
            logger.error(f"[URBANRUPEE INITIATE] Gateway Timeout for orderid {merchant_ref}")
            return {
                "status": "PENDING",
                "vendor_name": "UrbanRupee",
                "vendor_tx_id": None,
                "reference_id": merchant_ref,
                "utr": None,
                "message": "UrbanRupee gateway timeout - request submitted, awaiting callback.",
                "raw_response": {"error": "Timeout"}
            }
        except Exception as e:
            logger.error(f"[URBANRUPEE INITIATE] Network Exception for {merchant_ref}: {e}")
            return {
                "status": "FAILED",
                "vendor_name": "UrbanRupee",
                "vendor_tx_id": None,
                "reference_id": merchant_ref,
                "utr": None,
                "message": f"Network error connecting to UrbanRupee Payout API: {str(e)}",
                "raw_response": {"error": str(e)}
            }

    @classmethod
    async def check_status(
        cls,
        merchant_ref: str,
        base_url: Optional[str] = None,
        user_id: Optional[str] = None,
        api_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls official UrbanRupee Check Status API:
        POST https://payout.urbanrupee.in/api/payout/checkstatus

        Request:
        {
            "userid": "YOUR_USER_ID",
            "orderid": "order_1780033533"
        }
        """
        creds = cls.get_credentials(base_url, user_id, api_token)
        url = f"{creds['base_url']}/api/payout/checkstatus"

        payload = {
            "userid": creds["userid"],
            "orderid": str(merchant_ref).strip()
        }

        logger.info(f"[URBANRUPEE STATUS] Checking status at {url} for orderid: {merchant_ref}")

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                try:
                    res_json = response.json()
                except Exception:
                    res_json = {"raw_text": response.text}

                logger.info(f"[URBANRUPEE STATUS] Response: {res_json}")

                if response.status_code == 200:
                    raw_st = str(res_json.get("status") or "").lower()
                    msg = res_json.get("message") or "Status retrieved"
                    vendor_tx_id = res_json.get("transaction_id") or res_json.get("id")
                    utr = res_json.get("utr") or ""

                    if raw_st == "success":
                        mapped_status = "SUCCESS"
                    elif raw_st in ("failed", "failure", "rejected"):
                        mapped_status = "FAILED"
                    elif raw_st in ("pending", "processing", "initiated", "accepted"):
                        mapped_status = "PENDING"
                    elif "not found" in msg.lower() or "transaction pending" in msg.lower():
                        mapped_status = "PENDING"
                    else:
                        mapped_status = "PENDING"

                    return {
                        "status": mapped_status,
                        "vendor_name": "UrbanRupee",
                        "vendor_tx_id": vendor_tx_id,
                        "reference_id": merchant_ref,
                        "utr": utr,
                        "message": msg,
                        "raw_response": res_json
                    }
                else:
                    return {
                        "status": "PENDING",
                        "vendor_name": "UrbanRupee",
                        "vendor_tx_id": None,
                        "reference_id": merchant_ref,
                        "utr": None,
                        "message": f"UrbanRupee Status Check returned HTTP {response.status_code}",
                        "raw_response": res_json
                    }

        except Exception as e:
            logger.error(f"[URBANRUPEE STATUS] Status check error for {merchant_ref}: {e}")
            return {
                "status": "PENDING",
                "vendor_name": "UrbanRupee",
                "vendor_tx_id": None,
                "reference_id": merchant_ref,
                "utr": None,
                "message": f"Status check network exception: {str(e)}",
                "raw_response": {"error": str(e)}
            }

    @classmethod
    async def check_balance(
        cls,
        base_url: Optional[str] = None,
        user_id: Optional[str] = None,
        api_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls official UrbanRupee Check Balance API:
        POST https://payout.urbanrupee.in/api/payout/balance

        Request:
        {
            "token": "YOUR_API_TOKEN",
            "userid": "YOUR_USER_ID"
        }
        """
        creds = cls.get_credentials(base_url, user_id, api_token)
        url = f"{creds['base_url']}/api/payout/balance"

        payload = {
            "token": creds["token"],
            "userid": creds["userid"]
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                try:
                    res_json = response.json()
                except Exception:
                    res_json = {"raw_text": response.text}

                if response.status_code == 200 and res_json.get("status") is True:
                    bal = float(res_json.get("balance", 0.0))
                    return {
                        "status": "SUCCESS",
                        "vendor_name": "UrbanRupee",
                        "balance": bal,
                        "currency": res_json.get("currency", "INR"),
                        "message": res_json.get("message", "Success"),
                        "raw_response": res_json
                    }
                else:
                    return {
                        "status": "FAILED",
                        "vendor_name": "UrbanRupee",
                        "balance": 0.0,
                        "currency": "INR",
                        "message": res_json.get("message") or f"UrbanRupee Balance Check Error (HTTP {response.status_code})",
                        "raw_response": res_json
                    }

        except Exception as e:
            logger.error(f"[URBANRUPEE BALANCE] Balance check exception: {e}")
            return {
                "status": "FAILED",
                "vendor_name": "UrbanRupee",
                "balance": 0.0,
                "currency": "INR",
                "message": f"Balance check network exception: {str(e)}",
                "raw_response": {"error": str(e)}
            }
