"""
Database migration script to create central transaction engine tables in PostgreSQL:
- transaction_configuration
- transactions (Authoritative Append-Only Transaction Table)
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

    # 2. transactions (Authoritative Append-Only Design)
    """
    CREATE TABLE IF NOT EXISTS transactions (
        -- Primary / Public IDs
        id                  BIGSERIAL PRIMARY KEY,
        public_id           UUID NOT NULL DEFAULT gen_random_uuid(),

        -- Enterprise Scope
        tenant_id           UUID NOT NULL,
        company_id          UUID NOT NULL,
        retailer_id         UUID NOT NULL,

        -- Business Transaction References
        txn_id              VARCHAR(64) NOT NULL,
        ref_id              VARCHAR(128),
        table_ref_id        UUID,

        -- Transaction Information
        service_name       VARCHAR(50) NOT NULL,
        entry_type         VARCHAR(10) NOT NULL,
        amount             NUMERIC(18,2) NOT NULL,

        -- Wallet Balance Snapshot
        balance_before     NUMERIC(18,2) NOT NULL,
        balance_after      NUMERIC(18,2) NOT NULL,

        -- Transaction Status
        status              VARCHAR(30) NOT NULL,

        -- Description
        narration           VARCHAR(500),

        -- Enterprise Date Keys
        day_key             INTEGER,
        week_key            INTEGER,
        month_key           INTEGER,
        quarter_key         INTEGER,
        year_key             INTEGER,

        financial_year_key  INTEGER,
        financial_quarter_key INTEGER,
        financial_month_key  INTEGER,

        date_key            INTEGER,
        time_key            INTEGER,

        -- Partition Keys
        partition_year      SMALLINT NOT NULL,
        partition_month     SMALLINT NOT NULL,
        partition_day       SMALLINT NOT NULL,

        -- Audit / Lifecycle
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,

        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        created_by          UUID,
        updated_by          UUID,

        -- Constraints
        CONSTRAINT uq_transactions_public_id
            UNIQUE (public_id),

        CONSTRAINT chk_transactions_entry_type
            CHECK (entry_type IN ('DEBIT', 'CREDIT')),

        CONSTRAINT chk_transactions_amount
            CHECK (amount > 0),

        CONSTRAINT chk_transactions_balance_before
            CHECK (balance_before >= 0),

        CONSTRAINT chk_transactions_balance_after
            CHECK (balance_after >= 0),

        CONSTRAINT chk_transactions_partition_month
            CHECK (partition_month BETWEEN 1 AND 12),

        CONSTRAINT chk_transactions_partition_day
            CHECK (partition_day BETWEEN 1 AND 31)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_rt_tenant_company_retailer ON transactions (tenant_id, company_id, retailer_id);",
    "CREATE INDEX IF NOT EXISTS idx_rt_txn_id ON transactions (txn_id);",
    "CREATE INDEX IF NOT EXISTS idx_rt_ref_id ON transactions (ref_id);",
    "CREATE INDEX IF NOT EXISTS idx_rt_table_ref_id ON transactions (table_ref_id);",
    "CREATE INDEX IF NOT EXISTS idx_rt_service_name ON transactions (service_name);",
    "CREATE INDEX IF NOT EXISTS idx_rt_entry_type ON transactions (entry_type);",
    "CREATE INDEX IF NOT EXISTS idx_rt_status ON transactions (status);",
    "CREATE INDEX IF NOT EXISTS idx_rt_created_at ON transactions (created_at);",
    "CREATE INDEX IF NOT EXISTS idx_rt_retailer_created_at ON transactions (retailer_id, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_rt_retailer_txn ON transactions (retailer_id, txn_id);",
    "CREATE INDEX IF NOT EXISTS idx_rt_retailer_service_date ON transactions (retailer_id, service_name, created_at DESC);",

    # Triggers on transactions
    """
    CREATE OR REPLACE FUNCTION set_transactions_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$;
    """,
    "DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;",
    """
    CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_transactions_updated_at();
    """,
    """
    CREATE OR REPLACE FUNCTION prevent_retailer_transaction_mutation()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RAISE EXCEPTION
            'transactions is append-only. UPDATE/DELETE is not allowed.';
    END;
    $$;
    """,
    "DROP TRIGGER IF EXISTS trg_transactions_no_update ON transactions;",
    """
    CREATE TRIGGER trg_transactions_no_update
    BEFORE UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_retailer_transaction_mutation();
    """,

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
        print("All transaction engine tables, indexes, and triggers successfully created!")

if __name__ == "__main__":
    asyncio.run(create_tables())
