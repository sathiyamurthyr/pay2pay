-- ==============================================================================
-- Migration: 14_admin_service_vendor_wallets_sp.sql
-- Description: 
--   1. Create admin_service_vendor_wallet table for dynamic Service + Vendor mapping
--   2. Seed default Admin Service + Vendor wallets (Payout+Utkal, Recharge+Utkal, etc.)
--   3. Stored Procedure: sp_get_admin_service_vendor_wallets
--   4. Stored Procedure: sp_validate_pos_topup_approval
--   5. Stored Procedure: sp_approve_pos_topup_request
--   6. Stored Procedure: sp_topup_admin_service_vendor_wallet
-- ==============================================================================

-- 1. Create table admin_service_vendor_wallet if it does not exist
CREATE TABLE IF NOT EXISTS public.admin_service_vendor_wallet (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::UUID,
    company_id UUID NULL,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    vendor_code VARCHAR(50) NOT NULL,
    vendor_name VARCHAR(100) NOT NULL,
    wallet_number VARCHAR(50) UNIQUE NOT NULL,
    available_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    hold_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(255) NULL DEFAULT 'SYSTEM',
    version_no INT NOT NULL DEFAULT 1
);

-- Unique index on (service_code, vendor_code) where not deleted
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_svc_vendor_wallet 
    ON public.admin_service_vendor_wallet(tenant_id, UPPER(service_code), UPPER(vendor_code)) 
    WHERE (is_deleted = false);

CREATE INDEX IF NOT EXISTS idx_admin_svc_vendor_status 
    ON public.admin_service_vendor_wallet(tenant_id, is_active, is_deleted);


-- 2. Seed Default Dynamic Admin Service + Vendor Wallets
INSERT INTO public.admin_service_vendor_wallet (
    tenant_id, service_code, service_name, vendor_code, vendor_name, wallet_number, available_balance, is_active, is_deleted, created_by, updated_by
) VALUES 
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'PAYOUT',
    'Payout',
    'UTKAL',
    'Utkal',
    'ADM-WAL-PAYOUT-UTKAL',
    10000.0000,
    TRUE,
    FALSE,
    'SYSTEM_SEED',
    'SYSTEM_SEED'
),
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'RECHARGE',
    'Recharge',
    'UTKAL',
    'Utkal',
    'ADM-WAL-RECHARGE-UTKAL',
    200.0000,
    TRUE,
    FALSE,
    'SYSTEM_SEED',
    'SYSTEM_SEED'
),
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'PAYOUT',
    'Payout',
    'PINELABS',
    'Pine Labs',
    'ADM-WAL-PAYOUT-PINELABS',
    25000.0000,
    TRUE,
    FALSE,
    'SYSTEM_SEED',
    'SYSTEM_SEED'
),
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'AEPS',
    'AePS',
    'MOSAMBEE',
    'Mosambee',
    'ADM-WAL-AEPS-MOSAMBEE',
    15000.0000,
    TRUE,
    FALSE,
    'SYSTEM_SEED',
    'SYSTEM_SEED'
),
(
    '00000000-0000-0000-0000-000000000001'::UUID,
    'PAYOUT',
    'Payout',
    'BULKPE',
    'BulkPe',
    'ADM-WAL-PAYOUT-BULKPE',
    50000.0000,
    TRUE,
    FALSE,
    'SYSTEM_SEED',
    'SYSTEM_SEED'
)
ON CONFLICT DO NOTHING;


