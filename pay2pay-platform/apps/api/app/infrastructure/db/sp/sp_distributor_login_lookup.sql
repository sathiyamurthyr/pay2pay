-- ==============================================================================
-- Stored Procedure: public.sp_distributor_login_lookup
-- Purpose: Authoritative stored procedure to look up a distributor for 
--          authentication by mobile number, verifying active status and 
--          returning credentials, profile, and tenant metadata.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sp_distributor_login_lookup(p_mobile text)
RETURNS TABLE (
    distributor_id uuid,
    distributor_ref_id bigint,
    distributor_code varchar,
    business_name varchar,
    owner_name varchar,
    full_name varchar,
    mobile varchar,
    email varchar,
    status varchar,
    is_active boolean,
    approve_status boolean,
    active_status boolean,
    wallet_balance numeric,
    credit_limit numeric,
    tenant_id uuid,
    tenant_ref_id bigint,
    company_id uuid,
    company_ref_id bigint,
    user_type_ref_id integer,
    role varchar,
    user_type varchar,
    password_hash varchar,
    mfa_enabled boolean,
    failed_attempts integer,
    locked_until timestamptz,
    gst_number varchar,
    pan_number varchar,
    city varchar,
    state varchar,
    pincode varchar,
    address text,
    bank_account_number varchar,
    ifsc varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_mobile text;
BEGIN
    -- Normalize mobile: strip non-digits, take last 10 digits
    v_clean_mobile := substring(regexp_replace(COALESCE(p_mobile, ''), '\D', '', 'g') from '(\d{10})$');
    IF v_clean_mobile IS NULL OR length(v_clean_mobile) < 10 THEN
        v_clean_mobile := trim(p_mobile);
    END IF;

    RETURN QUERY
    SELECT 
        v.distributor_id,
        v.distributor_ref_id,
        v.distributor_code,
        v.business_name,
        v.owner_name,
        v.full_name::varchar,
        v.mobile,
        v.email,
        v.status,
        v.is_active,
        v.approve_status,
        v.active_status,
        v.wallet_balance,
        v.credit_limit,
        v.tenant_id,
        v.tenant_ref_id,
        v.company_id,
        v.company_ref_id,
        v.user_type_ref_id,
        v.role,
        v.user_type,
        v.password_hash,
        v.mfa_enabled,
        v.failed_attempts,
        v.locked_until,
        v.gst_number,
        v.pan_number,
        v.city,
        v.state,
        v.pincode,
        v.address,
        v.bank_account_number,
        v.ifsc
    FROM public.view_distributor_auth_profile v
    WHERE (
        v.mobile = v_clean_mobile
        OR v.mobile = ('91' || v_clean_mobile)
        OR v.mobile = ('+91' || v_clean_mobile)
        OR v.mobile = p_mobile
    )
    ORDER BY (CASE WHEN v.status = 'ACTIVE' AND v.is_active = TRUE THEN 1 ELSE 2 END)
    LIMIT 1;
END;
$$;
