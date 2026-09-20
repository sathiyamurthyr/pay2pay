#!/usr/bin/env python3
"""
Database Migration: Master Distributor (Super Distributor) Module
Creates:
  1. super_distributor_distributor — explicit SD->Dist mapping table
  2. sd_wallet — Super Distributor wallet table
  3. view_super_distributor_auth_profile — authentication view
  4. sp_super_distributor_login_lookup — authentication stored procedure
  5. Backfills super_distributor_distributor from existing distributor.super_distributor_ref_id

Run from project root: python -m database.migrations.add_super_distributor_module
"""

import asyncio
import logging
import os
import sys

# Allow running from project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://pay2pay:pay2pay@localhost:5432/pay2pay"
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("migration")


async def run_migration():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        logger.info("Starting Master Distributor module migration...")

        # ── 1. Create sd_wallet ──
        logger.info("Creating sd_wallet table...")
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS public.sd_wallet (
                sd_wallet_ref_id    BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                super_distributor_ref_id BIGINT NOT NULL,
                tenant_id           UUID NOT NULL,
                company_id          UUID NOT NULL,
                balance             NUMERIC(18,2) NOT NULL DEFAULT 0.00,
                currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
                status              VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                is_active           BOOLEAN NOT NULL DEFAULT TRUE,
                is_frozen           BOOLEAN NOT NULL DEFAULT FALSE,
                freeze_reason       TEXT,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_sd_wallet_super_distributor UNIQUE(super_distributor_ref_id)
            );
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sd_wallet_sd_ref_id
                ON public.sd_wallet(super_distributor_ref_id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sd_wallet_tenant_comp
                ON public.sd_wallet(tenant_id, company_id);
        """))
        logger.info("  ✓ sd_wallet created")

        # ── 2. Create super_distributor_distributor mapping table ──
        logger.info("Creating super_distributor_distributor mapping table...")
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS public.super_distributor_distributor (
                sd_distributor_ref_id       BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                super_distributor_ref_id    BIGINT NOT NULL,
                distributor_ref_id          BIGINT NOT NULL,
                tenant_id                   UUID NOT NULL,
                company_id                  UUID NOT NULL,
                status                      VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by                  VARCHAR(255),
                CONSTRAINT uq_sd_distributor_mapping
                    UNIQUE(super_distributor_ref_id, distributor_ref_id)
            );
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sd_dist_map_sd_ref_id
                ON public.super_distributor_distributor(super_distributor_ref_id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sd_dist_map_dist_ref_id
                ON public.super_distributor_distributor(distributor_ref_id);
        """))
        await db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sd_dist_map_status
                ON public.super_distributor_distributor(status);
        """))
        logger.info("  ✓ super_distributor_distributor created")

        # ── 3. Backfill: populate mapping from existing distributor.super_distributor_ref_id ──
        logger.info("Backfilling SD->Dist mappings from existing distributor records...")
        result = await db.execute(text("""
            INSERT INTO public.super_distributor_distributor (
                super_distributor_ref_id, distributor_ref_id, tenant_id, company_id,
                status, created_by
            )
            SELECT DISTINCT
                sd.super_distributor_ref_id,
                d.distributor_ref_id,
                d.tenant_id,
                COALESCE(d.company_id, sd.company_id) AS company_id,
                'ACTIVE',
                'MIGRATION_BACKFILL'
            FROM public.distributor d
            JOIN public.super_distributor sd
                ON sd.public_id = d.mapped_super_distributor_id
               AND sd.super_distributor_ref_id IS NOT NULL
            WHERE d.is_deleted = FALSE
              AND d.distributor_ref_id IS NOT NULL
              AND sd.super_distributor_ref_id IS NOT NULL
            ON CONFLICT (super_distributor_ref_id, distributor_ref_id) DO NOTHING;
        """))
        logger.info(f"  ✓ Backfill complete: {result.rowcount} mapping(s) inserted")

        # ── 4. Create view_super_distributor_auth_profile ──
        logger.info("Creating view_super_distributor_auth_profile...")
        view_dir = os.path.join(os.path.dirname(__file__), "../../infrastructure/db/views")
        view_path = os.path.join(view_dir, "view_super_distributor_auth_profile.sql")
        if os.path.exists(view_path):
            with open(view_path, "r") as f:
                view_sql = f.read()
            await db.execute(text(view_sql))
            logger.info("  ✓ view_super_distributor_auth_profile created")
        else:
            logger.warning(f"  ⚠ View SQL not found at {view_path}")

        # ── 5. Create sp_super_distributor_login_lookup ──
        logger.info("Creating sp_super_distributor_login_lookup...")
        sp_dir = os.path.join(os.path.dirname(__file__), "../../infrastructure/db/sp")
        sp_path = os.path.join(sp_dir, "sp_super_distributor_login_lookup.sql")
        if os.path.exists(sp_path):
            with open(sp_path, "r") as f:
                sp_sql = f.read()
            await db.execute(text(sp_sql))
            logger.info("  ✓ sp_super_distributor_login_lookup created")
        else:
            logger.warning(f"  ⚠ SP SQL not found at {sp_path}")

        await db.commit()
        logger.info("Migration committed successfully.")

    await engine.dispose()
    logger.info("Master Distributor module migration complete.")


if __name__ == "__main__":
    asyncio.run(run_migration())
