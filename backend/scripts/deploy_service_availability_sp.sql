-- ==============================================================================
-- Pay2Pay Platform Service Availability & Downtime Status Stored Procedures (SPI)
-- ==============================================================================

-- 1. Returns live availability status for all platform services
CREATE OR REPLACE FUNCTION public.sp_get_all_platform_services_status()
RETURNS TABLE(
    out_service_code VARCHAR,
    out_service_name VARCHAR,
    out_is_enabled BOOLEAN,
    out_config_status VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.service_code::VARCHAR, 
        c.service_name::VARCHAR, 
        c.is_enabled, 
        c.config_status::VARCHAR
    FROM customer_service_configuration c
    WHERE c.is_deleted = false
    ORDER BY c.service_code;
END;
$$;

-- 2. Checks live availability of a specific service code (e.g., 'DMT', 'RECHARGE', 'AEPS')
CREATE OR REPLACE FUNCTION public.sp_check_platform_service_availability(p_service_code VARCHAR)
RETURNS TABLE(
    out_service_code VARCHAR,
    out_service_name VARCHAR,
    out_is_enabled BOOLEAN,
    out_config_status VARCHAR,
    out_status_message VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_found BOOLEAN := false;
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
        END
    FROM customer_service_configuration c
    WHERE UPPER(c.service_code) = UPPER(p_service_code) 
      AND c.is_deleted = false;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p_service_code::VARCHAR,
            p_service_code::VARCHAR,
            false::BOOLEAN,
            'INACTIVE'::VARCHAR,
            'Service code not recognized or configured.'::VARCHAR;
    END IF;
END;
$$;
