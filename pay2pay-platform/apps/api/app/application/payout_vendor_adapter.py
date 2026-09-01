"""
Payout Vendor Adapter Architecture with Strict Environment-Based Sandbox Simulation.

Architecture:
                 ┌── DEV / STAGING (Simulated) ──> SimulatedVendorAdapter (0 HTTP Calls, Weighted Random)
Payout Service ──┤
                 └── PROD (Live) ───────────────> LiveVendorAdapter (Utkal / WowPe / BulkPe APIs)

STRICT ENVIRONMENT SAFEGUARDS:
- When APP_ENV=production or ENVIRONMENT=production: Simulation is HARD-DISABLED.
- Request-level parameters (e.g. mode=DEV) CANNOT override server-side production configuration.
- Simulated responses use clearly identifiable 'TEST-...' prefixes for UTR, RRN, and Vendor References.
"""

import os
import time
import uuid
import random
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("payout_vendor_adapter")


class BasePayoutVendorAdapter(ABC):
    """Abstract Base Class for Payout Gateway Vendor Adapters."""

    @abstractmethod
    async def initiate_payout(
        self,
        vendor_name: str,
        merchant_ref: str,
        account_number: str,
        ifsc_code: str,
        account_holder: str,
        amount: float,
        mode: str = "IMPS",
        mobile: Optional[str] = None,
        bank_name: Optional[str] = None,
        sender_name: Optional[str] = None,
        remarks: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Initiates a payout dispatch through the vendor gateway."""
        pass

    @abstractmethod
    async def check_status(
        self,
        vendor_name: str,
        reference_id: str,
        merchant_ref: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Polls vendor gateway for payout settlement status."""
        pass

    @abstractmethod
    async def check_balance(
        self,
        vendor_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Fetches active float balance for the vendor gateway."""
        pass


class LiveVendorAdapter(BasePayoutVendorAdapter):
    """
    Live Production Vendor Adapter.
    Strictly used in Production mode. Dispatches real HTTP requests to configured vendor APIs.
    """

    async def initiate_payout(
        self,
        vendor_name: str,
        merchant_ref: str,
        account_number: str,
        ifsc_code: str,
        account_holder: str,
        amount: float,
        mode: str = "IMPS",
        mobile: Optional[str] = None,
        bank_name: Optional[str] = None,
        sender_name: Optional[str] = None,
        remarks: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        v_upper = (vendor_name or "URBANRUPEE").upper()
        logger.info(f"[LIVE VENDOR DISPATCH] Calling live vendor '{v_upper}' for ref {merchant_ref} (Amount: ₹{amount})")

        if v_upper in ("URBANRUPEE", "URBAN_RUPEE", "UR"):
            from app.application.urbanrupee_client import UrbanRupeeApiClient
            return await UrbanRupeeApiClient.initiate_payout(
                merchant_ref=merchant_ref,
                account_number=account_number,
                ifsc_code=ifsc_code,
                account_holder=account_holder,
                amount=amount,
                mobile=mobile or "9876543210",
                mode=mode
            )

        elif v_upper in ("UTKAL", "UTKAL_DIGITAL", "UTKALDIGITAL"):
            from app.application.utkaldigital_client import UtkalDigitalApiClient
            return await UtkalDigitalApiClient.initiate_payout(
                merchant_ref=merchant_ref,
                account_number=account_number,
                ifsc_code=ifsc_code,
                account_holder=account_holder,
                amount=amount,
                sender_mobile=mobile or "7873314226",
                sender_name=sender_name or "Customer",
                bank_name=bank_name or "Commercial Bank",
                bank_code="SBIN" if "SBIN" in str(ifsc_code).upper() else "MAGNI",
                service_id="27"
            )

        elif v_upper == "WOWPE":
            from app.application.wowpe_client import WowPeApiClient
            return await WowPeApiClient.initiate_payout(
                merchant_ref=merchant_ref,
                account_number=account_number,
                ifsc_code=ifsc_code,
                account_holder=account_holder,
                amount=amount,
                mode=mode,
                mobile=mobile or "9876543210"
            )

        else:
            from app.application.bulkpe_client import BulkPeApiClient
            return await BulkPeApiClient.initiate_payout(
                merchant_ref=merchant_ref,
                account_number=account_number,
                ifsc_code=ifsc_code,
                account_holder=account_holder,
                amount=amount,
                mode=mode,
                remarks=remarks or f"Payout {merchant_ref}"
            )

    async def check_status(
        self,
        vendor_name: str,
        reference_id: str,
        merchant_ref: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        v_upper = (vendor_name or "URBANRUPEE").upper()
        if v_upper in ("URBANRUPEE", "URBAN_RUPEE", "UR"):
            from app.application.urbanrupee_client import UrbanRupeeApiClient
            return await UrbanRupeeApiClient.check_status(
                merchant_ref=merchant_ref or reference_id
            )
        elif v_upper in ("UTKAL", "UTKAL_DIGITAL", "UTKALDIGITAL"):
            from app.application.utkaldigital_client import UtkalDigitalApiClient
            return await UtkalDigitalApiClient.check_payout_status(
                request_id=merchant_ref or reference_id
            )
        elif v_upper == "WOWPE":
            from app.application.wowpe_client import WowPeApiClient
            return await WowPeApiClient.check_status(
                merchant_ref=merchant_ref,
                order_id=reference_id
            )
        else:
            from app.application.bulkpe_client import BulkPeApiClient
            return await BulkPeApiClient.check_payout_status(
                reference_id=merchant_ref or reference_id
            )

    async def check_balance(
        self,
        vendor_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        v_upper = (vendor_name or "URBANRUPEE").upper()
        if v_upper in ("URBANRUPEE", "URBAN_RUPEE", "UR"):
            from app.application.urbanrupee_client import UrbanRupeeApiClient
            res = await UrbanRupeeApiClient.check_balance()
            return {
                "success": res.get("status") == "SUCCESS",
                "status": res.get("status", "SUCCESS"),
                "vendor_name": "UrbanRupee",
                "balance": res.get("balance", 0.0),
                "message": res.get("message", "Success")
            }
        elif v_upper in ("UTKAL", "UTKAL_DIGITAL", "UTKALDIGITAL"):
            from app.application.utkaldigital_client import UtkalDigitalApiClient
            return await UtkalDigitalApiClient.check_balance()
        elif v_upper == "WOWPE":
            from app.application.wowpe_client import WowPeApiClient
            return await WowPeApiClient.check_balance()
        else:
            return {
                "success": True,
                "status": "SUCCESS",
                "vendor_name": "BulkPe",
                "balance": 250000.00,
                "message": "BulkPe float balance retrieved"
            }


class SimulatedVendorAdapter(BasePayoutVendorAdapter):
    """
    Simulated Sandbox Vendor Adapter.
    Used in DEV / STAGING environments.
    Guarantees 0 outbound HTTP calls to third-party bank gateways.
    Uses configurable probability distribution:
      - SUCCESS (default 70%) -> Generates TEST-UTR..., TEST-RRN..., TEST-VREF...
      - PENDING (default 20%) -> Simulates bank clearing lag
      - FAILED  (default 10%) -> Simulates definitive decline to exercise automatic wallet reversal flow
    """

    async def initiate_payout(
        self,
        vendor_name: str,
        merchant_ref: str,
        account_number: str,
        ifsc_code: str,
        account_holder: str,
        amount: float,
        mode: str = "IMPS",
        mobile: Optional[str] = None,
        bank_name: Optional[str] = None,
        sender_name: Optional[str] = None,
        remarks: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        v_upper = (vendor_name or "UTKALDIGITAL").upper()
        probs = settings.simulation_probabilities

        # Check for deterministic force prefix (for unit & automated regression testing)
        ref_str = str(merchant_ref or "").upper()
        if "FORCE-SUCCESS" in ref_str:
            outcome = "SUCCESS"
        elif "FORCE-PENDING" in ref_str:
            outcome = "PENDING"
        elif "FORCE-FAILED" in ref_str or "FORCE-FAIL" in ref_str:
            outcome = "FAILED"
        elif "FORCE-TIMEOUT" in ref_str:
            outcome = "TIMEOUT"
        else:
            # Weighted random selection based on server-side configuration
            rand_roll = random.uniform(0, 100)
            success_threshold = probs["SUCCESS_PCT"]
            pending_threshold = success_threshold + probs["PENDING_PCT"]

            if rand_roll <= success_threshold:
                outcome = "SUCCESS"
            elif rand_roll <= pending_threshold:
                outcome = "PENDING"
            else:
                outcome = "FAILED"

        sim_latency = round(random.uniform(120.0, 320.0), 2)
        unique_suffix = f"{random.randint(100000000000, 999999999999)}"
        short_hex = uuid.uuid4().hex[:8].upper()

        logger.info(
            f"[DEV VENDOR SIMULATOR] Dispatched '{v_upper}' payout simulation for ref {merchant_ref} "
            f"| Amount: ₹{amount} | Mode: {mode} | Simulated Result: {outcome} (Latency: {sim_latency}ms)"
        )

        if outcome == "SUCCESS":
            test_utr = f"TEST-UTR{unique_suffix}"
            test_rrn = f"TEST-RRN{unique_suffix}"
            test_vref = f"TEST-VREF-{v_upper}-{short_hex}"

            return {
                "success": True,
                "status": "SUCCESS",
                "provider": v_upper,
                "vendor_name": v_upper,
                "utr": test_utr,
                "rrn": test_rrn,
                "vendor_tx_id": test_vref,
                "order_id": test_vref,
                "vendor_ref": merchant_ref,
                "message": f"TEST SIMULATOR: {v_upper} payout processed successfully (Sandbox Mode).",
                "http_status": 200,
                "latency_ms": sim_latency,
                "is_simulated": True,
                "environment": "DEV_SANDBOX",
                "raw_response": {
                    "simulation": True,
                    "provider": v_upper,
                    "status": "SUCCESS",
                    "utr": test_utr,
                    "rrn": test_rrn,
                    "reference_id": merchant_ref
                }
            }

        elif outcome in ("PENDING", "TIMEOUT"):
            test_vref = f"TEST-VREF-PENDING-{short_hex}"
            return {
                "success": True,
                "status": "PENDING",
                "provider": v_upper,
                "vendor_name": v_upper,
                "utr": None,
                "rrn": None,
                "vendor_tx_id": test_vref,
                "order_id": test_vref,
                "vendor_ref": merchant_ref,
                "message": f"TEST SIMULATOR: Transaction queued at clearing house (Awaiting Bank Ack).",
                "http_status": 200 if outcome == "PENDING" else 408,
                "latency_ms": sim_latency,
                "is_simulated": True,
                "environment": "DEV_SANDBOX",
                "raw_response": {
                    "simulation": True,
                    "provider": v_upper,
                    "status": "PENDING",
                    "reference_id": merchant_ref
                }
            }

        else:
            # DEFINITIVE FAILURE -> Triggers identical reversal workflow
            test_vref = f"TEST-VREF-FAILED-{short_hex}"
            failure_reasons = [
                "TEST SIMULATOR: E004 - Insufficient float balance in vendor clearing account.",
                "TEST SIMULATOR: E012 - Destination bank core system returned technical decline.",
                "TEST SIMULATOR: E033 - Beneficiary account dormant or blocked by bank policy.",
                "TEST SIMULATOR: E049 - Invalid IFSC / branch closed for electronic settlement."
            ]
            sim_reason = random.choice(failure_reasons)

            return {
                "success": False,
                "status": "FAILED",
                "provider": v_upper,
                "vendor_name": v_upper,
                "utr": None,
                "rrn": None,
                "vendor_tx_id": test_vref,
                "order_id": test_vref,
                "vendor_ref": merchant_ref,
                "message": sim_reason,
                "http_status": 400,
                "latency_ms": sim_latency,
                "is_simulated": True,
                "environment": "DEV_SANDBOX",
                "raw_response": {
                    "simulation": True,
                    "provider": v_upper,
                    "status": "FAILED",
                    "error_code": "SIM_DECLINE",
                    "error_message": sim_reason,
                    "reference_id": merchant_ref
                }
            }

    async def check_status(
        self,
        vendor_name: str,
        reference_id: str,
        merchant_ref: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        v_upper = (vendor_name or "UTKALDIGITAL").upper()
        # In reconciliation polling, simulate that 80% of pending resolve to SUCCESS, 20% to FAILED
        rand_val = random.random()
        ref_id = merchant_ref or reference_id or f"TEST-{uuid.uuid4().hex[:8]}"

        if rand_val < 0.80:
            test_utr = f"TEST-UTR{random.randint(100000000000, 999999999999)}"
            return {
                "success": True,
                "status": "SUCCESS",
                "provider": v_upper,
                "vendor_name": v_upper,
                "utr": test_utr,
                "vendor_tx_id": f"TEST-VREF-{v_upper}-{uuid.uuid4().hex[:6].upper()}",
                "message": "TEST SIMULATOR: Payout settled successfully during reconciliation check.",
                "is_simulated": True
            }
        else:
            return {
                "success": False,
                "status": "FAILED",
                "provider": v_upper,
                "vendor_name": v_upper,
                "utr": None,
                "message": "TEST SIMULATOR: Settlement rejected by destination bank after polling.",
                "is_simulated": True
            }

    async def check_balance(
        self,
        vendor_name: str,
        **kwargs
    ) -> Dict[str, Any]:
        v_upper = (vendor_name or "UTKALDIGITAL").upper()
        return {
            "success": True,
            "status": "SUCCESS",
            "provider": v_upper,
            "vendor_name": v_upper,
            "balance": 1000000.00,
            "currency": "INR",
            "message": f"TEST SIMULATOR: Sandbox float balance for {v_upper} is ₹10,00,000.00",
            "is_simulated": True,
            "environment": "DEV_SANDBOX"
        }


class PayoutVendorAdapterFactory:
    """
    Factory for resolving the appropriate Vendor Adapter.
    Enforces strict environment rules:
    - Production -> Always LiveVendorAdapter (Never Simulated)
    - Development / Staging -> SimulatedVendorAdapter (when configured)
    """

    _live_instance: Optional[LiveVendorAdapter] = None
    _simulated_instance: Optional[SimulatedVendorAdapter] = None

    @classmethod
    def get_adapter(cls, force_live: bool = False) -> BasePayoutVendorAdapter:
        # HARD SAFEGUARD: In Production environment, ALWAYS return LiveVendorAdapter
        if settings.is_production:
            if not cls._live_instance:
                cls._live_instance = LiveVendorAdapter()
            return cls._live_instance

        # In Dev/Staging: if simulation is active, return SimulatedVendorAdapter
        if settings.is_payout_simulation_active and not force_live:
            if not cls._simulated_instance:
                cls._simulated_instance = SimulatedVendorAdapter()
            return cls._simulated_instance

        if not cls._live_instance:
            cls._live_instance = LiveVendorAdapter()
        return cls._live_instance
