-- =============================================================================
-- PAY2PAY DATABASE ID STANDARDIZATION
-- SCRIPT 02: ADD BIGINT <tablename>_ref_id GENERATED ALWAYS AS IDENTITY
-- =============================================================================

DO $$
DECLARE
    r RECORD;
    v_target_col TEXT;
    v_sql TEXT;
BEGIN
    FOR r IN (
        SELECT c.relname as table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
          AND c.relkind = 'r'
          AND c.relname NOT LIKE '_migration_%'
        ORDER BY c.relname
    ) LOOP
        v_target_col := r.table_name || '_ref_id';

        -- Check if column exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = r.table_name 
              AND column_name = v_target_col
        ) THEN
            -- Add BIGINT GENERATED ALWAYS AS IDENTITY column
            v_sql := FORMAT('ALTER TABLE public.%I ADD COLUMN %I BIGINT GENERATED ALWAYS AS IDENTITY;', r.table_name, v_target_col);
            BEGIN
                EXECUTE v_sql;
                INSERT INTO public._migration_id_standardization_log (step_name, table_name, status, details)
                VALUES ('02_add_bigint_ref_ids', r.table_name, 'SUCCESS', 'Added identity column ' || v_target_col);
            EXCEPTION WHEN OTHERS THEN
                INSERT INTO public._migration_id_standardization_log (step_name, table_name, status, details)
                VALUES ('02_add_bigint_ref_ids', r.table_name, 'ERROR', SQLERRM);
            END;
        END IF;
    END LOOP;
END $$;
