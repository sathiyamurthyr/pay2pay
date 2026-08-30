import asyncio
import sys

backend_dir = r"d:\pay2pay\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

SQL_DEPLOYMENT_SCRIPT = """
-- ============================================================
-- PAY2PAY - COMPLETE PRODUCTION PAYOUT DATABASE SUITE
-- ============================================================

-- 1. Sequence for 5-digit unique Transaction ID suffix
CREATE SEQUENCE IF NOT EXISTS public.payout_txn_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 99999
    CYCLE;


-- ============================================================
-- 2. TRANSACTION ID GENERATION FUNCTION
-- Format: <VENDOR_FIRST_CHAR>PAY<DDMMYYHHMM><5-DIGIT-UNIQUE-NUMBER>
-- Example: CPAY290826142100123
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_payout_txn_id(
    p_vendor_name VARCHAR(100) DEFAULT NULL
)
RETURNS VARCHAR(100)
LANGUAGE plpgsql
AS $$
DECLARE
    v_vendor_char VARCHAR(1);
    v_dt          VARCHAR(10);
    v_seq_val     BIGINT;
    v_seq_str     VARCHAR(5);
BEGIN
    -- Dynamic Vendor First Character
    IF p_vendor_name IS NOT NULL AND TRIM(p_vendor_name) <> '' THEN
        v_vendor_char := UPPER(SUBSTRING(TRIM(p_vendor_name), 1, 1));
        IF v_vendor_char !~ '^[A-Z0-9]$' THEN
            v_vendor_char := 'P';
        END IF;
    ELSE
        v_vendor_char := 'P';
    END IF;

    -- Timestamp: DDMMYYHH24MI (10 digits) in IST (Asia/Kolkata)
    v_dt := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'DDMMYYHH24MI');

    -- Sequence: 5-digit zero-padded number
    v_seq_val := nextval('public.payout_txn_seq');
    v_seq_str := LPAD(v_seq_val::TEXT, 5, '0');

    RETURN v_vendor_char || 'PAY' || v_dt || v_seq_str;
END;
$$;


-- ============================================================
-- 3. WALLET BALANCE UPDATE FUNCTION (SEQUENTIAL RUNNING BALANCES)
-- ============================================================

CREATE OR REPLACE FUNCTION public.wallet_balance_update(
    p_tenant_id        UUID,
    p_company_id       UUID,
    p_retailer_id      UUID,
    p_txn_id           VARCHAR(100),
    p_ref_id           VARCHAR(100),
    p_table_ref_id     UUID,
    p_entry_type       VARCHAR(10),
    p_total_amount     NUMERIC(18,2),
    p_service_name     VARCHAR(50),
    p_wallet_type      VARCHAR(50),
    p_lines            JSONB,
    p_created_by       UUID
)
RETURNS TABLE (
    wallet_id          UUID,
    txn_id             VARCHAR(100),
    balance_before     NUMERIC(18,2),
    balance_after      NUMERIC(18,2),
    total_amount       NUMERIC(18,2),
    status             VARCHAR(30)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE

    v_wallet_id          UUID;
    v_balance_before     NUMERIC(18,2);
    v_balance_after      NUMERIC(18,2);

    v_line               JSONB;
    v_line_amount        NUMERIC(18,2);
    v_line_total         NUMERIC(18,2);
    v_running_balance    NUMERIC(18,2);
    v_line_before        NUMERIC(18,2);
    v_line_after         NUMERIC(18,2);

    v_partition_year     SMALLINT;
    v_partition_month    SMALLINT;
    v_partition_day      SMALLINT;

    v_day_key            INTEGER;
    v_week_key           INTEGER;
    v_month_key          INTEGER;
    v_quarter_key        INTEGER;
    v_year_key           INTEGER;
    v_date_key           INTEGER;
    v_time_key           INTEGER;

BEGIN

    -- ========================================================
    -- 1. VALIDATION
    -- ========================================================

    IF p_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID is required';
    END IF;

    IF p_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID is required';
    END IF;

    IF p_retailer_id IS NULL THEN
        RAISE EXCEPTION 'Retailer ID is required';
    END IF;

    IF p_txn_id IS NULL OR TRIM(p_txn_id) = '' THEN
        RAISE EXCEPTION 'Txn ID is required';
    END IF;

    IF p_entry_type IS NULL
       OR UPPER(TRIM(p_entry_type)) NOT IN ('DEBIT', 'CREDIT') THEN

        RAISE EXCEPTION
            'Entry type must be DEBIT or CREDIT';

    END IF;

    IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
        RAISE EXCEPTION
            'Total amount must be greater than zero';
    END IF;

    IF p_service_name IS NULL
       OR TRIM(p_service_name) = '' THEN

        RAISE EXCEPTION
            'Service name is required';

    END IF;

    IF p_wallet_type IS NULL
       OR TRIM(p_wallet_type) = '' THEN

        RAISE EXCEPTION
            'Wallet type is required';

    END IF;

    IF p_lines IS NULL
       OR jsonb_typeof(p_lines) <> 'array'
       OR jsonb_array_length(p_lines) = 0 THEN

        RAISE EXCEPTION
            'Transaction lines must be a non-empty JSON array';

    END IF;


    -- ========================================================
    -- 2. NORMALIZE
    -- ========================================================

    p_entry_type   := UPPER(TRIM(p_entry_type));
    p_service_name := UPPER(TRIM(p_service_name));
    p_wallet_type  := UPPER(TRIM(p_wallet_type));


    -- ========================================================
    -- 3. VALIDATE LINE TOTAL AGAINST WALLET TOTAL
    -- ========================================================

    SELECT COALESCE(
        SUM((line->>'amount')::NUMERIC),
        0
    )
    INTO v_line_total
    FROM jsonb_array_elements(p_lines) AS line;

    IF ROUND(v_line_total, 2) <> ROUND(p_total_amount, 2) THEN

        RAISE EXCEPTION
            'Line total % does not match wallet amount %',
            v_line_total,
            p_total_amount;

    END IF;


    -- ========================================================
    -- 4. DUPLICATE PROTECTION (Per Txn ID & Entry Type)
    -- ========================================================

    IF EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.tenant_id = p_tenant_id
          AND t.company_id = p_company_id
          AND t.retailer_id = p_retailer_id
          AND t.txn_id = p_txn_id
          AND t.entry_type = p_entry_type
    ) THEN

        RAISE EXCEPTION
            'Duplicate transaction already exists. Txn ID: %, Entry: %',
            p_txn_id,
            p_entry_type;

    END IF;


    -- ========================================================
    -- 5. GET AND LOCK RETAILER WALLET
    -- ========================================================

    SELECT
        COALESCE(rw.public_id, gen_random_uuid()),
        COALESCE(rw.wallet_balance, 0.00)::NUMERIC(18,2)
    INTO
        v_wallet_id,
        v_balance_before
    FROM public.retailer_wallet rw
    WHERE rw.tenant_id = p_tenant_id
      AND rw.company_id = p_company_id
      AND rw.retailer_id = p_retailer_id
      AND rw.is_active = TRUE
      AND rw.is_deleted = FALSE
    FOR UPDATE;


    -- ========================================================
    -- 6. WALLET NOT FOUND
    -- ========================================================

    IF v_wallet_id IS NULL THEN

        RAISE EXCEPTION
            'Active wallet not found for retailer %',
            p_retailer_id;

    END IF;


    -- ========================================================
    -- 7. CALCULATE BALANCE (CHANGED ONLY ONCE BY TOTAL AMOUNT)
    -- ========================================================

    IF p_entry_type = 'DEBIT' THEN

        IF v_balance_before < p_total_amount THEN

            RAISE EXCEPTION
                'Insufficient wallet balance. Available: %, Required: %',
                v_balance_before,
                p_total_amount;

        END IF;

        v_balance_after :=
            v_balance_before - p_total_amount;

    ELSE

        v_balance_after :=
            v_balance_before + p_total_amount;

    END IF;


    -- ========================================================
    -- 8. UPDATE RETAILER WALLET (ONLY ONCE)
    -- ========================================================

    UPDATE public.retailer_wallet
    SET
        wallet_balance = v_balance_after,
        updated_at = NOW(),
        updated_date = NOW()
    WHERE (public.retailer_wallet.public_id = v_wallet_id OR public.retailer_wallet.retailer_id = p_retailer_id)
      AND public.retailer_wallet.tenant_id = p_tenant_id
      AND public.retailer_wallet.company_id = p_company_id
      AND public.retailer_wallet.retailer_id = p_retailer_id
      AND public.retailer_wallet.is_active = TRUE
      AND public.retailer_wallet.is_deleted = FALSE;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Wallet update failed for retailer %',
            p_retailer_id;

    END IF;


    -- ========================================================
    -- 9. PARTITION DATE & DATE KEYS
    -- ========================================================

    v_partition_year  := EXTRACT(YEAR FROM NOW())::SMALLINT;
    v_partition_month := EXTRACT(MONTH FROM NOW())::SMALLINT;
    v_partition_day   := EXTRACT(DAY FROM NOW())::SMALLINT;

    v_day_key         := EXTRACT(DAY FROM NOW())::INTEGER;
    v_week_key        := EXTRACT(WEEK FROM NOW())::INTEGER;
    v_month_key       := EXTRACT(MONTH FROM NOW())::INTEGER;
    v_quarter_key     := EXTRACT(QUARTER FROM NOW())::INTEGER;
    v_year_key        := EXTRACT(YEAR FROM NOW())::INTEGER;
    v_date_key        := TO_CHAR(NOW(), 'YYYYMMDD')::INTEGER;
    v_time_key        := TO_CHAR(NOW(), 'HH24MISS')::INTEGER;


    -- ========================================================
    -- 10. INSERT DYNAMIC TRANSACTION LINES WITH SEQUENTIAL BALANCES
    --
    -- NO "Wallet Debit" line
    -- Dynamic component lines only (Amount, Charge, GST)
    -- Sequential running balance:
    -- DR 500: 10000 -> 9500
    -- DR 20 :  9500 -> 9480
    -- DR 3.6:  9480 -> 9476.40
    -- ========================================================

    v_running_balance := v_balance_before;

    FOR v_line IN
        SELECT *
        FROM jsonb_array_elements(p_lines)
    LOOP

        v_line_amount := (v_line->>'amount')::NUMERIC(18,2);

        IF p_entry_type = 'DEBIT' THEN
            v_line_before := v_running_balance;
            v_line_after  := v_line_before - v_line_amount;
            v_running_balance := v_line_after;
        ELSE
            v_line_before := v_running_balance;
            v_line_after  := v_line_before + v_line_amount;
            v_running_balance := v_line_after;
        END IF;

        INSERT INTO public.transactions (
            public_id,

            tenant_id,
            company_id,
            retailer_id,
            retailer_name,

            dist_id,
            dist_name,
            sd_id,
            sd_name,
            rm_id,
            rm_name,

            vendor_id,
            vendor_name,

            txn_id,
            ref_id,
            table_ref_id,

            service_name,
            wallet_type,
            "UserType",

            entry_type,
            amount,

            balance_before,
            balance_after,

            status,
            narration,

            day_key,
            week_key,
            month_key,
            quarter_key,
            year_key,
            date_key,
            time_key,

            partition_year,
            partition_month,
            partition_day,

            is_active,
            is_deleted,

            created_at,
            created_by
        )
        VALUES (
            gen_random_uuid(),

            p_tenant_id,
            p_company_id,
            p_retailer_id,
            v_line->>'retailer_name',

            CASE WHEN v_line->>'dist_id' IS NOT NULL AND TRIM(v_line->>'dist_id') <> '' THEN (v_line->>'dist_id')::UUID ELSE NULL END,
            v_line->>'dist_name',
            CASE WHEN v_line->>'sd_id' IS NOT NULL AND TRIM(v_line->>'sd_id') <> '' THEN (v_line->>'sd_id')::UUID ELSE NULL END,
            v_line->>'sd_name',
            CASE WHEN v_line->>'rm_id' IS NOT NULL AND TRIM(v_line->>'rm_id') <> '' THEN (v_line->>'rm_id')::UUID ELSE NULL END,
            v_line->>'rm_name',

            CASE WHEN v_line->>'vendor_id' IS NOT NULL AND TRIM(v_line->>'vendor_id') <> '' THEN (v_line->>'vendor_id')::UUID ELSE NULL END,
            v_line->>'vendor_name',

            p_txn_id,
            p_ref_id,
            p_table_ref_id,

            p_service_name,
            p_wallet_type,
            v_line->>'user_type',

            p_entry_type,
            v_line_amount,

            v_line_before,
            v_line_after,

            'SUCCESS',
            v_line->>'narration',

            v_day_key,
            v_week_key,
            v_month_key,
            v_quarter_key,
            v_year_key,
            v_date_key,
            v_time_key,

            v_partition_year,
            v_partition_month,
            v_partition_day,

            TRUE,
            FALSE,

            NOW(),
            p_created_by
        );

    END LOOP;


    -- ========================================================
    -- 11. RETURN
    -- ========================================================

    RETURN QUERY
    SELECT
        v_wallet_id,
        p_txn_id,
        v_balance_before,
        v_balance_after,
        p_total_amount,
        'SUCCESS'::VARCHAR(30);

END;
$$;


-- ============================================================
-- 4. INITIATE PAYOUT TRANSACTION STORED PROCEDURE
-- Validates:
-- - Tenant, Company, Retailer, Customer
-- - Beneficiary Mandatory Fields (Name, Account, IFSC, Bank)
-- - Payout Service Enabled Status
-- - Customer Monthly Limit (Dynamically Calculated)
-- - Dynamic Payout Slab Charges & GST
-- - Retailer Wallet Sufficient Balance (Locked FOR UPDATE)
-- - Generates Unique TxnID: <VENDOR_CHAR>PAY<DDMMYYHHMM><5-DIGIT>
-- - Calls wallet_balance_update() for Atomic Debit
-- - Inserts Record into public.payout_transaction
-- ============================================================

CREATE OR REPLACE FUNCTION public.initiate_payout_transaction(
    p_tenant_id            UUID,
    p_company_id           UUID,
    p_retailer_id          UUID,
    p_customer_id          UUID,
    p_beneficiary_id       UUID,
    p_amount               NUMERIC(18,2),
    p_beneficiary_name     VARCHAR(255),
    p_account_number       VARCHAR(100),
    p_ifsc                 VARCHAR(50),
    p_bank_name            VARCHAR(255),
    p_mode                 VARCHAR(20) DEFAULT 'IMPS',
    p_vendor_id            BIGINT DEFAULT NULL,
    p_vendor_name          VARCHAR(100) DEFAULT 'Commercial Bank',
    p_user_type            VARCHAR(50) DEFAULT 'RETAILER',
    p_beneficiary_mobile   VARCHAR(20) DEFAULT NULL,
    p_beneficiary_email    VARCHAR(255) DEFAULT NULL,
    p_created_by           UUID DEFAULT NULL
)
RETURNS TABLE (
    success                BOOLEAN,
    status                 VARCHAR(30),
    transaction_number     VARCHAR(100),
    amount                 NUMERIC(18,2),
    charges                NUMERIC(18,2),
    gst_amount             NUMERIC(18,2),
    total_wallet_debit     NUMERIC(18,2),
    error_code             VARCHAR(50),
    error_message          VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_service_enabled      BOOLEAN;
    v_monthly_limit        NUMERIC(18,2);
    v_current_month_used   NUMERIC(18,2);
    v_current_month_year   VARCHAR(10);

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

    v_txn_id               VARCHAR(100);
    v_payout_id            UUID;
    v_lines                JSONB;
    v_wallet_res           RECORD;

    v_ret_name             VARCHAR(255);
    v_dist_id              UUID;
    v_dist_name            VARCHAR(255);
    v_sd_id                UUID;
    v_sd_name              VARCHAR(255);
    v_rm_id                UUID;
    v_rm_name              VARCHAR(255);

BEGIN

    -- ========================================================
    -- 1. MANDATORY CONTEXT VALIDATIONS
    -- ========================================================

    IF p_tenant_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'TENANT_REQUIRED'::VARCHAR(50), 'Tenant ID is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_company_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'COMPANY_REQUIRED'::VARCHAR(50), 'Company ID is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_retailer_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'RETAILER_REQUIRED'::VARCHAR(50), 'Retailer ID is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_customer_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'CUSTOMER_REQUIRED'::VARCHAR(50), 'Customer ID is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'INVALID_AMOUNT'::VARCHAR(50), 'Amount must be greater than zero'::VARCHAR(500);
        RETURN;
    END IF;


    -- ========================================================
    -- 2. MANDATORY BENEFICIARY VALIDATIONS
    -- ========================================================

    IF p_beneficiary_name IS NULL OR TRIM(p_beneficiary_name) = '' THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'BENEFICIARY_NAME_REQUIRED'::VARCHAR(50), 'Beneficiary name is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_account_number IS NULL OR TRIM(p_account_number) = '' THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'ACCOUNT_NUMBER_REQUIRED'::VARCHAR(50), 'Account number is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_ifsc IS NULL OR TRIM(p_ifsc) = '' THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'IFSC_REQUIRED'::VARCHAR(50), 'IFSC code is required'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_bank_name IS NULL OR TRIM(p_bank_name) = '' THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'BANK_NAME_REQUIRED'::VARCHAR(50), 'Bank name is required'::VARCHAR(500);
        RETURN;
    END IF;


    -- ========================================================
    -- 3. PAYOUT SERVICE ACTIVE STATUS CHECK
    -- ========================================================

    SELECT COALESCE(sp.is_enabled, TRUE)
    INTO v_service_enabled
    FROM public.service_policy sp
    WHERE sp.tenant_id = p_tenant_id
      AND sp.service_code = 'PAYOUT'
      AND sp.is_active = TRUE
      AND sp.is_deleted = FALSE
    LIMIT 1;

    IF v_service_enabled IS FALSE THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'PAYOUT_SERVICE_DOWN'::VARCHAR(50), 'Payout service is currently inactive or undergoing maintenance'::VARCHAR(500);
        RETURN;
    END IF;


    -- ========================================================
    -- 4. CUSTOMER MONTHLY LIMIT CHECK (DYNAMIC)
    -- ========================================================

    v_current_month_year := TO_CHAR(NOW(), 'YYYY-MM');

    -- Lookup configured limit from customer_monthly_limit or customer_limit_configuration
    SELECT COALESCE(cml.monthly_limit, clc.monthly_amount, 200000.00)
    INTO v_monthly_limit
    FROM (SELECT 1) _
    LEFT JOIN public.customer_monthly_limit cml
        ON cml.customer_id = p_customer_id AND cml.month_year = v_current_month_year AND cml.is_active = TRUE AND cml.is_deleted = FALSE
    LEFT JOIN public.customer_limit_configuration clc
        ON clc.tenant_id = p_tenant_id AND clc.service_code = 'PAYOUT' AND clc.is_active = TRUE AND clc.is_deleted = FALSE
    LIMIT 1;

    IF v_monthly_limit IS NULL THEN
        v_monthly_limit := 200000.00;
    END IF;

    -- Calculate current month used amount from transactions for this customer
    SELECT COALESCE(SUM(t.amount), 0.00)
    INTO v_current_month_used
    FROM public.transactions t
    WHERE t.tenant_id = p_tenant_id
      AND t.table_ref_id = p_customer_id
      AND t.service_name = 'PAYOUT'
      AND t.entry_type = 'DEBIT'
      AND t.status IN ('SUCCESS', 'INITIATED')
      AND t.partition_year = EXTRACT(YEAR FROM NOW())::SMALLINT
      AND t.partition_month = EXTRACT(MONTH FROM NOW())::SMALLINT
      AND t.narration = 'Payout Amount';

    IF (v_current_month_used + p_amount) > v_monthly_limit THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), p_amount, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'MONTHLY_LIMIT_EXCEEDED'::VARCHAR(50), 
            FORMAT('Customer monthly limit exceeded. Limit: ₹%s, Used: ₹%s, Requested: ₹%s', v_monthly_limit, v_current_month_used, p_amount)::VARCHAR(500);
        RETURN;
    END IF;


    -- ========================================================
    -- 5. DYNAMIC PRICING SLAB CALCULATION
    -- ========================================================

    SELECT
        ps.public_id,
        CASE WHEN UPPER(ps.commission_type) = 'PERCENTAGE' THEN ROUND((p_amount * ps.commission / 100.0), 2) ELSE ps.commission END,
        CASE WHEN UPPER(ps.vendor_charge_type) = 'PERCENTAGE' THEN ROUND((p_amount * ps.vendor_charge / 100.0), 2) ELSE ps.vendor_charge END,
        CASE WHEN UPPER(ps.company_charges_type) = 'PERCENTAGE' THEN ROUND((p_amount * ps.company_charges / 100.0), 2) ELSE ps.company_charges END,
        CASE WHEN UPPER(ps.other_charges_type) = 'PERCENTAGE' THEN ROUND((p_amount * ps.other_charges / 100.0), 2) ELSE ps.other_charges END,
        ps.gst
    INTO
        v_slab_id,
        v_commission,
        v_vendor_charge,
        v_company_charges,
        v_other_charges,
        v_gst_rate
    FROM public.payout_slab ps
    WHERE ps.tenant_id = p_tenant_id
      AND ps.service_code = 'PAYOUT'
      AND ps.min_amount <= p_amount
      AND ps.max_amount >= p_amount
      AND ps.is_active = TRUE
      AND ps.is_deleted = FALSE
    ORDER BY ps.effective_from DESC NULLS LAST
    LIMIT 1;

    -- Defaults if no slab matches
    IF v_commission IS NULL THEN v_commission := 0.00; END IF;
    IF v_vendor_charge IS NULL THEN v_vendor_charge := 0.00; END IF;
    IF v_company_charges IS NULL THEN v_company_charges := 0.00; END IF;
    IF v_other_charges IS NULL THEN v_other_charges := 0.00; END IF;
    IF v_gst_rate IS NULL THEN v_gst_rate := 18.00; END IF;

    v_charge_base := v_commission + v_vendor_charge + v_company_charges + v_other_charges;
    IF v_charge_base > 0 THEN
        v_gst_amount := ROUND((v_charge_base * v_gst_rate / 100.0), 2);
    ELSE
        v_gst_amount := 0.00;
    END IF;

    v_total_charges := v_charge_base + v_gst_amount;
    v_charge_ex_gst := v_charge_base;
    v_total_wallet_debit := p_amount + v_total_charges;


    -- ========================================================
    -- 6. CHANNEL HIERARCHY RESOLUTION
    -- ========================================================

    SELECT
        COALESCE(r.store_name, r.owner_name, 'Retailer'),
        r.mapped_distributor_id,
        d.business_name,
        d.mapped_super_distributor_id,
        sd.business_name,
        r.rm_id,
        rm.full_name
    INTO
        v_ret_name,
        v_dist_id,
        v_dist_name,
        v_sd_id,
        v_sd_name,
        v_rm_id,
        v_rm_name
    FROM public.retailer r
    LEFT JOIN public.distributor d ON d.public_id = r.mapped_distributor_id
    LEFT JOIN public.super_distributor sd ON sd.public_id = d.mapped_super_distributor_id
    LEFT JOIN public.regional_manager rm ON rm.public_id = r.rm_id
    WHERE r.public_id = p_retailer_id;


    -- ========================================================
    -- 7. GENERATE UNIQUE TRANSACTION ID (<VENDOR_FIRST_CHAR>PAY...)
    -- ========================================================

    v_txn_id := public.generate_payout_txn_id(p_vendor_name);
    v_payout_id := gen_random_uuid();


    -- ========================================================
    -- 8. ATOMIC WALLET DEBIT VIA wallet_balance_update()
    -- Dynamic component lines (No generic 'Wallet Debit' line)
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
                'vendor_name', p_vendor_name,
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
                'vendor_name', p_vendor_name,
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
                'vendor_name', p_vendor_name,
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
                'vendor_name', p_vendor_name,
                'user_type', p_user_type
            )
        );
    END IF;

    BEGIN
        SELECT * INTO v_wallet_res
        FROM public.wallet_balance_update(
            p_tenant_id,
            p_company_id,
            p_retailer_id,
            v_txn_id,
            v_txn_id,
            p_customer_id,
            'DEBIT',
            v_total_wallet_debit,
            'PAYOUT',
            'MAIN',
            v_lines,
            p_created_by
        );
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Insufficient wallet balance%' THEN
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), p_amount, v_total_charges, v_gst_amount, v_total_wallet_debit, 'INSUFFICIENT_BALANCE'::VARCHAR(50), SQLERRM::VARCHAR(500);
            RETURN;
        ELSIF SQLERRM LIKE '%Active wallet not found%' THEN
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), p_amount, v_total_charges, v_gst_amount, v_total_wallet_debit, 'WALLET_NOT_FOUND'::VARCHAR(50), SQLERRM::VARCHAR(500);
            RETURN;
        ELSE
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), p_amount, v_total_charges, v_gst_amount, v_total_wallet_debit, 'WALLET_DEBIT_FAILED'::VARCHAR(50), SQLERRM::VARCHAR(500);
            RETURN;
        END IF;
    END;


    -- ========================================================
    -- 9. INSERT INTO public.payout_transaction
    -- ========================================================

    INSERT INTO public.payout_transaction (
        public_id,
        tenant_id,
        company_id,

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
        p_tenant_id,
        p_company_id,

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
        p_vendor_name,

        TRUE,
        FALSE,
        NOW(),
        NOW(),
        1,
        'ACTIVE'
    );


    -- ========================================================
    -- 10. RETURN SUCCESS
    -- ========================================================

    RETURN QUERY
    SELECT
        TRUE,
        'INITIATED'::VARCHAR(30),
        v_txn_id,
        p_amount,
        v_total_charges,
        v_gst_amount,
        v_total_wallet_debit,
        NULL::VARCHAR(50),
        'Txn Successfully Initiated'::VARCHAR(500);

END;
$$;


-- ============================================================
-- 5. UPDATE PAYOUT STATUS FUNCTION (SUCCESS / PENDING / FAILED)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_payout_transaction_status(
    p_transaction_number    VARCHAR(100),
    p_new_status            VARCHAR(30),
    p_utr_number            VARCHAR(100) DEFAULT NULL,
    p_rrn                   VARCHAR(100) DEFAULT NULL,
    p_gateway_reference     VARCHAR(100) DEFAULT NULL,
    p_bank_reference        VARCHAR(100) DEFAULT NULL,
    p_vendor_response       TEXT DEFAULT NULL,
    p_api_response          TEXT DEFAULT NULL,
    p_api_response_code     VARCHAR(50) DEFAULT NULL,
    p_error_code            VARCHAR(200) DEFAULT NULL,
    p_error_message         VARCHAR(500) DEFAULT NULL
)
RETURNS TABLE (
    success                 BOOLEAN,
    status                  VARCHAR(30),
    transaction_number      VARCHAR(100),
    is_reversed             BOOLEAN,
    message                 VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_cur_status            VARCHAR(30);
    v_rev_res               RECORD;
BEGIN

    -- Validate Status
    IF UPPER(TRIM(p_new_status)) NOT IN ('SUCCESS', 'PENDING', 'PROCESSING', 'FAILED', 'REVERSED') THEN
        RETURN QUERY SELECT FALSE, 'ERROR'::VARCHAR(30), p_transaction_number, FALSE, 'Invalid status value'::VARCHAR(500);
        RETURN;
    END IF;

    p_new_status := UPPER(TRIM(p_new_status));

    -- Lock and check current status
    SELECT pt.status
    INTO v_cur_status
    FROM public.payout_transaction pt
    WHERE pt.transaction_number = p_transaction_number
    FOR UPDATE;

    IF v_cur_status IS NULL THEN
        RETURN QUERY SELECT FALSE, 'NOT_FOUND'::VARCHAR(30), p_transaction_number, FALSE, 'Payout transaction not found'::VARCHAR(500);
        RETURN;
    END IF;

    -- Update payout_transaction row
    UPDATE public.payout_transaction
    SET
        status               = p_new_status,
        utr_number           = COALESCE(p_utr_number, public.payout_transaction.utr_number),
        rrn                  = COALESCE(p_rrn, public.payout_transaction.rrn),
        gateway_reference    = COALESCE(p_gateway_reference, public.payout_transaction.gateway_reference),
        bank_reference       = COALESCE(p_bank_reference, public.payout_transaction.bank_reference),
        vendor_response      = COALESCE(p_vendor_response, public.payout_transaction.vendor_response),
        api_response         = COALESCE(p_api_response, public.payout_transaction.api_response),
        api_response_code    = COALESCE(p_api_response_code, public.payout_transaction.api_response_code),
        error_code           = COALESCE(p_error_code, public.payout_transaction.error_code),
        error_message        = COALESCE(p_error_message, public.payout_transaction.error_message),
        updated_date         = NOW()
    WHERE public.payout_transaction.transaction_number = p_transaction_number;

    -- If definitive FAILED -> Execute Automatic Reversal via wallet_balance_update()
    IF p_new_status = 'FAILED' THEN
        SELECT * INTO v_rev_res
        FROM public.reverse_failed_payout_transaction(p_transaction_number, COALESCE(p_error_message, 'Vendor transaction failed'));

        RETURN QUERY SELECT TRUE, 'FAILED'::VARCHAR(30), p_transaction_number, v_rev_res.success, FORMAT('Status updated to FAILED. Reversal status: %s', v_rev_res.message)::VARCHAR(500);
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, p_new_status, p_transaction_number, FALSE, 'Payout transaction status updated successfully'::VARCHAR(500);

END;
$$;


-- ============================================================
-- 6. REVERSE FAILED PAYOUT TRANSACTION FUNCTION
-- - Same Txn ID
-- - Exact 3 Component CREDIT Lines (Amount, Charge, GST Reversal)
-- - Sequential Running Balance Restoration
-- - Double Reversal Protection
-- ============================================================

CREATE OR REPLACE FUNCTION public.reverse_failed_payout_transaction(
    p_transaction_number    VARCHAR(100),
    p_reversal_reason       VARCHAR(500) DEFAULT 'Automatic Vendor Failure Refund'
)
RETURNS TABLE (
    success                 BOOLEAN,
    status                  VARCHAR(30),
    transaction_number      VARCHAR(100),
    refunded_amount         NUMERIC(18,2),
    message                 VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_tenant_id             UUID;
    v_company_id            UUID;
    v_retailer_id           UUID;
    v_total_refund          NUMERIC(18,2) := 0.00;
    v_rev_lines             JSONB := '[]'::JSONB;
    v_row                   RECORD;
    v_wallet_res            RECORD;
BEGIN

    -- 1. Double Reversal Guard (Check if CREDIT already exists in transactions)
    IF EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.txn_id = p_transaction_number
          AND t.entry_type = 'CREDIT'
    ) THEN
        RETURN QUERY SELECT FALSE, 'ALREADY_REVERSED'::VARCHAR(30), p_transaction_number, 0.00::NUMERIC(18,2), 'Transaction has already been reversed'::VARCHAR(500);
        RETURN;
    END IF;

    -- 2. Fetch Original DEBIT Lines from transactions
    FOR v_row IN
        SELECT
            t.tenant_id,
            t.company_id,
            t.retailer_id,
            t.retailer_name,
            t.dist_id,
            t.dist_name,
            t.sd_id,
            t.sd_name,
            t.rm_id,
            t.rm_name,
            t.vendor_id,
            t.vendor_name,
            t.amount,
            t.narration,
            t."UserType"
        FROM public.transactions t
        WHERE t.txn_id = p_transaction_number
          AND t.entry_type = 'DEBIT'
        ORDER BY t.id ASC
    LOOP
        v_tenant_id   := v_row.tenant_id;
        v_company_id  := v_row.company_id;
        v_retailer_id := v_row.retailer_id;
        v_total_refund := v_total_refund + v_row.amount;

        v_rev_lines := v_rev_lines || jsonb_build_object(
            'amount', v_row.amount,
            'narration', v_row.narration || ' Reversal',
            'retailer_name', v_row.retailer_name,
            'dist_id', v_row.dist_id,
            'dist_name', v_row.dist_name,
            'sd_id', v_row.sd_id,
            'sd_name', v_row.sd_name,
            'rm_id', v_row.rm_id,
            'rm_name', v_row.rm_name,
            'vendor_id', v_row.vendor_id,
            'vendor_name', v_row.vendor_name,
            'user_type', v_row."UserType"
        );
    END LOOP;

    IF v_total_refund <= 0 OR jsonb_array_length(v_rev_lines) = 0 THEN
        RETURN QUERY SELECT FALSE, 'NO_DEBIT_FOUND'::VARCHAR(30), p_transaction_number, 0.00::NUMERIC(18,2), 'No original debit transaction lines found for reversal'::VARCHAR(500);
        RETURN;
    END IF;

    -- 3. Execute CREDIT via wallet_balance_update() using SAME Txn ID
    SELECT * INTO v_wallet_res
    FROM public.wallet_balance_update(
        v_tenant_id,
        v_company_id,
        v_retailer_id,
        p_transaction_number,
        p_transaction_number,
        NULL,
        'CREDIT',
        v_total_refund,
        'PAYOUT',
        'MAIN',
        v_rev_lines,
        NULL
    );

    -- 4. Update payout_transaction refund fields
    UPDATE public.payout_transaction
    SET
        status                  = 'FAILED',
        refund_type             = 'FULL_REVERSAL',
        refund_status           = 'REVERSED',
        error_message           = p_reversal_reason,
        updated_date            = NOW()
    WHERE public.payout_transaction.transaction_number = p_transaction_number;

    RETURN QUERY
    SELECT
        TRUE,
        'REVERSED'::VARCHAR(30),
        p_transaction_number,
        v_total_refund,
        'Transaction reversed and retailer wallet refunded successfully'::VARCHAR(500);

END;
$$;
"""

async def deploy_suite():
    print("Connecting to database and deploying complete Payout Database Implementation Suite...")
    async with AsyncSessionLocal() as session:
        await session.execute(text(SQL_DEPLOYMENT_SCRIPT))
        await session.commit()
        print("All Payout SQL Functions deployed successfully!")

if __name__ == "__main__":
    asyncio.run(deploy_suite())
