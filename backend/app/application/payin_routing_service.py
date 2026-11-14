"""
Enterprise Company Ref ID Provider Routing Service.
Strict Governance Rule:
- SMSPay Company Ref ID (2) -> BankMe PayIn Provider
- All Other Company Ref IDs -> Existing PayIn Processing
- Never use company_type_id, user role, or client body inputs for routing.
"""

import logging
from enum import Enum
from typing import Optional, Dict, Any

logger = logging.getLogger("payin_routing_service")

# Authoritative verified Company Ref ID for SMSPay
SMSPAY_COMPANY_REF_ID: int = 2


class PayInProvider(str, Enum):
    BANKME = "BANKME"
    EXISTING = "EXISTING"


class PayInRoutingService:
    """
    Authoritative Server-Side Provider Routing Engine.
    Resolves the execution gateway exclusively from the authenticated Company Ref ID.
    """

    @classmethod
    def resolve_provider(cls, authenticated_company_ref_id: Optional[int]) -> PayInProvider:
        """
        Resolves payment provider strictly using authenticated Company Ref ID.

        Rules:
        - company_ref_id == 2 (SMSPay) -> BANKME
        - company_ref_id != 2 (Near4You=1, Pay2Pay=47, etc.) -> EXISTING
        - Missing or invalid company_ref_id -> Defaults safely to EXISTING
        """
        if authenticated_company_ref_id is None:
            logger.warning("No authenticated company_ref_id provided. Defaulting to EXISTING provider.")
            return PayInProvider.EXISTING

        try:
            ref_int = int(authenticated_company_ref_id)
        except (ValueError, TypeError):
            logger.error("Invalid non-integer company_ref_id: %s. Defaulting to EXISTING provider.", authenticated_company_ref_id)
            return PayInProvider.EXISTING

        if ref_int == SMSPAY_COMPANY_REF_ID:
            logger.info("Routing to BANKME PayIn provider for SMSPay (company_ref_id=%d)", ref_int)
            return PayInProvider.BANKME

        logger.info("Routing to EXISTING PayIn provider for company_ref_id=%d", ref_int)
        return PayInProvider.EXISTING

