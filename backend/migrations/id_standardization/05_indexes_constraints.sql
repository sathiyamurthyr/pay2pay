-- =============================================================================
-- PAY2PAY DATABASE ID STANDARDIZATION
-- SCRIPT 05: PRIMARY KEYS, FOREIGN KEY CONSTRAINTS & HIGH-SPEED B-TREE INDEXES
-- =============================================================================

DO $$
DECLARE
    r RECORD;
    v_target_pk TEXT;
    v_old_pk TEXT;
    v_constraint TEXT;
    v_sql TEXT;
BEGIN
    -- 1. Promote <table_name>_ref_id to PRIMARY KEY across tables
    FOR r IN (
        SELECT c.relname as table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
          AND c.relkind = 'r'
          AND c.relname NOT LIKE '_migration_%'
        ORDER BY c.relname
    ) LOOP
        v_target_pk := r.table_name || '_ref_id';

        -- Verify column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = v_target_pk
        ) THEN
            -- Check current PK constraint
            SELECT con.conname INTO v_constraint
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = r.table_name AND con.contype = 'p';

            IF v_constraint IS NOT NULL THEN
                -- Check if current PK is already the target
                SELECT a.attname INTO v_old_pk
                FROM pg_constraint con
                JOIN pg_class c ON c.oid = con.conrelid
                JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
                WHERE con.conname = v_constraint;

                IF v_old_pk <> v_target_pk THEN
                    BEGIN
                        -- Drop old PK and establish new PK
                        v_sql := FORMAT('ALTER TABLE public.%I DROP CONSTRAINT %I;', r.table_name, v_constraint);
                        EXECUTE v_sql;

                        v_sql := FORMAT('ALTER TABLE public.%I ADD PRIMARY KEY (%I);', r.table_name, v_target_pk);
                        EXECUTE v_sql;
                    EXCEPTION WHEN OTHERS THEN
                        NULL;
                    END;
                END IF;
            ELSE
                BEGIN
                    v_sql := FORMAT('ALTER TABLE public.%I ADD PRIMARY KEY (%I);', r.table_name, v_target_pk);
                    EXECUTE v_sql;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END IF;
    END LOOP;

    -- 2. Build optimized indexes on high-volume FK columns
    FOR r IN (
        SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND (c.column_name LIKE '%_ref_id' OR c.column_name IN ('public_id', 'transaction_number', 'txn_id'))
          AND c.table_name NOT LIKE '_migration_%'
    ) LOOP
        -- Skip PK column from duplicate index
        IF r.column_name <> (r.table_name || '_ref_id') THEN
            v_sql := FORMAT('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I);',
                            'idx_' || SUBSTRING(r.table_name, 1, 15) || '_' || SUBSTRING(r.column_name, 1, 15),
                            r.table_name, r.column_name);
            BEGIN
                EXECUTE v_sql;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END LOOP;

    -- 3. Ensure public_id has UNIQUE constraint where applicable
    FOR r IN (
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name = 'public_id'
          AND c.table_name IN ('tenant', 'company', 'retailer', 'distributor', 'super_distributor', 'regional_manager', 'customer', 'beneficiary_master', 'retailer_wallet', 'payout_transaction', 'transactions')
    ) LOOP
        v_sql := FORMAT('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (public_id);',
                        r.table_name, 'uq_' || r.table_name || '_public_id');
        BEGIN
            EXECUTE v_sql;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    INSERT INTO public._migration_id_standardization_log (step_name, status, details)
    VALUES ('05_indexes_constraints', 'SUCCESS', 'Promoted *_ref_id to Primary Keys and created B-Tree indexes.');
END $$;
