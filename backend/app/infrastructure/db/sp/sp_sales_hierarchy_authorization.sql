-- ==============================================================================
-- STORED PROCEDURE: sp_sales_hierarchy_authorization
-- Purpose: Resolves all authorized entity UUIDs for a given sales user.
-- ==============================================================================

CREATE OR REPLACE FUNCTION sp_sales_hierarchy_authorization(
    p_sales_user_id UUID
)
RETURNS TABLE (
    is_all_scope BOOLEAN,
    tenant_id UUID,
    super_distributor_ids UUID[],
    distributor_ids UUID[],
    retailer_ids UUID[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tenant_id UUID;
    v_has_all BOOLEAN := FALSE;
    v_sd_ids UUID[] := ARRAY[]::UUID[];
    v_dist_ids UUID[] := ARRAY[]::UUID[];
    v_ret_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- 1. Get Tenant ID of Sales User
    SELECT su.tenant_id INTO v_tenant_id
    FROM sales_user su
    WHERE su.public_id = p_sales_user_id AND su.is_active = true AND su.is_deleted = false;

    IF v_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- 2. Check if user has ALL mapping
    IF EXISTS (
        SELECT 1 FROM sales_hierarchy_mapping
        WHERE sales_user_id = p_sales_user_id
          AND mapping_type = 'ALL'
          AND is_active = true
          AND is_deleted = false
    ) THEN
        v_has_all := TRUE;
    ELSE
        -- 3. Gather directly mapped SDs and their downstream Dist & Retailers
        SELECT ARRAY_AGG(DISTINCT super_distributor_id) INTO v_sd_ids
        FROM sales_hierarchy_mapping
        WHERE sales_user_id = p_sales_user_id
          AND mapping_type = 'SUPER_DISTRIBUTOR'
          AND super_distributor_id IS NOT NULL
          AND is_active = true
          AND is_deleted = false;

        -- 4. Gather directly mapped Distributors
        SELECT ARRAY_AGG(DISTINCT distributor_id) INTO v_dist_ids
        FROM sales_hierarchy_mapping
        WHERE sales_user_id = p_sales_user_id
          AND mapping_type = 'DISTRIBUTOR'
          AND distributor_id IS NOT NULL
          AND is_active = true
          AND is_deleted = false;

        -- 5. Gather directly mapped Retailers
        SELECT ARRAY_AGG(DISTINCT retailer_id) INTO v_ret_ids
        FROM sales_hierarchy_mapping
        WHERE sales_user_id = p_sales_user_id
          AND mapping_type = 'RETAILER'
          AND retailer_id IS NOT NULL
          AND is_active = true
          AND is_deleted = false;
    END IF;

    RETURN QUERY
    SELECT 
        v_has_all,
        v_tenant_id,
        COALESCE(v_sd_ids, ARRAY[]::UUID[]),
        COALESCE(v_dist_ids, ARRAY[]::UUID[]),
        COALESCE(v_ret_ids, ARRAY[]::UUID[]);
END;
$$;
