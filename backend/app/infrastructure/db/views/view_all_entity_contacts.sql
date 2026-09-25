-- ==============================================================================
-- View: public.view_all_entity_contacts
-- Purpose: Unified view across Super Distributor, Distributor, and Retailer
--          for authoritative cross-entity mobile & email uniqueness enforcement.
-- ==============================================================================

CREATE OR REPLACE VIEW public.view_all_entity_contacts AS
-- Super Distributor
SELECT 
    sd.super_distributor_ref_id AS entity_ref_id,
    sd.public_id AS entity_id,
    4::integer AS user_type_ref_id,
    'SD'::varchar(50) AS user_type_code,
    'Super Distributor'::varchar(100) AS user_type_name,
    sd.business_name::varchar(255) AS business_name,
    sd.owner_name::varchar(255) AS owner_name,
    sd.mobile::varchar(20) AS mobile,
    sd.email::varchar(255) AS email,
    sd.status::varchar(30) AS status,
    sd.is_active,
    sd.tenant_id,
    sd.company_id
FROM public.super_distributor sd
WHERE sd.is_deleted = FALSE

UNION ALL

-- Distributor
SELECT 
    d.distributor_ref_id AS entity_ref_id,
    d.public_id AS entity_id,
    3::integer AS user_type_ref_id,
    'DISTRIBUTOR'::varchar(50) AS user_type_code,
    'Distributor'::varchar(100) AS user_type_name,
    d.business_name::varchar(255) AS business_name,
    d.owner_name::varchar(255) AS owner_name,
    d.mobile::varchar(20) AS mobile,
    d.email::varchar(255) AS email,
    d.status::varchar(30) AS status,
    d.is_active,
    d.tenant_id,
    d.company_id
FROM public.distributor d
WHERE d.is_deleted = FALSE

UNION ALL

-- Retailer
SELECT 
    r.retailer_ref_id AS entity_ref_id,
    r.public_id AS entity_id,
    2::integer AS user_type_ref_id,
    'RETAILER'::varchar(50) AS user_type_code,
    'Retailer'::varchar(100) AS user_type_name,
    r.store_name::varchar(255) AS business_name,
    r.owner_name::varchar(255) AS owner_name,
    COALESCE(rc.mobile, '')::varchar(20) AS mobile,
    COALESCE(rc.email, '')::varchar(255) AS email,
    r.status::varchar(30) AS status,
    r.is_active,
    r.tenant_id,
    r.company_id
FROM public.retailer r
LEFT JOIN public.retailer_contact rc ON rc.retailer_id = r.public_id AND rc.is_deleted = FALSE
WHERE r.is_deleted = FALSE;
