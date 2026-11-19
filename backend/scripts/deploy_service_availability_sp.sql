-- ==============================================================================
-- Pay2Pay Platform Service Availability & Downtime Status Stored Procedures (SPI)
-- Enhanced for Company-Specific Scoping (SMSPAY, Near4You, Pay2Pay)
-- ==============================================================================

-- 1. Returns live availability status for all platform services scoped by company_ref_id
CREATE OR REPLACE FUNCTION public.sp_get_all_platform_services_status(p_company_ref_id BIGINT DEFAULT NULL)
RETURNS TABLE(
    out_service_code VARCHAR,
    out_service_name VARCHAR,
    out_is_enabled BOOLEAN,
    out_config_status VARCHAR,
    out_company_ref_id BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH company_services AS (
        SELECT 
            c.service_code::VARCHAR AS svc_code, 
            c.service_name::VARCHAR AS svc_name, 
            c.is_enabled AS svc_enabled, 
            c.config_status::VARCHAR AS svc_status,
            c.company_ref_id AS svc_comp_ref,
            ROW_NUMBER() OVER(
                PARTITION BY UPPER(c.service_code) 
                ORDER BY (c.company_ref_id IS NOT NULL AND c.company_ref_id = p_company_ref_id) DESC, c.company_ref_id NULLS LAST
            ) as rn
        FROM customer_service_configuration c
        WHERE c.is_deleted = false
          AND (p_company_ref_id IS NULL OR c.company_ref_id = p_company_ref_id OR c.company_ref_id IS NULL)
    )
    SELECT 
        cs.svc_code,
        cs.svc_name,
        cs.svc_enabled,
        cs.svc_status,
        cs.svc_comp_ref
    FROM company_services cs
    WHERE cs.rn = 1
    ORDER BY cs.svc_code;
END;
$$;

-- 2. Toggles or sets the enabled status of a platform service scoped by company_ref_id
CREATE OR REPLACE FUNCTION public.sp_toggle_platform_service(
    p_service_code VARCHAR,
    p_is_enabled BOOLEAN,
    p_updated_by VARCHAR DEFAULT 'ADMIN',
    p_company_ref_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    out_service_code VARCHAR,
    out_service_name VARCHAR,
    out_is_enabled BOOLEAN,
    out_config_status VARCHAR,
    out_company_ref_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_found BOOLEAN := false;
    v_target_comp BIGINT := p_company_ref_id;
BEGIN
    IF v_target_comp IS NOT NULL THEN
        -- Check if company-specific record exists
        UPDATE customer_service_configuration
        SET is_enabled = p_is_enabled,
            updated_by = p_updated_by,
            updated_date = NOW()
        WHERE UPPER(service_code) = UPPER(p_service_code)
          AND company_ref_id = v_target_comp
          AND is_deleted = false;
        
        GET DIAGNOSTICS v_found = ROW_COUNT;

        IF v_found = 0 THEN
            -- Insert company-scoped row copying template from global row or default
            INSERT INTO customer_service_configuration (
                public_id, tenant_id, company_ref_id, service_code, service_name,
                is_enabled, config_status, requires_full_kyc, requires_approval,
                risk_validation_enabled, created_by, updated_by
            )
            SELECT
                gen_random_uuid(), 
                COALESCE(c.tenant_id, 'fa480c2d-2725-43bd-a7ba-6fc60a89a1cb'::uuid),
                v_target_comp,
                UPPER(p_service_code),
                COALESCE(c.service_name, p_service_code),
                p_is_enabled,
                'CONFIGURED',
                COALESCE(c.requires_full_kyc, false),
                COALESCE(c.requires_approval, false),
                COALESCE(c.risk_validation_enabled, true),
                p_updated_by,
                p_updated_by
            FROM (SELECT 1) _dummy
            LEFT JOIN customer_service_configuration c ON UPPER(c.service_code) = UPPER(p_service_code) AND c.is_deleted = false
            LIMIT 1;
        END IF;
    ELSE
        -- Global update across records where company_ref_id is null
        UPDATE customer_service_configuration
        SET is_enabled = p_is_enabled,
            updated_by = p_updated_by,
            updated_date = NOW()
        WHERE UPPER(service_code) = UPPER(p_service_code)
          AND company_ref_id IS NULL
          AND is_deleted = false;
    END IF;

    RETURN QUERY
    SELECT 
        c.service_code::VARCHAR, 
        c.service_name::VARCHAR, 
        c.is_enabled, 
        c.config_status::VARCHAR,
        c.company_ref_id
    FROM customer_service_configuration c
    WHERE UPPER(c.service_code) = UPPER(p_service_code)
      AND (v_target_comp IS NULL OR c.company_ref_id = v_target_comp OR c.company_ref_id IS NULL)
      AND c.is_deleted = false
    ORDER BY (c.company_ref_id IS NOT NULL AND c.company_ref_id = v_target_comp) DESC
    LIMIT 1;
END;
$$;

-- 3. Checks live availability of a specific service code (e.g., 'DMT', 'RECHARGE', 'AEPS') for a company
CREATE OR REPLACE FUNCTION public.sp_check_platform_service_availability(
    p_service_code VARCHAR,
    p_company_ref_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    out_service_code VARCHAR,
    out_service_name VARCHAR,
    out_is_enabled BOOLEAN,
    out_config_status VARCHAR,
    out_status_message VARCHAR,
    out_company_ref_id BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.service_code::VARCHAR, 
        c.service_name::VARCHAR, 
        c.is_enabled, 
        c.config_status::VARCHAR,
        CASE 
            WHEN c.is_enabled = true THEN 'Service is active and operational.'::VARCHAR
            ELSE 'Temporary service down. Scheduled maintenance in progress. Service will resume shortly.'::VARCHAR
        END,
        c.company_ref_id
    FROM customer_service_configuration c
    WHERE UPPER(c.service_code) = UPPER(p_service_code) 
      AND (p_company_ref_id IS NULL OR c.company_ref_id = p_company_ref_id OR c.company_ref_id IS NULL)
      AND c.is_deleted = false
    ORDER BY (c.company_ref_id IS NOT NULL AND c.company_ref_id = p_company_ref_id) DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p_service_code::VARCHAR,
            p_service_code::VARCHAR,
            false::BOOLEAN,
            'INACTIVE'::VARCHAR,
            'Service code not recognized or configured.'::VARCHAR,
            p_company_ref_id;
    END IF;
END;
$$;
