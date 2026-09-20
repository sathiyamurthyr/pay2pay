-- ==============================================================================
-- View: public.view_super_distributor_auth_profile
-- Purpose: Authoritative view for Super Distributor (Master Distributor)
--          authentication, credentials, profile metadata, wallet balance,
--          and operational status.
-- Pattern: Mirrors view_distributor_auth_profile exactly.
-- DO NOT MODIFY view_distributor_auth_profile.
-- ==============================================================================

CREATE OR REPLACE VIEW public.view_super_distributor_auth_profile AS
SELECT
    sd.id AS super_distributor_id_pk,
    sd.public_id AS super_distributor_id,
    COALESCE(sd.super_distributor_ref_id, sd.id) AS super_distributor_ref_id,
    sd.super_distributor_code,
    sd.business_name,
    sd.owner_name,
    COALESCE(sd.owner_name, au.full_name, 'Super Distributor Partner')::varchar(250) AS full_name,
    sd.mobile,
    COALESCE(sd.email, au.email)::varchar(255) AS email,
    sd.status,
    sd.is_active,
    sd.is_deleted,
    (sd.status = 'ACTIVE' AND sd.is_active = TRUE AND sd.is_deleted = FALSE) AS approve_status,
    (sd.status = 'ACTIVE' AND sd.is_active = TRUE AND sd.is_deleted = FALSE) AS active_status,
    COALESCE(w.balance, sd.wallet_balance, 0.00)::numeric(18,2) AS wallet_balance,
    COALESCE(sd.credit_limit, 0.00)::numeric(18,2) AS credit_limit,
    COALESCE(sd.tenant_id, au.tenant_id) AS tenant_id,
    COALESCE(sd.tenant_ref_id, t.tenant_ref_id, 1)::bigint AS tenant_ref_id,
    COALESCE(sd.company_id, au.company_id) AS company_id,
    COALESCE(sd.company_ref_id, c.company_ref_id, 1)::bigint AS company_ref_id,
    4::integer AS user_type_ref_id,
    'SUPER_DISTRIBUTOR'::varchar(50) AS role,
    'SUPER_DISTRIBUTOR'::varchar(50) AS user_type,
    au.password_hash,
    COALESCE(au.mfa_enabled, FALSE) AS mfa_enabled,
    COALESCE(au.failed_attempts, 0)::integer AS failed_attempts,
    au.locked_until,
    sd.gst_number,
    sd.pan_number,
    sd.city,
    sd.state,
    sd.pincode,
    sd.address,
    sd.bank_account_number,
    sd.ifsc
FROM public.super_distributor sd
LEFT JOIN public.auth_users au
    ON (au.mobile_number = sd.mobile OR au.user_id = sd.public_id)
    AND au.is_deleted = FALSE
LEFT JOIN public.tenant t
    ON t.public_id = sd.tenant_id
    AND t.is_deleted = FALSE
LEFT JOIN public.company c
    ON c.public_id = sd.company_id
    AND c.is_deleted = FALSE
LEFT JOIN public.sd_wallet w
    ON w.super_distributor_ref_id = COALESCE(sd.super_distributor_ref_id, sd.id)
WHERE sd.is_deleted = FALSE;
