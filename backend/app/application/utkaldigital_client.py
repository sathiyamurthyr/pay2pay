"""
Official Utkal Digital Payout API Client
Integrates official Utkal Digital REST API endpoints for:
- Payout Transaction: POST https://singleptxn.utkaldigital.co.in/ProcessRequest/transaction
- Status Verification: POST https://singleptxn.utkaldigital.co.in/ProcessRequest/verify
- Balance Check: POST https://api.utkaldigital.co.in/Recharge/fetchBalance
"""

import os
import time
import json
import logging
import httpx
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("utkaldigital_client")

UTKAL_AUTHCODE = os.getenv("UTKAL_AUTHCODE", "a9f9d5c1752e49e08a")
UTKAL_MPIN = os.getenv("UTKAL_MPIN", "995184")
UTKAL_PAYOUT_URL = os.getenv("UTKAL_PAYOUT_URL", "https://singleptxn.utkaldigital.co.in/ProcessRequest/transaction")
UTKAL_STATUS_URL = os.getenv("UTKAL_STATUS_URL", "https://singleptxn.utkaldigital.co.in/ProcessRequest/verify")
UTKAL_BALANCE_URL = os.getenv("UTKAL_BALANCE_URL", "https://api.utkaldigital.co.in/Recharge/fetchBalance")


