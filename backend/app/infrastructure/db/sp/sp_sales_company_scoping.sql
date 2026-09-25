-- ==============================================================================
-- Pay2Pay Enterprise Sales Portal: Multi-Company & Strict Tenant Hierarchy Scope
-- ==============================================================================

-- 1. View: Super Distributors with Strict Company & Tenant Scoping
CREATE OR REPLACE VIEW vw_sales_company_super_distributors AS
SELECT 
    sd.id,
    sd.public_id,
    sd.super_distributor_ref_id,
    sd.super_distributor_code,
    sd.business_name,
    sd.owner_name,
    sd.mobile,
    sd.email,
    sd.gst_number,
    sd.pan_number,
    sd.bank_account_number,
    sd.ifsc,
    sd.wallet_balance,
    sd.credit_limit,
    sd.state,
    sd.city,
    sd.address,
    sd.pincode,
    sd.status,
    sd.tenant_id,
    sd.company_id,
    sd.tenant_ref_id,
    sd.company_ref_id,
    sd.created_date,
    sd.is_active,
    sd.is_deleted,
    COALESCE(d_agg.dist_count, 0) AS distributor_count,
    COALESCE(r_agg.ret_count, 0) AS retailer_count,
    COALESCE(t_agg.txn_count, 0) AS transaction_count,
    COALESCE(t_agg.txn_volume, 0.0) AS transaction_volume
FROM super_distributor sd
LEFT JOIN (
    SELECT mapped_super_distributor_id, count(id) AS dist_count
    FROM distributor
    WHERE is_deleted = false
    GROUP BY mapped_super_distributor_id
) d_agg ON d_agg.mapped_super_distributor_id = sd.public_id
LEFT JOIN (
    SELECT mapped_super_distributor_id, count(id) AS ret_count
    FROM retailer
    WHERE is_deleted = false
    GROUP BY mapped_super_distributor_id
) r_agg ON r_agg.mapped_super_distributor_id = sd.public_id
LEFT JOIN (
    SELECT sd_id, count(transactions_ref_id) AS txn_count, COALESCE(sum(amount), 0.0) AS txn_volume
    FROM transactions
    WHERE is_deleted = false
    GROUP BY sd_id
) t_agg ON t_agg.sd_id = sd.public_id
WHERE sd.is_deleted = false;


-- 2. View: Distributors with Strict Company & Tenant Scoping
CREATE OR REPLACE VIEW vw_sales_company_distributors AS
SELECT 
    d.id,
    d.public_id,
    d.distributor_ref_id,
    d.distributor_code,
    d.business_name,
    d.owner_name,
    d.mobile,
    d.email,
    d.gst_number,
    d.pan_number,
    d.bank_account_number,
    d.ifsc,
    d.wallet_balance,
    d.credit_limit,
    d.state,
    d.city,
    d.address,
    d.pincode,
    d.status,
    d.mapped_super_distributor_id,
    COALESCE(sd.business_name, 'Direct Company') AS super_distributor_name,
    d.tenant_id,
    d.company_id,
    d.tenant_ref_id,
    d.company_ref_id,
    d.super_distributor_ref_id,
    d.created_date,
    d.is_active,
    d.is_deleted,
    COALESCE(r_agg.ret_count, 0) AS retailer_count,
    COALESCE(pos_agg.pos_count, 0) AS pos_count,
    COALESCE(t_agg.txn_count, 0) AS transaction_count,
    COALESCE(t_agg.txn_volume, 0.0) AS transaction_volume
FROM distributor d
LEFT JOIN super_distributor sd ON sd.public_id = d.mapped_super_distributor_id AND sd.is_deleted = false
LEFT JOIN (
    SELECT mapped_distributor_id, count(id) AS ret_count
    FROM retailer
    WHERE is_deleted = false
    GROUP BY mapped_distributor_id
) r_agg ON r_agg.mapped_distributor_id = d.public_id
LEFT JOIN (
    SELECT sm.mapped_retailer_id, count(sm.id) AS pos_count
    FROM swipe_machine sm
    WHERE sm.is_deleted = false
    GROUP BY sm.mapped_retailer_id
) pos_agg ON pos_agg.mapped_retailer_id = d.public_id
LEFT JOIN (
    SELECT dist_id, count(transactions_ref_id) AS txn_count, COALESCE(sum(amount), 0.0) AS txn_volume
    FROM transactions
    WHERE is_deleted = false
    GROUP BY dist_id
) t_agg ON t_agg.dist_id = d.public_id
WHERE d.is_deleted = false;