-- 3. Stored Procedure: sp_get_admin_service_vendor_wallets
CREATE OR REPLACE FUNCTION public.sp_get_admin_service_vendor_wallets(
    p_tenant_id UUID DEFAULT NULL,
    p_service VARCHAR DEFAULT NULL,
    p_vendor VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    public_id UUID,
    tenant_id UUID,
    company_id UUID,
    service_code VARCHAR,
    service_name VARCHAR,
    vendor_code VARCHAR,
    vendor_name VARCHAR,
    wallet_number VARCHAR,
    available_balance NUMERIC,
    hold_balance NUMERIC,
    currency VARCHAR,
    is_active BOOLEAN,
    created_date TIMESTAMPTZ,
    updated_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.public_id,
        w.tenant_id,
        w.company_id,
        w.service_code,
        w.service_name,
        w.vendor_code,
        w.vendor_name,
        w.wallet_number,
        w.available_balance::NUMERIC,
        w.hold_balance::NUMERIC,
        w.currency,
        w.is_active,
        w.created_date,
        w.updated_date
    FROM public.admin_service_vendor_wallet w
    WHERE w.is_deleted = false
      AND (p_service IS NULL OR p_service = '' OR UPPER(w.service_code) = UPPER(p_service) OR UPPER(w.service_name) = UPPER(p_service))
      AND (p_vendor IS NULL OR p_vendor = '' OR UPPER(w.vendor_code) = UPPER(p_vendor) OR UPPER(w.vendor_name) = UPPER(p_vendor))
    ORDER BY w.service_code ASC, w.vendor_name ASC;
END;
$$;


-- 4. Stored Procedure: sp_validate_pos_topup_approval
CREATE OR REPLACE FUNCTION public.sp_validate_pos_topup_approval(
    p_topup_id UUID,
    p_approved_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_topup RECORD;
    v_mode VARCHAR;
    v_is_t1 BOOLEAN := FALSE;
    v_req_cal_date DATE;
    v_curr_cal_date DATE;
    v_date_eligible BOOLEAN := TRUE;
    v_date_block_reason VARCHAR := '';
    v_service VARCHAR := 'Payout';
    v_vendor VARCHAR := 'Utkal';
    v_wallet RECORD;
    v_effective_amount NUMERIC;
    v_balance_eligible BOOLEAN := TRUE;
    v_wallet_eligible BOOLEAN := TRUE;
    v_block_reason VARCHAR := '';
    v_shortfall NUMERIC := 0.00;
    v_can_approve BOOLEAN := TRUE;
    v_meta JSONB;
BEGIN
    -- 1. Load Topup Request Record
    SELECT * INTO v_topup
    FROM public.topup_requests
    WHERE (public_id = p_topup_id OR id::text = p_topup_id::text)
      AND is_deleted = false
    LIMIT 1;

    IF v_topup IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'is_eligible', FALSE,
            'can_approve', FALSE,
            'block_reason', 'Topup request not found.'
        );
    END IF;

    -- 2. Status Check
    IF UPPER(v_topup.status) NOT IN ('PENDING', 'UNDER_REVIEW') THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'is_eligible', FALSE,
            'can_approve', FALSE,
            'status', v_topup.status,
            'block_reason', 'This request has already been processed. Please refresh the page.'
        );
    END IF;

    -- 3. Calculate Effective Amount
    v_effective_amount := COALESCE(
        p_approved_amount,
        v_topup.received_amount,
        v_topup.approved_amount,
        v_topup.requested_amount
    );

    -- 4. POS Approval Date Validation (IST Calendar Date)
    v_mode := UPPER(COALESCE(v_topup.payment_method, '') || ' ' || COALESCE(v_topup.metadata_json->>'payment_mode', ''));
    v_is_t1 := (v_mode LIKE '%T1%' OR v_mode LIKE '%T+1%' OR v_mode LIKE '%POS+T1%' OR v_mode LIKE '%POS - T1%');

    -- Calculate IST Calendar Dates
    v_req_cal_date := (COALESCE(v_topup.payment_date, v_topup.submitted_at, v_topup.created_date) AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_curr_cal_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

    IF v_is_t1 THEN
        IF v_req_cal_date >= v_curr_cal_date THEN
            v_date_eligible := FALSE;
            v_date_block_reason := 'POS T1 requests can be approved from T+1 only.';
        END IF;
    ELSE
        IF v_req_cal_date > v_curr_cal_date THEN
            v_date_eligible := FALSE;
            v_date_block_reason := 'Future-dated topup requests cannot be approved.';
        END IF;
    END IF;

    -- 5. Resolve Service and Vendor (Dynamic with Payout + Utkal default)
    BEGIN
        IF v_topup.metadata_json IS NOT NULL THEN
            v_meta := v_topup.metadata_json::JSONB;
            IF v_meta->>'vendor_name' IS NOT NULL AND v_meta->>'vendor_name' <> '' THEN
                v_vendor := v_meta->>'vendor_name';
            END IF;
            IF v_meta->>'service_name' IS NOT NULL AND v_meta->>'service_name' <> '' THEN
                v_service := v_meta->>'service_name';
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_service := 'Payout';
        v_vendor := 'Utkal';
    END;

    -- 6. Retrieve Mapped Admin Service + Vendor Wallet
    SELECT * INTO v_wallet
    FROM public.admin_service_vendor_wallet
    WHERE is_deleted = false
      AND UPPER(service_code) = UPPER(v_service)
      AND (
          UPPER(vendor_code) = UPPER(v_vendor) 
          OR UPPER(vendor_name) = UPPER(v_vendor)
          OR (UPPER(v_vendor) LIKE '%' || UPPER(vendor_code) || '%')
          OR (UPPER(vendor_code) LIKE '%' || UPPER(v_vendor) || '%')
      )
    ORDER BY is_active DESC, available_balance DESC
    LIMIT 1;

    -- Fallback to default Payout + Utkal wallet if specific vendor wallet not matched
    IF v_wallet.id IS NULL THEN
        SELECT * INTO v_wallet
        FROM public.admin_service_vendor_wallet
        WHERE is_deleted = false
          AND UPPER(service_code) = 'PAYOUT'
          AND (UPPER(vendor_code) = 'UTKAL' OR UPPER(vendor_name) = 'UTKAL')
        LIMIT 1;
    END IF;

    IF v_wallet.id IS NULL THEN
        v_wallet_eligible := FALSE;
        v_block_reason := 'Admin wallet configuration is not available for this Service and Vendor. Approval cannot continue.';
    ELSIF v_wallet.is_active = FALSE THEN
        v_wallet_eligible := FALSE;
        v_block_reason := 'The mapped Admin wallet is inactive. Approval cannot continue.';
    ELSIF v_wallet.available_balance < v_effective_amount THEN
        v_balance_eligible := FALSE;
        v_shortfall := v_effective_amount - v_wallet.available_balance;
        v_block_reason := 'Admin balance is low. Please add funds to continue the approval.';
    END IF;

    -- 7. Combine Approval Eligibility
    IF NOT v_date_eligible THEN
        v_can_approve := FALSE;
        v_block_reason := v_date_block_reason;
    ELSIF NOT v_wallet_eligible OR NOT v_balance_eligible THEN
        v_can_approve := FALSE;
    ELSE
        v_can_approve := TRUE;
        v_block_reason := '';
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'topup_id', v_topup.public_id,
        'topup_request_id', v_topup.topup_request_id,
        'status', v_topup.status,
        'is_eligible', v_can_approve,
        'can_approve', v_can_approve,
        'date_eligible', v_date_eligible,
        'wallet_eligible', v_wallet_eligible,
        'balance_eligible', v_balance_eligible,
        'is_pos_t1', v_is_t1,
        'pos_type', CASE WHEN v_is_t1 THEN 'POS T1' ELSE 'POS Instant' END,
        'payment_mode', COALESCE(v_topup.payment_method, 'POS - Instant'),
        'service', COALESCE(v_wallet.service_name, v_service),
        'service_code', COALESCE(v_wallet.service_code, 'PAYOUT'),
        'vendor', COALESCE(v_wallet.vendor_name, v_vendor),
        'vendor_code', COALESCE(v_wallet.vendor_code, 'UTKAL'),
        'admin_wallet_id', v_wallet.public_id,
        'admin_available_balance', COALESCE(v_wallet.available_balance::NUMERIC, 0.00),
        'required_amount', v_effective_amount,
        'shortfall_amount', v_shortfall,
        'block_reason', v_block_reason,
        'request_cal_date', v_req_cal_date,
        'current_cal_date', v_curr_cal_date
    );