def mask_sensitive_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive fields like account numbers, MPINs, and Authcodes in log output."""
    masked = dict(data)
    if "BankAccountNumber" in masked and isinstance(masked["BankAccountNumber"], str):
        acc = masked["BankAccountNumber"]
        masked["BankAccountNumber"] = f"XXXX-XXXX-{acc[-4:]}" if len(acc) >= 4 else "XXXX"
    if "AccountNo" in masked and isinstance(masked["AccountNo"], str):
        acc = masked["AccountNo"]
        masked["AccountNo"] = f"XXXX-XXXX-{acc[-4:]}" if len(acc) >= 4 else "XXXX"
    if "SenderMobile" in masked and isinstance(masked["SenderMobile"], str):
        mob = masked["SenderMobile"]
        masked["SenderMobile"] = f"XXXXXX{mob[-4:]}" if len(mob) >= 4 else "XXXX"
    if "Authcode" in masked and isinstance(masked["Authcode"], str):
        auth = masked["Authcode"]
        masked["Authcode"] = f"{auth[:4]}••••••••{auth[-4:]}" if len(auth) > 8 else "••••••••"
    if "Mpin" in masked and isinstance(masked["Mpin"], str):
        masked["Mpin"] = "******"
    if "AdharNo" in masked and isinstance(masked["AdharNo"], str):
        adh = masked["AdharNo"]
        masked["AdharNo"] = f"XXXXXXXX{adh[-4:]}" if len(adh) >= 4 else "XXXXXXXX"
    return masked


class UtkalDigitalApiClient:
    """Official Utkal Digital Payout API Client implementation."""

    @classmethod
    def get_transport(cls) -> httpx.AsyncHTTPTransport:
        """Forces IPv4 outbound routing to match whitelisted IPv4 address."""
        return httpx.AsyncHTTPTransport(local_address="0.0.0.0")

    @classmethod
    def get_credentials(
        cls,
        authcode: Optional[str] = None,
        mpin: Optional[str] = None
    ) -> Tuple[str, str]:
        auth = authcode or UTKAL_AUTHCODE
        mp = mpin or UTKAL_MPIN
        return auth, mp

    @classmethod
    async def initiate_payout(
        cls,
        merchant_ref: str,
        account_number: str,
        ifsc_code: str,
        account_holder: str,
        amount: float,
        sender_mobile: str = "7873314226",
        sender_name: str = "Customer",
        bank_name: str = "Bank",
        bank_code: str = "MAGNI",
        service_id: str = "27",
        aadhar_no: str = "123456789205",
        pan_no: str = "CWMPS5725E",
        lat: str = "16.53333",
        long: str = "23.55212",
        authcode: Optional[str] = None,
        mpin: Optional[str] = None,
        api_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls official Utkal Digital Payout API.
        Endpoint: POST https://singleptxn.utkaldigital.co.in/ProcessRequest/transaction
        """
        auth, mp = cls.get_credentials(authcode, mpin)
        target_url = api_url or UTKAL_PAYOUT_URL

        clean_acc = "".join(filter(str.isalnum, str(account_number)))
        clean_ifsc = str(ifsc_code).strip().upper()
        clean_mobile = "".join(filter(str.isdigit, str(sender_mobile)))[-10:] if sender_mobile else "7873314226"

        payload = {
            "Authcode": auth,
            "Mpin": mp,
            "RequestID": str(merchant_ref),
            "ServiceId": str(service_id),
            "SenderMobile": clean_mobile,
            "SenderName": str(sender_name or "Retailer Customer"),
            "BankName": str(bank_name or "Bank"),
            "BankCode": str(bank_code or "MAGNI"),
            "BankAccountNumber": clean_acc,
            "BeneficiaryName": str(account_holder or "Beneficiary"),
            "BankIfsc": clean_ifsc,
            "Amount": str(int(amount) if float(amount).is_integer() else str(amount)),
            "AdharNo": str(aadhar_no or "123456789205"),
            "PanNo": str(pan_no or "CWMPS5725E"),
            "Lat": str(lat or "16.53333"),
            "Long": str(long or "23.55212")
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        start_time = time.perf_counter()
        logger.info(f"[UTKAL PAYOUT REQUEST] URL={target_url} Payload={mask_sensitive_payload(payload)}")

        try:
            async with httpx.AsyncClient(transport=cls.get_transport(), timeout=35.0) as client:
                res = await client.post(target_url, json=payload, headers=headers)
                latency = round((time.perf_counter() - start_time) * 1000, 2)

                try:
                    data = res.json()
                except Exception:
                    data = {"raw_body": res.text, "status_code": res.status_code}

                logger.info(f"[UTKAL PAYOUT RESPONSE] HTTP={res.status_code} Latency={latency}ms Response={data}")

                raw_status = str(data.get("Status") or data.get("status") or "").upper()
                desc = str(data.get("Description") or data.get("description") or data.get("message") or "")
                op_ref_id = str(data.get("OpRefId") or data.get("opRefId") or data.get("UTR") or data.get("utr") or "")
                trans_id = str(data.get("TransId") or data.get("transId") or "")
                request_id = str(data.get("RequestId") or data.get("RequestID") or merchant_ref)
                balance_val = data.get("Balance") or data.get("balance")

                if raw_status in ("SUCCESS", "SUCCESSFUL", "TXN_SUCCESS") or res.status_code in (200, 201) and "successful" in desc.lower():
                    standardized_status = "SUCCESS"
                    is_success = True
                elif raw_status in ("PENDING", "PROCESSING", "IN_PROGRESS", "ACCEPTED"):
                    standardized_status = "PENDING"
                    is_success = True
                else:
                    standardized_status = "FAILED"
                    is_success = False

                return {
                    "success": is_success,
                    "status": standardized_status,
                    "provider": "UTKALDIGITAL",
                    "utr": op_ref_id or trans_id or f"UTK{merchant_ref}",
                    "vendor_tx_id": trans_id or op_ref_id,
                    "order_id": trans_id,
                    "request_id": request_id,
                    "message": desc or ("Transaction Successful" if is_success else "Transaction Failed"),
                    "balance": balance_val,
                    "service_name": data.get("ServiceName") or "IMPS",
                    "service_id": data.get("ServiceId") or service_id,
                    "http_status": res.status_code,
                    "latency_ms": latency,
                    "raw_response": data
                }

        except httpx.TimeoutException as te:
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            logger.warning(f"[UTKAL PAYOUT TIMEOUT] Request timed out after {latency}ms: {te}")
            return {
                "success": False,
                "status": "PENDING",
                "provider": "UTKALDIGITAL",
                "utr": "",
                "vendor_tx_id": "",
                "request_id": merchant_ref,
                "message": "Vendor request timed out. Transaction status pending verification.",
                "http_status": 408,
                "latency_ms": latency,
                "raw_response": {"error": "Timeout", "detail": str(te)}
            }
        except Exception as ex:
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"[UTKAL PAYOUT ERROR] Connection exception: {ex}")
            return {
                "success": False,
                "status": "FAILED",
                "provider": "UTKALDIGITAL",
                "utr": "",
                "vendor_tx_id": "",
                "request_id": merchant_ref,
                "message": f"Connection error reaching Utkal Digital: {str(ex)}",
                "http_status": 500,
                "latency_ms": latency,
                "raw_response": {"error": str(ex)}
            }

    @classmethod
    async def check_payout_status(
        cls,
        request_id: str,
        sender_name: str = "Customer",
        sender_mobile: str = "9876543210",
        bank_name: str = "Bank",
        bank_code: str = "UTIB",
        account_no: str = "",
        ifsc: str = "",
        service_id: str = "26",
        aadhar_no: str = "123456789205",
        pan_no: str = "CWMPS5725E",
        lat: str = "16.53333",
        long: str = "23.55212",
        authcode: Optional[str] = None,
        mpin: Optional[str] = None,
        api_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls official Utkal Digital Status Check API.
        Endpoint: POST https://singleptxn.utkaldigital.co.in/ProcessRequest/verify
        """
        auth, mp = cls.get_credentials(authcode, mpin)
        target_url = api_url or UTKAL_STATUS_URL

        clean_mobile = "".join(filter(str.isdigit, str(sender_mobile)))[-10:] if sender_mobile else "9876543210"

        payload = {
            "Authcode": auth,
            "Mpin": mp,
            "RequestID": str(request_id),
            "ServiceId": str(service_id),
            "SenderName": str(sender_name or "Customer"),
            "SenderMobile": clean_mobile,
            "BankName": str(bank_name or "Bank"),
            "BankCode": str(bank_code or "UTIB"),
            "AccountNo": str(account_no),
            "Ifsc": str(ifsc).strip().upper(),
            "AdharNo": str(aadhar_no or "123456789205"),
            "PanNo": str(pan_no or "CWMPS5725E"),
            "Lat": str(lat or "16.53333"),
            "Long": str(long or "23.55212")
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        start_time = time.perf_counter()
        logger.info(f"[UTKAL STATUS REQUEST] URL={target_url} Payload={mask_sensitive_payload(payload)}")

        try:
            async with httpx.AsyncClient(transport=cls.get_transport(), timeout=25.0) as client:
                res = await client.post(target_url, json=payload, headers=headers)
                latency = round((time.perf_counter() - start_time) * 1000, 2)

                try:
                    data = res.json()
                except Exception:
                    data = {"raw_body": res.text, "status_code": res.status_code}

                logger.info(f"[UTKAL STATUS RESPONSE] HTTP={res.status_code} Latency={latency}ms Response={data}")

                raw_status = str(data.get("Status") or data.get("status") or "").upper()
                desc = str(data.get("Description") or data.get("description") or "")
                op_ref_id = str(data.get("OpRefId") or data.get("opRefId") or "")
                trans_id = str(data.get("TransId") or data.get("transId") or "")

                if raw_status in ("SUCCESS", "SUCCESSFUL") or "successful" in desc.lower():
                    standardized_status = "SUCCESS"
                    is_success = True
                elif raw_status in ("PENDING", "PROCESSING", "IN_PROGRESS"):
                    standardized_status = "PENDING"
                    is_success = True
                else:
                    standardized_status = "FAILED"
                    is_success = False

                return {
                    "success": is_success,
                    "status": standardized_status,
                    "provider": "UTKALDIGITAL",
                    "utr": op_ref_id or trans_id,
                    "vendor_tx_id": trans_id,
                    "request_id": request_id,
                    "message": desc or "Status checked",
                    "balance": data.get("Balance"),
                    "txn_date": data.get("TxnDate"),
                    "service_name": data.get("ServiceName"),
                    "service_id": data.get("ServiceId"),
                    "latency_ms": latency,
                    "raw_response": data
                }

        except Exception as ex:
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"[UTKAL STATUS ERROR] Connection exception: {ex}")
            return {
                "success": False,
                "status": "FAILED",
                "provider": "UTKALDIGITAL",
                "message": f"Connection error during status check: {str(ex)}",
                "latency_ms": latency,
                "raw_response": {"error": str(ex)}
            }

    @classmethod
    async def check_balance(
        cls,
        authcode: Optional[str] = None,
        mpin: Optional[str] = None,
        api_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls official Utkal Digital Balance Fetch API.
        Endpoint: POST https://api.utkaldigital.co.in/Recharge/fetchBalance
        """
        auth, mp = cls.get_credentials(authcode, mpin)
        target_url = api_url or UTKAL_BALANCE_URL

        payload = {
            "Authcode": auth,
            "Mpin": mp
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        start_time = time.perf_counter()
        logger.info(f"[UTKAL BALANCE REQUEST] URL={target_url} Payload={mask_sensitive_payload(payload)}")

        try:
            async with httpx.AsyncClient(transport=cls.get_transport(), timeout=15.0) as client:
                res = await client.post(target_url, json=payload, headers=headers)
                latency = round((time.perf_counter() - start_time) * 1000, 2)

                try:
                    data = res.json()
                except Exception:
                    data = {"raw_body": res.text, "status_code": res.status_code}

                logger.info(f"[UTKAL BALANCE RESPONSE] HTTP={res.status_code} Latency={latency}ms Response={data}")

                raw_status = str(data.get("Status") or data.get("status") or "").upper()
                desc = str(data.get("Description") or data.get("description") or data.get("message") or "")
                user_id = str(data.get("UserId") or data.get("userId") or "")
                txn_date = str(data.get("TxnDate") or data.get("txnDate") or "")

                avail_bal = data.get("AvailBalance") or data.get("availBalance") or data.get("Balance") or data.get("balance") or 0.0
                sec_bal = data.get("SecurityBalance") or data.get("securityBalance") or 0.0
                tot_bal = data.get("TotalBalance") or data.get("totalBalance") or avail_bal or 0.0

                try:
                    numeric_balance = float(avail_bal) if avail_bal is not None else 0.0
                except (ValueError, TypeError):
                    numeric_balance = 0.0

                try:
                    numeric_total = float(tot_bal) if tot_bal is not None else numeric_balance
                except (ValueError, TypeError):
                    numeric_total = numeric_balance

                is_success = raw_status in ("SUCCESS", "SUCCESSFUL") or (numeric_balance > 0) or (res.status_code == 200 and "invalid" not in desc.lower())

                return {
                    "success": is_success,
                    "status": "ONLINE" if is_success else "CONNECTED_PENDING_WHITELIST",
                    "provider": "UTKALDIGITAL",
                    "provider_code": "UTKALDIGITAL",
                    "provider_name": "Utkal Digital Payout API",
                    "balance": numeric_balance,
                    "avail_balance": numeric_balance,
                    "security_balance": float(sec_bal or 0.0),
                    "total_balance": numeric_total,
                    "user_id": user_id,
                    "txn_date": txn_date,
                    "message": desc or ("Live Balance Fetched" if is_success else "Live Gateway Connected"),
                    "latency_ms": latency,
                    "http_status": res.status_code,
                    "raw_response": data
                }

        except Exception as ex:
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"[UTKAL BALANCE ERROR] Connection exception: {ex}")
            return {
                "success": False,
                "status": "OFFLINE",
                "provider": "UTKALDIGITAL",
                "provider_code": "UTKALDIGITAL",
                "provider_name": "Utkal Digital Payout API",
                "balance": 0.0,
                "message": f"Connection error: {str(ex)}",
                "latency_ms": latency,
                "raw_response": {"error": str(ex)}
            }
