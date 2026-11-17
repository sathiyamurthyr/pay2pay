"""
Centralized Payment Gateway Vendor Name Masking Service.
Enterprise Standard for Sathus Financial Applications (Pay2Pay, Near4You, SMSPAY).

Purpose:
- Masks real vendor/provider names (e.g. BankMe, Existing) in customer-facing payment interfaces.
- Replaces them with stable, generic gateway identifiers:
  * Provider A (BANKME, ID: 1)  -> Gateway G-1 (code: "G-1")
  * Provider B (EXISTING, ID: 3) -> Gateway G-2 (code: "G-2")
- Ensures customer-facing interfaces display EXACTLY G-1 and G-2 (no other gateway entries).
- Preserves internal provider identifiers, backend adapters, API integrations, callbacks, and webhooks.
- Preserves authorized administrative visibility for role-based auditing.
"""

import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("gateway_masking_service")

# ─── CENTRALIZED GATEWAY CONFIGURATION ───
# Statically stable and dynamically configurable mapping
GATEWAY_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "BANKME": {
        "gateway_id": "gateway-g1",
        "gateway_code": "G-1",
        "display_name": "Gateway G-1",
        "subtitle": "Primary Payment Gateway",
        "internal_provider": "BANKME",
        "internal_vendor_ref_id": 1,
        "is_active": True,
        "badge": "Active",
        "badge_color": "#10B981",
        "icon_text": "G-1",
        "display_order": 1,
        "supported_methods": ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING"],
        "description": "Fast and secure payment processing with instant confirmation."
    },
    "EXISTING": {
        "gateway_id": "gateway-g2",
        "gateway_code": "G-2",
        "display_name": "Gateway G-2",
        "subtitle": "Secondary Payment Gateway",
        "internal_provider": "EXISTING",
        "internal_vendor_ref_id": 3,
        "is_active": True,
        "badge": "Active",
        "badge_color": "#10B981",
        "icon_text": "G-2",
        "display_order": 2,
        "supported_methods": ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING"],
        "description": "Enterprise-grade payment gateway with redundant routing."
    }
}

# Fast lookup mappings
CODE_TO_INTERNAL = {
    "G-1": "BANKME",
    "G1": "BANKME",
    "GATEWAY-G1": "BANKME",
    "GATEWAY_G1": "BANKME",
    "BANKME": "BANKME",
    "BANK_ME": "BANKME",
    "G-2": "EXISTING",
    "G2": "EXISTING",
    "GATEWAY-G2": "EXISTING",
    "GATEWAY_G2": "EXISTING",
    "EXISTING": "EXISTING"
}

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN", "COMPANY_ADMIN", "OPS_ADMIN", "FINANCE_ADMIN"}


class GatewayMaskingService:
    """
    Centralized Gateway Masking & Dynamic Translation Service.
    """

    @classmethod
    def is_admin_role(cls, role: Optional[str]) -> bool:
        """Determines if a user role is an authorized administrator."""
        if not role:
            return False
        return str(role).strip().upper() in ADMIN_ROLES

    @classmethod
    def is_customer_facing_role(cls, role: Optional[str]) -> bool:
        """Determines if a user role is customer-facing (retailer, distributor, etc.)."""
        return not cls.is_admin_role(role)

    @classmethod
    def resolve_internal_vendor(cls, code: Optional[str]) -> Optional[str]:
        """
        Translates a customer-facing gateway code (e.g. 'G-1', 'G-2')
        or internal provider identifier into the canonical internal vendor code.
        """
        if not code:
            return None
        cleaned = str(code).strip().upper()
        return CODE_TO_INTERNAL.get(cleaned, cleaned)

    @classmethod
    def get_gateway_code(cls, internal_vendor_or_id: Any) -> str:
        """
        Maps an internal vendor identifier (code or integer ID) to customer-facing code (G-1 or G-2).
        """
        if isinstance(internal_vendor_or_id, int):
            if internal_vendor_or_id == 1:
                return "G-1"
            if internal_vendor_or_id == 3:
                return "G-2"
            return "G-1"

        cleaned = str(internal_vendor_or_id or "").strip().upper()
        if "BANKME" in cleaned or cleaned in ("1", "G-1", "G1"):
            return "G-1"
        if "EXISTING" in cleaned or cleaned in ("3", "G-2", "G2"):
            return "G-2"
        return "G-1"

    @classmethod
    def get_masked_display_name(cls, internal_vendor: Optional[str], role: Optional[str] = None) -> str:
        """
        Returns the appropriate gateway name:
        - Customer-facing: 'Gateway G-1' or 'Gateway G-2'
        - Authorized Admin: actual provider name if permitted, or formatted gateway name.
        """
        g_code = cls.get_gateway_code(internal_vendor)
        if cls.is_admin_role(role):
            # Admins may see actual provider name
            canon = cls.resolve_internal_vendor(internal_vendor)
            return "BankMe Technologies" if canon == "BANKME" else "Existing Gateway"

        return f"Gateway {g_code}"

    @classmethod
    def get_customer_gateway_options(cls) -> List[Dict[str, Any]]:
        """
        Returns exactly the two authorized customer-facing gateway records (G-1 and G-2).
        No other gateways are ever exposed to customers.
        """
        return [
            {
                "payin_vendor_ref_id": 1,
                "vendor_code": "G-1",
                "vendor_name": "Gateway G-1",
                "provider_name": "Gateway G-1",
                "gateway_code": "G-1",
                "display_name": "Gateway G-1",
                "subtitle": "Primary Payment Gateway",
                "badge": "Active",
                "is_active": True,
                "is_default": True
            },
            {
                "payin_vendor_ref_id": 3,
                "vendor_code": "G-2",
                "vendor_name": "Gateway G-2",
                "provider_name": "Gateway G-2",
                "gateway_code": "G-2",
                "display_name": "Gateway G-2",
                "subtitle": "Secondary Payment Gateway",
                "badge": "Active",
                "is_active": True,
                "is_default": False
            }
        ]
