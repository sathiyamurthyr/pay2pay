-- ==============================================================================
-- STORED PROCEDURE: sp_sales_audit_log
-- Purpose: Logs sensitive Sales Portal operations with temporal financial keys.
-- ==============================================================================

CREATE OR REPLACE FUNCTION sp_sales_audit_log(
    p_tenant_id UUID,
    p_sales_user_id UUID,
    p_actor_email VARCHAR(255),
    p_action VARCHAR(100),
    p_entity_type VARCHAR(100),
    p_entity_ref_id VARCHAR(255),
    p_old_value JSONB,
    p_new_value JSONB,
    p_status VARCHAR(50),
    p_ip_address VARCHAR(64),
    p_user_agent VARCHAR(500)
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_ref_id BIGINT;
    v_day_key INT;
    v_week_key INT;
    v_month_key INT;
    v_year_key INT;
    v_financial_year VARCHAR(20);
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_month INT;
    v_year INT;
BEGIN
    v_month := EXTRACT(MONTH FROM v_now);
    v_year := EXTRACT(YEAR FROM v_now);
    
    v_day_key := CAST(TO_CHAR(v_now, 'YYYYMMDD') AS INT);
    v_week_key := CAST(TO_CHAR(v_now, 'YYYYWW') AS INT);
    v_month_key := CAST(TO_CHAR(v_now, 'YYYYMM') AS INT);
    v_year_key := v_year;
    
    IF v_month >= 4 THEN
        v_financial_year := 'FY' || v_year || '-' || (v_year + 1);
    ELSE
        v_financial_year := 'FY' || (v_year - 1) || '-' || v_year;
    END IF;

    INSERT INTO sales_audit_log (
        public_id,
        tenant_id,
        sales_user_id,
        actor_email,
        action,
        entity_type,
        entity_ref_id,
        old_value,
        new_value,
        status,
        ip_address,
        user_agent,
        day_key,
        week_key,
        month_key,
        year_key,
        financial_year_key,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_tenant_id,
        p_sales_user_id,
        p_actor_email,
        p_action,
        p_entity_type,
        p_entity_ref_id,
        p_old_value,
        p_new_value,
        p_status,
        p_ip_address,
        p_user_agent,
        v_day_key,
        v_week_key,
        v_month_key,
        v_year_key,
        v_financial_year,
        v_now
    )
    RETURNING sales_audit_ref_id INTO v_ref_id;

    RETURN v_ref_id;
END;
$$;
