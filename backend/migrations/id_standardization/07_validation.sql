-- =============================================================================
-- PAY2PAY DATABASE ID STANDARDIZATION
-- SCRIPT 07: COMPREHENSIVE VALIDATION & AUDIT SUITE
-- =============================================================================

DO $$
DECLARE
    v_total_tables INT;
    v_tables_with_ref_pk INT;
    v_tables_with_pub_id INT;
BEGIN
    SELECT COUNT(*) INTO v_total_tables
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname NOT LIKE '_migration_%';

    SELECT COUNT(*) INTO v_tables_with_ref_pk
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
    WHERE n.nspname = 'public' AND con.contype = 'p' AND a.attname = (c.relname || '_ref_id');

    SELECT COUNT(*) INTO v_tables_with_pub_id
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'public_id';

    RAISE NOTICE '========================================================';
    RAISE NOTICE '  PAY2PAY ID STANDARDIZATION VALIDATION SUMMARY';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Total Base Tables:                     %', v_total_tables;
    RAISE NOTICE 'Tables with <tablename>_ref_id PK:     %', v_tables_with_ref_pk;
    RAISE NOTICE 'Tables preserving public_id UUID:      %', v_tables_with_pub_id;
    RAISE NOTICE '========================================================';

    INSERT INTO public._migration_id_standardization_log (step_name, status, details)
    VALUES ('07_validation', 'COMPLETED', FORMAT('Validation completed. %s of %s tables standardized.', v_tables_with_ref_pk, v_total_tables));
END $$;