END;
$$;


-- 5. Stored Procedure: sp_approve_pos_topup_request
CREATE OR REPLACE FUNCTION public.sp_approve_pos_topup_request(
    p_topup_id UUID,
    p_approved_amount NUMERIC DEFAULT NULL,
    p_admin_email VARCHAR DEFAULT 'admin@pay2pay.in',
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_topup RECORD;
    v_val JSONB;
    v_wallet RECORD;
    v_ret_wallet RECORD;
    v_final_approved NUMERIC;
    v_service VARCHAR := 'Payout';
    v_vendor VARCHAR := 'Utkal';
    v_admin_bal_before NUMERIC;
    v_admin_bal_after NUMERIC;
    v_ret_bal_before NUMERIC;
    v_ret_bal_after NUMERIC;
    v_txn_ref VARCHAR;
    v_topup_req_ref_id BIGINT;
    v_meta JSONB;
BEGIN
    -- 1. Row-lock Topup Request with FOR UPDATE
    SELECT * INTO v_topup
    FROM public.topup_requests
    WHERE (public_id = p_topup_id OR id::text = p_topup_id::text)
      AND is_deleted = false
    FOR UPDATE;

    IF v_topup IS NULL THEN
        RAISE EXCEPTION 'Topup request not found for ID %', p_topup_id;
    END IF;

    IF UPPER(v_topup.status) NOT IN ('PENDING', 'UNDER_REVIEW') THEN
        RAISE EXCEPTION 'This request has already been processed with status %', v_topup.status;
    END IF;

    -- 2. Run Comprehensive Validation SP
    v_val := public.sp_validate_pos_topup_approval(v_topup.public_id, p_approved_amount);

    IF (v_val->>'can_approve')::BOOLEAN = FALSE THEN
        RAISE EXCEPTION '%', COALESCE(v_val->>'block_reason', 'Topup approval validation failed.');
    END IF;

    v_final_approved := (v_val->>'required_amount')::NUMERIC;
    IF v_final_approved <= 0 THEN
        RAISE EXCEPTION 'Approved amount must be greater than zero.';
    END IF;

    -- 3. Row-lock Admin Service + Vendor Wallet with FOR UPDATE
    SELECT * INTO v_wallet
    FROM public.admin_service_vendor_wallet
    WHERE public_id = (v_val->>'admin_wallet_id')::UUID
      AND is_deleted = false
    FOR UPDATE;

    IF v_wallet IS NULL THEN
        RAISE EXCEPTION 'Admin wallet configuration is not available for this Service and Vendor. Approval cannot continue.';
    END IF;

    IF v_wallet.available_balance < v_final_approved THEN
        RAISE EXCEPTION 'Admin balance is no longer sufficient to approve this request. Please add funds and try again.';
    END IF;

    -- 4. Row-lock Retailer Wallet with FOR UPDATE
    SELECT * INTO v_ret_wallet
    FROM public.retailer_wallet
    WHERE retailer_id = v_topup.retailer_id
      AND is_deleted = false
    FOR UPDATE
    LIMIT 1;

    IF v_ret_wallet IS NULL THEN
        RAISE EXCEPTION 'Retailer wallet record not found for retailer %', v_topup.retailer_id;
    END IF;

    -- 5. Calculate Balances
    v_admin_bal_before := v_wallet.available_balance;
    v_admin_bal_after := v_admin_bal_before - v_final_approved;

    v_ret_bal_before := COALESCE(v_ret_wallet.wallet_balance, 0.0);
    v_ret_bal_after := v_ret_bal_before + v_final_approved;

    -- 6. Atomic Financial Updates
    -- 6a. Deduct from Admin Service + Vendor Wallet
    UPDATE public.admin_service_vendor_wallet
    SET available_balance = v_admin_bal_after,
        updated_date = NOW(),
        updated_by = p_admin_email,
        version_no = version_no + 1
    WHERE id = v_wallet.id;

    -- 6b. Credit to Retailer Wallet
    UPDATE public.retailer_wallet
    SET wallet_balance = v_ret_bal_after,
        updated_date = NOW(),
        updated_by = p_admin_email,
        version_no = version_no + 1
    WHERE id = v_ret_wallet.id;

    -- 7. Generate Transaction Reference
    v_txn_ref := 'TOP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 6));

    -- 8. Update Topup Request
    UPDATE public.topup_requests
    SET status = 'APPROVED',
        approved_amount = v_final_approved,
        received_amount = v_final_approved,
        approved_by = p_admin_email,
        approved_at = NOW(),
        admin_notes = COALESCE(p_admin_notes, admin_notes),
        transaction_reference = v_txn_ref,
        updated_date = NOW(),
        updated_by = p_admin_email,
        version_no = version_no + 1
    WHERE id = v_topup.id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'topup_id', v_topup.public_id,
        'topup_request_id', v_topup.topup_request_id,
        'status', 'APPROVED',
        'approved_amount', v_final_approved,
        'transaction_reference', v_txn_ref,
        'service', v_wallet.service_name,
        'vendor', v_wallet.vendor_name,
        'admin_wallet_balance_before', v_admin_bal_before,
        'admin_wallet_balance_after', v_admin_bal_after,
        'retailer_wallet_balance_before', v_ret_bal_before,
        'retailer_wallet_balance_after', v_ret_bal_after,
        'approved_by', p_admin_email,
        'approved_at', NOW()
    );
