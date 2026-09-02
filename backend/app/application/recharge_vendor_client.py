"""
Recharge Vendor Client & Adapters.

Provides pluggable telecom vendor integration (Utkal Digital, InstantPay, Lapu)
with production resilience, timeout guards, and simulation support.
"""

import os
import uuid
import time
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger("pay2pay.recharge.vendor")


@dataclass
class VendorRechargeResult:
    success: bool
    status: str  # SUCCESS, FAILED, PENDING
    vendor_name: str
    vendor_reference: str
    vendor_transaction_id: str
    operator_ref: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None


class BaseRechargeVendorAdapter:
    async def process_recharge(
        self,
        mobile_number: str,
        operator_code: str,
        circle: str,
        amount: float,
        reference_id: str,
        client_ip: Optional[str] = None
    ) -> VendorRechargeResult:
        raise NotImplementedError


import httpx


SERVICE_ID_MAP: Dict[str, str] = {
    # Prepaid Mobile
    "AIRTEL": "1",
    "VI": "2",
    "VODAFONE": "2",
    "IDEA": "2",
    "JIO": "5",
    "BSNL": "15",
    "BSNL_TOPUP": "11",
    "BSNL TOPUP": "11",
    "MTNL": "16",
    "MTNL_TALKTIME": "10",
    "MTNL TALKTIME": "10",
    # DTH
    "AIRTEL DIGITAL TV": "6",
    "AIRTEL_DTH": "6",
    "DISH TV": "7",
    "DISH_TV": "7",
    "BIG TV": "17",
    "SUN DIRECT": "18",
    "SUN_DIRECT": "18",
    "TATASKY": "19",
    "TATA PLAY": "19",
    "VIDEOCON D2H": "20",
    "VIDEOCON_D2H": "20",
}


class UtkalDigitalRechargeAdapter(BaseRechargeVendorAdapter):
    """
    Live Production & Resilient Telecom API Adapter for Utkal Digital.
    URL: https://api.utkaldigital.co.in/Recharge/transaction
    """
    def __init__(self, is_simulated: bool = False):
        self.is_simulated = is_simulated
        self.vendor_name = "UTKALDIGITAL"
        self.api_url = os.getenv("UTKAL_RECHARGE_URL", "https://api.utkaldigital.co.in/Recharge/transaction")
        self.auth_code = os.getenv("UTKAL_AUTHCODE", "a9f9d5c1752e49e08a")
        self.mpin = os.getenv("UTKAL_MPIN", "995184")

    def get_service_id(self, operator_code: str) -> str:
        clean_code = operator_code.strip().upper()
        return SERVICE_ID_MAP.get(clean_code, "1")

    async def process_recharge(
        self,
        mobile_number: str,
        operator_code: str,
        circle: str,
        amount: float,
        reference_id: str,
        client_ip: Optional[str] = None
    ) -> VendorRechargeResult:
        logger.info(
            f"[{self.vendor_name}] Dispatching recharge request: "
            f"Mobile={mobile_number}, Op={operator_code}, Amt={amount}, Ref={reference_id}, Simulated={self.is_simulated}"
        )

        service_id = self.get_service_id(operator_code)
        amount_str = str(int(amount)) if amount == int(amount) else f"{amount:.2f}"

        # If simulated mode is explicitly forced in local testing:
        if self.is_simulated:
            hex_suffix = uuid.uuid4().hex[:8].upper()
            operator_ref = f"OP{int(time.time()) % 10000000:07d}{hex_suffix[:4]}"
            return VendorRechargeResult(
                success=True,
                status="SUCCESS",
                vendor_name=self.vendor_name,
                vendor_reference=reference_id,
                vendor_transaction_id=f"VTXN-{int(time.time())}",
                operator_ref=operator_ref,
                error_message=None,
                raw_response={"Status": "Success", "OpRefId": operator_ref, "Description": "Simulated success"}
            )

        # LIVE API Request
        payload = {
            "Authcode": self.auth_code,
            "Mpin": self.mpin,
            "CustomerId": mobile_number.strip(),
            "Amount": amount_str,
            "ServiceId": str(service_id),
            "RequestID": reference_id.strip()
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    self.api_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

            logger.info(f"[{self.vendor_name}] HTTP Response status: {resp.status_code}, Body: {resp.text[:300]}")

            if resp.status_code != 200:
                return VendorRechargeResult(
                    success=False,
                    status="PENDING",
                    vendor_name=self.vendor_name,
                    vendor_reference=reference_id,
                    vendor_transaction_id="",
                    operator_ref=None,
                    error_message=f"Gateway HTTP {resp.status_code}. Pending callback.",
                    raw_response={"raw": resp.text[:500]}
                )

            data = resp.json()
            raw_status = str(data.get("Status") or "").strip()
            description = data.get("Description") or "No description provided"
            op_ref_id = data.get("OpRefId") or ""
            trans_id = str(data.get("TransId") or "")
            req_id = data.get("RequestId") or reference_id

            if raw_status.lower() == "success":
                return VendorRechargeResult(
                    success=True,
                    status="SUCCESS",
                    vendor_name=self.vendor_name,
                    vendor_reference=req_id,
                    vendor_transaction_id=trans_id,
                    operator_ref=op_ref_id if op_ref_id else f"OP{trans_id}",
                    error_message=None,
                    raw_response=data
                )
            elif raw_status.lower() == "pending":
                return VendorRechargeResult(
                    success=True,
                    status="PENDING",
                    vendor_name=self.vendor_name,
                    vendor_reference=req_id,
                    vendor_transaction_id=trans_id,
                    operator_ref=op_ref_id,
                    error_message=description,
                    raw_response=data
                )
            else:
                # "Failed", "Reverse", or other errors
                return VendorRechargeResult(
                    success=False,
                    status="FAILED",
                    vendor_name=self.vendor_name,
                    vendor_reference=req_id,
                    vendor_transaction_id=trans_id,
                    operator_ref=None,
                    error_message=description,
                    raw_response=data
                )

        except httpx.TimeoutException:
            logger.warning(f"[{self.vendor_name}] Gateway timeout for {reference_id}. Retaining PENDING status for callback.")
            return VendorRechargeResult(
                success=True,
                status="PENDING",
                vendor_name=self.vendor_name,
                vendor_reference=reference_id,
                vendor_transaction_id="",
                operator_ref=None,
                error_message="Gateway timeout. Awaiting webhook callback confirmation.",
                raw_response={"error": "GATEWAY_TIMEOUT"}
            )
        except Exception as e:
            logger.error(f"[{self.vendor_name}] Exception calling recharge API: {str(e)}", exc_info=True)
            return VendorRechargeResult(
                success=False,
                status="PENDING",
                vendor_name=self.vendor_name,
                vendor_reference=reference_id,
                vendor_transaction_id="",
                operator_ref=None,
                error_message=f"Connection error: {str(e)}",
                raw_response={"error": str(e)}
            )


def get_recharge_vendor_adapter() -> BaseRechargeVendorAdapter:
    env_mode = os.getenv("APP_ENV", "PRODUCTION").upper()
    sim_enabled = os.getenv("RECHARGE_SIMULATION_ENABLED", "False").lower() in ("true", "1")
    return UtkalDigitalRechargeAdapter(is_simulated=sim_enabled)