-- 3. View: Retailers with Strict Company, SD, and Distributor Chain
CREATE OR REPLACE VIEW vw_sales_company_retailers AS
SELECT 
    r.id,
    r.public_id,
    r.retailer_ref_id,
    r.retailer_code,
    r.store_name,
    r.legal_name,
    r.owner_name,
    r.business_category,
    r.store_type,
    r.status,
    r.mapped_distributor_id,
    d.distributor_ref_id,
    COALESCE(d.business_name, '-') AS distributor_name,
    r.mapped_super_distributor_id,
    sd.super_distributor_ref_id,
    COALESCE(sd.business_name, '-') AS super_distributor_name,
    r.tenant_id,
    r.company_id,
    r.tenant_ref_id,
    r.company_ref_id,
    r.created_date,
    r.is_active,
    r.is_deleted,
    COALESCE(pos_agg.pos_count, 0) AS pos_count,
    COALESCE(t_agg.txn_count, 0) AS transaction_count,
    COALESCE(t_agg.txn_volume, 0.0) AS transaction_volume,
    mdr.mdr AS configured_mdr
FROM retailer r
LEFT JOIN distributor d ON d.public_id = r.mapped_distributor_id AND d.is_deleted = false
LEFT JOIN super_distributor sd ON sd.public_id = r.mapped_super_distributor_id AND sd.is_deleted = false
LEFT JOIN (
    SELECT mapped_retailer_id, count(id) AS pos_count
    FROM swipe_machine
    WHERE is_deleted = false
    GROUP BY mapped_retailer_id
) pos_agg ON pos_agg.mapped_retailer_id = r.public_id
LEFT JOIN (
    SELECT retailer_id, count(transactions_ref_id) AS txn_count, COALESCE(sum(amount), 0.0) AS txn_volume
    FROM transactions
    WHERE is_deleted = false
    GROUP BY retailer_id
) t_agg ON t_agg.retailer_id = r.public_id
LEFT JOIN pos_mdr_configuration mdr ON mdr.retailer_id = r.public_id AND mdr.is_active = true AND mdr.is_deleted = false
WHERE r.is_deleted = false;


