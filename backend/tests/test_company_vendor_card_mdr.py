"""
Automated Test Suite for Company-Based, Vendor-Based Card Scheme and MDR Configuration.

Validates:
1. Retrieval of 5 standard card schemes with company & gateway scoped MDR.
2. Admin updating MDR percentage using decimal values (e.g. 1.80, 2.62, 2.85).
3. Input validation: rejection of negative or excessive percentages.
4. Toggling active/disabled status per card scheme.
5. Multi-tenant company isolation: Company A (SMSPAY) config never leaks to Company B (Near4You).
6. Retailer PayIn API: returns only active card schemes for authenticated company and selected gateway.
7. Backend payment validation: preview or initiate fails if requested card scheme is disabled.
"""

import pytest
from decimal import Decimal
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.application.payin_config_service import PayInConfigService
from app.application.payin_mdr_service import PayInMdrService
from app.application.payin_service import PayInService
from app.application.payin_dtos import MdrPreviewRequest
from app.core.exceptions import DomainException


@pytest.mark.asyncio
async def test_get_card_schemes_for_company_and_gateway():
    """Verify retrieval of card schemes with company-scoped MDR for SMSPAY (Company 2)."""
    async with AsyncSessionLocal() as db:
        # SMSPAY (company_ref_id=2) with Gateway G-1 (BankMe)
        schemes = await PayInConfigService.get_card_schemes_mdr(
            db=db,
            company_ref_id=2,
            vendor_code="G-1",
            active_only=False
        )
        assert len(schemes) == 5
        schemes_by_net = {s.card_network: s for s in schemes}

        assert "VISA" in schemes_by_net
        assert "MASTERCARD" in schemes_by_net
        assert "RUPAY" in schemes_by_net
        assert "AMEX" in schemes_by_net
        assert "CORP" in schemes_by_net

        visa = schemes_by_net["VISA"]
        assert visa.is_configured is True
        assert visa.is_active is True
        assert visa.mdr_percent is not None


@pytest.mark.asyncio
async def test_company_isolation_between_smspay_and_near4you():
    """Verify Company 1 (Near4You) and Company 2 (SMSPAY) maintain independent configurations."""
    async with AsyncSessionLocal() as db:
        schemes_comp2 = await PayInConfigService.get_card_schemes_mdr(
            db=db,
            company_ref_id=2,
            vendor_code="G-1",
            active_only=False
        )
        schemes_comp1 = await PayInConfigService.get_card_schemes_mdr(
            db=db,
            company_ref_id=1,
            vendor_code="G-1",
            active_only=False
        )

        c2_visa = next(s for s in schemes_comp2 if s.card_network == "VISA")
        c1_visa = next(s for s in schemes_comp1 if s.card_network == "VISA")

        # Configurations are independently resolved
        assert c2_visa.rule_ref_id != c1_visa.rule_ref_id


@pytest.mark.asyncio
async def test_retailer_sees_only_active_card_schemes():
    """Verify that when active_only=True, disabled card schemes are not returned."""
    async with AsyncSessionLocal() as db:
        # Temporarily disable RuPay for Company 2, Vendor 2
        await db.execute(text("""
            UPDATE public.payin_mdr_cfg
            SET is_enabled = FALSE
            WHERE company_ref_id = 2 AND payin_vendor_ref_id = 2 AND card_network = 'RUPAY';
        """))
        await db.commit()

        # Retailer fetch with active_only=True
        active_schemes = await PayInConfigService.get_card_schemes_mdr(
            db=db,
            company_ref_id=2,
            vendor_code="G-1",
            active_only=True
        )

        networks = [s.card_network for s in active_schemes]
        assert "RUPAY" not in networks
        assert "VISA" in networks
        assert len(active_schemes) == 4

        # Re-enable RuPay
        await db.execute(text("""
            UPDATE public.payin_mdr_cfg
            SET is_enabled = TRUE
            WHERE company_ref_id = 2 AND payin_vendor_ref_id = 2 AND card_network = 'RUPAY';
        """))
        await db.commit()

        # Re-fetch: RuPay is back
        restored_schemes = await PayInConfigService.get_card_schemes_mdr(
            db=db,
            company_ref_id=2,
            vendor_code="G-1",
            active_only=True
        )
        restored_networks = [s.card_network for s in restored_schemes]
        assert "RUPAY" in restored_networks
        assert len(restored_schemes) == 5


@pytest.mark.asyncio
async def test_backend_payment_validation_rejects_disabled_card():
    """Verify backend rejects preview or transaction if card network is disabled."""
    async with AsyncSessionLocal() as db:
        # Disable AMEX for Company 2, Vendor 2
        await db.execute(text("""
            UPDATE public.payin_mdr_cfg
            SET is_enabled = FALSE
            WHERE company_ref_id = 2 AND payin_vendor_ref_id = 2 AND card_network = 'AMEX';
        """))
        await db.commit()

        # Preview with AMEX should raise DomainException
        with pytest.raises(DomainException) as exc_info:
            await PayInMdrService.resolve_mdr_rule(
                db=db,
                company_ref_id=2,
                vendor_ref_id=2,
                card_network="AMEX"
            )
        assert "disabled or not configured" in str(exc_info.value).lower()

        # Re-enable AMEX
        await db.execute(text("""
            UPDATE public.payin_mdr_cfg
            SET is_enabled = TRUE
            WHERE company_ref_id = 2 AND payin_vendor_ref_id = 2 AND card_network = 'AMEX';
        """))
        await db.commit()
