"""
Script to create account_migration_history table in PostgreSQL Supabase database.
Safe, idempotent creation executing each statement separately.
"""

import sys
import asyncio
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS public.account_migration_history (
        account_migration_history_ref_id BIGSERIAL PRIMARY KEY,
        migration_reference_no VARCHAR(50) NOT NULL,
        migration_type VARCHAR(50) NOT NULL,
        source_account_ref_id BIGINT NOT NULL,
        source_account_id UUID NOT NULL,
        source_account_code VARCHAR(50) NOT NULL,
        source_role VARCHAR(50) NOT NULL,
        destination_account_ref_id BIGINT NULL,
        destination_account_id UUID NULL,
        destination_account_code VARCHAR(50) NULL,
        destination_role VARCHAR(50) NOT NULL,
        admin_user_ref_id BIGINT NULL,
        admin_user_id UUID NOT NULL,
        admin_username VARCHAR(100) NOT NULL,
        destination_mobile VARCHAR(20) NOT NULL,
        destination_email VARCHAR(255) NOT NULL,
        kyc_reference VARCHAR(255) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
        auto_approval_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
        opening_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        failure_reason TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ NULL,
        tenant_id UUID NOT NULL,
        company_id UUID NOT NULL,
        metadata_json JSONB NULL
    )
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS uq_migration_ref_no 
        ON public.account_migration_history (migration_reference_no)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_mig_source 
        ON public.account_migration_history (source_account_ref_id, source_role)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_mig_dest 
        ON public.account_migration_history (destination_account_ref_id, destination_role)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_mig_tenant_comp 
        ON public.account_migration_history (tenant_id, company_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_mig_dest_mobile 
        ON public.account_migration_history (destination_mobile)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_mig_dest_email 
        ON public.account_migration_history (destination_email)
    """
]

async def run_migration():
    print("Executing account_migration_history schema creation statement-by-statement...")
    async with AsyncSessionLocal() as session:
        for stmt in STATEMENTS:
            await session.execute(text(stmt))
        await session.commit()
    print("✅ account_migration_history table and indexes verified successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
