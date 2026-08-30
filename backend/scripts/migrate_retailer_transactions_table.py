"""
Migration script for Retailer Transactions table in PostgreSQL / Supabase.
Applies the full append-only wallet transaction schema with indexes and triggers.
"""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

STATEMENTS = [
    # 1. Backup legacy transactions table if it exists
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'transaction_reference'
        ) THEN
            DROP TABLE IF EXISTS transactions_legacy_backup;
            CREATE TABLE transactions_legacy_backup AS SELECT * FROM transactions;
            DROP TABLE transactions CASCADE;
        END IF;
    END $$;
    """,

    # 2. Create the Authoritative Append-Only transactions table
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

    # 3. Indexes
    """
    CREATE INDEX IF NOT EXISTS idx_rt_tenant_company_retailer
    ON transactions (
        tenant_id,
        company_id,
        retailer_id
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_txn_id
    ON transactions (txn_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_ref_id
    ON transactions (ref_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_table_ref_id
    ON transactions (table_ref_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_service_name
    ON transactions (service_name);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_entry_type
    ON transactions (entry_type);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_status
    ON transactions (status);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_created_at
    ON transactions (created_at);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_retailer_created_at
    ON transactions (
        retailer_id,
        created_at DESC
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_retailer_txn
    ON transactions (
        retailer_id,
        txn_id
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_rt_retailer_service_date
    ON transactions (
        retailer_id,
        service_name,
        created_at DESC
    );
    """,

    # 4. Updated_at Trigger Function
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

    # 5. Drop and Create Updated_at Trigger
    """
    DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
    """,
    """
    CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_transactions_updated_at();
    """,

    # 6. Prevent Mutation Trigger Function (Append-Only)
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

    # 7. Drop and Create Append-Only Trigger
    """
    DROP TRIGGER IF EXISTS trg_transactions_no_update ON transactions;
    """,
    """
    CREATE TRIGGER trg_transactions_no_update
    BEFORE UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_retailer_transaction_mutation();
    """
]

async def run_migration():
    print("Connecting to PostgreSQL / Supabase...")
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Executing migration statements one by one...")
        for idx, stmt in enumerate(STATEMENTS, 1):
            s = stmt.strip()
            if s:
                await conn.execute(text(s))
        print("Migration executed successfully!")

        # Verify table columns
        res = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            ORDER BY ordinal_position;
        """))
        cols = res.fetchall()
        print(f"\nCreated transactions table with {len(cols)} columns:")
        for c in cols:
            print(f"  - {c[0]} ({c[1]}, nullable={c[2]})")

        # Verify constraints
        con_res = await conn.execute(text("""
            SELECT conname, contype, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'transactions';
        """))
        print("\nActive Constraints:")
        for con in con_res.fetchall():
            print(f"  - {con[0]} ({con[1]}): {con[2]}")

        # Verify indexes
        idx_res = await conn.execute(text("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'transactions';
        """))
        print("\nActive Indexes:")
        for idx in idx_res.fetchall():
            print(f"  - {idx[0]}: {idx[1]}")

        # Verify triggers
        trg_res = await conn.execute(text("""
            SELECT trigger_name, event_manipulation 
            FROM information_schema.triggers 
            WHERE event_object_table = 'transactions';
        """))
        print("\nAttached Triggers:")
        for t in trg_res.fetchall():
            print(f"  - {t[0]} on {t[1]}")

if __name__ == "__main__":
    asyncio.run(run_migration())
