"""
Migration script for POS MDR, Distributor & Super Distributor Commission System.
Additive and backward-compatible.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import uuid
from sqlalchemy import text
from app.core.database import engine

MIGRATION_SQL = """
-- 1. Create pos_card_types table
CREATE TABLE IF NOT EXISTS public.pos_card_types (
    card_type_ref_id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial card types
INSERT INTO public.pos_card_types (code, name, display_order, is_active)
VALUES 
    ('VISA', 'VISA', 1, TRUE),
    ('MASTER', 'MASTER', 2, TRUE),
    ('RUPAY', 'RUPAY', 3, TRUE),
    ('AMEX / DINERS', 'AMEX / DINERS', 4, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. Extend distributor_mdr with nullable card_type_ref_id, tenant_ref_id, company_ref_id
ALTER TABLE public.distributor_mdr 
ADD COLUMN IF NOT EXISTS card_type_ref_id BIGINT NULL,
ADD COLUMN IF NOT EXISTS tenant_ref_id BIGINT NULL,
ADD COLUMN IF NOT EXISTS company_ref_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_dist_mdr_card_type ON public.distributor_mdr (card_type_ref_id);

-- 3. Create super_distributor_mdr table
CREATE TABLE IF NOT EXISTS public.super_distributor_mdr (
    super_distributor_mdr_ref_id BIGSERIAL PRIMARY KEY,
    super_distributor_ref_id BIGINT NOT NULL,
    retailer_ref_id BIGINT NOT NULL,
    service_name VARCHAR(50) NOT NULL DEFAULT 'POS_TOPUP',
    payment_mode VARCHAR(50) NOT NULL,
    card_type_ref_id BIGINT NULL,
    mdr NUMERIC(10, 4) NOT NULL,
    mdr_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    tenant_ref_id BIGINT NULL,
    company_ref_id BIGINT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_super_distributor_mdr 
ON public.super_distributor_mdr (super_distributor_ref_id, retailer_ref_id, service_name, payment_mode);

CREATE INDEX IF NOT EXISTS idx_sd_mdr_sd_ret 
ON public.super_distributor_mdr (super_distributor_ref_id, retailer_ref_id);

CREATE INDEX IF NOT EXISTS idx_sd_mdr_card_type 
ON public.super_distributor_mdr (card_type_ref_id);

-- 4. Create pos_mdr_commission_config table
CREATE TABLE IF NOT EXISTS public.pos_mdr_commission_config (
    pos_mdr_commission_config_ref_id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL,
    tenant_ref_id BIGINT NULL,
    company_ref_id BIGINT NULL,
    card_type_ref_id BIGINT NULL,
    payment_mode VARCHAR(50) NULL,
    distributor_commission NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    sd_commission NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    default_distributor_mdr NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    default_sd_mdr NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    retailer_mdr_override NUMERIC(10, 4) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_mdr_comm_comp 
ON public.pos_mdr_commission_config (company_id, company_ref_id);

CREATE INDEX IF NOT EXISTS idx_pos_mdr_comm_mode 
ON public.pos_mdr_commission_config (payment_mode);
"""

async def run_migration():
    async with engine.begin() as conn:
        print("Executing migration statements...")
        for statement in MIGRATION_SQL.strip().split(";"):
            stmt_clean = statement.strip()
            if stmt_clean:
                await conn.execute(text(stmt_clean))
        
        # Seed default 0.00 commission rows for all active companies if none exist
        companies_res = await conn.execute(text("""
            SELECT public_id, tenant_id, company_ref_id, tenant_ref_id
            FROM public.company
            WHERE is_deleted = false
        """))
        companies = companies_res.fetchall()
        for comp in companies:
            c_pid, c_tid, c_ref, t_ref = comp[0], comp[1], comp[2], comp[3]
            existing_res = await conn.execute(text("""
                SELECT 1 FROM public.pos_mdr_commission_config
                WHERE company_id = :cid
            """), {"cid": c_pid})
            if not existing_res.fetchone():
                await conn.execute(text("""
                    INSERT INTO public.pos_mdr_commission_config (
                        tenant_id, company_id, tenant_ref_id, company_ref_id,
                        payment_mode, distributor_commission, sd_commission,
                        default_distributor_mdr, default_sd_mdr, status
                    ) VALUES (
                        :tid, :cid, :tref, :cref,
                        'ALL', 0.0000, 0.0000, 0.0000, 0.0000, 'ACTIVE'
                    )
                """), {
                    "tid": c_tid,
                    "cid": c_pid,
                    "tref": t_ref or 1,
                    "cref": c_ref or 1
                })
                print(f"  [OK] Seeded 0.00% default config for company {c_pid} (ref={c_ref})")

        print("[SUCCESS] Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
