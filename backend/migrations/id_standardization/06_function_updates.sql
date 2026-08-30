-- =============================================================================
-- PAY2PAY DATABASE ID STANDARDIZATION
-- SCRIPT 06: MODERNIZED STORED PROCEDURES & FUNCTIONS USING BIGINT *_ref_id
-- =============================================================================

-- 1. wallet_balance_update with *_ref_id support
CREATE OR REPLACE FUNCTION public.wallet_balance_update(
    p_tenant_id              UUID,
    p_company_id             UUID,
    p_retailer_id            UUID,

    p_txn_id                 VARCHAR(100),
    p_ref_id                 VARCHAR(100),
    p_table_ref_id           UUID,

    p_entry_type             VARCHAR(10),
    p_total_amount           NUMERIC(18,2),

    p_payout_amount          NUMERIC(18,2),
    p_charge_amount          NUMERIC(18,2),
    p_gst_amount             NUMERIC(18,2),

    p_service_name           VARCHAR(100),
    p_wallet_type            VARCHAR(50),
    p_user_type              VARCHAR(50),

    p_retailer_name          VARCHAR(255) DEFAULT NULL,
    p_dist_id                UUID DEFAULT NULL,
    p_dist_name              VARCHAR(255) DEFAULT NULL,
    p_sd_id                  UUID DEFAULT NULL,
    p_sd_name                VARCHAR(255) DEFAULT NULL,
    p_rm_id                  UUID DEFAULT NULL,
    p_rm_name                VARCHAR(255) DEFAULT NULL,
    p_vendor_id              UUID DEFAULT NULL,
    p_vendor_name            VARCHAR(100) DEFAULT NULL,

    p_created_by             UUID DEFAULT NULL
)
RETURNS TABLE (
    success                  BOOLEAN,
    txn_id                   VARCHAR(100),
    wallet_balance_before    NUMERIC(18,2),
    wallet_balance_after     NUMERIC(18,2),
    total_amount             NUMERIC(18,2),
    status                   VARCHAR(30),
    error_code               VARCHAR(100),
    error_message            VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_wallet_id              UUID;
    v_wallet_ref_id          BIGINT;
    v_tenant_ref_id          BIGINT;
    v_company_ref_id         BIGINT;
    v_retailer_ref_id        BIGINT;
    v_distributor_ref_id     BIGINT;
    v_super_dist_ref_id      BIGINT;
    v_rm_ref_id              BIGINT;

    v_balance_before         NUMERIC(18,2);
    v_balance_after          NUMERIC(18,2);
    v_running_balance        NUMERIC(18,2);
    v_line_before            NUMERIC(18,2);
    v_line_after             NUMERIC(18,2);
    v_line_amount            NUMERIC(18,2);

    v_partition_year         SMALLINT;
    v_partition_month        SMALLINT;
    v_partition_day          SMALLINT;

    v_day_key                INTEGER;
    v_week_key               INTEGER;
    v_month_key              INTEGER;
    v_quarter_key            INTEGER;
    v_year_key               INTEGER;
    v_financial_year_key     INTEGER;
    v_financial_quarter_key  INTEGER;
    v_financial_month_key    INTEGER;
    v_date_key               INTEGER;
    v_time_key               INTEGER;

    v_actor_id               UUID;

BEGIN

    IF p_entry_type IS NULL OR UPPER(TRIM(p_entry_type)) NOT IN ('DEBIT','CREDIT') THEN
        RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), p_total_amount, 'FAILED'::VARCHAR(30), 'INVALID_ENTRY_TYPE'::VARCHAR(100), 'Entry type must be DEBIT or CREDIT'::VARCHAR(500);
        RETURN;
    END IF;

    IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'FAILED'::VARCHAR(30), 'INVALID_AMOUNT'::VARCHAR(100), 'Wallet amount must be greater than zero'::VARCHAR(500);
        RETURN;
    END IF;

    IF COALESCE(p_payout_amount, 0) < 0 OR COALESCE(p_charge_amount, 0) < 0 OR COALESCE(p_gst_amount, 0) < 0 THEN
        RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), p_total_amount, 'FAILED'::VARCHAR(30), 'INVALID_COMPONENT_AMOUNT'::VARCHAR(100), 'Payout, charge and GST amounts cannot be negative'::VARCHAR(500);
        RETURN;
    END IF;

    IF ROUND(COALESCE(p_payout_amount, 0) + COALESCE(p_charge_amount, 0) + COALESCE(p_gst_amount, 0), 2) <> ROUND(p_total_amount, 2) THEN
        RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), p_total_amount, 'FAILED'::VARCHAR(30), 'AMOUNT_MISMATCH'::VARCHAR(100), 'Component amount total does not match wallet debit amount'::VARCHAR(500);
        RETURN;
    END IF;

    p_entry_type   := UPPER(TRIM(p_entry_type));
    p_service_name := UPPER(TRIM(COALESCE(p_service_name, 'PAYOUT')));
    p_wallet_type  := UPPER(TRIM(COALESCE(p_wallet_type, 'MAIN')));
    v_actor_id     := COALESCE(p_created_by, p_retailer_id);

    IF EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE (t.retailer_id = p_retailer_id OR t.retailer_ref_id = v_retailer_ref_id)
          AND t.txn_id = p_txn_id
          AND t.entry_type = p_entry_type
    ) THEN
        RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), p_total_amount, 'FAILED'::VARCHAR(30), 'DUPLICATE_TRANSACTION'::VARCHAR(100), FORMAT('Duplicate transaction exists for TxnID: %s, Entry: %s', p_txn_id, p_entry_type)::VARCHAR(500);
        RETURN;
    END IF;

    -- Lock Retailer Wallet FOR UPDATE
    SELECT
        COALESCE(rw.public_id, gen_random_uuid()),
        rw.retailer_wallet_ref_id,
        COALESCE(rw.wallet_balance, 0.00)::NUMERIC(18,2),
        COALESCE(rw.tenant_id, p_tenant_id),
        COALESCE(rw.company_id, p_company_id),
        rw.tenant_ref_id,
        rw.company_ref_id,
        rw.retailer_ref_id
    INTO
        v_wallet_id,
        v_wallet_ref_id,
        v_balance_before,
        p_tenant_id,
        p_company_id,
        v_tenant_ref_id,
        v_company_ref_id,
        v_retailer_ref_id
    FROM public.retailer_wallet rw
    WHERE (rw.retailer_id = p_retailer_id OR rw.public_id = p_retailer_id)
      AND rw.is_active = TRUE
      AND rw.is_deleted = FALSE
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), p_total_amount, 'FAILED'::VARCHAR(30), 'WALLET_NOT_FOUND'::VARCHAR(100), FORMAT('Active wallet not found for retailer %s', p_retailer_id)::VARCHAR(500);
        RETURN;
    END IF;

    -- Resolve BIGINT ref_ids if null
    IF v_retailer_ref_id IS NULL THEN
        SELECT r.retailer_ref_id INTO v_retailer_ref_id FROM public.retailer r WHERE r.public_id = p_retailer_id;
    END IF;
    IF v_tenant_ref_id IS NULL AND p_tenant_id IS NOT NULL THEN
        SELECT t.tenant_ref_id INTO v_tenant_ref_id FROM public.tenant t WHERE t.public_id = p_tenant_id;
    END IF;
    IF v_company_ref_id IS NULL AND p_company_id IS NOT NULL THEN
        SELECT c.company_ref_id INTO v_company_ref_id FROM public.company c WHERE c.public_id = p_company_id;
    END IF;
    IF p_dist_id IS NOT NULL THEN
        SELECT d.distributor_ref_id INTO v_distributor_ref_id FROM public.distributor d WHERE d.public_id = p_dist_id;
    END IF;
    IF p_sd_id IS NOT NULL THEN
        SELECT sd.super_distributor_ref_id INTO v_super_dist_ref_id FROM public.super_distributor sd WHERE sd.public_id = p_sd_id;
    END IF;
    IF p_rm_id IS NOT NULL THEN
        SELECT rm.regional_manager_ref_id INTO v_rm_ref_id FROM public.regional_manager rm WHERE rm.public_id = p_rm_id;
    END IF;

    IF p_entry_type = 'DEBIT' THEN
        IF v_balance_before < p_total_amount THEN
            RETURN QUERY SELECT FALSE, p_txn_id, v_balance_before, v_balance_before, p_total_amount, 'FAILED'::VARCHAR(30), 'INSUFFICIENT_BALANCE'::VARCHAR(100), FORMAT('Insufficient wallet balance. Available: %s, Required: %s', v_balance_before, p_total_amount)::VARCHAR(500);
            RETURN;
        END IF;
        v_balance_after := v_balance_before - p_total_amount;
    ELSE
        v_balance_after := v_balance_before + p_total_amount;
    END IF;

    UPDATE public.retailer_wallet
    SET
        wallet_balance = v_balance_after,
        updated_at = NOW(),
        updated_date = NOW()
    WHERE (public.retailer_wallet.public_id = v_wallet_id OR public.retailer_wallet.retailer_id = p_retailer_id)
      AND public.retailer_wallet.is_active = TRUE
      AND public.retailer_wallet.is_deleted = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet update failed for retailer %', p_retailer_id;
    END IF;

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

    -- Indian Financial Year Computation
    IF v_month_key >= 4 THEN
        v_financial_year_key    := v_year_key;
        v_financial_quarter_key := ((v_month_key - 4) / 3) + 1;
        v_financial_month_key   := v_month_key - 3;
    ELSE
        v_financial_year_key    := v_year_key - 1;
        v_financial_quarter_key := 4;
        v_financial_month_key   := v_month_key + 9;
    END IF;

    v_running_balance := v_balance_before;

    IF p_payout_amount > 0 THEN
        v_line_amount := p_payout_amount;
        v_line_before := v_running_balance;

        IF p_entry_type = 'DEBIT' THEN
            v_line_after := v_line_before - v_line_amount;
        ELSE
            v_line_after := v_line_before + v_line_amount;
        END IF;

        INSERT INTO public.transactions (
            public_id, tenant_id, company_id, retailer_id, retailer_name,
            tenant_ref_id, company_ref_id, retailer_ref_id,
            dist_id, dist_name, sd_id, sd_name, rm_id, rm_name,
            distributor_ref_id, super_distributor_ref_id, regional_manager_ref_id,
            vendor_id, vendor_name, txn_id, ref_id, table_ref_id,
            service_name, wallet_type, "UserType", entry_type, amount,
            balance_before, balance_after, status, narration,
            day_key, week_key, month_key, quarter_key, year_key,
            financial_year_key, financial_quarter_key, financial_month_key,
            date_key, time_key,
            partition_year, partition_month, partition_day,
            is_active, is_deleted, created_at, updated_at, created_by, updated_by
        )
        VALUES (
            gen_random_uuid(), p_tenant_id, p_company_id, p_retailer_id, p_retailer_name,
            v_tenant_ref_id, v_company_ref_id, v_retailer_ref_id,
            p_dist_id, p_dist_name, p_sd_id, p_sd_name, p_rm_id, p_rm_name,
            v_distributor_ref_id, v_super_dist_ref_id, v_rm_ref_id,
            p_vendor_id, COALESCE(p_vendor_name, 'Commercial Bank'), p_txn_id, p_ref_id, p_table_ref_id,
            p_service_name, p_wallet_type, p_user_type, p_entry_type, v_line_amount,
            v_line_before, v_line_after, 'SUCCESS',
            CASE WHEN p_entry_type = 'DEBIT' THEN 'Payout Amount' ELSE 'Payout Amount Reversal' END,
            v_day_key, v_week_key, v_month_key, v_quarter_key, v_year_key,
            v_financial_year_key, v_financial_quarter_key, v_financial_month_key,
            v_date_key, v_time_key,
            v_partition_year, v_partition_month, v_partition_day,
            TRUE, FALSE, NOW(), NOW(), v_actor_id, v_actor_id
        );

        v_running_balance := v_line_after;
    END IF;

    IF p_charge_amount > 0 THEN
        v_line_amount := p_charge_amount;
        v_line_before := v_running_balance;

        IF p_entry_type = 'DEBIT' THEN
            v_line_after := v_line_before - v_line_amount;
        ELSE
            v_line_after := v_line_before + v_line_amount;
        END IF;

        INSERT INTO public.transactions (
            public_id, tenant_id, company_id, retailer_id, retailer_name,
            tenant_ref_id, company_ref_id, retailer_ref_id,
            dist_id, dist_name, sd_id, sd_name, rm_id, rm_name,
            distributor_ref_id, super_distributor_ref_id, regional_manager_ref_id,
            vendor_id, vendor_name, txn_id, ref_id, table_ref_id,
            service_name, wallet_type, "UserType", entry_type, amount,
            balance_before, balance_after, status, narration,
            day_key, week_key, month_key, quarter_key, year_key,
            financial_year_key, financial_quarter_key, financial_month_key,
            date_key, time_key,
            partition_year, partition_month, partition_day,
            is_active, is_deleted, created_at, updated_at, created_by, updated_by
        )
        VALUES (
            gen_random_uuid(), p_tenant_id, p_company_id, p_retailer_id, p_retailer_name,
            v_tenant_ref_id, v_company_ref_id, v_retailer_ref_id,
            p_dist_id, p_dist_name, p_sd_id, p_sd_name, p_rm_id, p_rm_name,
            v_distributor_ref_id, v_super_dist_ref_id, v_rm_ref_id,
            p_vendor_id, COALESCE(p_vendor_name, 'Commercial Bank'), p_txn_id, p_ref_id, p_table_ref_id,
            p_service_name, p_wallet_type, p_user_type, p_entry_type, v_line_amount,
            v_line_before, v_line_after, 'SUCCESS',
            CASE WHEN p_entry_type = 'DEBIT' THEN 'Payout Charge' ELSE 'Payout Charge Reversal' END,
            v_day_key, v_week_key, v_month_key, v_quarter_key, v_year_key,
            v_financial_year_key, v_financial_quarter_key, v_financial_month_key,
            v_date_key, v_time_key,
            v_partition_year, v_partition_month, v_partition_day,
            TRUE, FALSE, NOW(), NOW(), v_actor_id, v_actor_id
        );

        v_running_balance := v_line_after;
    END IF;

    IF p_gst_amount > 0 THEN
        v_line_amount := p_gst_amount;
        v_line_before := v_running_balance;

        IF p_entry_type = 'DEBIT' THEN
            v_line_after := v_line_before - v_line_amount;
        ELSE
            v_line_after := v_line_before + v_line_amount;
        END IF;

        INSERT INTO public.transactions (
            public_id, tenant_id, company_id, retailer_id, retailer_name,
            tenant_ref_id, company_ref_id, retailer_ref_id,
            dist_id, dist_name, sd_id, sd_name, rm_id, rm_name,
            distributor_ref_id, super_distributor_ref_id, regional_manager_ref_id,
            vendor_id, vendor_name, txn_id, ref_id, table_ref_id,
            service_name, wallet_type, "UserType", entry_type, amount,
            balance_before, balance_after, status, narration,
            day_key, week_key, month_key, quarter_key, year_key,
            financial_year_key, financial_quarter_key, financial_month_key,
            date_key, time_key,
            partition_year, partition_month, partition_day,
            is_active, is_deleted, created_at, updated_at, created_by, updated_by
        )
        VALUES (
            gen_random_uuid(), p_tenant_id, p_company_id, p_retailer_id, p_retailer_name,
            v_tenant_ref_id, v_company_ref_id, v_retailer_ref_id,
            p_dist_id, p_dist_name, p_sd_id, p_sd_name, p_rm_id, p_rm_name,
            v_distributor_ref_id, v_super_dist_ref_id, v_rm_ref_id,
            p_vendor_id, COALESCE(p_vendor_name, 'Commercial Bank'), p_txn_id, p_ref_id, p_table_ref_id,
            p_service_name, p_wallet_type, p_user_type, p_entry_type, v_line_amount,
            v_line_before, v_line_after, 'SUCCESS',
            CASE WHEN p_entry_type = 'DEBIT' THEN 'GST' ELSE 'GST Reversal' END,
            v_day_key, v_week_key, v_month_key, v_quarter_key, v_year_key,
            v_financial_year_key, v_financial_quarter_key, v_financial_month_key,
            v_date_key, v_time_key,
            v_partition_year, v_partition_month, v_partition_day,
            TRUE, FALSE, NOW(), NOW(), v_actor_id, v_actor_id
        );

        v_running_balance := v_line_after;
    END IF;

    RETURN QUERY
    SELECT
        TRUE,
        p_txn_id,
        v_balance_before,
        v_balance_after,
        p_total_amount,
        'SUCCESS'::VARCHAR(30),
        NULL::VARCHAR(100),
        NULL::VARCHAR(500);

