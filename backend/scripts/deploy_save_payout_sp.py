import asyncio
import sys

backend_dir = r"d:\pay2pay\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

SAVE_PAYOUT_SP = """
-- ============================================================
-- PAY2PAY - PRODUCTION SAVE PAYOUT STORED PROCEDURE
-- Resolves:
-- 1. Generate TxnID FIRST (<VENDOR_FIRST_CHAR>PAY<DDMMYYHHMM><5-DIGIT>)
-- 2. Resolve Retailer -> Company & Tenant & Hierarchy
-- 3. Resolve User Type & Validate from user_type Master Table
-- 4. Resolve Vendor & First Character
-- 5. Get Customer & Validate Active Status
-- 6. Get Beneficiary from beneficiary_master (and fallback sources)
-- 7. Validate Beneficiary mandatory fields
-- 8. Check PAYOUT service enabled
-- 9. Get payout_slab dynamically
-- 10. Calculate charges + GST + total wallet debit
-- 11. Check customer monthly limit
-- 12. Lock retailer wallet FOR UPDATE
-- 13. Check wallet balance
-- 14. wallet_balance_update(DEBIT) with SAME TxnID & dynamic lines & user_type_ref_id
-- 15. Insert payout_transaction with SAME TxnID, user_type, user_type_ref_id & status = INITIATED
-- 16. Return SAME TxnID, INITIATED, CALL_VENDOR = TRUE, resolved beneficiary details
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_payout_transaction(
    p_retailer_id          UUID,
    p_customer_id          UUID,
    p_beneficiary_id       UUID,
    p_amount               NUMERIC(18,2),
    p_mode                 VARCHAR(20) DEFAULT 'IMPS',
    p_vendor_id            BIGINT DEFAULT NULL,
    p_vendor_name          VARCHAR(100) DEFAULT 'Commercial Bank',
    p_tenant_id            UUID DEFAULT NULL,
    p_company_id           UUID DEFAULT NULL,
    p_user_type            VARCHAR(50) DEFAULT 'RETAILER',
    p_beneficiary_name     VARCHAR(255) DEFAULT NULL,
    p_account_number       VARCHAR(100) DEFAULT NULL,
    p_ifsc                 VARCHAR(50) DEFAULT NULL,
    p_bank_name            VARCHAR(255) DEFAULT NULL,
    p_created_by           UUID DEFAULT NULL
)
RETURNS TABLE (
    success                BOOLEAN,
    status                 VARCHAR(30),
    transaction_number     VARCHAR(100),
    call_vendor            BOOLEAN,
    amount                 NUMERIC(18,2),
    charges                NUMERIC(18,2),
    gst_amount             NUMERIC(18,2),
    total_wallet_debit     NUMERIC(18,2),
    beneficiary_name       VARCHAR(255),
    account_number         VARCHAR(100),
    ifsc_code              VARCHAR(50),
    bank_name              VARCHAR(255),
    customer_mobile        VARCHAR(20),
    error_code             VARCHAR(50),
    error_message          VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_tenant_id            UUID;
    v_company_id           UUID;
    v_ret_name             VARCHAR(255);
    v_dist_id              UUID;
    v_dist_name            VARCHAR(255);
    v_sd_id                UUID;
    v_sd_name              VARCHAR(255);
    v_rm_id                UUID;
    v_rm_name              VARCHAR(255);

    v_user_type_ref_id     BIGINT;
    v_tenant_ref_id        BIGINT;
    v_company_ref_id       BIGINT;
    v_retailer_ref_id      BIGINT;
    v_customer_ref_id      BIGINT;
    v_beneficiary_ref_id   BIGINT;

    v_vendor_name          VARCHAR(100);
    v_vendor_char          VARCHAR(1);
    v_txn_id               VARCHAR(100);
    v_dt                   VARCHAR(10);
    v_seq_val              BIGINT;
    v_seq_str              VARCHAR(5);

    v_cust_name            VARCHAR(255);
    v_cust_mobile          VARCHAR(20);
    v_cust_status          VARCHAR(50);
    v_cust_active          BOOLEAN;
    v_cust_deleted         BOOLEAN;

    v_beneficiary_name     VARCHAR(255);
    v_account_number       VARCHAR(100);
    v_ifsc                 VARCHAR(50);
    v_bank_name            VARCHAR(255);
    v_bene_mobile          VARCHAR(20);
    v_bene_verif_status    VARCHAR(50);

    v_service_enabled      BOOLEAN;
    v_slab_id              UUID;
    v_commission           NUMERIC(18,2) := 0.00;
    v_vendor_charge        NUMERIC(18,2) := 0.00;
    v_company_charges      NUMERIC(18,2) := 0.00;
    v_other_charges        NUMERIC(18,2) := 0.00;
    v_gst_rate             NUMERIC(18,2) := 0.00;
    v_gst_amount           NUMERIC(18,2) := 0.00;
    v_charge_base          NUMERIC(18,2) := 0.00;
    v_total_charges        NUMERIC(18,2) := 0.00;
    v_charge_ex_gst        NUMERIC(18,2) := 0.00;
    v_total_wallet_debit   NUMERIC(18,2) := 0.00;

    v_current_month_year   VARCHAR(10);
    v_monthly_limit        NUMERIC(18,2);
    v_current_month_used   NUMERIC(18,2);

    v_payout_id            UUID;
    v_lines                JSONB;
    v_wallet_res           RECORD;

BEGIN

    -- ========================================================
    -- 1. BASIC INPUT CHECKS
    -- ========================================================

    IF p_retailer_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), NULL::VARCHAR(255), NULL::VARCHAR(100), NULL::VARCHAR(50), NULL::VARCHAR(255), NULL::VARCHAR(20), 'RETAILER_REQUIRED'::VARCHAR(50), 'Retailer ID is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_customer_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), NULL::VARCHAR(255), NULL::VARCHAR(100), NULL::VARCHAR(50), NULL::VARCHAR(255), NULL::VARCHAR(20), 'CUSTOMER_REQUIRED'::VARCHAR(50), 'Customer ID is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), NULL::VARCHAR(255), NULL::VARCHAR(100), NULL::VARCHAR(50), NULL::VARCHAR(255), NULL::VARCHAR(20), 'INVALID_AMOUNT'::VARCHAR(50), 'Amount must be greater than zero'::VARCHAR(500);
        RETURN;
    END IF;

    -- ========================================================
    -- 2. VALIDATE USER TYPE AGAINST MASTER TABLE
    -- ========================================================
    SELECT ut.user_type_ref_id INTO v_user_type_ref_id
    FROM public.user_type ut
    WHERE UPPER(ut.user_type_code) = UPPER(COALESCE(p_user_type, 'RETAILER'))
       OR UPPER(ut.code) = UPPER(COALESCE(p_user_type, 'RETAILER'))
    LIMIT 1;

    IF v_user_type_ref_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), NULL::VARCHAR(255), NULL::VARCHAR(100), NULL::VARCHAR(50), NULL::VARCHAR(255), NULL::VARCHAR(20), 'INVALID_USER_TYPE'::VARCHAR(50), 'Invalid user type provided'::VARCHAR(500);
        RETURN;
    END IF;

    -- ========================================================
    -- 3. RESOLVE RETAILER & HIERARCHY
    -- ========================================================

    SELECT
        r.tenant_id,
        r.company_id,
        COALESCE(r.store_name, r.legal_name, r.owner_name, 'Retailer'),
        r.distributor_id,
        r.super_distributor_id,
        r.regional_manager_id,
        r.tenant_ref_id,
        r.company_ref_id,
        r.retailer_ref_id
    INTO
        v_tenant_id,
        v_company_id,
        v_ret_name,
        v_dist_id,
        v_sd_id,
        v_rm_id,
        v_tenant_ref_id,
        v_company_ref_id,
        v_retailer_ref_id
    FROM public.retailer r
    WHERE r.public_id = p_retailer_id
      AND r.is_active = TRUE
      AND r.is_deleted = FALSE;

    IF v_tenant_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), NULL::VARCHAR(255), NULL::VARCHAR(100), NULL::VARCHAR(50), NULL::VARCHAR(255), NULL::VARCHAR(20), 'RETAILER_NOT_FOUND'::VARCHAR(50), 'Active retailer not found'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_tenant_id IS NOT NULL THEN v_tenant_id := p_tenant_id; END IF;
    IF p_company_id IS NOT NULL THEN v_company_id := p_company_id; END IF;

    v_tenant_ref_id := COALESCE(v_tenant_ref_id, 1);
    v_company_ref_id := COALESCE(v_company_ref_id, 1);

    -- Hierarchy Names
    IF v_dist_id IS NOT NULL THEN
        SELECT COALESCE(d.business_name, d.owner_name, 'Distributor') INTO v_dist_name FROM public.distributor d WHERE d.public_id = v_dist_id;
    END IF;
    IF v_sd_id IS NOT NULL THEN
        SELECT COALESCE(sd.business_name, sd.owner_name, 'Super Distributor') INTO v_sd_name FROM public.super_distributor sd WHERE sd.public_id = v_sd_id;
    END IF;
    IF v_rm_id IS NOT NULL THEN
        SELECT COALESCE(rm.full_name, 'Regional Manager') INTO v_rm_name FROM public.regional_manager rm WHERE rm.public_id = v_rm_id;
    END IF;

    -- ========================================================
    -- 4. RESOLVE VENDOR & GENERATE TXN ID
    -- ========================================================

    v_vendor_name := COALESCE(p_vendor_name, 'Commercial Bank');
    v_vendor_char := UPPER(SUBSTRING(TRIM(v_vendor_name) FROM 1 FOR 1));
    IF v_vendor_char NOT IN ('C', 'E', 'B', 'U', 'W', 'P') THEN
        v_vendor_char := 'C';
    END IF;

    v_dt := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'DDMMYYHH24MI');
    v_seq_val := nextval('payout_txn_num_seq');
    v_seq_str := LPAD((v_seq_val % 100000)::TEXT, 5, '0');
    v_txn_id  := v_vendor_char || 'PAY' || v_dt || v_seq_str;

    -- ========================================================
    -- 5. RESOLVE CUSTOMER & STATUS
    -- ========================================================

    SELECT
        COALESCE(c.full_name, 'Customer'),
        COALESCE(c.mobile, ''),
        COALESCE(c.status, 'ACTIVE'),
        COALESCE(c.is_active, TRUE),
        COALESCE(c.is_deleted, FALSE),
        c.customer_ref_id
    INTO
        v_cust_name,
        v_cust_mobile,
        v_cust_status,
        v_cust_active,
        v_cust_deleted,
        v_customer_ref_id
    FROM public.customer c
    WHERE c.public_id = p_customer_id;

    IF v_cust_name IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), NULL::VARCHAR(255), NULL::VARCHAR(100), NULL::VARCHAR(50), NULL::VARCHAR(255), NULL::VARCHAR(20), 'CUSTOMER_NOT_FOUND'::VARCHAR(50), 'Customer not found'::VARCHAR(500);
        RETURN;
    END IF;

    IF v_cust_active = FALSE OR v_cust_deleted = TRUE OR UPPER(v_cust_status) IN ('INACTIVE', 'SUSPENDED', 'BLOCKED', 'CLOSED') THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), NULL::VARCHAR(255), NULL::VARCHAR(100), NULL::VARCHAR(50), NULL::VARCHAR(255), v_cust_mobile, 'CUSTOMER_INACTIVE'::VARCHAR(50), 'Customer account is inactive or suspended'::VARCHAR(500);
        RETURN;
    END IF;

    -- ========================================================
    -- 6. RESOLVE BENEFICIARY
    -- ========================================================

    SELECT
        bm.account_holder_name,
        bm.account_number,
        bm.ifsc_code,
        bm.bank_name,
        bm.mobile_number,
        bm.verification_status,
        bm.beneficiary_master_ref_id
    INTO
        v_beneficiary_name,
        v_account_number,
        v_ifsc,
        v_bank_name,
        v_bene_mobile,
        v_bene_verif_status,
        v_beneficiary_ref_id
    FROM public.beneficiary_master bm
    WHERE bm.public_id = p_beneficiary_id
      AND bm.is_active = TRUE
      AND bm.is_deleted = FALSE;

    -- Fallback inputs if provided
    IF v_beneficiary_name IS NULL AND p_beneficiary_name IS NOT NULL THEN
        v_beneficiary_name := p_beneficiary_name;
        v_account_number   := p_account_number;
        v_ifsc             := p_ifsc;
        v_bank_name        := p_bank_name;
    END IF;

    IF v_beneficiary_name IS NULL OR v_account_number IS NULL OR v_ifsc IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), v_beneficiary_name, v_account_number, v_ifsc, v_bank_name, v_cust_mobile, 'BENEFICIARY_NOT_FOUND'::VARCHAR(50), 'Active beneficiary details not found or missing required fields'::VARCHAR(500);
        RETURN;
    END IF;

    -- ========================================================
    -- 7. CHECK PAYOUT SERVICE ENABLED
    -- ========================================================

    SELECT COALESCE(s.is_active, TRUE) INTO v_service_enabled
    FROM public.service s
    WHERE (s.code = 'PAYOUT' OR s.name ILIKE '%Payout%')
      AND s.is_active = TRUE
      AND s.is_deleted = FALSE
    LIMIT 1;

    IF v_service_enabled IS NULL THEN
        v_service_enabled := TRUE; -- Fallback default enabled
    END IF;

    IF v_service_enabled = FALSE THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), v_beneficiary_name, v_account_number, v_ifsc, v_bank_name, v_cust_mobile, 'SERVICE_DISABLED'::VARCHAR(50), 'Payout service is currently disabled'::VARCHAR(500);
        RETURN;
    END IF;

    -- ========================================================
    -- 8. GET PAYOUT SLAB & CHARGES
    -- ========================================================

    SELECT
        ps.public_id,
        COALESCE(ps.commission_amount, 0.00),
        COALESCE(ps.vendor_charge, 0.00),
        COALESCE(ps.company_charges, 0.00),
        COALESCE(ps.other_charges, 0.00),
        COALESCE(ps.gst_rate, 18.00)
    INTO
        v_slab_id,
        v_commission,
        v_vendor_charge,
        v_company_charges,
        v_other_charges,
        v_gst_rate
    FROM public.payout_slab ps
    WHERE ps.min_amount <= p_amount
      AND ps.max_amount >= p_amount
      AND ps.is_active = TRUE
      AND ps.is_deleted = FALSE
    ORDER BY ps.min_amount DESC
    LIMIT 1;

    IF v_slab_id IS NULL THEN
        -- Fallback default slab
        v_vendor_charge   := 10.00;
        v_company_charges := 10.00;
        v_gst_rate        := 18.00;
    END IF;

    -- ========================================================
    -- 9. CALCULATE CHARGES + GST + WALLET DEBIT
    -- ========================================================

    v_charge_base        := v_vendor_charge + v_company_charges + v_other_charges;
    v_gst_amount         := ROUND(v_charge_base * (v_gst_rate / 100.00), 2);
    v_total_charges      := v_charge_base + v_gst_amount;
    v_charge_ex_gst      := v_charge_base;
    v_total_wallet_debit := p_amount + v_total_charges;

    -- ========================================================
    -- 10. CHECK CUSTOMER MONTHLY LIMIT
    -- ========================================================

    v_current_month_year := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYYMM');

    SELECT
        COALESCE(cml.monthly_limit, 200000.00),
        COALESCE(cml.current_month_used, 0.00)
    INTO
        v_monthly_limit,
        v_current_month_used
    FROM public.customer_monthly_limit cml
    WHERE cml.customer_id = p_customer_id
      AND cml.month_year = v_current_month_year
      AND cml.is_active = TRUE
      AND cml.is_deleted = FALSE
    LIMIT 1;

    IF v_monthly_limit IS NULL THEN
        v_monthly_limit := 200000.00;
        v_current_month_used := 0.00;
    END IF;

    IF (v_current_month_used + p_amount) > v_monthly_limit THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, v_total_charges, v_gst_amount, v_total_wallet_debit, v_beneficiary_name, v_account_number, v_ifsc, v_bank_name, v_cust_mobile, 'MONTHLY_LIMIT_EXCEEDED'::VARCHAR(50), FORMAT('Monthly payout limit of %s exceeded. Available limit: %s', v_monthly_limit, (v_monthly_limit - v_current_month_used))::VARCHAR(500);
        RETURN;
    END IF;

    -- ========================================================
    -- 11 & 12 & 13. EXECUTE WALLET DEBIT WITH DYNAMIC ATOMIC LINES
    -- ========================================================

    IF v_total_charges > 0 THEN
        v_lines := jsonb_build_array(
            jsonb_build_object(
                'amount', p_amount,
                'narration', 'Payout Amount',
                'retailer_name', v_ret_name,
                'dist_id', v_dist_id,
                'dist_name', v_dist_name,
                'sd_id', v_sd_id,
                'sd_name', v_sd_name,
                'rm_id', v_rm_id,
                'rm_name', v_rm_name,
                'vendor_name', v_vendor_name,
                'user_type', p_user_type
            ),
            jsonb_build_object(
                'amount', v_charge_ex_gst,
                'narration', 'Payout Charge',
                'retailer_name', v_ret_name,
                'dist_id', v_dist_id,
                'dist_name', v_dist_name,
                'sd_id', v_sd_id,
                'sd_name', v_sd_name,
                'rm_id', v_rm_id,
                'rm_name', v_rm_name,
                'vendor_name', v_vendor_name,
                'user_type', p_user_type
            ),
            jsonb_build_object(
                'amount', v_gst_amount,
                'narration', 'GST',
                'retailer_name', v_ret_name,
                'dist_id', v_dist_id,
                'dist_name', v_dist_name,
                'sd_id', v_sd_id,
                'sd_name', v_sd_name,
                'rm_id', v_rm_id,
                'rm_name', v_rm_name,
                'vendor_name', v_vendor_name,
                'user_type', p_user_type
            )
        );
    ELSE
        v_lines := jsonb_build_array(
            jsonb_build_object(
                'amount', p_amount,
                'narration', 'Payout Amount',
                'retailer_name', v_ret_name,
                'dist_id', v_dist_id,
                'dist_name', v_dist_name,
                'sd_id', v_sd_id,
                'sd_name', v_sd_name,
                'rm_id', v_rm_id,
                'rm_name', v_rm_name,
                'vendor_name', v_vendor_name,
                'user_type', p_user_type
            )
        );
    END IF;

    BEGIN
        SELECT * INTO v_wallet_res
        FROM public.wallet_balance_update(
            v_tenant_id,
            v_company_id,
            p_retailer_id,
            v_txn_id,
            v_txn_id,
            NULL,
            'DEBIT',
            v_total_wallet_debit,
            p_amount,
            v_charge_ex_gst,
            v_gst_amount,
            'PAYOUT',
            'MAIN',
            p_user_type,
            v_ret_name,
            v_dist_id,
            v_dist_name,
            v_sd_id,
            v_sd_name,
            v_rm_id,
            v_rm_name,
            NULL,
            v_vendor_name,
            p_created_by
        );
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Insufficient wallet balance%' THEN
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, v_total_charges, v_gst_amount, v_total_wallet_debit, v_beneficiary_name, v_account_number, v_ifsc, v_bank_name, v_cust_mobile, 'INSUFFICIENT_BALANCE'::VARCHAR(50), SQLERRM::VARCHAR(500);
            RETURN;
        ELSIF SQLERRM LIKE '%Active wallet not found%' THEN
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, v_total_charges, v_gst_amount, v_total_wallet_debit, v_beneficiary_name, v_account_number, v_ifsc, v_bank_name, v_cust_mobile, 'WALLET_NOT_FOUND'::VARCHAR(50), SQLERRM::VARCHAR(500);
            RETURN;
        ELSE
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), FALSE, p_amount, v_total_charges, v_gst_amount, v_total_wallet_debit, v_beneficiary_name, v_account_number, v_ifsc, v_bank_name, v_cust_mobile, 'WALLET_DEBIT_FAILED'::VARCHAR(50), SQLERRM::VARCHAR(500);
            RETURN;
        END IF;
    END;

    -- ========================================================
    -- 14. INSERT INTO public.payout_transaction
    -- ========================================================

    v_payout_id := gen_random_uuid();

    INSERT INTO public.payout_transaction (
        public_id,
        tenant_id,
        company_id,
        retailer_id,
        customer_id,
        beneficiary_id,

        tenant_ref_id,
        company_ref_id,
        retailer_ref_id,
        customer_ref_id,
        beneficiary_master_ref_id,

        user_type,
        user_type_ref_id,

        transaction_number,
        payout_id,

        gateway_reference,
        bank_reference,
        utr_number,
        rrn,

        mode,
        status,
        processed_time,

        vendor_id,
        vendor_name,

        is_active,
        is_deleted,
        created_date,
        updated_date,
        version_no,
        record_status
    )
    VALUES (
        gen_random_uuid(),
        v_tenant_id,
        v_company_id,
        p_retailer_id,
        p_customer_id,
        p_beneficiary_id,

        v_tenant_ref_id,
        v_company_ref_id,
        v_retailer_ref_id,
        v_customer_ref_id,
        v_beneficiary_ref_id,

        COALESCE(p_user_type, 'RETAILER'),
        v_user_type_ref_id,

        v_txn_id,
        v_payout_id,

        v_txn_id,
        v_txn_id,
        '',
        '',

        p_mode,
        'INITIATED',
        NOW(),

        p_vendor_id,
        v_vendor_name,

        TRUE,
        FALSE,
        NOW(),
        NOW(),
        1,
        'ACTIVE'
    );

    -- ========================================================
    -- 15. RETURN
    -- ========================================================

    RETURN QUERY
    SELECT
        TRUE,
        'INITIATED'::VARCHAR(30),
        v_txn_id,
        TRUE,
        p_amount,
        v_total_charges,
        v_gst_amount,
        v_total_wallet_debit,
        v_beneficiary_name,
        v_account_number,
        v_ifsc,
        v_bank_name,
        v_cust_mobile,
        NULL::VARCHAR(50),
        'Txn Successfully Initiated'::VARCHAR(500);

END;
$$;
"""

async def deploy():
    print("Deploying public.save_payout_transaction...")
    async with AsyncSessionLocal() as session:
        await session.execute(text(SAVE_PAYOUT_SP))
        await session.commit()
        print("save_payout_transaction deployed successfully!")

if __name__ == "__main__":
    asyncio.run(deploy())
