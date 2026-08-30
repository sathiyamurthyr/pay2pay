import asyncio
import sys

backend_dir = r"d:\pay2pay\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

DDL_STATEMENTS = [
    # 1. Add wallet_type to transactions table if not exists
    """
    ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(50) NOT NULL DEFAULT 'MAIN';
    """,
    
    # 2. Add index on wallet_type
    """
    CREATE INDEX IF NOT EXISTS idx_rt_wallet_type 
    ON transactions(wallet_type);
    """,

    # 3. Add composite index on (retailer_id, wallet_type)
    """
    CREATE INDEX IF NOT EXISTS idx_rt_retailer_wallet_type 
    ON transactions(retailer_id, wallet_type);
    """,

    # 4. Add updated_at to retailer_wallet if not exists
    """
    ALTER TABLE retailer_wallet 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    """,

    # 5. Drop old function signature to avoid overload collision
    """
    DROP FUNCTION IF EXISTS public.wallet_balance_update(
        UUID, UUID, UUID, VARCHAR, VARCHAR, UUID, VARCHAR, NUMERIC, VARCHAR, VARCHAR, VARCHAR, UUID
    );
    """,

    # 6. Create or replace the wallet_balance_update stored procedure with dynamic line entries
    """
    CREATE OR REPLACE FUNCTION public.wallet_balance_update(
        p_tenant_id        UUID,
        p_company_id       UUID,
        p_retailer_id      UUID,
        p_txn_id           VARCHAR(100),
        p_ref_id           VARCHAR(100),
        p_table_ref_id     UUID,
        p_entry_type       VARCHAR(10),
        p_total_amount     NUMERIC(18,2),
        p_service_name     VARCHAR(50),
        p_wallet_type      VARCHAR(50),
        p_lines            JSONB,
        p_created_by       UUID
    )
    RETURNS TABLE (
        wallet_id          UUID,
        txn_id             VARCHAR(100),
        balance_before     NUMERIC(18,2),
        balance_after      NUMERIC(18,2),
        total_amount       NUMERIC(18,2),
        status             VARCHAR(30)
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    #variable_conflict use_column
    DECLARE

        v_wallet_id          UUID;
        v_balance_before     NUMERIC(18,2);
        v_balance_after      NUMERIC(18,2);

        v_line               JSONB;
        v_line_total         NUMERIC(18,2);

        v_partition_year     SMALLINT;
        v_partition_month    SMALLINT;
        v_partition_day      SMALLINT;

    BEGIN

        -- ========================================================
        -- 1. VALIDATION
        -- ========================================================

        IF p_tenant_id IS NULL THEN
            RAISE EXCEPTION 'Tenant ID is required';
        END IF;

        IF p_company_id IS NULL THEN
            RAISE EXCEPTION 'Company ID is required';
        END IF;

        IF p_retailer_id IS NULL THEN
            RAISE EXCEPTION 'Retailer ID is required';
        END IF;

        IF p_txn_id IS NULL OR TRIM(p_txn_id) = '' THEN
            RAISE EXCEPTION 'Txn ID is required';
        END IF;

        IF p_entry_type IS NULL
           OR UPPER(TRIM(p_entry_type)) NOT IN ('DEBIT', 'CREDIT') THEN

            RAISE EXCEPTION
                'Entry type must be DEBIT or CREDIT';

        END IF;

        IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
            RAISE EXCEPTION
                'Total amount must be greater than zero';
        END IF;

        IF p_service_name IS NULL
           OR TRIM(p_service_name) = '' THEN

            RAISE EXCEPTION
                'Service name is required';

        END IF;

        IF p_wallet_type IS NULL
           OR TRIM(p_wallet_type) = '' THEN

            RAISE EXCEPTION
                'Wallet type is required';

        END IF;

        IF p_lines IS NULL
           OR jsonb_typeof(p_lines) <> 'array'
           OR jsonb_array_length(p_lines) = 0 THEN

            RAISE EXCEPTION
                'Transaction lines must be a non-empty JSON array';

        END IF;


        -- ========================================================
        -- 2. NORMALIZE
        -- ========================================================

        p_entry_type   := UPPER(TRIM(p_entry_type));
        p_service_name := UPPER(TRIM(p_service_name));
        p_wallet_type  := UPPER(TRIM(p_wallet_type));


        -- ========================================================
        -- 3. VALIDATE LINE TOTAL AGAINST WALLET TOTAL
        -- ========================================================

        SELECT COALESCE(
            SUM((line->>'amount')::NUMERIC),
            0
        )
        INTO v_line_total
        FROM jsonb_array_elements(p_lines) AS line;

        IF ROUND(v_line_total, 2) <> ROUND(p_total_amount, 2) THEN

            RAISE EXCEPTION
                'Line total % does not match wallet amount %',
                v_line_total,
                p_total_amount;

        END IF;


        -- ========================================================
        -- 4. DUPLICATE PROTECTION (Per Txn ID & Entry Type)
        -- ========================================================

        IF EXISTS (
            SELECT 1
            FROM public.transactions t
            WHERE t.tenant_id = p_tenant_id
              AND t.company_id = p_company_id
              AND t.retailer_id = p_retailer_id
              AND t.txn_id = p_txn_id
              AND t.entry_type = p_entry_type
        ) THEN

            RAISE EXCEPTION
                'Duplicate transaction already exists. Txn ID: %, Entry: %',
                p_txn_id,
                p_entry_type;

        END IF;


        -- ========================================================
        -- 5. GET AND LOCK RETAILER WALLET
        -- ========================================================

        SELECT
            COALESCE(rw.public_id, gen_random_uuid()),
            COALESCE(rw.wallet_balance, 0.00)::NUMERIC(18,2)
        INTO
            v_wallet_id,
            v_balance_before
        FROM public.retailer_wallet rw
        WHERE rw.tenant_id = p_tenant_id
          AND rw.company_id = p_company_id
          AND rw.retailer_id = p_retailer_id
          AND rw.is_active = TRUE
          AND rw.is_deleted = FALSE
        FOR UPDATE;


        -- ========================================================
        -- 6. WALLET NOT FOUND
        -- ========================================================

        IF v_wallet_id IS NULL THEN

            RAISE EXCEPTION
                'Active wallet not found for retailer %',
                p_retailer_id;

        END IF;


        -- ========================================================
        -- 7. CALCULATE BALANCE (CHANGED ONLY ONCE BY TOTAL AMOUNT)
        -- ========================================================

        IF p_entry_type = 'DEBIT' THEN

            IF v_balance_before < p_total_amount THEN

                RAISE EXCEPTION
                    'Insufficient wallet balance. Available: %, Required: %',
                    v_balance_before,
                    p_total_amount;

            END IF;

            v_balance_after :=
                v_balance_before - p_total_amount;

        ELSE

            v_balance_after :=
                v_balance_before + p_total_amount;

        END IF;


        -- ========================================================
        -- 8. UPDATE RETAILER WALLET (ONLY ONCE)
        -- ========================================================

        UPDATE public.retailer_wallet
        SET
            wallet_balance = v_balance_after,
            updated_at = NOW(),
            updated_date = NOW()
        WHERE (public.retailer_wallet.public_id = v_wallet_id OR public.retailer_wallet.retailer_id = p_retailer_id)
          AND public.retailer_wallet.tenant_id = p_tenant_id
          AND public.retailer_wallet.company_id = p_company_id
          AND public.retailer_wallet.retailer_id = p_retailer_id
          AND public.retailer_wallet.is_active = TRUE
          AND public.retailer_wallet.is_deleted = FALSE;


        IF NOT FOUND THEN

            RAISE EXCEPTION
                'Wallet update failed for retailer %',
                p_retailer_id;

        END IF;


        -- ========================================================
        -- 9. PARTITION DATE
        -- ========================================================

        v_partition_year :=
            EXTRACT(YEAR FROM NOW())::SMALLINT;

        v_partition_month :=
            EXTRACT(MONTH FROM NOW())::SMALLINT;

        v_partition_day :=
            EXTRACT(DAY FROM NOW())::SMALLINT;


        -- ========================================================
        -- 10. INSERT DYNAMIC TRANSACTION LINES
        --
        -- NO "Wallet Debit" line
        -- Dynamic component lines only (Amount, Charge, GST)
        -- ========================================================

        FOR v_line IN
            SELECT *
            FROM jsonb_array_elements(p_lines)
        LOOP

            INSERT INTO public.transactions (
                public_id,

                tenant_id,
                company_id,
                retailer_id,

                txn_id,
                ref_id,
                table_ref_id,

                service_name,
                wallet_type,

                entry_type,
                amount,

                balance_before,
                balance_after,

                status,
                narration,

                partition_year,
                partition_month,
                partition_day,

                is_active,
                is_deleted,

                created_at,
                created_by
            )
            VALUES (
                gen_random_uuid(),

                p_tenant_id,
                p_company_id,
                p_retailer_id,

                p_txn_id,
                p_ref_id,
                p_table_ref_id,

                p_service_name,
                p_wallet_type,

                p_entry_type,
                (v_line->>'amount')::NUMERIC(18,2),

                v_balance_before,
                v_balance_after,

                'SUCCESS',
                v_line->>'narration',

                v_partition_year,
                v_partition_month,
                v_partition_day,

                TRUE,
                FALSE,

                NOW(),
                p_created_by
            );

        END LOOP;


        -- ========================================================
        -- 11. RETURN
        -- ========================================================

        RETURN QUERY
        SELECT
            v_wallet_id,
            p_txn_id,
            v_balance_before,
            v_balance_after,
            p_total_amount,
            'SUCCESS'::VARCHAR(30);

    END;
    $$;
    """
]

async def deploy():
    print("Connecting to Supabase PostgreSQL database...")
    async with AsyncSessionLocal() as session:
        for idx, stmt in enumerate(DDL_STATEMENTS, 1):
            stmt_clean = stmt.strip()
            print(f"Executing step {idx}/{len(DDL_STATEMENTS)}...")
            await session.execute(text(stmt_clean))
            await session.commit()
            print(f"  Step {idx} succeeded.")
        print("\nAll migration & stored procedure deployment steps completed successfully!")

if __name__ == "__main__":
    asyncio.run(deploy())
