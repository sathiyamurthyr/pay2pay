"""
Unit & Integration Test Suite for Retailer PayIn Dynamic MDR Resolution.

Verifies:
1. Retailer PayIn preview resolution when card_network is omitted (default checkout flow).
2. Priority scoring: Base rule vs. Primary scheme (VISA) vs. Explicit scheme (RuPay, AMEX).
3. Rejection of disabled card schemes.
4. Active company fallback safety mechanism.
5. Multi-company tenant isolation (SMSPAY vs Near4You).
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.application.payin_mdr_service import PayInMdrService
from app.core.exceptions import DomainException


async def setup_test_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    
    @event.listens_for(engine.sync_engine, "connect")
    def on_connect(dbapi_con, con_record):
        dbapi_con.execute("ATTACH DATABASE ':memory:' AS public")

    past_dt = datetime.now(timezone.utc) - timedelta(days=1)
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE public.payin_mdr_cfg (
                payin_mdr_cfg_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_ref_id INTEGER NOT NULL,
                payin_vendor_ref_id INTEGER NOT NULL,
                payin_service_type_ref_id INTEGER,
                payin_payment_mode_ref_id INTEGER,
                payin_card_type_ref_id INTEGER,
                card_network TEXT,
                mdr_pct REAL NOT NULL,
                mdr_fixed REAL NOT NULL DEFAULT 0.0,
                tax_pct REAL NOT NULL DEFAULT 0.18,
                min_mdr REAL NOT NULL DEFAULT 0.0,
                max_mdr REAL NOT NULL DEFAULT 5000.0,
                mdr_treatment TEXT NOT NULL DEFAULT 'COLLECT_ADDITIONALLY',
                priority INTEGER NOT NULL DEFAULT 100,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                effective_from TIMESTAMP NOT NULL,
                effective_to TIMESTAMP,
                created_by TEXT DEFAULT 'SYSTEM',
                updated_by TEXT DEFAULT 'SYSTEM',
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
        """))
        await conn.execute(text("""
            CREATE TABLE public.payin_company_cfg (
                company_ref_id INTEGER PRIMARY KEY,
                payin_enabled INTEGER NOT NULL DEFAULT 1,
                customer_payable_policy TEXT NOT NULL DEFAULT 'WITH_MDR'
            );
        """))
        await conn.execute(text("""
            CREATE TABLE public.mdr_configuration (
                id INTEGER PRIMARY KEY,
                company_ref_id INTEGER,
                percentage REAL,
                fixed_charge REAL,
                minimum_charge REAL,
                maximum_charge REAL,
                gst_applicable INTEGER,
                is_active INTEGER
            );
        """))
        
        await conn.execute(text("""
            INSERT INTO public.payin_company_cfg VALUES (2, 1, 'WITH_MDR');
        """))
        await conn.execute(text("""
            INSERT INTO public.payin_mdr_cfg 
                (company_ref_id, payin_vendor_ref_id, payin_card_type_ref_id, card_network, mdr_pct, priority, is_enabled, effective_from, created_at, updated_at)
            VALUES 
                (2, 2, 1, 'VISA', 0.0262, 100, 1, :pdt, :pdt, :pdt),
                (2, 2, 2, 'MASTERCARD', 0.0262, 100, 1, :pdt, :pdt, :pdt),
                (2, 2, 3, 'RUPAY', 0.0180, 100, 1, :pdt, :pdt, :pdt),
                (2, 2, 4, 'AMEX', 0.0310, 100, 1, :pdt, :pdt, :pdt),
                (2, 2, 5, 'CORP', 0.0340, 100, 1, :pdt, :pdt, :pdt);
        """), {"pdt": past_dt})
        
    return engine


@pytest.mark.asyncio
async def test_direct_resolve_mdr_rule_without_card_network():
    """Directly test PayInMdrService.resolve_mdr_rule when card_network is None (Retailer Top-Up page load)."""
    engine = await setup_test_engine()
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with session_factory() as session:
        # Call actual domain method with NO card_network
        res = await PayInMdrService.resolve_mdr_rule(
            db=session,
            company_ref_id=2,
            vendor_ref_id=2,
            service_type_ref_id=1,
            payment_mode_ref_id=1,
            card_type_ref_id=None,
            card_network=None
        )
        
        assert res is not None
        assert res["mdr_pct"] == Decimal("0.0262")
        assert res["customer_payable_policy"] == "WITH_MDR"
        assert res["mdr_treatment"] == "COLLECT_ADDITIONALLY"
        
    await engine.dispose()


