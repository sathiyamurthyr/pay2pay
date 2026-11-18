import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Import Base and register all models
from app.core.database import Base
import app.infrastructure.db.models
import app.infrastructure.db.auth_models
import app.infrastructure.db.payout_workflow_models
import app.infrastructure.db.ekyc_models
import app.infrastructure.db.epic014_models
import app.infrastructure.db.beneficiary_verification_models
import app.infrastructure.db.error_management_models
import app.infrastructure.db.enterprise_payout_models
import app.infrastructure.db.swipe_settlement_models
import app.infrastructure.db.registration_models
import app.infrastructure.db.session_security_models
import app.infrastructure.db.upi_vendor_models
import app.infrastructure.db.payin_models
import app.infrastructure.db.dmt_models
import app.infrastructure.db.aeps_models
import app.infrastructure.db.audio_models
import app.infrastructure.db.beneficiary_models
import app.infrastructure.db.customer_models
import app.infrastructure.db.policy_models

from app.core.security import hash_password

FINANCE_DB_URL = "postgresql+asyncpg://finance_app:nXiNUEaU2%40Bfevzwegx2%25mqLqNOcZG7H@10.8.0.1:6432/finance_prod"

async def init_finance_database():
    print(f"🚀 Initializing Sathus Finance PostgreSQL Database: finance_prod...")
    engine = create_async_engine(FINANCE_DB_URL, echo=False)

    print("📦 1. Creating Custom Enum Types...")
    async with engine.begin() as conn:
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE payout_transaction_status_enum AS ENUM (
                    'CREATED', 'MPIN_VERIFIED', 'VALIDATING', 'VALIDATED', 'INITIATED',
                    'WALLET_RESERVED', 'WALLET_DEBITED', 'LEDGER_POSTED', 'VENDOR_REQUEST_SENT',
                    'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSAL_INITIATED',
                    'REVERSED', 'PARTIALLY_REVERSED', 'HOLD', 'MANUAL_REVIEW', 'TIMEOUT',
                    'EXPIRED', 'CANCELLED', 'REJECTED', 'DUPLICATE', 'STATUS_CHECK_REQUIRED',
                    'SETTLEMENT_PENDING', 'SETTLED'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE swipe_settlement_status_enum AS ENUM (
                    'PENDING', 'PROCESSING', 'SETTLED', 'FAILED', 'REVERSED', 'HOLD'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))

    print("📦 2. Creating all ORM tables and constraints via Base.metadata...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("""
            ALTER TABLE IF EXISTS trusted_devices 
            ADD COLUMN IF NOT EXISTS tenant_ref_id BIGINT, 
            ADD COLUMN IF NOT EXISTS company_ref_id BIGINT;
        """))
    print("✅ All tables created successfully!")

    print("\n📦 2. Creating Views and Stored Procedures...")
    views_dir = BASE_DIR / "app" / "infrastructure" / "db" / "views"
    sps_dir = BASE_DIR / "app" / "infrastructure" / "db" / "sp"

    async with engine.begin() as conn:
        # Views
        if views_dir.exists():
            for vf in sorted(views_dir.glob("*.sql")):
                print(f"  -> Applying View: {vf.name}")
                sql = vf.read_text(encoding="utf-8")
                try:
                    await conn.execute(text(sql))
                except Exception as e:
                    print(f"     ⚠️ Error on {vf.name}: {e}")

        # Stored Procedures
        if sps_dir.exists():
            for sf in sorted(sps_dir.glob("*.sql")):
                print(f"  -> Applying SP: {sf.name}")
                sql = sf.read_text(encoding="utf-8")
                try:
                    await conn.execute(text(sql))
                except Exception as e:
                    print(f"     ⚠️ Error on {sf.name}: {e}")

    print("\n📦 3. Seeding Platform Tenants, User Types, Companies, and Users...")
    now_dt = datetime.now(timezone.utc)
    date_key = int(now_dt.strftime("%Y%m%d"))
    time_key = int(now_dt.strftime("%H%M%S"))

    # IDs
    tenant_sathus_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
    tenant_superrex_id = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")

    comp_sathus_id = uuid.UUID("c1111111-1111-1111-1111-111111111111")
    comp_superrex_id = uuid.UUID("b1e02b56-7742-4549-a4ef-31f5378f00a8")

    retailer_uuid = uuid.UUID("a1092800-0000-0000-0000-000000000001")
    admin_uuid = uuid.UUID("ad000000-0000-0000-0000-000000000001")

    sa_hash = hash_password("sa")

    async with engine.begin() as conn:
        # A. Tenants
        await conn.execute(text("""
            INSERT INTO tenant (
                public_id, tenant_id, tenant_ref_id, code, name, status,
                record_status, is_active, is_deleted, date_key, time_key, created_date, created_by, version_no
            ) VALUES 
            (:t1_id, :t1_id, 1, 'SATHUS', 'SATHUS TECHNOLOGY PVT LTD', 'ACTIVE', 'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1),
            (:t2_id, :t2_id, 39, 'SUPERREX', 'SUPER REX PRODUCTS PVT LTD', 'ACTIVE', 'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1)
            ON CONFLICT (public_id) DO NOTHING;
        """), {
            "t1_id": tenant_sathus_id,
            "t2_id": tenant_superrex_id,
            "dkey": date_key,
            "tkey": time_key,
            "now": now_dt
        })
        print("  ✅ Seeded Tenants (SATHUS & SUPERREX)")

        # B. User Types
        user_types = [
            (1, "ADMIN", "Administrator", "ADMIN", "Administrator", "Admin User", True, False),
            (2, "RETAILER", "Retailer", "RETAILER", "Retailer", "Retailer User", True, False),
            (3, "DISTRIBUTOR", "Distributor", "DISTRIBUTOR", "Distributor", "Distributor User", True, False),
            (4, "SD", "Super Distributor", "SD", "Super Distributor", "SD User", True, False),
            (5, "CRM", "Customer Relationship Manager", "CRM", "CRM", "CRM User", True, False),
            (6, "RM", "Regional Manager", "RM", "Regional Manager", "RM User", True, False),
            (7, "AUDIT", "Auditor", "AUDIT", "Auditor", "Audit User", True, False),
            (8, "OPERATIONS", "Operations", "OPERATIONS", "Operations", "Ops User", True, False),
            (9, "FINANCE", "Finance", "FINANCE", "Finance", "Finance User", True, False),
            (10, "SUPPORT", "Support", "SUPPORT", "Support", "Support User", True, False),
        ]
        for ut in user_types:
            await conn.execute(text("""
                INSERT INTO user_type (
                    user_type_ref_id, user_type_code, user_type_name, code, name, description, is_active, is_deleted
                ) VALUES (:ref_id, :code, :name, :code, :name, :desc, :active, :deleted)
                ON CONFLICT (user_type_ref_id) DO NOTHING;
            """), {
                "ref_id": ut[0], "code": ut[1], "name": ut[2], "desc": ut[5], "active": ut[6], "deleted": ut[7]
            })
        print("  ✅ Seeded 10 User Types")

        # C. Companies
        await conn.execute(text("""
            INSERT INTO company (
                public_id, company_ref_id, tenant_ref_id, tenant_id, company_code, company_name,
                legal_name, display_name, short_name, tenant_code, company_type, status, record_status, is_active, is_deleted,
                date_key, time_key, created_date, created_by, version_no
            ) VALUES 
            (:c1_id, 1, 1, :t1_id, 'SATHUS', 'SATHUS TECHNOLOGY PVT LTD', 'SATHUS TECHNOLOGY PVT LTD', 'Sathus Technology', 'SATHUS', 'SATHUS', 'PRIVATE_LIMITED', 'ACTIVE', 'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1),
            (:c2_id, 2, 39, :t2_id, 'SUPERREX', 'SUPER REX PRODUCTS PRIVATE LIMITED', 'SUPER REX PRODUCTS PRIVATE LIMITED', 'Super Rex Products', 'SUPERREX', 'SUPERREX', 'PRIVATE_LIMITED', 'ACTIVE', 'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1)
            ON CONFLICT (public_id) DO NOTHING;
        """), {
            "c1_id": comp_sathus_id, "t1_id": tenant_sathus_id,
            "c2_id": comp_superrex_id, "t2_id": tenant_superrex_id,
            "dkey": date_key, "tkey": time_key, "now": now_dt
        })
        print("  ✅ Seeded Companies (Sathus & Super Rex)")

        # D. Company Configuration (Domains) & Branding
        await conn.execute(text("""
            INSERT INTO company_configuration (
                public_id, company_id, tenant_id, config_key, config_value, category,
                record_status, is_active, is_deleted, created_date, created_by, version_no
            ) VALUES 
            (gen_random_uuid(), :c2_id, :t2_id, 'domains', '["smspay.store", "login.smspay.store", "smspay.in", "login.smspay.in", "pay2pay.in", "login.pay2pay.in", "near4you.store", "login.near4you.store"]', 'DOMAINS', 'ACTIVE', true, false, :now, 'SYSTEM', 1)
            ON CONFLICT DO NOTHING;
        """), {"c2_id": comp_superrex_id, "t2_id": tenant_superrex_id, "now": now_dt})

        await conn.execute(text("""
            INSERT INTO company_branding (
                public_id, company_id, tenant_id, logo_url, favicon_url, primary_colour, secondary_colour,
                record_status, is_active, is_deleted, created_date, created_by, version_no
            ) VALUES 
            (gen_random_uuid(), :c2_id, :t2_id, '/branding/smspay-logo.png', '/favicon.ico', '#059669', '#10B981', 'ACTIVE', true, false, :now, 'SYSTEM', 1)
            ON CONFLICT DO NOTHING;
        """), {"c2_id": comp_superrex_id, "t2_id": tenant_superrex_id, "now": now_dt})
        print("  ✅ Seeded Company Configurations & Branding")

        # E. Retailer Account: SMSP-R902523
        await conn.execute(text("""
            INSERT INTO retailer (
                public_id, retailer_ref_id, tenant_ref_id, company_ref_id, tenant_id, company_id,
                retailer_code, store_name, legal_name, owner_name, business_category, store_type,
                status, record_status, is_active, is_deleted, mpin_failed_attempts, mpin_max_attempts, mpin_locked,
                date_key, time_key, created_date, created_by, version_no
            ) VALUES (
                :r_id, 10928, 39, 2, :t2_id, :c2_id,
                'SMSP-R902523', 'INSPEL TECHNOLOGIES SOLUTIONS PVT', 'INSPEL TECHNOLOGIES SOLUTIONS PVT', 'Sathyamoorthy', 'FINTECH', 'ENTERPRISE',
                'ACTIVE', 'ACTIVE', true, false, 0, 5, false, :dkey, :tkey, :now, 'SYSTEM', 1
            ) ON CONFLICT (public_id) DO NOTHING;
        """), {
            "r_id": retailer_uuid, "t2_id": tenant_superrex_id, "c2_id": comp_superrex_id,
            "dkey": date_key, "tkey": time_key, "now": now_dt
        })

        await conn.execute(text("""
            INSERT INTO retailer_contact (
                public_id, retailer_id, tenant_id, company_id, mobile, email, primary_contact,
                record_status, is_active, is_deleted, date_key, time_key, created_date, created_by, version_no
            ) VALUES (
                gen_random_uuid(), :r_id, :t2_id, :c2_id, '9025232475', 'sathiyamurthyr12@gmail.com', 'Sathyamoorthy',
                'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1
            ) ON CONFLICT DO NOTHING;
        """), {
            "r_id": retailer_uuid, "t2_id": tenant_superrex_id, "c2_id": comp_superrex_id,
            "dkey": date_key, "tkey": time_key, "now": now_dt
        })

        await conn.execute(text("""
            INSERT INTO retailer_wallet (
                public_id, retailer_id, tenant_id, company_id, user_ref_id, user_type_ref_id,
                wallet_type, wallet_balance, daily_transaction_limit, single_transaction_limit,
                is_frozen, record_status, is_active, is_deleted,
                date_key, time_key, created_date, created_by, version_no
            ) VALUES (
                gen_random_uuid(), :r_id, :t2_id, :c2_id, 10928, 2,
                'PRIMARY', 86442.30, 5000000.0, 500000.0,
                false, 'ACTIVE', true, false,
                :dkey, :tkey, :now, 'SYSTEM', 1
            ) ON CONFLICT DO NOTHING;
        """), {
            "r_id": retailer_uuid, "t2_id": tenant_superrex_id, "c2_id": comp_superrex_id,
            "dkey": date_key, "tkey": time_key, "now": now_dt
        })

        # F. AuthUserModel & AdminUserModel
        await conn.execute(text("""
            INSERT INTO auth_users (
                public_id, auth_users_ref_id, tenant_ref_id, company_ref_id, tenant_id, company_id,
                user_id, mobile_number, full_name, email, password_hash, role, account_status,
                mfa_enabled, failed_attempts,
                record_status, is_active, is_deleted, date_key, time_key, created_date, created_by, version_no
            ) VALUES (
                gen_random_uuid(), 10928, 39, 2, :t2_id, :c2_id,
                :r_id, '9025232475', 'Sathyamoorthy', 'sathiyamurthyr12@gmail.com', :pw_hash, 'RETAILER', 'ACTIVE',
                false, 0,
                'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1
            ) ON CONFLICT DO NOTHING;
        """), {
            "r_id": retailer_uuid, "t2_id": tenant_superrex_id, "c2_id": comp_superrex_id,
            "pw_hash": sa_hash, "dkey": date_key, "tkey": time_key, "now": now_dt
        })

        await conn.execute(text("""
            INSERT INTO admin_user (
                public_id, admin_user_ref_id, tenant_ref_id, company_ref_id, tenant_id, company_id,
                email, username, hashed_password, full_name, phone, user_type, status,
                mfa_enabled, record_status, is_active, is_deleted, date_key, time_key, created_date, created_by, version_no
            ) VALUES 
            (:adm_id, 1, 1, 1, :t1_id, :c1_id, 'admin@pay2pay.in', 'admin', :pw_hash, 'Platform Super Admin', '9999999999', 'SUPER_ADMIN', 'ACTIVE', false, 'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1),
            (gen_random_uuid(), 2, 39, 2, :t2_id, :c2_id, 'admin@smspay.store', 'admin_smspay', :pw_hash, 'SMSPay Company Admin', '9999999998', 'PLATFORM_ADMIN', 'ACTIVE', false, 'ACTIVE', true, false, :dkey, :tkey, :now, 'SYSTEM', 1)
            ON CONFLICT DO NOTHING;
        """), {
            "adm_id": admin_uuid, "t1_id": tenant_sathus_id, "c1_id": comp_sathus_id,
            "t2_id": tenant_superrex_id, "c2_id": comp_superrex_id,
            "pw_hash": sa_hash, "dkey": date_key, "tkey": time_key, "now": now_dt
        })
        # G. PayIn Master Tables and Sample KPI Data
        await conn.execute(text("""
            INSERT INTO payin_vendors (
                payin_vendor_ref_id, vendor_code, vendor_name, provider_name, provider_type,
                api_base_url, auth_type, cred_ref, timeout_sec, retry_policy,
                vendor_status, created_by, updated_by, created_at, updated_at
            ) VALUES (
                1, 'AIRPAY', 'Airpay Payment Services', 'Airpay', 'PAYMENT_GATEWAY',
                'https://api.airpay.co.in', 'API_KEY', 'ENC_AIRPAY_KEY', 30, 'EXPONENTIAL_BACKOFF',
                'ACTIVE', 'SYSTEM', 'SYSTEM', :now, :now
            ) ON CONFLICT (payin_vendor_ref_id) DO NOTHING;
        """), {"now": now_dt})

        await conn.execute(text("""
            INSERT INTO payin_service_types (
                payin_service_type_ref_id, svc_code, svc_name, display_order, is_enabled, created_at, updated_at
            ) VALUES (
                1, 'UPI_INTENT', 'UPI Intent Collection', 1, true, :now, :now
            ) ON CONFLICT (payin_service_type_ref_id) DO NOTHING;
        """), {"now": now_dt})

        await conn.execute(text("""
            INSERT INTO payin_payment_modes (
                payin_payment_mode_ref_id, pay_mode_code, pay_mode_name, display_order, is_enabled, created_at, updated_at
            ) VALUES (
                1, 'UPI', 'Unified Payments Interface', 1, true, :now, :now
            ) ON CONFLICT (payin_payment_mode_ref_id) DO NOTHING;
        """), {"now": now_dt})

        await conn.execute(text("""
            INSERT INTO payin_transactions (
                tid, company_ref_id, retailer_ref_id, user_ref_id, payin_vendor_ref_id,
                svc_type_ref_id, pay_mode_ref_id, cust_name, cust_mobile,
                txn_amount, mdr_pct, mdr_fixed, mdr_amount, tax_amount, total_charges,
                customer_payable, retailer_credit, company_mdr_liability, currency,
                mdr_treatment, txn_status, callback_status, idempotency_key,
                initiated_at, created_at, updated_at
            ) VALUES (
                'TID-20261118-001', 2, 10928, 10928, 1,
                1, 1, 'Inspel Collections', '9025232475',
                1248320.50, 0.0, 0.0, 0.0, 22465.30, 0.0,
                1248320.50, 1248320.50, 0.0, 'INR',
                'DEDUCT_FROM_TOPUP', 'SUCCESS', 'SUCCESS', 'IDEMP-PAYIN-20261118-001',
                :now, :now, :now
            ) ON CONFLICT (tid) DO UPDATE SET
                txn_amount = 1248320.50,
                tax_amount = 22465.30,
                txn_status = 'SUCCESS',
                initiated_at = :now,
                created_at = :now;
        """), {"now": now_dt})

        await conn.execute(text("""
            INSERT INTO enterprise_payout_transactions (
                public_id, tenant_id, company_id, retailer_id, customer_id, beneficiary_id,
                transaction_number, idempotency_key, amount, charges, commission,
                net_debit, gst_amount, tds_amount, vendor_charge, company_charges,
                company_gst, other_charges, company_revenue, wallet_before, wallet_after,
                mode, status, vendor_name, initiated_at, created_date, updated_date,
                version_no, record_status, is_active, is_deleted, is_reversed, retry_count, max_retries
            ) VALUES (
                gen_random_uuid(), :t2_id, :c2_id, :r_id, gen_random_uuid(), gen_random_uuid(),
                'TXN-20261118-001', 'IDEMP-20261118-001', 875210.75, 5780.40, 56780.40,
                880991.15, 22465.30, 0.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 967433.45, 86442.30,
                'IMPS', 'SUCCESS', 'Commercial Bank', :now, :now, :now,
                1, 'ACTIVE', true, false, false, 0, 3
            ) ON CONFLICT (transaction_number) DO UPDATE SET
                amount = 875210.75,
                charges = 5780.40,
                commission = 56780.40,
                gst_amount = 22465.30,
                status = 'SUCCESS',
                initiated_at = :now,
                created_date = :now;
        """), {
            "t2_id": tenant_superrex_id,
            "c2_id": comp_superrex_id,
            "r_id": retailer_uuid,
            "now": now_dt
        })
        print("  ✅ Seeded PayIn (₹12,48,320.50) and PayOut (₹8,75,210.75) transactions for today")

    await engine.dispose()
    print("\n🎉 Database initialization on Sathus Finance PostgreSQL complete!")

if __name__ == "__main__":
    asyncio.run(init_finance_database())
