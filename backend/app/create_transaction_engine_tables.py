"""
Database migration script to create central transaction engine tables in PostgreSQL:
- transaction_configuration
- transactions
- transaction_audit_logs
- transaction_ledger_entries
"""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

STATEMENTS = [
    # 1. transaction_configuration
    """
    CREATE TABLE IF NOT EXISTS transaction_configuration (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        company_id UUID,
        vendor_code VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
        prefix_source VARCHAR(50) NOT NULL DEFAULT 'VENDOR_FIRST_CHAR',
        custom_prefix VARCHAR(10),
        date_format VARCHAR(50) NOT NULL DEFAULT '%d%m%y%H%M',
        include_year BOOLEAN NOT NULL DEFAULT TRUE,
        include_hour BOOLEAN NOT NULL DEFAULT TRUE,
        include_minute BOOLEAN NOT NULL DEFAULT TRUE,
        random_length INT NOT NULL DEFAULT 5,
        transaction_format VARCHAR(100) NOT NULL DEFAULT '<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>',
        timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        updated_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        CONSTRAINT uq_txn_cfg_tenant_vendor UNIQUE (tenant_id, vendor_code)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_txn_cfg_tenant ON transaction_configuration(tenant_id);",
    "CREATE INDEX IF NOT EXISTS idx_txn_cfg_vendor ON transaction_configuration(vendor_code);",

    # 2. transactions
    """
    CREATE TABLE IF NOT EXISTS transactions (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        company_id UUID,
        vendor_id UUID,
        vendor_code VARCHAR(50) NOT NULL DEFAULT 'WOWPE',
        transaction_reference VARCHAR(50) UNIQUE NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        service_type VARCHAR(50) NOT NULL,
        customer_id UUID,
        retailer_id UUID,
        beneficiary_id UUID,
        amount NUMERIC(18, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        charges NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        commission NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        gst_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        tds_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        net_amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
        status_description VARCHAR(255),
        request_id VARCHAR(100),
        idempotency_key VARCHAR(255),
        utr VARCHAR(100),
        vendor_order_id VARCHAR(100),
        response_message TEXT,
        metadata_json JSONB,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        updated_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM'
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(transaction_reference);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON transactions(vendor_id);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_retailer ON transactions(retailer_id);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_service ON transactions(service_type);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);",
    "CREATE INDEX IF NOT EXISTS idx_transactions_idem ON transactions(idempotency_key);",

    # 3. transaction_audit_logs
    """
    CREATE TABLE IF NOT EXISTS transaction_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        transaction_id UUID,
        transaction_reference VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        actor_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        actor_id VARCHAR(100),
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_txn_audit_ref ON transaction_audit_logs(transaction_reference);",
    "CREATE INDEX IF NOT EXISTS idx_txn_audit_status ON transaction_audit_logs(new_status);",
    "CREATE INDEX IF NOT EXISTS idx_txn_audit_created ON transaction_audit_logs(created_at);",

    # 4. transaction_ledger_entries
    """
    CREATE TABLE IF NOT EXISTS transaction_ledger_entries (
        id BIGSERIAL PRIMARY KEY,
        public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        transaction_id UUID,
        transaction_reference VARCHAR(50) NOT NULL,
        entry_type VARCHAR(10) NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        amount NUMERIC(18, 2) NOT NULL,
        balance_before NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        balance_after NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        narration VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_txn_ledger_ref ON transaction_ledger_entries(transaction_reference);",
    "CREATE INDEX IF NOT EXISTS idx_txn_ledger_account ON transaction_ledger_entries(account_number);",
    "CREATE INDEX IF NOT EXISTS idx_txn_ledger_created ON transaction_ledger_entries(created_at);",

    # 5. Default configurations
    """
    INSERT INTO transaction_configuration (
        tenant_id, vendor_code, prefix_source, date_format,
        include_year, include_hour, include_minute, random_length,
        transaction_format, timezone, is_active
    ) VALUES 
    (
        '93538c98-0b19-493c-a247-4cdb02a46c68', 'WOWPE', 'VENDOR_FIRST_CHAR', '%d%m%y%H%M',
        TRUE, TRUE, TRUE, 5,
        '<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>', 'Asia/Kolkata', TRUE
    ),
    (
        '93538c98-0b19-493c-a247-4cdb02a46c68', 'BULKPE', 'VENDOR_FIRST_CHAR', '%d%m%y%H%M',
        TRUE, TRUE, TRUE, 5,
        '<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>', 'Asia/Kolkata', TRUE
    ),
    (
        '93538c98-0b19-493c-a247-4cdb02a46c68', 'DEFAULT', 'VENDOR_FIRST_CHAR', '%d%m%y%H%M',
        TRUE, TRUE, TRUE, 5,
        '<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>', 'Asia/Kolkata', TRUE
    )
    ON CONFLICT (tenant_id, vendor_code) DO NOTHING;
    """
]

async def create_tables():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        for idx, stmt in enumerate(STATEMENTS, 1):
            s = stmt.strip()
            if s:
                await conn.execute(text(s))
        print("All transaction engine tables and indexes successfully created!")

if __name__ == "__main__":
    asyncio.run(create_tables())