END;
$$;

-- 2. reverse_failed_payout_transaction with *_ref_id support
DROP FUNCTION IF EXISTS public.reverse_failed_payout_transaction(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.reverse_failed_payout_transaction(VARCHAR);
DROP FUNCTION IF EXISTS public.reverse_failed_payout_transaction;

CREATE OR REPLACE FUNCTION public.reverse_failed_payout_transaction(
    p_transaction_number     VARCHAR(100),
    p_failure_reason         VARCHAR(500) DEFAULT 'Vendor Transaction Failed'
)
RETURNS TABLE (
    success                  BOOLEAN,
    transaction_number       VARCHAR(100),
    reversed_amount          NUMERIC(18,2),
    new_wallet_balance       NUMERIC(18,2),
    status                   VARCHAR(30),
    error_code               VARCHAR(100),
    error_message            VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_retailer_id            UUID;
    v_tenant_id              UUID;
    v_company_id             UUID;
    v_retailer_name          VARCHAR(255);
    v_dist_id                UUID;
    v_dist_name              VARCHAR(255);
    v_sd_id                  UUID;
    v_sd_name                VARCHAR(255);
    v_rm_id                  UUID;
    v_rm_name                VARCHAR(255);
    v_vendor_id              UUID;
    v_vendor_name            VARCHAR(100);
    v_user_type              VARCHAR(50);
    v_wallet_type            VARCHAR(50);
    v_service_name           VARCHAR(100);

    v_payout_amount          NUMERIC(18,2) := 0.00;
    v_charge_amount          NUMERIC(18,2) := 0.00;
    v_gst_amount             NUMERIC(18,2) := 0.00;
    v_total_amount           NUMERIC(18,2) := 0.00;

    v_res_record             RECORD;
BEGIN
    IF p_transaction_number IS NULL OR TRIM(p_transaction_number) = '' THEN
        RETURN QUERY SELECT FALSE, p_transaction_number, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'FAILED'::VARCHAR(30), 'INVALID_TXN_ID'::VARCHAR(100), 'Transaction number cannot be empty'::VARCHAR(500);
        RETURN;
    END IF;

    -- Check if reversal has already been executed
    IF EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.txn_id = p_transaction_number
          AND t.entry_type = 'CREDIT'
    ) THEN
        RETURN QUERY SELECT FALSE, p_transaction_number, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'FAILED'::VARCHAR(30), 'ALREADY_REVERSED'::VARCHAR(100), 'Reversal transaction has already been processed for this Txn ID'::VARCHAR(500);
        RETURN;
    END IF;

    -- Extract debit line components
    SELECT
        COALESCE(SUM(CASE WHEN t.narration ILIKE '%Payout Amount%' THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.narration ILIKE '%Charge%' THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.narration ILIKE '%GST%' THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(t.amount), 0)
    INTO
        v_payout_amount,
        v_charge_amount,
        v_gst_amount,
        v_total_amount
    FROM public.transactions t
    WHERE t.txn_id = p_transaction_number
      AND t.entry_type = 'DEBIT';

    IF v_total_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, p_transaction_number, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'FAILED'::VARCHAR(30), 'ORIGINAL_DEBIT_NOT_FOUND'::VARCHAR(100), FORMAT('No original debit transaction found for TxnID: %s', p_transaction_number)::VARCHAR(500);
        RETURN;
    END IF;

    SELECT
        t.retailer_id,
        t.tenant_id,
        t.company_id,
        t.retailer_name,
        t.dist_id,
        t.dist_name,
        t.sd_id,
        t.sd_name,
        t.rm_id,
        t.rm_name,
        t.vendor_id,
        t.vendor_name,
        t."UserType",
        t.wallet_type,
        t.service_name
    INTO
        v_retailer_id,
        v_tenant_id,
        v_company_id,
        v_retailer_name,
        v_dist_id,
        v_dist_name,
        v_sd_id,
        v_sd_name,
        v_rm_id,
        v_rm_name,
        v_vendor_id,
        v_vendor_name,
        v_user_type,
        v_wallet_type,
        v_service_name
    FROM public.transactions t
    WHERE t.txn_id = p_transaction_number
      AND t.entry_type = 'DEBIT'
    LIMIT 1;

    -- Execute CREDIT reversal via wallet_balance_update
    SELECT * INTO v_res_record
    FROM public.wallet_balance_update(
        p_tenant_id              => v_tenant_id,
        p_company_id             => v_company_id,
        p_retailer_id            => v_retailer_id,

        p_txn_id                 => p_transaction_number,
        p_ref_id                 => p_transaction_number,
        p_table_ref_id           => NULL,

        p_entry_type             => 'CREDIT',
        p_total_amount           => v_total_amount,

        p_payout_amount          => v_payout_amount,
        p_charge_amount          => v_charge_amount,
        p_gst_amount             => v_gst_amount,

        p_service_name           => COALESCE(v_service_name, 'PAYOUT'),
        p_wallet_type            => COALESCE(v_wallet_type, 'MAIN'),
        p_user_type              => COALESCE(v_user_type, 'RETAILER'),

        p_retailer_name          => v_retailer_name,
        p_dist_id                => v_dist_id,
        p_dist_name              => v_dist_name,
        p_sd_id                  => v_sd_id,
        p_sd_name                => v_sd_name,
        p_rm_id                  => v_rm_id,
        p_rm_name                => v_rm_name,
        p_vendor_id              => v_vendor_id,
        p_vendor_name            => v_vendor_name,
        p_created_by             => v_retailer_id
    );

    IF v_res_record.success = FALSE THEN
        RETURN QUERY SELECT FALSE, p_transaction_number, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'FAILED'::VARCHAR(30), v_res_record.error_code, v_res_record.error_message;
        RETURN;
    END IF;

    -- Update payout_transaction status to FAILED
    UPDATE public.payout_transaction
    SET
        status = 'FAILED',
        error_message = p_failure_reason,
        updated_date = NOW()
    WHERE transaction_number = p_transaction_number;

    RETURN QUERY
    SELECT
        TRUE,
        p_transaction_number,
        v_total_amount,
        v_res_record.wallet_balance_after,
        'REVERSED'::VARCHAR(30),
        NULL::VARCHAR(100),
        NULL::VARCHAR(500);

END;
$$;