END;
$$;


-- 6. Stored Procedure: sp_topup_admin_service_vendor_wallet
CREATE OR REPLACE FUNCTION public.sp_topup_admin_service_vendor_wallet(
    p_wallet_id UUID,
    p_amount NUMERIC,
    p_admin_email VARCHAR DEFAULT 'admin@pay2pay.in',
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet RECORD;
    v_bal_before NUMERIC;
    v_bal_after NUMERIC;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Topup amount must be greater than zero.';
    END IF;

    SELECT * INTO v_wallet
    FROM public.admin_service_vendor_wallet
    WHERE (public_id = p_wallet_id OR id::text = p_wallet_id::text)
      AND is_deleted = false
    FOR UPDATE;

    IF v_wallet IS NULL THEN
        RAISE EXCEPTION 'Admin service vendor wallet not found for ID %', p_wallet_id;
    END IF;

    v_bal_before := v_wallet.available_balance;
    v_bal_after := v_bal_before + p_amount;

    UPDATE public.admin_service_vendor_wallet
    SET available_balance = v_bal_after,
        updated_date = NOW(),
        updated_by = p_admin_email,
        version_no = version_no + 1
    WHERE id = v_wallet.id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'wallet_id', v_wallet.public_id,
        'service_code', v_wallet.service_code,
        'service_name', v_wallet.service_name,
        'vendor_code', v_wallet.vendor_code,
        'vendor_name', v_wallet.vendor_name,
        'added_amount', p_amount,
        'balance_before', v_bal_before,
        'balance_after', v_bal_after,
        'remarks', p_remarks,
        'updated_by', p_admin_email,
        'updated_at', NOW()
    );
END;
$$;