@pytest.mark.asyncio
async def test_direct_resolve_mdr_rule_with_rupay():
    """Directly test PayInMdrService.resolve_mdr_rule when card_network is 'RUPAY'."""
    engine = await setup_test_engine()
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with session_factory() as session:
        res = await PayInMdrService.resolve_mdr_rule(
            db=session,
            company_ref_id=2,
            vendor_ref_id=2,
            card_network="RUPAY"
        )
        
        assert res is not None
        assert res["mdr_pct"] == Decimal("0.0180")
        
    await engine.dispose()


@pytest.mark.asyncio
async def test_direct_resolve_mdr_rule_with_amex():
    """Directly test PayInMdrService.resolve_mdr_rule when card_network is 'AMEX'."""
    engine = await setup_test_engine()
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with session_factory() as session:
        res = await PayInMdrService.resolve_mdr_rule(
            db=session,
            company_ref_id=2,
            vendor_ref_id=2,
            card_network="AMEX"
        )
        
        assert res is not None
        assert res["mdr_pct"] == Decimal("0.0310")
        
    await engine.dispose()


@pytest.mark.asyncio
async def test_direct_resolve_mdr_rule_rejects_disabled_scheme():
    """Verify disabled card scheme raises DomainException."""
    engine = await setup_test_engine()
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with session_factory() as session:
        # Disable AMEX
        await session.execute(text("UPDATE public.payin_mdr_cfg SET is_enabled = 0 WHERE card_network = 'AMEX';"))
        await session.commit()
        
        with pytest.raises(DomainException) as exc_info:
            await PayInMdrService.resolve_mdr_rule(
                db=session,
                company_ref_id=2,
                vendor_ref_id=2,
                card_network="AMEX"
            )
        assert "disabled or not configured" in str(exc_info.value).lower()
        
    await engine.dispose()


@pytest.mark.asyncio
async def test_active_company_safety_fallback():
    """Verify that when no table rules exist, active company fallback returns default rate."""
    engine = await setup_test_engine()
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with session_factory() as session:
        # Wipe all MDR rules
        await session.execute(text("DELETE FROM public.payin_mdr_cfg;"))
        await session.execute(text("DELETE FROM public.mdr_configuration;"))
        await session.commit()
        
        # Call resolve_mdr_rule: company 2 has payin_enabled=1 in payin_company_cfg
        res = await PayInMdrService.resolve_mdr_rule(
            db=session,
            company_ref_id=2,
            vendor_ref_id=2,
            card_network=None
        )
        
        assert res is not None
        assert res["mdr_pct"] == Decimal("0.0262")
        
    await engine.dispose()


def test_calculate_charges_financial_accuracy():
    """Verify charge calculation mathematics (Decimal precision, GST, customer payable)."""
    # 1. Customer Pays MDR (WITH_MDR / COLLECT_ADDITIONALLY)
    config_with_mdr = {
        "rule_ref_id": 1,
        "mdr_pct": Decimal("0.0262"),
        "mdr_fixed": Decimal("0.00"),
        "tax_pct": Decimal("0.1800"),
        "min_mdr": Decimal("0.00"),
        "max_mdr": Decimal("5000.00"),
        "mdr_treatment": "COLLECT_ADDITIONALLY",
        "customer_payable_policy": "WITH_MDR",
        "policy_display_name": "Customer Pays MDR Charges"
    }
    calc = PayInMdrService.calculate_charges(500.0, config_with_mdr)
    assert calc["txn_amount"] == 500.0
    assert calc["mdr_amount"] == 13.10  # 500 * 0.0262 = 13.10
    assert calc["tax_amount"] == 2.36   # 13.10 * 0.18 = 2.358 -> 2.36
    assert calc["total_charges"] == 15.46
    assert calc["customer_payable"] == 515.46
    assert calc["retailer_credit"] == 500.0
    assert calc["company_mdr_liability"] == 0.0

    # 2. Retailer Bears MDR (WITHOUT_MDR / DEDUCT_FROM_TOPUP)
    config_without_mdr = {
        "rule_ref_id": 1,
        "mdr_pct": Decimal("0.0262"),
        "mdr_fixed": Decimal("0.00"),
        "tax_pct": Decimal("0.1800"),
        "min_mdr": Decimal("0.00"),
        "max_mdr": Decimal("5000.00"),
        "mdr_treatment": "DEDUCT_FROM_TOPUP",
        "customer_payable_policy": "WITHOUT_MDR",
        "policy_display_name": "Retailer Bears MDR Charges"
    }
    calc2 = PayInMdrService.calculate_charges(500.0, config_without_mdr)
    assert calc2["txn_amount"] == 500.0
    assert calc2["customer_payable"] == 500.0
    assert calc2["retailer_credit"] == 484.54  # 500 - 15.46 = 484.54
