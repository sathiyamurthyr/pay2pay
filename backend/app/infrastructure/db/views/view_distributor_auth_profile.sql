-- ==============================================================================
-- View: public.view_distributor_auth_profile
-- Purpose: Authoritative view for distributor authentication, credentials, 
--          profile metadata, wallet balance, and operational status.
-- ==============================================================================

CREATE OR REPLACE VIEW public.view_distributor_auth_profile AS
SELECT
    d.id AS distributor_id_pk,
    d.public_id AS distributor_id,
    COALESCE(d.distributor_ref_id, d.id) AS distributor_ref_id,
    d.distributor_code,
    d.business_name,
    d.owner_name,
    COALESCE(d.owner_name, au.full_name, 'Distributor Partner')::varchar(250) AS full_name,
    d.mobile,
    COALESCE(d.email, au.email)::varchar(255) AS email,
    d.status,
    d.is_active,
    d.is_deleted,
    (d.status = 'ACTIVE' AND d.is_active = TRUE AND d.is_deleted = FALSE) AS approve_status,
    (d.status = 'ACTIVE' AND d.is_active = TRUE AND d.is_deleted = FALSE) AS active_status,
    COALESCE(w.balance, d.wallet_balance, 0.00)::numeric(18,2) AS wallet_balance,
    COALESCE(d.credit_limit, 0.00)::numeric(18,2) AS credit_limit,
    COALESCE(d.tenant_id, au.tenant_id, '547aa7bb-a790-4fe2-bd5b-27214ed176c8'::uuid) AS tenant_id,
    COALESCE(d.tenant_ref_id, t.tenant_ref_id, 1)::bigint AS tenant_ref_id,
    COALESCE(d.company_id, au.company_id, 'b1e02b56-7742-4549-a4ef-31f5378f00a8'::uuid) AS company_id,
    COALESCE(d.company_ref_id, c.company_ref_id, 1)::bigint AS company_ref_id,
    3::integer AS user_type_ref_id,
    'DISTRIBUTOR'::varchar(50) AS role,
    'DISTRIBUTOR'::varchar(50) AS user_type,
    au.password_hash,
    COALESCE(au.mfa_enabled, FALSE) AS mfa_enabled,
    COALESCE(au.failed_attempts, 0)::integer AS failed_attempts,
    au.locked_until,
    d.gst_number,
    d.pan_number,
    d.city,
    d.state,
    d.pincode,
    d.address,
    d.bank_account_number,
    d.ifsc
FROM public.distributor d
LEFT JOIN public.auth_users au 
    ON (au.mobile_number = d.mobile OR au.user_id = d.public_id)
    AND au.is_deleted = FALSE
LEFT JOIN public.tenant t 
    ON t.public_id = d.tenant_id 
    AND t.is_deleted = FALSE
LEFT JOIN public.company c 
    ON c.public_id = d.company_id 
    AND c.is_deleted = FALSE
LEFT JOIN public.dist_wallet w 
    ON w.distributor_ref_id = COALESCE(d.distributor_ref_id, d.id) 
    AND w.is_active = TRUE
WHERE d.is_deleted = FALSE;
