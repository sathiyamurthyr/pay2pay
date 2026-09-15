-- ==============================================================================
-- Enterprise UPI Vendor Configuration Stored Procedures & Functions
-- Module: UPI QR Vendor Management & Configuration
-- ==============================================================================

-- 1. Create UPI Vendor
CREATE OR REPLACE FUNCTION public.sp_create_upi_vendor(
    p_tenant_id UUID,
    p_company_id UUID,
    p_vendor_name TEXT,
    p_vendor_code TEXT,
    p_company_mdr NUMERIC,
    p_retailer_mdr NUMERIC,
    p_qr_image_url TEXT,
    p_qr_image_storage_key TEXT,
    p_upi_id TEXT,
    p_payee_name TEXT,
    p_merchant_code TEXT,
    p_upi_uri TEXT,
    p_qr_payload TEXT,
    p_vendor_status TEXT,
    p_qr_status TEXT,
    p_admin_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_vendor_id BIGINT;
    v_public_id UUID := gen_random_uuid();
    v_clean_code TEXT := UPPER(TRIM(p_vendor_code));
    v_clean_upi TEXT := LOWER(TRIM(p_upi_id));
    v_v_status TEXT := UPPER(COALESCE(p_vendor_status, 'ACTIVE'));
    v_q_status TEXT := UPPER(COALESCE(p_qr_status, 'ENABLED'));
    v_result JSONB;
BEGIN
    -- Validations
    IF TRIM(COALESCE(p_vendor_name, '')) = '' THEN
        RAISE EXCEPTION 'Vendor Name is required.';
    END IF;
    IF v_clean_code = '' THEN
        RAISE EXCEPTION 'Vendor Code is required.';
    END IF;
    IF v_clean_upi = '' THEN
        RAISE EXCEPTION 'UPI ID is required.';
    END IF;
    IF p_company_mdr < 0 THEN
        RAISE EXCEPTION 'Company MDR percentage cannot be negative.';
    END IF;
    IF p_retailer_mdr < 0 THEN
        RAISE EXCEPTION 'Retailer MDR percentage cannot be negative.';
    END IF;
    IF v_v_status NOT IN ('ACTIVE', 'INACTIVE') THEN
        RAISE EXCEPTION 'Invalid vendor status: %. Allowed: ACTIVE, INACTIVE.', v_v_status;
    END IF;
    IF v_q_status NOT IN ('ENABLED', 'DISABLED') THEN
        RAISE EXCEPTION 'Invalid QR status: %. Allowed: ENABLED, DISABLED.', v_q_status;
    END IF;

    -- Check duplicate vendor_code within same company or globally
    IF EXISTS (
        SELECT 1 FROM public.upi_vendor_configuration
        WHERE is_deleted = FALSE
          AND (
              company_id = p_company_id
              OR company_id IS NULL
              OR p_company_id IS NULL
          )
          AND UPPER(vendor_code) = v_clean_code
    ) THEN
        RAISE EXCEPTION 'Vendor Code ''%'' already exists.', v_clean_code;
    END IF;

    -- Check duplicate UPI ID within same company or globally
    IF EXISTS (
        SELECT 1 FROM public.upi_vendor_configuration
        WHERE is_deleted = FALSE
          AND (
              company_id = p_company_id
              OR company_id IS NULL
              OR p_company_id IS NULL
          )
          AND LOWER(upi_id) = v_clean_upi
    ) THEN
        RAISE EXCEPTION 'UPI ID ''%'' is already registered with an existing vendor.', v_clean_upi;
    END IF;

    -- Insert vendor record
    INSERT INTO public.upi_vendor_configuration (
        public_id,
        tenant_id,
        company_id,
        vendor_name,
        vendor_code,
        company_mdr,
        retailer_mdr,
        qr_image_url,
        qr_image_storage_key,
        upi_id,
        payee_name,
        merchant_code,
        upi_uri,
        qr_payload,
        vendor_status,
        qr_status,
        created_by,
        created_date,
        updated_by,
        updated_date,
        is_active,
        is_deleted
    ) VALUES (
        v_public_id,
        p_tenant_id,
        p_company_id,
        TRIM(p_vendor_name),
        v_clean_code,
        p_company_mdr,
        p_retailer_mdr,
        p_qr_image_url,
        p_qr_image_storage_key,
        v_clean_upi,
        TRIM(p_payee_name),
        TRIM(p_merchant_code),
        TRIM(p_upi_uri),
        TRIM(p_qr_payload),
        v_v_status,
        v_q_status,
        p_admin_id,
        NOW(),
        p_admin_id,
        NOW(),
        TRUE,
        FALSE
    ) RETURNING id INTO v_vendor_id;

    -- Audit trail
    INSERT INTO public.upi_vendor_audit (
        vendor_config_id,
        company_id,
        admin_id,
        action,
        field_name,
        previous_value,
        new_value,
        created_at
    ) VALUES (
        v_vendor_id,
        p_company_id,
        COALESCE(p_admin_id, 'ADMIN'),
        'CREATE',
        'vendor_created',
        NULL,
        jsonb_build_object(
            'vendor_name', p_vendor_name,
            'vendor_code', v_clean_code,
            'upi_id', v_clean_upi,
            'company_mdr', p_company_mdr,
            'retailer_mdr', p_retailer_mdr,
            'vendor_status', v_v_status,
            'qr_status', v_q_status
        )::text,
        NOW()
    );

    SELECT to_jsonb(v.*) INTO v_result
    FROM public.vw_upi_vendor_configuration v
    WHERE v.id = v_vendor_id;

    RETURN v_result;
END;
$$;


-- 2. Update UPI Vendor
CREATE OR REPLACE FUNCTION public.sp_update_upi_vendor(
    p_vendor_id UUID,
    p_vendor_name TEXT,
    p_vendor_code TEXT,
    p_company_mdr NUMERIC,
    p_retailer_mdr NUMERIC,
    p_qr_image_url TEXT,
    p_qr_image_storage_key TEXT,
    p_upi_id TEXT,
    p_payee_name TEXT,
    p_merchant_code TEXT,
    p_upi_uri TEXT,
    p_qr_payload TEXT,
    p_vendor_status TEXT,
    p_qr_status TEXT,
    p_admin_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_old RECORD;
    v_clean_code TEXT := UPPER(TRIM(p_vendor_code));
    v_clean_upi TEXT := LOWER(TRIM(p_upi_id));
    v_v_status TEXT := UPPER(COALESCE(p_vendor_status, 'ACTIVE'));
    v_q_status TEXT := UPPER(COALESCE(p_qr_status, 'ENABLED'));
    v_result JSONB;
BEGIN
    SELECT * INTO v_old
    FROM public.upi_vendor_configuration
    WHERE public_id = p_vendor_id AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'UPI Vendor with ID % not found.', p_vendor_id;
    END IF;

    -- Validations
    IF p_company_mdr < 0 THEN
        RAISE EXCEPTION 'Company MDR percentage cannot be negative.';
    END IF;
    IF p_retailer_mdr < 0 THEN
        RAISE EXCEPTION 'Retailer MDR percentage cannot be negative.';
    END IF;

    -- Check unique vendor_code if changed
    IF v_clean_code <> v_old.vendor_code AND EXISTS (
        SELECT 1 FROM public.upi_vendor_configuration
        WHERE is_deleted = FALSE
          AND id <> v_old.id
          AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(v_old.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND UPPER(vendor_code) = v_clean_code
    ) THEN
        RAISE EXCEPTION 'Vendor Code ''%'' already exists for this company.', v_clean_code;
    END IF;

    -- Audit changes
    IF v_old.company_mdr <> p_company_mdr THEN
        INSERT INTO public.upi_vendor_audit (
            vendor_config_id, company_id, admin_id, action, field_name, previous_value, new_value, created_at
        ) VALUES (
            v_old.id, v_old.company_id, COALESCE(p_admin_id, 'ADMIN'), 'MDR_UPDATE', 'company_mdr',
            v_old.company_mdr::text, p_company_mdr::text, NOW()
        );
    END IF;

    IF v_old.retailer_mdr <> p_retailer_mdr THEN
        INSERT INTO public.upi_vendor_audit (
            vendor_config_id, company_id, admin_id, action, field_name, previous_value, new_value, created_at
        ) VALUES (
            v_old.id, v_old.company_id, COALESCE(p_admin_id, 'ADMIN'), 'MDR_UPDATE', 'retailer_mdr',
            v_old.retailer_mdr::text, p_retailer_mdr::text, NOW()
        );
    END IF;

    IF v_old.vendor_status <> v_v_status THEN
        INSERT INTO public.upi_vendor_audit (
            vendor_config_id, company_id, admin_id, action, field_name, previous_value, new_value, created_at
        ) VALUES (
            v_old.id, v_old.company_id, COALESCE(p_admin_id, 'ADMIN'), 'STATUS_TOGGLE', 'vendor_status',
            v_old.vendor_status, v_v_status, NOW()
        );
    END IF;

    IF v_old.qr_status <> v_q_status THEN
        INSERT INTO public.upi_vendor_audit (
            vendor_config_id, company_id, admin_id, action, field_name, previous_value, new_value, created_at
        ) VALUES (
            v_old.id, v_old.company_id, COALESCE(p_admin_id, 'ADMIN'), 'QR_STATUS_TOGGLE', 'qr_status',
            v_old.qr_status, v_q_status, NOW()
        );
    END IF;

    IF p_qr_image_url IS NOT NULL AND p_qr_image_url <> '' AND p_qr_image_url <> v_old.qr_image_url THEN
        INSERT INTO public.upi_vendor_audit (
            vendor_config_id, company_id, admin_id, action, field_name, previous_value, new_value, created_at
        ) VALUES (
            v_old.id, v_old.company_id, COALESCE(p_admin_id, 'ADMIN'), 'QR_CHANGED', 'qr_image_url',
            v_old.qr_image_url, p_qr_image_url, NOW()
        );
    END IF;

    -- Update Record
    UPDATE public.upi_vendor_configuration
    SET vendor_name = COALESCE(NULLIF(TRIM(p_vendor_name), ''), vendor_name),
        vendor_code = COALESCE(NULLIF(v_clean_code, ''), vendor_code),
        company_mdr = p_company_mdr,
        retailer_mdr = p_retailer_mdr,
        qr_image_url = CASE WHEN p_qr_image_url IS NOT NULL AND p_qr_image_url <> '' THEN p_qr_image_url ELSE qr_image_url END,
        qr_image_storage_key = CASE WHEN p_qr_image_storage_key IS NOT NULL AND p_qr_image_storage_key <> '' THEN p_qr_image_storage_key ELSE qr_image_storage_key END,
        upi_id = CASE WHEN v_clean_upi IS NOT NULL AND v_clean_upi <> '' THEN v_clean_upi ELSE upi_id END,
        payee_name = CASE WHEN p_payee_name IS NOT NULL THEN TRIM(p_payee_name) ELSE payee_name END,
        merchant_code = CASE WHEN p_merchant_code IS NOT NULL THEN TRIM(p_merchant_code) ELSE merchant_code END,
        upi_uri = CASE WHEN p_upi_uri IS NOT NULL AND p_upi_uri <> '' THEN TRIM(p_upi_uri) ELSE upi_uri END,
        qr_payload = CASE WHEN p_qr_payload IS NOT NULL AND p_qr_payload <> '' THEN TRIM(p_qr_payload) ELSE qr_payload END,
        vendor_status = v_v_status,
        qr_status = v_q_status,
        updated_by = p_admin_id,
        updated_date = NOW()
    WHERE id = v_old.id;

    SELECT to_jsonb(v.*) INTO v_result
    FROM public.vw_upi_vendor_configuration v
    WHERE v.id = v_old.id;

    RETURN v_result;
END;
$$;


-- 3. Get UPI Vendor Details + Audits
CREATE OR REPLACE FUNCTION public.sp_get_upi_vendor(
    p_vendor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_vendor RECORD;
    v_audits JSONB;
    v_result JSONB;
BEGIN
    SELECT * INTO v_vendor
    FROM public.vw_upi_vendor_configuration
    WHERE public_id = p_vendor_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at DESC), '[]'::jsonb)
    INTO v_audits
    FROM public.upi_vendor_audit a
    WHERE a.vendor_config_id = v_vendor.id;

    v_result := to_jsonb(v_vendor) || jsonb_build_object('audit_history', v_audits);

    RETURN v_result;
END;
$$;


-- 4. List UPI Vendors
CREATE OR REPLACE FUNCTION public.sp_list_upi_vendors(
    p_company_id UUID DEFAULT NULL,
    p_vendor_status TEXT DEFAULT NULL,
    p_qr_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
    v_search_pattern TEXT := CASE WHEN p_search IS NOT NULL AND TRIM(p_search) <> '' THEN '%' || UPPER(TRIM(p_search)) || '%' ELSE NULL END;
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(v.*) ORDER BY v.created_date DESC), '[]'::jsonb)
    INTO v_result
    FROM public.vw_upi_vendor_configuration v
    WHERE (p_company_id IS NULL OR v.company_id IS NULL OR v.company_id = p_company_id)
      AND (p_vendor_status IS NULL OR TRIM(p_vendor_status) = '' OR UPPER(p_vendor_status) = 'ALL' OR v.vendor_status = UPPER(TRIM(p_vendor_status)))
      AND (p_qr_status IS NULL OR TRIM(p_qr_status) = '' OR UPPER(p_qr_status) = 'ALL' OR v.qr_status = UPPER(TRIM(p_qr_status)))
      AND (v_search_pattern IS NULL OR (
          UPPER(v.vendor_name) LIKE v_search_pattern OR
          UPPER(v.vendor_code) LIKE v_search_pattern OR
          UPPER(v.upi_id) LIKE v_search_pattern OR
          UPPER(COALESCE(v.payee_name, '')) LIKE v_search_pattern
      ));

    RETURN v_result;
END;
$$;


-- 5. Toggle Vendor Status (ACTIVE / INACTIVE)
CREATE OR REPLACE FUNCTION public.sp_toggle_upi_vendor_status(
    p_vendor_id UUID,
    p_vendor_status TEXT,
    p_admin_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_old RECORD;
    v_new_status TEXT := UPPER(TRIM(p_vendor_status));
    v_result JSONB;
BEGIN
    IF v_new_status NOT IN ('ACTIVE', 'INACTIVE') THEN
        RAISE EXCEPTION 'Invalid status %. Allowed: ACTIVE, INACTIVE.', v_new_status;
    END IF;

    SELECT * INTO v_old
    FROM public.upi_vendor_configuration
    WHERE public_id = p_vendor_id AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'UPI Vendor with ID % not found.', p_vendor_id;
    END IF;

    IF v_old.vendor_status <> v_new_status THEN
        UPDATE public.upi_vendor_configuration
        SET vendor_status = v_new_status,
            updated_by = p_admin_id,
            updated_date = NOW()
        WHERE id = v_old.id;

        INSERT INTO public.upi_vendor_audit (
            vendor_config_id, company_id, admin_id, action, field_name, previous_value, new_value, created_at
        ) VALUES (
            v_old.id, v_old.company_id, COALESCE(p_admin_id, 'ADMIN'),
            CASE WHEN v_new_status = 'ACTIVE' THEN 'VENDOR_ENABLED' ELSE 'VENDOR_DISABLED' END,
            'vendor_status',
            v_old.vendor_status, v_new_status, NOW()
        );
    END IF;

    SELECT to_jsonb(v.*) INTO v_result
    FROM public.vw_upi_vendor_configuration v
    WHERE v.id = v_old.id;

    RETURN v_result;
END;
$$;


-- 6. Toggle QR Status (ENABLED / DISABLED)
CREATE OR REPLACE FUNCTION public.sp_toggle_upi_vendor_qr_status(
    p_vendor_id UUID,
    p_qr_status TEXT,
    p_admin_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_old RECORD;
    v_new_qr_status TEXT := UPPER(TRIM(p_qr_status));
    v_result JSONB;
BEGIN
    IF v_new_qr_status NOT IN ('ENABLED', 'DISABLED') THEN
        RAISE EXCEPTION 'Invalid QR status %. Allowed: ENABLED, DISABLED.', v_new_qr_status;
    END IF;

    SELECT * INTO v_old
    FROM public.upi_vendor_configuration
    WHERE public_id = p_vendor_id AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'UPI Vendor with ID % not found.', p_vendor_id;
    END IF;

    IF v_old.qr_status <> v_new_qr_status THEN
        UPDATE public.upi_vendor_configuration
        SET qr_status = v_new_qr_status,
            updated_by = p_admin_id,
            updated_date = NOW()
        WHERE id = v_old.id;

        INSERT INTO public.upi_vendor_audit (
            vendor_config_id, company_id, admin_id, action, field_name, previous_value, new_value, created_at
        ) VALUES (
            v_old.id, v_old.company_id, COALESCE(p_admin_id, 'ADMIN'),
            CASE WHEN v_new_qr_status = 'ENABLED' THEN 'QR_ENABLED' ELSE 'QR_DISABLED' END,
            'qr_status',
            v_old.qr_status, v_new_qr_status, NOW()
        );
    END IF;

    SELECT to_jsonb(v.*) INTO v_result
    FROM public.vw_upi_vendor_configuration v
    WHERE v.id = v_old.id;

    RETURN v_result;
END;
$$;


-- 7. Get Active Retailer UPI Vendor Configuration
CREATE OR REPLACE FUNCTION public.sp_get_active_retailer_upi_vendor_config(
    p_company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Priority 1: Company specific active vendor, Priority 2: Global default (NULL company_id)
    SELECT to_jsonb(v.*) INTO v_result
    FROM public.vw_active_upi_vendor_configuration v
    WHERE (p_company_id IS NULL OR v.company_id IS NULL OR v.company_id = p_company_id)
    ORDER BY 
        CASE WHEN p_company_id IS NOT NULL AND v.company_id = p_company_id THEN 1 ELSE 2 END,
        v.vendor_name ASC
    LIMIT 1;

    -- Priority 3: Fallback to any active vendor with QR enabled if no exact match
    IF v_result IS NULL THEN
        SELECT to_jsonb(v.*) INTO v_result
        FROM public.vw_active_upi_vendor_configuration v
        ORDER BY v.vendor_name ASC
        LIMIT 1;
    END IF;

    RETURN v_result;
END;
$$;