-- 4. Stored Procedure: Create Super Distributor under Company Scope
CREATE OR REPLACE FUNCTION sp_sales_create_super_distributor(
    p_sales_user_id UUID,
    p_business_name VARCHAR,
    p_owner_name VARCHAR,
    p_mobile VARCHAR,
    p_email VARCHAR,
    p_state VARCHAR,
    p_city VARCHAR,
    p_address TEXT,
    p_pincode VARCHAR,
    p_gst_number VARCHAR DEFAULT NULL,
    p_pan_number VARCHAR DEFAULT NULL,
    p_bank_account_number VARCHAR DEFAULT NULL,
    p_ifsc VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_sales_user RECORD;
    v_sd_id BIGINT;
    v_sd_ref_id BIGINT;
    v_sd_public_id UUID := gen_random_uuid();
    v_sd_code VARCHAR;
    v_result JSONB;
BEGIN
    -- 1. Fetch sales user scope
    SELECT * INTO v_sales_user
    FROM sales_user
    WHERE public_id = p_sales_user_id AND is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales user with ID % not found or inactive.', p_sales_user_id;
    END IF;

    -- 2. Generate unique ref id and code
    SELECT COALESCE(MAX(super_distributor_ref_id), 0) + 1 INTO v_sd_ref_id FROM super_distributor;
    SELECT 'P2P-SD' || LPAD(FLOOR(100000 + RANDOM() * 900000)::TEXT, 6, '0') INTO v_sd_code;

    -- 3. Insert new Super Distributor scoped strictly under company & tenant
    INSERT INTO super_distributor (
        super_distributor_ref_id,
        public_id,
        super_distributor_code,
        business_name,
        owner_name,
        mobile,
        email,
        state,
        city,
        address,
        pincode,
        gst_number,
        pan_number,
        bank_account_number,
        ifsc,
        status,
        wallet_balance,
        credit_limit,
        tenant_id,
        company_id,
        tenant_ref_id,
        company_ref_id,
        is_active,
        is_deleted,
        created_date,
        updated_date,
        created_by,
        version_no,
        record_status
    ) VALUES (
        v_sd_ref_id,
        v_sd_public_id,
        v_sd_code,
        p_business_name,
        p_owner_name,
        p_mobile,
        p_email,
        p_state,
        p_city,
        p_address,
        p_pincode,
        p_gst_number,
        p_pan_number,
        p_bank_account_number,
        p_ifsc,
        'ACTIVE',
        0.0,
        0.0,
        v_sales_user.tenant_id,
        v_sales_user.company_id,
        v_sales_user.tenant_ref_id,
        v_sales_user.company_ref_id,
        true,
        false,
        NOW(),
        NOW(),
        v_sales_user.email,
        1,
        'ACTIVE'
    )
    RETURNING id INTO v_sd_id;

    -- 4. Return created record as JSON
    SELECT json_build_object(
        'success', true,
        'id', v_sd_id,
        'super_distributor_ref_id', v_sd_ref_id,
        'public_id', v_sd_public_id,
        'super_distributor_code', v_sd_code,
        'business_name', p_business_name,
        'company_id', v_sales_user.company_id,
        'company_ref_id', v_sales_user.company_ref_id,
        'tenant_id', v_sales_user.tenant_id,
        'tenant_ref_id', v_sales_user.tenant_ref_id
    )::JSONB INTO v_result;

    RETURN v_result;
END;
$$;


-- 5. Stored Procedure: Create Distributor under Company & Parent SD Scope
CREATE OR REPLACE FUNCTION sp_sales_create_distributor(
    p_sales_user_id UUID,
    p_super_distributor_id UUID,
    p_business_name VARCHAR,
    p_owner_name VARCHAR,
    p_mobile VARCHAR,
    p_email VARCHAR,
    p_state VARCHAR,
    p_city VARCHAR,
    p_address TEXT,
    p_pincode VARCHAR,
    p_gst_number VARCHAR DEFAULT NULL,
    p_pan_number VARCHAR DEFAULT NULL,
    p_bank_account_number VARCHAR DEFAULT NULL,
    p_ifsc VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_sales_user RECORD;
    v_parent_sd RECORD;
    v_dist_id BIGINT;
    v_dist_ref_id BIGINT;
    v_dist_public_id UUID := gen_random_uuid();
    v_dist_code VARCHAR;
    v_result JSONB;
BEGIN
    -- 1. Fetch sales user scope
    SELECT * INTO v_sales_user
    FROM sales_user
    WHERE public_id = p_sales_user_id AND is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales user with ID % not found or inactive.', p_sales_user_id;
    END IF;

    -- 2. Verify parent Super Distributor belongs to the exact same company and tenant
    IF p_super_distributor_id IS NOT NULL THEN
        SELECT * INTO v_parent_sd
        FROM super_distributor
        WHERE public_id = p_super_distributor_id AND is_deleted = false;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent Super Distributor % not found.', p_super_distributor_id;
        END IF;

        IF v_sales_user.company_id IS NOT NULL AND v_parent_sd.company_id IS NOT NULL AND v_sales_user.company_id != v_parent_sd.company_id THEN
            RAISE EXCEPTION 'Cross-company mapping violation: Parent SD belongs to company % but sales user is in company %.', v_parent_sd.company_id, v_sales_user.company_id;
        END IF;
    END IF;

    -- 3. Generate unique ref id and distributor code
    SELECT COALESCE(MAX(distributor_ref_id), 0) + 1 INTO v_dist_ref_id FROM distributor;
    SELECT 'P2P-D' || LPAD(FLOOR(100000 + RANDOM() * 900000)::TEXT, 6, '0') INTO v_dist_code;

    -- 4. Insert new Distributor
    INSERT INTO distributor (
        distributor_ref_id,
        public_id,
        distributor_code,
        business_name,
        owner_name,
        mobile,
        email,
        state,
        city,
        address,
        pincode,
        gst_number,
        pan_number,
        bank_account_number,
        ifsc,
        mapped_super_distributor_id,
        super_distributor_ref_id,
        status,
        wallet_balance,
        credit_limit,
        tenant_id,
        company_id,
        tenant_ref_id,
        company_ref_id,
        is_active,
        is_deleted,
        created_date,
        updated_date,
        created_by,
        version_no,
        record_status
    ) VALUES (
        v_dist_ref_id,
        v_dist_public_id,
        v_dist_code,
        p_business_name,
        p_owner_name,
        p_mobile,
        p_email,
        p_state,
        p_city,
        p_address,
        p_pincode,
        p_gst_number,
        p_pan_number,
        p_bank_account_number,
        p_ifsc,
        p_super_distributor_id,
        v_parent_sd.super_distributor_ref_id,
        'ACTIVE',
        0.0,
        0.0,
        v_sales_user.tenant_id,
        COALESCE(v_sales_user.company_id, v_parent_sd.company_id),
        v_sales_user.tenant_ref_id,
        COALESCE(v_sales_user.company_ref_id, v_parent_sd.company_ref_id),
        true,
        false,
        NOW(),
        NOW(),
        v_sales_user.email,
        1,
        'ACTIVE'
    )
    RETURNING id INTO v_dist_id;

    -- 5. Return result
    SELECT json_build_object(
        'success', true,
        'id', v_dist_id,
        'distributor_ref_id', v_dist_ref_id,
        'public_id', v_dist_public_id,
        'distributor_code', v_dist_code,
        'business_name', p_business_name,
        'mapped_super_distributor_id', p_super_distributor_id,
        'super_distributor_ref_id', v_parent_sd.super_distributor_ref_id,
        'company_id', v_sales_user.company_id,
        'company_ref_id', v_sales_user.company_ref_id,
        'tenant_id', v_sales_user.tenant_id,
        'tenant_ref_id', v_sales_user.tenant_ref_id
    )::JSONB INTO v_result;

    RETURN v_result;
END;
$$;


-- 6. Stored Procedure: Create Retailer strictly under mapped Distributor and Parent SD
CREATE OR REPLACE FUNCTION sp_sales_create_retailer(
    p_sales_user_id UUID,
    p_distributor_id UUID,
    p_store_name VARCHAR,
    p_owner_name VARCHAR,
    p_mobile VARCHAR,
    p_email VARCHAR,
    p_business_category VARCHAR DEFAULT 'Retail & General Store',
    p_store_type VARCHAR DEFAULT 'PHYSICAL'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_sales_user RECORD;
    v_parent_dist RECORD;
    v_ret_id BIGINT;
    v_ret_ref_id BIGINT;
    v_ret_public_id UUID := gen_random_uuid();
    v_ret_code VARCHAR;
    v_result JSONB;
BEGIN
    -- 1. Fetch sales user scope
    SELECT * INTO v_sales_user
    FROM sales_user
    WHERE public_id = p_sales_user_id AND is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales user with ID % not found or inactive.', p_sales_user_id;
    END IF;

    -- 2. Verify parent Distributor belongs to the exact same company and tenant
    SELECT * INTO v_parent_dist
    FROM distributor
    WHERE public_id = p_distributor_id AND is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent Distributor % not found.', p_distributor_id;
    END IF;

    IF v_sales_user.company_id IS NOT NULL AND v_parent_dist.company_id IS NOT NULL AND v_sales_user.company_id != v_parent_dist.company_id THEN
        RAISE EXCEPTION 'Cross-company mapping violation: Parent Distributor belongs to company % but sales user is in company %.', v_parent_dist.company_id, v_sales_user.company_id;
    END IF;

    -- 3. Generate unique ref id and retailer code
    SELECT COALESCE(MAX(retailer_ref_id), 0) + 1 INTO v_ret_ref_id FROM retailer;
    SELECT 'P2P-R' || LPAD(FLOOR(100000 + RANDOM() * 900000)::TEXT, 6, '0') INTO v_ret_code;

    -- 4. Insert Retailer inheriting exact same Company, Tenant, Distributor, and Super Distributor
    INSERT INTO retailer (
        retailer_ref_id,
        public_id,
        retailer_code,
        store_name,
        legal_name,
        owner_name,
        business_category,
        store_type,
        status,
        mapped_distributor_id,
        distributor_ref_id,
        mapped_super_distributor_id,
        super_distributor_ref_id,
        tenant_id,
        company_id,
        tenant_ref_id,
        company_ref_id,
        is_active,
        is_deleted,
        created_date,
        updated_date,
        created_by,
        version_no,
        record_status,
        mpin_failed_attempts,
        mpin_max_attempts,
        mpin_locked
    ) VALUES (
        v_ret_ref_id,
        v_ret_public_id,
        v_ret_code,
        p_store_name,
        p_store_name,
        p_owner_name,
        p_business_category,
        p_store_type,
        'ACTIVE',
        v_parent_dist.public_id,
        v_parent_dist.distributor_ref_id,
        v_parent_dist.mapped_super_distributor_id,
        v_parent_dist.super_distributor_ref_id,
        v_sales_user.tenant_id,
        COALESCE(v_sales_user.company_id, v_parent_dist.company_id),
        v_sales_user.tenant_ref_id,
        COALESCE(v_sales_user.company_ref_id, v_parent_dist.company_ref_id),
        true,
        false,
        NOW(),
        NOW(),
        v_sales_user.email,
        1,
        'ACTIVE',
        0,
        5,
        false
    )
    RETURNING id INTO v_ret_id;

    -- 5. Return result
    SELECT json_build_object(
        'success', true,
        'id', v_ret_id,
        'retailer_ref_id', v_ret_ref_id,
        'public_id', v_ret_public_id,
        'retailer_code', v_ret_code,
        'store_name', p_store_name,
        'mapped_distributor_id', v_parent_dist.public_id,
        'distributor_ref_id', v_parent_dist.distributor_ref_id,
        'mapped_super_distributor_id', v_parent_dist.mapped_super_distributor_id,
        'super_distributor_ref_id', v_parent_dist.super_distributor_ref_id,
        'company_id', v_sales_user.company_id,
        'company_ref_id', v_sales_user.company_ref_id,
        'tenant_id', v_sales_user.tenant_id,
        'tenant_ref_id', v_sales_user.tenant_ref_id
    )::JSONB INTO v_result;

    RETURN v_result;
END;
$$;
