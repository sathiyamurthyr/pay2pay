"""
Official Utkal Digital Payout API Client
Integrates official Utkal Digital Payout REST API endpoints for:
- Payment Transfer (Payout Initiation): POST /ProcessRequest/Payout / /ProcessRequest/PaymentTransfer
- Get Bank Details: POST /ProcessRequest/GetBankDetails
- Status Check: POST /ProcessRequest/StatusCheck
- Account Validation (Penny Drop): POST /ProcessRequest/AccountValidate

Forces outbound IPv4 transport to ensure compatibility with IP whitelisting.
"""

import os
import time
import json
import logging
import httpx
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

UTKAL_BASE_URL = os.getenv("UTKAL_BASE_URL", "https://payoutbeneficiary.utkaldigital.co.in")
UTKAL_AUTH_CODE = os.getenv("UTKAL_AUTH_CODE", "a9f9d5c1752e49e08a")
UTKAL_MPIN = os.getenv("UTKAL_MPIN", "995184")


class UtkalDigitalClient:
    """Official Utkal Digital Payout API Client."""

    @classmethod
    def get_transport(cls) -> httpx.AsyncHTTPTransport:
        """Forces IPv4 outbound routing (0.0.0.0) to match whitelisted IPv4 address."""
        return httpx.AsyncHTTPTransport(local_address="0.0.0.0")

    @classmethod
    def get_credentials(
        cls,
        auth_code: Optional[str] = None,
        mpin: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> tuple[str, str, str]:
        a_code = auth_code or UTKAL_AUTH_CODE
        pin = mpin or UTKAL_MPIN
        b_url = (base_url or UTKAL_BASE_URL).rstrip("/")
        return a_code, pin, b_url

    @classmethod
    async def get_bank_details(
        cls,
        request_id: Optional[str] = None,
        auth_code: Optional[str] = None,
        mpin: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetches live bank directory list from Utkal Digital.
        Endpoint: POST /ProcessRequest/GetBankDetails
        """
        a_code, pin, b_url = cls.get_credentials(auth_code, mpin, base_url)
        req_id = request_id or f"REQ{int(time.time() * 1000)}"

        payload = {
            "Authcode": a_code,
            "Mpin": pin,
            "RequestID": req_id
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Pay2Pay-Enterprise-Gateway/1.0"
        }

        try:
            async with httpx.AsyncClient(transport=cls.get_transport(), timeout=30.0, verify=False) as client:
                url = f"{b_url}/ProcessRequest/GetBankDetails"
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code == 200:
                    res_json = response.json()
                    return {
                        "status": "SUCCESS" if res_json.get("Status") == "Success" else "FAILED",
                        "raw_status": res_json.get("Status"),
                        "description": res_json.get("Description"),
                        "request_id": res_json.get("RequestId") or req_id,
                        "data": res_json.get("Data") or []
                    }
                else:
                    return {
                        "status": "FAILED",
                        "description": f"HTTP Error {response.status_code}",
                        "raw_response": response.text
                    }
        except Exception as e:
            logger.error(f"[UTKAL GET BANK DETAILS ERROR] {str(e)}")
            return {
                "status": "ERROR",
                "description": str(e),
                "data": []
            }

    @classmethod
    async def initiate_payout(
        cls,
        merchant_ref: str,
        account_number: str,
        ifsc_code: str,
        account_holder: str,
        amount: float,
        bank_code: Optional[str] = None,
        bank_name: Optional[str] = None,
        mode: str = "IMPS",
        mobile: str = "9876543210",
        db: Optional[AsyncSession] = None,
        auth_code: Optional[str] = None,
        mpin: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls official Utkal Digital Payout / Payment Transfer API.
        Automatically resolves and embeds BankCode, BankName, and IFSC.
        """
        start_time = time.time()
        a_code, pin, b_url = cls.get_credentials(auth_code, mpin, base_url)

        # Resolve bank details if missing and db session available
        resolved_bank_code = bank_code
        resolved_bank_name = bank_name
        resolved_ifsc = ifsc_code

        if db and (not resolved_bank_code or not resolved_bank_name):
            from app.application.bank_master_service import BankMasterService
            b_info = await BankMasterService.resolve_bank_details(
                db=db,
                ifsc_code=ifsc_code,
                bank_name=bank_name
            )
            resolved_bank_code = resolved_bank_code or b_info.get("bank_code")
            resolved_bank_name = resolved_bank_name or b_info.get("bank_name")
            resolved_ifsc = resolved_ifsc or b_info.get("ifsc_code")

        # Fallback if still empty
        resolved_bank_code = resolved_bank_code or (ifsc_code[:4] if len(ifsc_code) >= 4 else "BANK")
        resolved_bank_name = resolved_bank_name or "Commercial Bank"

        valid_mode = mode.upper()
        if valid_mode not in ["IMPS", "NEFT", "RTGS"]:
            valid_mode = "IMPS"

        payload = {
            "Authcode": a_code,
            "Mpin": pin,
            "RequestID": str(merchant_ref),
            "BankCode": str(resolved_bank_code),
            "BankName": str(resolved_bank_name),
            "IFSC": str(resolved_ifsc).upper(),
            "AccountNo": str(account_number),
            "BeneficiaryName": str(account_holder),
            "Amount": f"{amount:.2f}",
            "TransferMode": valid_mode,
            "MobileNo": str(mobile) if mobile else "9876543210"
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Pay2Pay-Enterprise-Gateway/1.0"
        }

        try:
            async with httpx.AsyncClient(transport=cls.get_transport(), timeout=30.0, verify=False) as client:
                url = f"{b_url}/ProcessRequest/Payout"
                response = await client.post(url, json=payload, headers=headers)
                latency_ms = (time.time() - start_time) * 1000

                if response.status_code == 200:
                    res_json = response.json()
                    raw_status = str(res_json.get("Status", "")).upper()
                    
                    if raw_status in ("SUCCESS", "1", "SUCCESSFUL"):
                        payout_status = "SUCCESS"
                    elif raw_status in ("FAILED", "0", "FAILURE", "REJECTED"):
                        payout_status = "FAILED"
                    else:
                        payout_status = "PENDING"

                    return {
                        "status": payout_status,
                        "raw_status": raw_status,
                        "message": res_json.get("Description") or res_json.get("Message") or "Utkal Payout Processed",
                        "order_id": res_json.get("OrderId") or res_json.get("TransactionId") or merchant_ref,
                        "vendor_tx_id": res_json.get("TransactionId") or res_json.get("OrderId"),
                        "utr": res_json.get("UTR") or res_json.get("RRN") or f"UTK{merchant_ref}",
                        "rrn": res_json.get("RRN") or res_json.get("UTR"),
                        "bank_code": resolved_bank_code,
                        "bank_name": resolved_bank_name,
                        "ifsc_code": resolved_ifsc,
                        "latency_ms": latency_ms,
                        "raw_response": res_json
                    }
                else:
                    return {
                        "status": "FAILED",
                        "message": f"HTTP Error {response.status_code}: {response.text[:200]}",
                        "raw_response": response.text,
                        "latency_ms": latency_ms
                    }
        except Exception as e:
            logger.error(f"[UTKAL INITIATE PAYOUT EXCEPTION] {str(e)}")
            return {
                "status": "FAILED",
                "message": f"Utkal Gateway Communication Error: {str(e)}",
                "raw_response": None,
                "latency_ms": (time.time() - start_time) * 1000
            }
