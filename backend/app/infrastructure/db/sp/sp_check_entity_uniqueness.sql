-- ==============================================================================
-- Stored Procedure: public.sp_check_entity_uniqueness
-- Purpose: Authoritative database stored procedure to check mobile & email uniqueness
--          across Super Distributor, Distributor, and Retailer.
--          Enforces strict cross-entity rejection (e.g. Existing SD mobile -> Reject New Retailer).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sp_check_entity_uniqueness(
    p_mobile VARCHAR,
    p_email VARCHAR DEFAULT NULL,
    p_target_user_type_ref_id INTEGER DEFAULT 2
)
RETURNS TABLE (
    is_valid BOOLEAN,
    status VARCHAR,
    mobile_exists BOOLEAN,
    mobile_conflict BOOLEAN,
    existing_entity_type VARCHAR,
    existing_user_type_ref_id INTEGER,
    existing_status VARCHAR,
    existing_name VARCHAR,
    email_exists BOOLEAN,
    email_conflict BOOLEAN,
    message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_clean_mobile VARCHAR;
    v_clean_email VARCHAR;
    v_rec RECORD;
    v_email_rec RECORD;
BEGIN
    -- Normalize mobile
    v_clean_mobile := REGEXP_REPLACE(p_mobile, '[^0-9]', '', 'g');
    IF LENGTH(v_clean_mobile) > 10 THEN
        v_clean_mobile := RIGHT(v_clean_mobile, 10);
    END IF;

    -- Normalize email
    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));

    -- 1. Check Mobile in view_all_entity_contacts
    SELECT * INTO v_rec
    FROM public.view_all_entity_contacts
    WHERE REGEXP_REPLACE(mobile, '[^0-9]', '', 'g') = v_clean_mobile
       OR RIGHT(REGEXP_REPLACE(mobile, '[^0-9]', '', 'g'), 10) = v_clean_mobile
    LIMIT 1;

    -- 2. Check Email in view_all_entity_contacts if provided
    IF v_clean_email <> '' THEN
        SELECT * INTO v_email_rec
        FROM public.view_all_entity_contacts
        WHERE LOWER(TRIM(email)) = v_clean_email
        LIMIT 1;
    END IF;

    -- Case 1: Mobile exists for a DIFFERENT entity type
    IF v_rec IS NOT NULL AND v_rec.user_type_ref_id <> p_target_user_type_ref_id THEN
        RETURN QUERY SELECT 
            FALSE,
            'CONFLICT'::VARCHAR,
            TRUE,
            TRUE,
            v_rec.user_type_name,
            v_rec.user_type_ref_id,
            v_rec.status,
            v_rec.owner_name,
            (v_email_rec IS NOT NULL),
            (v_email_rec IS NOT NULL),
            FORMAT('Mobile number %s is already registered as a %s (%s). The same mobile number cannot be registered across multiple entity types.', v_clean_mobile, v_rec.user_type_name, v_rec.business_name)::TEXT;
        RETURN;
    END IF;

    -- Case 2: Mobile exists for the SAME entity type
    IF v_rec IS NOT NULL AND v_rec.user_type_ref_id = p_target_user_type_ref_id THEN
        RETURN QUERY SELECT 
            (v_rec.status IN ('DRAFT', 'PENDING_KYC')),
            CASE 
                WHEN v_rec.status IN ('ACTIVE', 'APPROVED') THEN 'ALREADY_ACTIVE'::VARCHAR
                WHEN v_rec.status IN ('PENDING_APPROVAL', 'UNDER_REVIEW') THEN 'PENDING_APPROVAL'::VARCHAR
                WHEN v_rec.status = 'REJECTED' THEN 'REJECTED'::VARCHAR
                ELSE 'INCOMPLETE'::VARCHAR
            END,
            TRUE,
            FALSE,
            v_rec.user_type_name,
            v_rec.user_type_ref_id,
            v_rec.status,
            v_rec.owner_name,
            (v_email_rec IS NOT NULL),
            FALSE,
            FORMAT('Mobile number is already registered for this %s account.', v_rec.user_type_name)::TEXT;
        RETURN;
    END IF;

    -- Case 3: Email conflict with any existing entity
    IF v_email_rec IS NOT NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            'EMAIL_CONFLICT'::VARCHAR,
            FALSE,
            FALSE,
            v_email_rec.user_type_name,
            v_email_rec.user_type_ref_id,
            v_email_rec.status,
            v_email_rec.owner_name,
            TRUE,
            TRUE,
            FORMAT('Email address %s is already registered for an existing %s (%s).', v_clean_email, v_email_rec.user_type_name, v_email_rec.business_name)::TEXT;
        RETURN;
    END IF;

    -- Case 4: Available for new registration
    RETURN QUERY SELECT 
        TRUE,
        'AVAILABLE'::VARCHAR,
        FALSE,
        FALSE,
        NULL::VARCHAR,
        NULL::INTEGER,
        NULL::VARCHAR,
        NULL::VARCHAR,
        FALSE,
        FALSE,
        'Mobile number and email are available for onboarding.'::TEXT;
    RETURN;
END;
$$;
