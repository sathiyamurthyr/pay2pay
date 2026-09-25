-- ==============================================================================
-- STORED PROCEDURE: sp_sales_user_auth_lookup
-- Purpose: Authenticates and resolves Sales User profile with tenant & scope.
-- ==============================================================================

CREATE OR REPLACE FUNCTION sp_sales_user_auth_lookup(
    p_identifier VARCHAR(255),
    p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    sales_user_ref_id BIGINT,
    public_id UUID,
    tenant_id UUID,
    company_id UUID,
    employee_code VARCHAR(50),
    username VARCHAR(100),
    full_name VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(20),
    password_hash VARCHAR(255),
    territory VARCHAR(100),
    department VARCHAR(100),
    designation VARCHAR(100),
    status VARCHAR(30),
    is_active BOOLEAN,
    tenant_name VARCHAR(255),
    mapping_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        su.sales_user_ref_id,
        su.public_id,
        su.tenant_id,
        su.company_id,
        su.employee_code,
        su.username,
        su.full_name,
        su.email,
        su.mobile,
        su.password_hash,
        su.territory,
        su.department,
        su.designation,
        su.status,
        su.is_active,
        t.name AS tenant_name,
        COUNT(shm.sales_mapping_ref_id) AS mapping_count
    FROM sales_user su
    JOIN tenant t ON su.tenant_id = t.public_id
    LEFT JOIN sales_hierarchy_mapping shm ON su.public_id = shm.sales_user_id AND shm.is_active = true AND shm.is_deleted = false
    WHERE su.is_deleted = false
      AND (su.email = p_identifier OR su.mobile = p_identifier OR su.username = p_identifier OR su.employee_code = p_identifier)
      AND (p_tenant_id IS NULL OR su.tenant_id = p_tenant_id)
    GROUP BY 
        su.sales_user_ref_id, su.public_id, su.tenant_id, su.company_id,
        su.employee_code, su.username, su.full_name, su.email, su.mobile,
        su.password_hash, su.territory, su.department, su.designation,
        su.status, su.is_active, t.name;
END;
$$;
