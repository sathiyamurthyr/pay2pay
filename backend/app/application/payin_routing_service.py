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
        - Any other company without a configured live adapter must NOT route to another company's provider.
        """
        if authenticated_company_ref_id is None:
            raise ValueError("Missing authenticated company_ref_id for PayIn routing.")

        try:
            ref_int = int(authenticated_company_ref_id)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid company_ref_id: {authenticated_company_ref_id}")

        if ref_int == SMSPAY_COMPANY_REF_ID:
            logger.info("Routing to BANKME PayIn provider for SMSPay (company_ref_id=%d)", ref_int)
            return PayInProvider.BANKME

        raise ValueError(f"No live PayIn provider configured for company_ref_id={ref_int}")

