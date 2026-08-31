-- =============================================================================
-- Migration: 12_approved_retailers_sp_and_mdr.sql
-- Description: 
--   1. Stored Procedure / Function to get only Approved & Active Retailers
--   2. Function to provision Default POS MDR for all Approved Retailers
--   3. Execution of default MDR configuration for existing approved retailers
-- =============================================================================

-- 1. Create get_approved_retailers_list function
DROP FUNCTION IF EXISTS public.get_approved_retailers_list(VARCHAR, UUID);
DROP FUNCTION IF EXISTS public.get_approved_retailers_list(VARCHAR);
DROP FUNCTION IF EXISTS public.get_approved_retailers_list();

CREATE OR REPLACE FUNCTION public.get_approved_retailers_list(
    p_search VARCHAR DEFAULT NULL,
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    public_id UUID,
    retailer_code VARCHAR,
    store_name VARCHAR,
    legal_name VARCHAR,
    owner_name VARCHAR,
    business_category VARCHAR,
    registered_mobile VARCHAR,
    email VARCHAR,
    status VARCHAR,
    wallet_balance NUMERIC,
    company_id UUID,
    tenant_id UUID,
    created_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.public_id,
        r.retailer_code,
        r.store_name,
        r.legal_name,
        r.owner_name,
        r.business_category,
        COALESCE(c.mobile, '')::VARCHAR AS registered_mobile,
        COALESCE(c.email, '')::VARCHAR AS email,
        r.status,
        COALESCE(w.wallet_balance, 0.0)::NUMERIC AS wallet_balance,
        r.company_id,
        r.tenant_id,
        r.created_date
    FROM public.retailer r
    LEFT JOIN LATERAL (
        SELECT rc.mobile, rc.email
        FROM public.retailer_contact rc
        WHERE rc.retailer_id = r.public_id AND rc.is_deleted = false
        ORDER BY rc.id ASC
        LIMIT 1
    ) c ON true
    LEFT JOIN public.retailer_wallet w ON w.retailer_id = r.public_id AND w.is_deleted = false
    WHERE r.is_deleted = false
      AND (UPPER(r.status) IN ('ACTIVE', 'APPROVED'))
      AND (p_company_id IS NULL OR r.company_id = p_company_id)
      AND (
          p_search IS NULL OR p_search = '' OR
          r.retailer_code ILIKE '%' || p_search || '%' OR
          r.store_name ILIKE '%' || p_search || '%' OR
          r.owner_name ILIKE '%' || p_search || '%' OR
          r.legal_name ILIKE '%' || p_search || '%' OR
          c.mobile ILIKE '%' || p_search || '%'
      )
    ORDER BY r.store_name ASC, r.created_date DESC;
END;
$$;


-- 2. Create provision_default_mdr_for_approved_retailers function
DROP FUNCTION IF EXISTS public.provision_default_mdr_for_approved_retailers();

CREATE OR REPLACE FUNCTION public.provision_default_mdr_for_approved_retailers()
RETURNS TABLE (
    provisioned_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ret RECORD;
    v_mode RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Loop over all active / approved retailers
    FOR v_ret IN 
        SELECT r.public_id, r.company_id, r.tenant_id
        FROM public.retailer r
        WHERE r.is_deleted = false AND UPPER(r.status) IN ('ACTIVE', 'APPROVED')
    LOOP
        -- For each default POS payment mode
        FOR v_mode IN
            SELECT * FROM (VALUES 
                ('POS - Instant', 1.7000, 'PERCENTAGE', 18.00, 'Default MDR for POS - Instant (1.70%)'),
                ('POS+T1', 1.6000, 'PERCENTAGE', 18.00, 'Default MDR for POS+T1 (1.60%)'),
                ('POS+T2', 1.5000, 'PERCENTAGE', 18.00, 'Default MDR for POS+T2 (1.50%)')
            ) AS t(payment_mode, mdr, mdr_type, gst_rate, remarks)
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.pos_mdr_configuration
                WHERE retailer_id = v_ret.public_id 
                  AND payment_mode = v_mode.payment_mode
                  AND is_deleted = false
            ) THEN
                INSERT INTO public.pos_mdr_configuration (
                    public_id, retailer_id, tenant_id, company_id,
                    payment_mode, mdr, mdr_type, gst_rate,
                    effective_from, is_active, is_deleted,
                    remarks, created_by, updated_by, created_date, updated_date
                ) VALUES (
                    gen_random_uuid(), v_ret.public_id, v_ret.tenant_id, v_ret.company_id,
                    v_mode.payment_mode, v_mode.mdr, v_mode.mdr_type, v_mode.gst_rate,
                    NOW(), true, false,
                    v_mode.remarks, 'SYSTEM_DEFAULT_PROVISION', 'SYSTEM_DEFAULT_PROVISION', NOW(), NOW()
                );
                v_count := v_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT v_count;
END;
$$;

-- 3. Execute Provisioning for all Existing Approved Retailers
SELECT * FROM public.provision_default_mdr_for_approved_retailers();
