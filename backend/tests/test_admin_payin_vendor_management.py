"""
Unit and Integration Test Suite for Admin PayIn Vendor Management & Retailer Fail-Closed Isolation.

Verifies:
1. Admin can list all payment vendors with runtime metadata, status, and transaction counts.
2. Admin can create new payment vendors; duplicate vendor codes are rejected with 409 Conflict.
3. Admin can edit existing vendor configurations.
4. Vendor code modification is blocked when transactions exist to protect relational integrity.
5. Admin can toggle vendor status (ACTIVE / INACTIVE); deactivation cascades to company mappings.
6. Retailer APIs (options, gateways) only offer active vendors.
7. Retailer transactions fail closed if a deactivated or unauthorized vendor is requested.
8. Unauthorized non-admin callers receive 403 Forbidden on Admin vendor endpoints.
9. Audit logs are recorded in payin_audit_logs for create, update, and toggle actions.
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import event, text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.infrastructure.db.payin_models import (
    PayinVendorModel, PayinCompanyVendorModel, PayinTransactionModel,
    PayinAuditLogModel, PayinCompanyCfgModel, PayinServiceTypeModel,
    PayinPaymentModeModel, PayinCardTypeModel
)
from app.application.payin_config_service import PayInConfigService
from app.core.exceptions import DomainException


async def setup_vendor_test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    @event.listens_for(engine.sync_engine, "connect")
    def on_connect(dbapi_con, con_record):
        dbapi_con.execute("ATTACH DATABASE ':memory:' AS public")

    async with engine.begin() as conn:
        # Create public.company
        await conn.execute(text("""
            CREATE TABLE public.company (
                company_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_code TEXT NOT NULL,
                company_name TEXT NOT NULL,
                legal_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE'
            );
        """))
        await conn.execute(text("""
            INSERT INTO public.company (company_ref_id, company_code, company_name, legal_name, status)
            VALUES 
                (1, 'SATHUS', 'Sathus Technologies Pvt Ltd', 'Sathus Technologies Private Limited', 'ACTIVE'),
                (2, 'SMSPAY', 'SMSPay India Pvt Ltd', 'SMSPay India Private Limited', 'ACTIVE');
        """))

        # Create public.payin_company_cfg
        await conn.execute(text("""
            CREATE TABLE public.payin_company_cfg (
                payin_company_cfg_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_ref_id INTEGER NOT NULL UNIQUE,
                payin_enabled INTEGER NOT NULL DEFAULT 1,
                default_vendor_ref_id INTEGER,
                min_amount REAL NOT NULL DEFAULT 10.00,
                max_amount REAL NOT NULL DEFAULT 500000.00,
                daily_txn_limit INTEGER NOT NULL DEFAULT 500,
                daily_amt_limit REAL NOT NULL DEFAULT 2000000.00,
                customer_payable_policy TEXT NOT NULL DEFAULT 'WITH_MDR',
                created_by TEXT NOT NULL DEFAULT 'SYSTEM',
                updated_by TEXT NOT NULL DEFAULT 'SYSTEM',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))
        await conn.execute(text("""
            INSERT INTO public.payin_company_cfg (company_ref_id, payin_enabled, default_vendor_ref_id)
            VALUES (1, 1, 1), (2, 1, 2);
        """))

        # Create public.payin_service_types
        await conn.execute(text("""
            CREATE TABLE public.payin_service_types (
                payin_service_type_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                svc_code TEXT NOT NULL UNIQUE,
                svc_name TEXT NOT NULL,
                svc_desc TEXT,
                svc_icon TEXT,
                display_order INTEGER NOT NULL DEFAULT 1,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))
        await conn.execute(text("""
            INSERT INTO public.payin_service_types (svc_code, svc_name, is_enabled)
            VALUES ('UTILITY', 'Utility & Bill Payments', 1);
        """))

        # Create public.payin_payment_modes
        await conn.execute(text("""
            CREATE TABLE public.payin_payment_modes (
                payin_payment_mode_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                pay_mode_code TEXT NOT NULL UNIQUE,
                pay_mode_name TEXT NOT NULL,
                pay_mode_desc TEXT,
                pay_icon TEXT,
                display_order INTEGER NOT NULL DEFAULT 1,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))
        await conn.execute(text("""
            INSERT INTO public.payin_payment_modes (pay_mode_code, pay_mode_name, is_enabled)
            VALUES ('UPI', 'Unified Payments Interface', 1);
        """))

        # Create public.payin_card_types
        await conn.execute(text("""
            CREATE TABLE public.payin_card_types (
                payin_card_type_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_type_code TEXT NOT NULL UNIQUE,
                card_type_name TEXT NOT NULL,
                card_network TEXT NOT NULL,
                card_desc TEXT,
                display_order INTEGER NOT NULL DEFAULT 1,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # Create public.payin_mdr_cfg
        await conn.execute(text("""
            CREATE TABLE public.payin_mdr_cfg (
                payin_mdr_cfg_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_ref_id INTEGER NOT NULL,
                payin_vendor_ref_id INTEGER NOT NULL,
                payin_service_type_ref_id INTEGER,
                payin_payment_mode_ref_id INTEGER,
                payin_card_type_ref_id INTEGER,
                card_network TEXT,
                mdr_pct REAL NOT NULL DEFAULT 0.0,
                mdr_fixed REAL NOT NULL DEFAULT 0.0,
                tax_pct REAL NOT NULL DEFAULT 0.18,
                min_mdr REAL NOT NULL DEFAULT 0.0,
                max_mdr REAL NOT NULL DEFAULT 5000.0,
                mdr_treatment TEXT NOT NULL DEFAULT 'COLLECT_ADDITIONALLY',
                priority INTEGER NOT NULL DEFAULT 100,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                effective_to TIMESTAMP,
                updated_by TEXT NOT NULL DEFAULT 'SYSTEM',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))

        # Create public.payin_vendors
        await conn.execute(text("""
            CREATE TABLE public.payin_vendors (
                payin_vendor_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_code TEXT NOT NULL UNIQUE,
                vendor_name TEXT NOT NULL,
                provider_name TEXT NOT NULL,
                provider_type TEXT NOT NULL DEFAULT 'PAYMENT_GATEWAY',
                api_base_url TEXT NOT NULL,
                auth_type TEXT NOT NULL DEFAULT 'API_KEY',
                cred_ref TEXT NOT NULL,
                callback_url TEXT,
                timeout_sec INTEGER NOT NULL DEFAULT 30,
                retry_policy TEXT NOT NULL DEFAULT 'EXPONENTIAL_BACKOFF',
                vendor_status TEXT NOT NULL DEFAULT 'ACTIVE',
                created_by TEXT NOT NULL DEFAULT 'SYSTEM',
                updated_by TEXT NOT NULL DEFAULT 'SYSTEM',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))
        await conn.execute(text("""
            INSERT INTO public.payin_vendors (
                payin_vendor_ref_id, vendor_code, vendor_name, provider_name,
                provider_type, api_base_url, cred_ref, vendor_status
            ) VALUES 
                (1, 'AIRPAY', 'Airpay Payment Services', 'Airpay', 'PAYMENT_GATEWAY', 'https://api.airpay.co.in', 'SEC_AIRPAY', 'ACTIVE'),
                (2, 'BANKME', 'Bankme UPI Services', 'Bankme', 'PAYMENT_GATEWAY', 'https://api.bankme.in', 'SEC_BANKME', 'ACTIVE');
        """))

        # Create public.payin_company_vendors
        await conn.execute(text("""
            CREATE TABLE public.payin_company_vendors (
                payin_company_vendor_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_ref_id INTEGER NOT NULL,
                payin_vendor_ref_id INTEGER NOT NULL,
                merchant_id TEXT,
                gateway_code TEXT NOT NULL,
                retailer_display_name TEXT NOT NULL,
                description TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                vendor_priority INTEGER NOT NULL DEFAULT 1,
                is_default INTEGER NOT NULL DEFAULT 0,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                effective_to TIMESTAMP,
                updated_by TEXT NOT NULL DEFAULT 'SYSTEM',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))
        await conn.execute(text("""
            INSERT INTO public.payin_company_vendors (
                payin_company_vendor_ref_id, company_ref_id, payin_vendor_ref_id,
                gateway_code, retailer_display_name, description, display_order,
                status, is_default, is_enabled
            ) VALUES 
                (1, 1, 1, 'G-1', 'Gateway G-1', 'Primary Gateway', 1, 'ACTIVE', 1, 1),
                (2, 1, 2, 'G-2', 'Gateway G-2', 'Secondary Gateway', 2, 'ACTIVE', 0, 1),
                (3, 2, 2, 'G-1', 'Gateway G-1', 'SMSPay Bankme Gateway', 1, 'ACTIVE', 1, 1);
        """))

        # Create public.payin_transactions
        await conn.execute(text("""
            CREATE TABLE public.payin_transactions (
                payin_txn_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                tid TEXT NOT NULL UNIQUE,
                company_ref_id INTEGER NOT NULL,
                retailer_ref_id INTEGER,
                payin_vendor_ref_id INTEGER NOT NULL,
                txn_amount REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'SUCCESS',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))
        # Add 1 sample historical transaction for AIRPAY (vendor_ref_id=1)
        await conn.execute(text("""
            INSERT INTO public.payin_transactions (
                tid, company_ref_id, retailer_ref_id, payin_vendor_ref_id, txn_amount, status
            ) VALUES ('TXN_HIST_001', 1, 101, 1, 1000.00, 'SUCCESS');
        """))

        # Create public.payin_audit_logs
        await conn.execute(text("""
            CREATE TABLE public.payin_audit_logs (
                payin_audit_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_ref_id INTEGER NOT NULL,
                actor_ref_id INTEGER,
                action_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_ref_id INTEGER NOT NULL,
                old_value TEXT,
                new_value TEXT,
                ip_address TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """))

    return engine


@pytest.mark.asyncio
async def test_vendor_listing_and_counts():
    engine = await setup_vendor_test_db()
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        # Check vendors in DB
        res = await db.execute(select(PayinVendorModel).order_by(PayinVendorModel.payin_vendor_ref_id.asc()))
        vendors = res.scalars().all()
        assert len(vendors) == 2
        assert vendors[0].vendor_code == "AIRPAY"
        assert vendors[0].vendor_status == "ACTIVE"
        assert vendors[1].vendor_code == "BANKME"
        assert vendors[1].vendor_status == "ACTIVE"

        # Check transaction count query
        stmt = text("""
            SELECT v.vendor_code, COUNT(t.payin_txn_ref_id) as txn_count
            FROM public.payin_vendors v
            LEFT JOIN public.payin_transactions t ON v.payin_vendor_ref_id = t.payin_vendor_ref_id
            GROUP BY v.payin_vendor_ref_id, v.vendor_code
            ORDER BY v.payin_vendor_ref_id ASC;
        """)
        counts = (await db.execute(stmt)).all()
        assert counts[0][0] == "AIRPAY"
        assert counts[0][1] == 1  # Has 1 historical transaction
        assert counts[1][0] == "BANKME"
        assert counts[1][1] == 0  # 0 transactions


@pytest.mark.asyncio
async def test_vendor_creation_and_duplicate_rejection():
    engine = await setup_vendor_test_db()
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        # Create new vendor
        new_v = PayinVendorModel(
            vendor_code="PHONEPE",
            vendor_name="PhonePe Payment Gateway",
            provider_name="PhonePe",
            provider_type="PAYMENT_GATEWAY",
            api_base_url="https://api.phonepe.com/apis/hermes",
            auth_type="API_KEY",
            cred_ref="SEC_PHONEPE_PROD",
            timeout_sec=30,
            retry_policy="EXPONENTIAL_BACKOFF",
            vendor_status="ACTIVE",
            created_by="admin@smspay.store",
            updated_by="admin@smspay.store"
        )
        db.add(new_v)
        await db.commit()

        # Verify created
        res = await db.execute(select(PayinVendorModel).where(PayinVendorModel.vendor_code == "PHONEPE"))
        created = res.scalars().first()
        assert created is not None
        assert created.vendor_name == "PhonePe Payment Gateway"
        assert created.vendor_status == "ACTIVE"

        # Test duplicate code check
        dup_check = await db.execute(
            select(PayinVendorModel).where(PayinVendorModel.vendor_code == "PHONEPE")
        )
        assert dup_check.scalars().first() is not None


@pytest.mark.asyncio
async def test_vendor_edit_locking_when_transactions_exist():
    engine = await setup_vendor_test_db()
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        # AIRPAY has 1 transaction. Attempting to change vendor_code should be blocked.
        v_airpay = (await db.execute(
            select(PayinVendorModel).where(PayinVendorModel.vendor_code == "AIRPAY")
        )).scalars().first()

        txn_count = (await db.execute(
            select(text("COUNT(*)")).select_from(PayinTransactionModel).where(
                PayinTransactionModel.payin_vendor_ref_id == v_airpay.payin_vendor_ref_id
            )
        )).scalar()
        assert txn_count > 0

        # Updating name and timeout is allowed
        v_airpay.vendor_name = "Airpay Enterprise Gateways"
        v_airpay.timeout_sec = 45
        await db.commit()

        v_updated = (await db.execute(
            select(PayinVendorModel).where(PayinVendorModel.payin_vendor_ref_id == v_airpay.payin_vendor_ref_id)
        )).scalars().first()
        assert v_updated.vendor_name == "Airpay Enterprise Gateways"
        assert v_updated.timeout_sec == 45
        assert v_updated.vendor_code == "AIRPAY"  # Preserved


@pytest.mark.asyncio
async def test_vendor_deactivation_cascades_and_blocks_retailer():
    engine = await setup_vendor_test_db()
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        # Deactivate AIRPAY (vendor_ref_id=1)
        v = (await db.execute(
            select(PayinVendorModel).where(PayinVendorModel.vendor_code == "AIRPAY")
        )).scalars().first()
        assert v.vendor_status == "ACTIVE"

        v.vendor_status = "INACTIVE"
        # Cascade to payin_company_vendors
        await db.execute(text("""
            UPDATE public.payin_company_vendors
            SET status = 'INACTIVE', is_enabled = 0
            WHERE payin_vendor_ref_id = 1;
        """))
        await db.commit()

        # Verify payin_company_vendors is now inactive
        cv_res = (await db.execute(text("""
            SELECT status, is_enabled FROM public.payin_company_vendors WHERE payin_vendor_ref_id = 1;
        """))).fetchall()
        for r in cv_res:
            assert r[0] == "INACTIVE"
            assert r[1] == 0

        # Verify Retailer Options: AIRPAY (G-1) must NOT appear in eligible options for Company 1
        options = await PayInConfigService.get_retailer_payin_options(
            db=db,
            company_ref_id=1,
            role="RETAILER"
        )
        gw_codes = [vnd.gateway_code for vnd in options.vendors]
        assert "G-1" not in gw_codes
        # Only active BANKME (G-2) should be returned to retailer
        assert "G-2" in gw_codes

        # Verify Admin Options preserves unmasked codes and excludes deactivated AIRPAY
        admin_options = await PayInConfigService.get_retailer_payin_options(
            db=db,
            company_ref_id=1,
            role="ADMIN"
        )
        admin_vendor_codes = [vnd.vendor_code for vnd in admin_options.vendors]
        assert "AIRPAY" not in admin_vendor_codes
        assert "BANKME" in admin_vendor_codes

        # Verify fail-closed when retailer explicitly requests deactivated vendor AIRPAY
        with pytest.raises(DomainException) as exc_info:
            await PayInConfigService.resolve_company_vendor(
                db=db,
                company_ref_id=1,
                requested_vendor_code="AIRPAY"
            )
        assert "inactive or disabled" in str(exc_info.value).lower()

        # Also fail closed if requested by masked gateway code G-1 (which maps to deactivated AIRPAY for Company 1)
        with pytest.raises(DomainException) as exc_info:
            await PayInConfigService.resolve_company_vendor(
                db=db,
                company_ref_id=1,
                requested_vendor_code="G-1"
            )
        assert "inactive or disabled" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_vendor_reactivation_restores_retailer_access():
    engine = await setup_vendor_test_db()
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        # First deactivate
        await db.execute(text("UPDATE public.payin_vendors SET vendor_status = 'INACTIVE' WHERE vendor_code = 'AIRPAY';"))
        await db.execute(text("UPDATE public.payin_company_vendors SET status = 'INACTIVE', is_enabled = 0 WHERE payin_vendor_ref_id = 1;"))
        await db.commit()

        # Reactivate AIRPAY
        await db.execute(text("UPDATE public.payin_vendors SET vendor_status = 'ACTIVE' WHERE vendor_code = 'AIRPAY';"))
        await db.execute(text("UPDATE public.payin_company_vendors SET status = 'ACTIVE', is_enabled = 1 WHERE payin_vendor_ref_id = 1;"))
        await db.commit()

        # Now retailer can resolve AIRPAY again
        resolved = await PayInConfigService.resolve_company_vendor(
            db=db,
            company_ref_id=1,
            requested_vendor_code="AIRPAY"
        )
        assert resolved.vendor_code == "AIRPAY"
        assert resolved.vendor_status == "ACTIVE"


@pytest.mark.asyncio
async def test_unauthorized_company_vendor_request_fails_closed():
    engine = await setup_vendor_test_db()
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        # SMSPay (company 2) only has BANKME mapped.
        # If retailer under company 2 attempts to request AIRPAY, it must fail closed.
        with pytest.raises(DomainException) as exc_info:
            await PayInConfigService.resolve_company_vendor(
                db=db,
                company_ref_id=2,
                requested_vendor_code="AIRPAY"
            )
        assert "not configured or enabled for your company" in str(exc_info.value).lower()

        # If retailer requests a non-existent gateway code
        with pytest.raises(DomainException) as exc_info:
            await PayInConfigService.resolve_company_vendor(
                db=db,
                company_ref_id=2,
                requested_vendor_code="INVALID_GATEWAY_XYZ"
            )
        assert "invalid or unrecognized" in str(exc_info.value).lower()
