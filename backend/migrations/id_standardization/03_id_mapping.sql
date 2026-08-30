-- =============================================================================
-- PAY2PAY DATABASE ID STANDARDIZATION
-- SCRIPT 03: CREATE FAST LOOKUP MAPPING INDEXES (public_id -> <table_name>_ref_id)
-- =============================================================================

DO $$
DECLARE
    r RECORD;
    v_target_col TEXT;
    v_idx_name TEXT;
    v_sql TEXT;
BEGIN
    FOR r IN (
        SELECT c.relname as table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
          AND c.relkind = 'r'
          AND c.relname NOT LIKE '_migration_%'
          AND EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = c.relname AND column_name = 'public_id'
          )
        ORDER BY c.relname
    ) LOOP
        v_target_col := r.table_name || '_ref_id';
        v_idx_name := 'idx_map_' || SUBSTRING(r.table_name, 1, 20) || '_pub_ref';

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = v_target_col
        ) THEN
            v_sql := FORMAT('CREATE INDEX IF NOT EXISTS %I ON public.%I (public_id, %I);', v_idx_name, r.table_name, v_target_col);
            BEGIN
                EXECUTE v_sql;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END LOOP;
END $$;
