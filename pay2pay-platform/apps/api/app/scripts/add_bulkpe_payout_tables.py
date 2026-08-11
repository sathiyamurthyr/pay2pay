"""
Migration script for BulkPe Enterprise Payout Engine database tables.
Creates tables and alters missing columns.
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def create_bulkpe_payout_tables():
    async with engine.begin() as conn:
        print("[DB Migration] Creating BulkPe Enterprise Payout Engine tables...")

        # 1. vendor_transaction table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS vendor_transaction (
                id BIGSERIAL PRIMARY KEY,
                public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                transaction_id UUID NULL,
                vendor_name VARCHAR(50) NOT NULL DEFAULT 'BULKPE',
                vendor_tx_id VARCHAR(100) NULL,
                vendor_ref VARCHAR(100) NULL,
                merchant_ref VARCHAR(100) NOT NULL,
                amount DOUBLE PRECISION NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
                http_status INTEGER NULL,
                latency_ms DOUBLE PRECISION NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                request_payload JSONB NULL,
                response_payload JSONB NULL,
                correlation_id VARCHAR(100) NULL,
                tenant_id UUID NOT NULL,
                company_id UUID NULL,
                retailer_id UUID NULL,
                created_by VARCHAR(100) DEFAULT 'system',
                created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE
            );
        """))

        # 2. wallet_ledger table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS wallet_ledger (
                id BIGSERIAL PRIMARY KEY,
                public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                wallet_id UUID NULL,
                retailer_id UUID NOT NULL,
                transaction_id UUID NULL,
                entry_type VARCHAR(20) NOT NULL,
                amount DOUBLE PRECISION NOT NULL,
                balance_before DOUBLE PRECISION NOT NULL,
                balance_after DOUBLE PRECISION NOT NULL,
                description VARCHAR(300) NOT NULL,
                tenant_id UUID NOT NULL,
                created_by VARCHAR(100) DEFAULT 'system',
                created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE
            );
        """))

        # 3. financial_journal table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS financial_journal (
                id BIGSERIAL PRIMARY KEY,
                public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                transaction_id UUID NULL,
                account_head VARCHAR(100) NOT NULL,
                debit_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                credit_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                narration VARCHAR(300) NOT NULL,
                tenant_id UUID NOT NULL,
                created_by VARCHAR(100) DEFAULT 'system',
                created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE
            );
        """))
        await conn.execute(text("ALTER TABLE financial_journal ADD COLUMN IF NOT EXISTS transaction_id UUID NULL;"))

        # 4. api_request_log table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS api_request_log (
                id BIGSERIAL PRIMARY KEY,
                public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                endpoint VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                headers JSONB NULL,
                request_body JSONB NULL,
                response_body JSONB NULL,
                status_code INTEGER NULL,
                latency_ms DOUBLE PRECISION NULL,
                correlation_id VARCHAR(100) NULL,
                tenant_id UUID NOT NULL,
                created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))

        # Create indexes
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_vendor_tx_merchant_ref ON vendor_transaction(merchant_ref);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_vendor_tx_vendor_tx_id ON vendor_transaction(vendor_tx_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_wallet_ledger_retailer_id ON wallet_ledger(retailer_id);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_financial_journal_tx_id ON financial_journal(transaction_id);"))

        print("[DB Migration] BulkPe Enterprise Payout tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_bulkpe_payout_tables())
