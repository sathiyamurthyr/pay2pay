import asyncio
import sys

backend_dir = r"d:\pay2pay\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

STATEMENTS = [
    # 1. Extension
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",

    # 2. Sequence
    """
    CREATE SEQUENCE IF NOT EXISTS public.payout_txn_seq
        START WITH 1
        INCREMENT BY 1
        MINVALUE 1
        MAXVALUE 99999
        CYCLE;
    """,

    # 3. generate_payout_txn_id
    """
    CREATE OR REPLACE FUNCTION public.generate_payout_txn_id(
        p_vendor_name VARCHAR(500) DEFAULT NULL
    )
    RETURNS VARCHAR(100)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        v_vendor_char VARCHAR(1);
        v_datetime    VARCHAR(10);
        v_seq         BIGINT;
        v_candidate   VARCHAR(100);
    BEGIN
        v_vendor_char := UPPER(SUBSTRING(TRIM(COALESCE(p_vendor_name, 'PAY2PAY')) FROM 1 FOR 1));

        IF v_vendor_char !~ '^[A-Z0-9]$' THEN
            v_vendor_char := 'P';
        END IF;

        v_datetime := TO_CHAR(
            NOW() AT TIME ZONE 'Asia/Kolkata',
            'DDMMYYHH24MI'
        );

        LOOP
            v_seq := nextval('public.payout_txn_seq');

            v_candidate :=
                v_vendor_char ||
                'PAY' ||
                v_datetime ||
                LPAD((v_seq % 100000)::TEXT, 5, '0');

            IF NOT EXISTS (
                SELECT 1
                FROM public.payout_transaction pt
                WHERE pt.transaction_number = v_candidate
            )
            AND NOT EXISTS (
                SELECT 1
                FROM public.transactions t
                WHERE t.txn_id = v_candidate
            ) THEN
                RETURN v_candidate;
            END IF;
        END LOOP;
    END;
    $$;
    """,

    # 4. Drop older versions
    "DROP FUNCTION IF EXISTS public.reverse_failed_payout_transaction(VARCHAR, VARCHAR);",
    "DROP FUNCTION IF EXISTS public.update_payout_transaction_status(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR);",

    # 5. wallet_balance_update (structured component parameters)
    """
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
        v_date_key               INTEGER;
        v_time_key               INTEGER;

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

        IF EXISTS (
            SELECT 1
            FROM public.transactions t
            WHERE t.retailer_id = p_retailer_id
              AND t.txn_id = p_txn_id
              AND t.entry_type = p_entry_type
        ) THEN
            RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), p_total_amount, 'FAILED'::VARCHAR(30), 'DUPLICATE_TRANSACTION'::VARCHAR(100), FORMAT('Duplicate transaction exists for TxnID: %s, Entry: %s', p_txn_id, p_entry_type)::VARCHAR(500);
            RETURN;
        END IF;

        -- Lock Retailer Wallet FOR UPDATE (using retailer_id)
        SELECT
            COALESCE(rw.public_id, gen_random_uuid()),
            COALESCE(rw.wallet_balance, 0.00)::NUMERIC(18,2),
            COALESCE(rw.tenant_id, p_tenant_id),
            COALESCE(rw.company_id, p_company_id)
        INTO
            v_wallet_id,
            v_balance_before,
            p_tenant_id,
            p_company_id
        FROM public.retailer_wallet rw
        WHERE (rw.retailer_id = p_retailer_id OR rw.public_id = p_retailer_id)
          AND rw.is_active = TRUE
          AND rw.is_deleted = FALSE
        FOR UPDATE;

        IF v_wallet_id IS NULL THEN
            RETURN QUERY SELECT FALSE, p_txn_id, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), p_total_amount, 'FAILED'::VARCHAR(30), 'WALLET_NOT_FOUND'::VARCHAR(100), FORMAT('Active wallet not found for retailer %s', p_retailer_id)::VARCHAR(500);
            RETURN;
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
                dist_id, dist_name, sd_id, sd_name, rm_id, rm_name,
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
                p_dist_id, p_dist_name, p_sd_id, p_sd_name, p_rm_id, p_rm_name,
                p_vendor_id, COALESCE(p_vendor_name, 'Commercial Bank'), p_txn_id, p_ref_id, p_table_ref_id,
                p_service_name, p_wallet_type, p_user_type, p_entry_type, v_line_amount,
                v_line_before, v_line_after, 'SUCCESS',
                CASE WHEN p_entry_type = 'DEBIT' THEN 'Payout Amount' ELSE 'Payout Amount Reversal' END,
                v_day_key, v_week_key, v_month_key, v_quarter_key, v_year_key,
                v_financial_year_key, v_financial_quarter_key, v_financial_month_key,
                v_date_key, v_time_key,
                v_partition_year, v_partition_month, v_partition_day,
                TRUE, FALSE, NOW(), NOW(), COALESCE(p_created_by, p_retailer_id), COALESCE(p_created_by, p_retailer_id)
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
                dist_id, dist_name, sd_id, sd_name, rm_id, rm_name,
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
                p_dist_id, p_dist_name, p_sd_id, p_sd_name, p_rm_id, p_rm_name,
                p_vendor_id, COALESCE(p_vendor_name, 'Commercial Bank'), p_txn_id, p_ref_id, p_table_ref_id,
                p_service_name, p_wallet_type, p_user_type, p_entry_type, v_line_amount,
                v_line_before, v_line_after, 'SUCCESS',
                CASE WHEN p_entry_type = 'DEBIT' THEN 'Payout Charge' ELSE 'Payout Charge Reversal' END,
                v_day_key, v_week_key, v_month_key, v_quarter_key, v_year_key,
                v_financial_year_key, v_financial_quarter_key, v_financial_month_key,
                v_date_key, v_time_key,
                v_partition_year, v_partition_month, v_partition_day,
                TRUE, FALSE, NOW(), NOW(), COALESCE(p_created_by, p_retailer_id), COALESCE(p_created_by, p_retailer_id)
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
                dist_id, dist_name, sd_id, sd_name, rm_id, rm_name,
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
                p_dist_id, p_dist_name, p_sd_id, p_sd_name, p_rm_id, p_rm_name,
                p_vendor_id, COALESCE(p_vendor_name, 'Commercial Bank'), p_txn_id, p_ref_id, p_table_ref_id,
                p_service_name, p_wallet_type, p_user_type, p_entry_type, v_line_amount,
                v_line_before, v_line_after, 'SUCCESS',
                CASE WHEN p_entry_type = 'DEBIT' THEN 'GST' ELSE 'GST Reversal' END,
                v_day_key, v_week_key, v_month_key, v_quarter_key, v_year_key,
                v_financial_year_key, v_financial_quarter_key, v_financial_month_key,
                v_date_key, v_time_key,
                v_partition_year, v_partition_month, v_partition_day,
                TRUE, FALSE, NOW(), NOW(), COALESCE(p_created_by, p_retailer_id), COALESCE(p_created_by, p_retailer_id)
            );

            v_running_balance := v_line_after;
        END IF;

        IF ROUND(v_running_balance, 2) <> ROUND(v_balance_after, 2) THEN
            RAISE EXCEPTION 'Ledger running balance mismatch. Ledger: %, Wallet: %', v_running_balance, v_balance_after;
        END IF;

        RETURN QUERY
        SELECT TRUE, p_txn_id, v_balance_before, v_balance_after, p_total_amount, 'SUCCESS'::VARCHAR(30), NULL::VARCHAR(100), NULL::VARCHAR(500);

    END;
    $$;
    """,

    # 6. wallet_balance_update overload for JSON lines
    """
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
        IF p_retailer_id IS NULL OR p_txn_id IS NULL THEN
            RAISE EXCEPTION 'Retailer and TxnID parameters are required';
        END IF;

        IF p_entry_type IS NULL OR UPPER(TRIM(p_entry_type)) NOT IN ('DEBIT', 'CREDIT') THEN
            RAISE EXCEPTION 'Entry type must be DEBIT or CREDIT';
        END IF;

        IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
            RAISE EXCEPTION 'Total amount must be greater than zero';
        END IF;

        p_entry_type   := UPPER(TRIM(p_entry_type));
        p_service_name := UPPER(TRIM(COALESCE(p_service_name, 'PAYOUT')));
        p_wallet_type  := UPPER(TRIM(COALESCE(p_wallet_type, 'MAIN')));

        SELECT COALESCE(SUM((line->>'amount')::NUMERIC), 0)
        INTO v_line_total
        FROM jsonb_array_elements(p_lines) AS line;

        IF ROUND(v_line_total, 2) <> ROUND(p_total_amount, 2) THEN
            RAISE EXCEPTION 'Line total % does not match wallet amount %', v_line_total, p_total_amount;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.transactions t
            WHERE t.retailer_id = p_retailer_id
              AND t.txn_id = p_txn_id
              AND t.entry_type = p_entry_type
        ) THEN
            RAISE EXCEPTION 'Duplicate transaction already exists. Txn ID: %, Entry: %', p_txn_id, p_entry_type;
        END IF;

        SELECT
            COALESCE(rw.public_id, gen_random_uuid()),
            COALESCE(rw.wallet_balance, 0.00)::NUMERIC(18,2),
            COALESCE(rw.tenant_id, p_tenant_id),
            COALESCE(rw.company_id, p_company_id)
        INTO
            v_wallet_id,
            v_balance_before,
            p_tenant_id,
            p_company_id
        FROM public.retailer_wallet rw
        WHERE (rw.retailer_id = p_retailer_id OR rw.public_id = p_retailer_id)
          AND rw.is_active = TRUE
          AND rw.is_deleted = FALSE
        FOR UPDATE;

        IF v_wallet_id IS NULL THEN
            RAISE EXCEPTION 'Active wallet not found for retailer %', p_retailer_id;
        END IF;

        IF p_entry_type = 'DEBIT' THEN
            IF v_balance_before < p_total_amount THEN
                RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_balance_before, p_total_amount;
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
                public_id, tenant_id, company_id, retailer_id, retailer_name,
                dist_id, dist_name, sd_id, sd_name, rm_id, rm_name,
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
                gen_random_uuid(), p_tenant_id, p_company_id, p_retailer_id, COALESCE(v_line->>'retailer_name', 'Retailer'),
                CASE WHEN v_line->>'dist_id' IS NOT NULL AND TRIM(v_line->>'dist_id') <> '' THEN (v_line->>'dist_id')::UUID ELSE NULL END,
                v_line->>'dist_name',
                CASE WHEN v_line->>'sd_id' IS NOT NULL AND TRIM(v_line->>'sd_id') <> '' THEN (v_line->>'sd_id')::UUID ELSE NULL END,
                v_line->>'sd_name',
                CASE WHEN v_line->>'rm_id' IS NOT NULL AND TRIM(v_line->>'rm_id') <> '' THEN (v_line->>'rm_id')::UUID ELSE NULL END,
                v_line->>'rm_name',
                CASE WHEN v_line->>'vendor_id' IS NOT NULL AND TRIM(v_line->>'vendor_id') <> '' THEN (v_line->>'vendor_id')::UUID ELSE NULL END,
                COALESCE(v_line->>'vendor_name', 'Commercial Bank'),
                p_txn_id, p_ref_id, p_table_ref_id,
                p_service_name, p_wallet_type, COALESCE(v_line->>'user_type', 'RETAILER'),
                p_entry_type, v_line_amount,
                v_line_before, v_line_after, 'SUCCESS', v_line->>'narration',
                v_day_key, v_week_key, v_month_key, v_quarter_key, v_year_key,
                v_financial_year_key, v_financial_quarter_key, v_financial_month_key,
                v_date_key, v_time_key,
                v_partition_year, v_partition_month, v_partition_day,
                TRUE, FALSE, NOW(), NOW(), COALESCE(p_created_by, p_retailer_id), COALESCE(p_created_by, p_retailer_id)
            );
        END LOOP;

        RETURN QUERY
        SELECT v_wallet_id, p_txn_id, v_balance_before, v_balance_after, p_total_amount, 'SUCCESS'::VARCHAR(30);

    END;
    $$;
    """,

    # 7. reverse_failed_payout_transaction
    """
    CREATE OR REPLACE FUNCTION public.reverse_failed_payout_transaction(
        p_transaction_number    VARCHAR(100),
        p_reversal_reason       VARCHAR(500) DEFAULT 'Automatic Vendor Failure Refund'
    )
    RETURNS TABLE (
        success                 BOOLEAN,
        status                  VARCHAR(30),
        transaction_number      VARCHAR(100),
        refunded_amount         NUMERIC(18,2),
        error_code              VARCHAR(100),
        error_message           VARCHAR(500)
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
        v_retailer_name         VARCHAR(255);
        v_dist_id               UUID;
        v_dist_name             VARCHAR(255);
        v_sd_id                 UUID;
        v_sd_name               VARCHAR(255);
        v_rm_id                 UUID;
        v_rm_name               VARCHAR(255);
        v_vendor_id             UUID;
        v_vendor_name           VARCHAR(100);
        v_user_type             VARCHAR(50);
        v_wallet_type           VARCHAR(50);
        v_service_name          VARCHAR(50);

        v_payout_amount         NUMERIC(18,2) := 0.00;
        v_charge_amount         NUMERIC(18,2) := 0.00;
        v_gst_amount            NUMERIC(18,2) := 0.00;
        v_total_refund          NUMERIC(18,2) := 0.00;

        v_result                RECORD;
    BEGIN

        IF EXISTS (
            SELECT 1
            FROM public.transactions t
            WHERE t.txn_id = p_transaction_number
              AND t.entry_type = 'CREDIT'
        ) THEN
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), p_transaction_number, 0.00::NUMERIC(18,2), 'ALREADY_REVERSED'::VARCHAR(100), 'Wallet reversal already exists for this TxnID'::VARCHAR(500);
            RETURN;
        END IF;

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
            t."UserType",
            t.wallet_type,
            t.service_name
        INTO
            v_tenant_id,
            v_company_id,
            v_retailer_id,
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

        SELECT COALESCE(SUM(t.amount), 0.00)
        INTO v_payout_amount
        FROM public.transactions t
        WHERE t.txn_id = p_transaction_number
          AND t.entry_type = 'DEBIT'
          AND t.narration = 'Payout Amount';

        SELECT COALESCE(SUM(t.amount), 0.00)
        INTO v_charge_amount
        FROM public.transactions t
        WHERE t.txn_id = p_transaction_number
          AND t.entry_type = 'DEBIT'
          AND t.narration = 'Payout Charge';

        SELECT COALESCE(SUM(t.amount), 0.00)
        INTO v_gst_amount
        FROM public.transactions t
        WHERE t.txn_id = p_transaction_number
          AND t.entry_type = 'DEBIT'
          AND t.narration = 'GST';

        v_total_refund := v_payout_amount + v_charge_amount + v_gst_amount;

        IF v_retailer_id IS NULL OR v_total_refund <= 0 THEN
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), p_transaction_number, 0.00::NUMERIC(18,2), 'ORIGINAL_DEBIT_NOT_FOUND'::VARCHAR(100), 'Original payout debit lines were not found for reversal'::VARCHAR(500);
            RETURN;
        END IF;

        SELECT * INTO v_result
        FROM public.wallet_balance_update(
            v_tenant_id,
            v_company_id,
            v_retailer_id,
            p_transaction_number,
            p_transaction_number,
            NULL,
            'CREDIT',
            v_total_refund,
            v_payout_amount,
            v_charge_amount,
            v_gst_amount,
            COALESCE(v_service_name, 'PAYOUT'),
            COALESCE(v_wallet_type, 'MAIN'),
            v_user_type,
            v_retailer_name,
            v_dist_id,
            v_dist_name,
            v_sd_id,
            v_sd_name,
            v_rm_id,
            v_rm_name,
            v_vendor_id,
            v_vendor_name,
            NULL
        );

        IF NOT v_result.success THEN
            RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), p_transaction_number, 0.00::NUMERIC(18,2), v_result.error_code, v_result.error_message;
            RETURN;
        END IF;

        UPDATE public.payout_transaction
        SET
            status                  = 'FAILED',
            refund_type             = 'FULL_REVERSAL',
            refund_status           = 'REVERSED',
            error_message           = p_reversal_reason,
            updated_date            = NOW()
        WHERE public.payout_transaction.transaction_number = p_transaction_number;

        RETURN QUERY
        SELECT TRUE, 'REVERSED'::VARCHAR(30), p_transaction_number, v_total_refund, NULL::VARCHAR(100), COALESCE(p_reversal_reason, 'Transaction reversed and retailer wallet refunded successfully')::VARCHAR(500);

    END;
    $$;
    """,

    # 8. update_payout_transaction_status
    """
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

        IF UPPER(TRIM(p_new_status)) NOT IN ('SUCCESS', 'PENDING', 'PROCESSING', 'FAILED', 'REVERSED') THEN
            RETURN QUERY SELECT FALSE, 'ERROR'::VARCHAR(30), p_transaction_number, FALSE, 'Invalid status value'::VARCHAR(500);
            RETURN;
        END IF;

        p_new_status := UPPER(TRIM(p_new_status));

        SELECT pt.status
        INTO v_cur_status
        FROM public.payout_transaction pt
        WHERE pt.transaction_number = p_transaction_number
        FOR UPDATE;

        IF v_cur_status IS NULL THEN
            RETURN QUERY SELECT FALSE, 'NOT_FOUND'::VARCHAR(30), p_transaction_number, FALSE, 'Payout transaction not found'::VARCHAR(500);
            RETURN;
        END IF;

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

        IF p_new_status = 'FAILED' THEN
            SELECT * INTO v_rev_res
            FROM public.reverse_failed_payout_transaction(p_transaction_number, COALESCE(p_error_message, 'Vendor transaction failed'));

            RETURN QUERY SELECT TRUE, 'FAILED'::VARCHAR(30), p_transaction_number, v_rev_res.success, FORMAT('Status updated to FAILED. Reversal status: %s', v_rev_res.error_message)::VARCHAR(500);
            RETURN;
        END IF;

        RETURN QUERY SELECT TRUE, p_new_status, p_transaction_number, FALSE, 'Payout transaction status updated successfully'::VARCHAR(500);

    END;
    $$;
    """
]

async def deploy():
    print("Deploying statement by statement...")
    async with AsyncSessionLocal() as session:
        for idx, stmt in enumerate(STATEMENTS, 1):
            print(f"Executing statement {idx}/{len(STATEMENTS)}...")
            await session.execute(text(stmt.strip()))
            await session.commit()
            print(f"  Statement {idx} succeeded!")
    print("\nAll statements deployed successfully!")

if __name__ == "__main__":
    asyncio.run(deploy())
