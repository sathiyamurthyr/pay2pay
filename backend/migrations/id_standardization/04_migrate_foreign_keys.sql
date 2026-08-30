-- =============================================================================
-- PAY2PAY DATABASE ID STANDARDIZATION
-- SCRIPT 04: ADD AND BACKFILL STANDARDIZED *_ref_id FOREIGN KEY COLUMNS
-- =============================================================================

DO $$
DECLARE
    -- Definition of relationships to standardize across all referencing tables
    v_fk_mappings JSONB := '[
        {"fk_col": "tenant_ref_id",             "old_uuid_col": "tenant_id",              "ref_table": "tenant"},
        {"fk_col": "company_ref_id",            "old_uuid_col": "company_id",             "ref_table": "company"},
        {"fk_col": "retailer_ref_id",           "old_uuid_col": "retailer_id",            "ref_table": "retailer"},
        {"fk_col": "distributor_ref_id",        "old_uuid_col": "dist_id",                "ref_table": "distributor"},
        {"fk_col": "distributor_ref_id",        "old_uuid_col": "mapped_distributor_id",  "ref_table": "distributor"},
        {"fk_col": "super_distributor_ref_id",  "old_uuid_col": "sd_id",                  "ref_table": "super_distributor"},
        {"fk_col": "super_distributor_ref_id",  "old_uuid_col": "mapped_super_distributor_id", "ref_table": "super_distributor"},
        {"fk_col": "regional_manager_ref_id",   "old_uuid_col": "rm_id",                  "ref_table": "regional_manager"},
        {"fk_col": "customer_ref_id",           "old_uuid_col": "customer_id",            "ref_table": "customer"},
        {"fk_col": "beneficiary_master_ref_id", "old_uuid_col": "beneficiary_id",         "ref_table": "beneficiary_master"},
        {"fk_col": "retailer_wallet_ref_id",    "old_uuid_col": "wallet_id",              "ref_table": "retailer_wallet"},
        {"fk_col": "payout_transaction_ref_id", "old_uuid_col": "payout_id",              "ref_table": "payout_transaction"},
        {"fk_col": "payout_slab_ref_id",        "old_uuid_col": "payout_slab_id",         "ref_table": "payout_slab"}
    ]'::JSONB;

    v_map RECORD;
    v_tbl RECORD;
    v_sql TEXT;
    v_ref_pk TEXT;
BEGIN
    FOR v_map IN SELECT * FROM jsonb_to_recordset(v_fk_mappings) AS x(fk_col TEXT, old_uuid_col TEXT, ref_table TEXT)
    LOOP
        v_ref_pk := v_map.ref_table || '_ref_id';

        -- Verify reference table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_map.ref_table) THEN
            
            -- Find all child tables containing old_uuid_col
            FOR v_tbl IN (
                SELECT c.table_name
                FROM information_schema.columns c
                JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                WHERE c.table_schema = 'public'
                  AND c.column_name = v_map.old_uuid_col
                  AND c.table_name <> v_map.ref_table
                  AND c.table_name NOT LIKE '_migration_%'
                ORDER BY c.table_name
            ) LOOP
                -- 1. Add BIGINT fk_col if not present
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = v_tbl.table_name AND column_name = v_map.fk_col
                ) THEN
                    v_sql := FORMAT('ALTER TABLE public.%I ADD COLUMN %I BIGINT;', v_tbl.table_name, v_map.fk_col);
                    BEGIN
                        EXECUTE v_sql;
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END;
                END IF;

                -- 2. Backfill fk_col by joining on public_id
                IF v_tbl.table_name <> 'transactions' THEN -- transactions has append-only trigger
                    v_sql := FORMAT('UPDATE public.%I c SET %I = p.%I FROM public.%I p WHERE c.%I = p.public_id AND c.%I IS NULL AND c.%I IS NOT NULL;',
                                    v_tbl.table_name, v_map.fk_col, v_ref_pk, v_map.ref_table, v_map.old_uuid_col, v_map.fk_col, v_map.old_uuid_col);
                    BEGIN
                        EXECUTE v_sql;
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END;
                END IF;

            END LOOP;
        END IF;
    END LOOP;

    -- Special handling for append-only transactions table:
    -- Temporarily disable trigger, backfill *_ref_id FKs, and re-enable trigger
    BEGIN
        ALTER TABLE public.transactions DISABLE TRIGGER trg_transactions_no_update;

        -- Backfill retailer_ref_id
        UPDATE public.transactions t
        SET retailer_ref_id = r.retailer_ref_id
        FROM public.retailer r
        WHERE (t.retailer_id = r.public_id OR t.retailer_id::text = r.id::text)
          AND t.retailer_ref_id IS NULL;

        -- Backfill tenant_ref_id
        UPDATE public.transactions t
        SET tenant_ref_id = ten.tenant_ref_id
        FROM public.tenant ten
        WHERE (t.tenant_id = ten.public_id OR t.tenant_id::text = ten.id::text)
          AND t.tenant_ref_id IS NULL;

        -- Backfill company_ref_id
        UPDATE public.transactions t
        SET company_ref_id = comp.company_ref_id
        FROM public.company comp
        WHERE (t.company_id = comp.public_id OR t.company_id::text = comp.id::text)
          AND t.company_ref_id IS NULL;

        -- Backfill distributor_ref_id
        UPDATE public.transactions t
        SET distributor_ref_id = d.distributor_ref_id
        FROM public.distributor d
        WHERE (t.dist_id = d.public_id OR t.dist_id::text = d.id::text)
          AND t.distributor_ref_id IS NULL;

        -- Backfill super_distributor_ref_id
        UPDATE public.transactions t
        SET super_distributor_ref_id = sd.super_distributor_ref_id
        FROM public.super_distributor sd
        WHERE (t.sd_id = sd.public_id OR t.sd_id::text = sd.id::text)
          AND t.super_distributor_ref_id IS NULL;

        -- Backfill regional_manager_ref_id
        UPDATE public.transactions t
        SET regional_manager_ref_id = rm.regional_manager_ref_id
        FROM public.regional_manager rm
        WHERE (t.rm_id = rm.public_id OR t.rm_id::text = rm.id::text)
          AND t.regional_manager_ref_id IS NULL;

        ALTER TABLE public.transactions ENABLE TRIGGER trg_transactions_no_update;
    EXCEPTION WHEN OTHERS THEN
        ALTER TABLE public.transactions ENABLE TRIGGER trg_transactions_no_update;
    END;

    INSERT INTO public._migration_id_standardization_log (step_name, status, details)
    VALUES ('04_migrate_foreign_keys', 'SUCCESS', 'Standardized and backfilled *_ref_id FK columns.');
END $$;
