"""
Migration script to create Unisus Pay tables:
- unisus_pay_qr_codes
- unisus_pay_payment_requests
- unisus_pay_config
"""

import asyncio
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

backend_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

SQL_DDL = """
-- 1. unisus_pay_qr_codes
CREATE TABLE IF NOT EXISTS public.unisus_pay_qr_codes (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'fa480c2d-2725-43bd-a7ba-6fc60a89a1cb'::uuid,
    company_id UUID NOT NULL DEFAULT '0bf4371b-4c74-4916-a817-61c203b353e8'::uuid,
    qr_id VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL DEFAULT 'Primary Collection QR',
    qr_image_base64 TEXT NOT NULL,
    is_default_qr BOOLEAN NOT NULL DEFAULT FALSE,
    unisus_user_id VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unisus_qr_id ON public.unisus_pay_qr_codes(qr_id);
CREATE INDEX IF NOT EXISTS idx_unisus_qr_company ON public.unisus_pay_qr_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_unisus_qr_active ON public.unisus_pay_qr_codes(is_active);

-- 2. unisus_pay_payment_requests
CREATE TABLE IF NOT EXISTS public.unisus_pay_payment_requests (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT 'fa480c2d-2725-43bd-a7ba-6fc60a89a1cb'::uuid,
    company_id UUID NOT NULL DEFAULT '0bf4371b-4c74-4916-a817-61c203b353e8'::uuid,
    topup_request_id VARCHAR(50) NOT NULL,
    user_id UUID,
    user_type VARCHAR(50) NOT NULL DEFAULT 'RETAILER',
    user_code VARCHAR(50),
    unisus_payment_request_id VARCHAR(100),
    unisus_id VARCHAR(100),
    reference_no VARCHAR(100) NOT NULL UNIQUE,
    qr_id VARCHAR(100) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    note TEXT,
    receipt_url TEXT,
    admin_remark TEXT,
    raw_response JSONB,
    raw_callback JSONB,
    callback_received_at TIMESTAMPTZ,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unisus_pr_ref ON public.unisus_pay_payment_requests(reference_no);
CREATE INDEX IF NOT EXISTS idx_unisus_pr_topup_id ON public.unisus_pay_payment_requests(topup_request_id);
CREATE INDEX IF NOT EXISTS idx_unisus_pr_status ON public.unisus_pay_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_unisus_pr_company ON public.unisus_pay_payment_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_unisus_pr_user ON public.unisus_pay_payment_requests(user_id);

-- 3. unisus_pay_config
CREATE TABLE IF NOT EXISTS public.unisus_pay_config (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL UNIQUE DEFAULT 'UNISUSPAY',
    base_url VARCHAR(255) NOT NULL DEFAULT 'https://api.unisuspe.com/api/apiclient',
    email VARCHAR(255) NOT NULL DEFAULT 'admin@sathus.in',
    password VARCHAR(255) NOT NULL DEFAULT 'Sathus@1621',
    web_code VARCHAR(50) NOT NULL DEFAULT 'UNISUSPAY',
    cached_token TEXT,
    token_updated_at TIMESTAMPTZ,
    wallet_balance NUMERIC(18, 2),
    last_balance_check_at TIMESTAMPTZ,
    last_qr_sync_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unisus_cfg_service ON public.unisus_pay_config(service_name);

-- Seed initial config record if not present
INSERT INTO public.unisus_pay_config (service_name, base_url, email, password, web_code, is_active)
VALUES ('UNISUSPAY', 'https://api.unisuspe.com/api/apiclient', 'admin@sathus.in', 'Sathus@1621', 'UNISUSPAY', TRUE)
ON CONFLICT (service_name) DO NOTHING;
"""

async def run_migration():
    print("Connecting to database and running Unisus Pay DDL...")
    async with AsyncSessionLocal() as session:
        for statement in SQL_DDL.strip().split(";"):
            cleaned = statement.strip()
            if cleaned:
                await session.execute(text(cleaned))
        await session.commit()
    print("✅ Unisus Pay tables and initial config successfully applied!")

if __name__ == "__main__":
    asyncio.run(run_migration())
