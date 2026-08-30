-- =============================================================================
-- PAY2PAY DATABASE ID STANDARDIZATION
-- SCRIPT 01: SCHEMA INVENTORY & MIGRATION AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public._migration_id_standardization_log (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    step_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(150),
    status VARCHAR(50) NOT NULL,
    details TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public._migration_id_standardization_log (step_name, status, details)
VALUES ('01_schema_inventory', 'STARTED', 'Initiating database ID standardization migration.');
