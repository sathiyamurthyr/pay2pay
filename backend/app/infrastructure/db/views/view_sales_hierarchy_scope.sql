-- ==============================================================================
-- VIEW: view_sales_hierarchy_scope
-- Purpose: Provides unified view of Tenant -> Company -> Super Distributor -> 
--          Distributor -> Retailer -> POS Machine hierarchy for Sales Portal.
-- Strictly tenant and company scoped.
-- ==============================================================================

CREATE OR REPLACE VIEW view_sales_hierarchy_scope AS
SELECT
    r.tenant_id,
    r.company_id,
    r.public_id AS retailer_id,
    r.retailer_code,
    r.store_name AS retailer_name,
    r.owner_name AS retailer_owner,
    r.status AS retailer_status,
    r.business_category,
    r.store_type,
    r.created_date AS retailer_onboarded_at,
    
    -- Distributor Details
    d.public_id AS distributor_id,
    d.distributor_code,
    d.business_name AS distributor_name,
    d.owner_name AS distributor_owner,
    d.mobile AS distributor_mobile,
    d.email AS distributor_email,
    d.status AS distributor_status,
    
    -- Super Distributor Details
    sd.public_id AS super_distributor_id,
    sd.super_distributor_code,
    sd.business_name AS super_distributor_name,
    sd.owner_name AS super_distributor_owner,
    sd.mobile AS super_distributor_mobile,
    sd.email AS super_distributor_email,
    sd.status AS super_distributor_status,
    
    -- Company Details
    c.legal_name AS company_name,
    
    -- POS Summary Counts
    COALESCE(pos_counts.pos_count, 0) AS pos_machine_count,
    COALESCE(pos_counts.active_pos_count, 0) AS active_pos_count

FROM retailer r
LEFT JOIN distributor d ON r.mapped_distributor_id = d.public_id
LEFT JOIN super_distributor sd ON (r.mapped_super_distributor_id = sd.public_id OR d.mapped_super_distributor_id = sd.public_id)
LEFT JOIN company c ON r.company_id = c.public_id
LEFT JOIN (
    SELECT 
        mapped_retailer_id,
        COUNT(*) AS pos_count,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_pos_count
    FROM swipe_machine
    WHERE is_deleted = false
    GROUP BY mapped_retailer_id
) pos_counts ON r.public_id = pos_counts.mapped_retailer_id
WHERE r.is_deleted = false;
