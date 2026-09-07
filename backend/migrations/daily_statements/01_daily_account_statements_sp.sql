-- ==============================================================================
-- Migration: Daily Automatic Account Statements (Retailer & Admin)
-- Stored Procedures & Log Table for Daily Account Statement System
-- ==============================================================================

-- 1. Create Log & Status Table
CREATE TABLE IF NOT EXISTS public.daily_account_statement_log (
    id                          BIGSERIAL PRIMARY KEY,
    public_id                   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    statement_number            VARCHAR(100) UNIQUE NOT NULL,
    tenant_id                   UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    company_id                  UUID NOT NULL DEFAULT 'b1e02b56-7742-4549-a4ef-31f5378f00a8'::uuid,
    retailer_id                 UUID,
    statement_type              VARCHAR(20) NOT NULL DEFAULT 'RETAILER', -- 'RETAILER' or 'ADMIN'
    statement_date              DATE NOT NULL,
    period_start                TIMESTAMPTZ NOT NULL,
    period_end                  TIMESTAMPTZ NOT NULL,
    opening_balance             NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    total_credit                NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    total_debit                 NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    closing_balance             NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    total_commission            NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    total_gst                   NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    transaction_count           INTEGER NOT NULL DEFAULT 0,
    reconciliation_status       VARCHAR(30) NOT NULL DEFAULT 'RECONCILED', -- 'RECONCILED' or 'FAILED'
    reconciliation_difference   NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    pdf_file_path               VARCHAR(500),
    is_password_protected       BOOLEAN NOT NULL DEFAULT TRUE,
    password_type               VARCHAR(30) NOT NULL DEFAULT 'PAN',
    email_recipient             VARCHAR(255),
    email_status                VARCHAR(35) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED', 'SUPPRESSED_RECONCILIATION_FAILED', 'SKIPPED_NO_EMAIL'
    email_sent_at               TIMESTAMPTZ,
    error_message               TEXT,
    metadata_json               JSONB DEFAULT '{}'::jsonb,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index for duplicate protection: strictly one statement per company_id + retailer_id + statement_date
CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_statement_scope 
ON public.daily_account_statement_log (
    company_id, 
    COALESCE(retailer_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    statement_date
);

CREATE INDEX IF NOT EXISTS idx_daily_stmt_date ON public.daily_account_statement_log (statement_date);
CREATE INDEX IF NOT EXISTS idx_daily_stmt_retailer ON public.daily_account_statement_log (retailer_id);
CREATE INDEX IF NOT EXISTS idx_daily_stmt_status ON public.daily_account_statement_log (reconciliation_status, email_status);


-- ==============================================================================
-- 2. Stored Procedure: List Active Retailers For Statement Generation
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_list_active_retailers_for_statement(
    p_company_id UUID DEFAULT NULL,
    p_statement_date DATE DEFAULT NULL
)
RETURNS TABLE (
    retailer_id             UUID,
    retailer_code           VARCHAR,
    owner_name              VARCHAR,
    store_name              VARCHAR,
    legal_name              VARCHAR,
    pan_number              VARCHAR,
    email                   VARCHAR,
    mobile                  VARCHAR,
    current_wallet_balance  NUMERIC,
    day_transaction_count   INTEGER,
    tenant_id               UUID,
    company_id              UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_date DATE := COALESCE(p_statement_date, CURRENT_DATE - 1);
BEGIN
    RETURN QUERY
    SELECT 
        r.public_id AS retailer_id,
        r.retailer_code::VARCHAR,
        COALESCE(r.owner_name, r.legal_name, 'Retailer')::VARCHAR AS owner_name,
        COALESCE(r.store_name, r.owner_name, 'Retailer Store')::VARCHAR AS store_name,
        COALESCE(r.legal_name, r.store_name, 'Retailer Legal Name')::VARCHAR AS legal_name,
        COALESCE(k.pan_number, '')::VARCHAR AS pan_number,
        COALESCE(c.email, '')::VARCHAR AS email,
        COALESCE(c.mobile, '')::VARCHAR AS mobile,
        COALESCE(w.wallet_balance, 0.00)::NUMERIC AS current_wallet_balance,
        COALESCE(day_tx.cnt, 0)::INTEGER AS day_transaction_count,
        r.tenant_id,
        r.company_id
    FROM public.retailer r
    LEFT JOIN public.retailer_kyc k ON k.retailer_id = r.public_id AND k.is_deleted = FALSE
    LEFT JOIN public.retailer_contact c ON c.retailer_id = r.public_id AND c.is_deleted = FALSE
    LEFT JOIN public.retailer_wallet w ON w.retailer_id = r.public_id AND w.is_deleted = FALSE AND w.wallet_type = 'MAIN'
    LEFT JOIN (
        SELECT t.retailer_id AS tx_rid, COUNT(*)::INTEGER AS cnt
        FROM public.transactions t
        WHERE DATE(t.created_at) = v_date
          AND t.is_deleted = FALSE
        GROUP BY t.retailer_id
    ) day_tx ON day_tx.tx_rid = r.public_id
    WHERE r.is_deleted = FALSE
      AND (p_company_id IS NULL OR r.company_id = p_company_id)
    ORDER BY day_transaction_count DESC, r.retailer_code ASC;
END;
$$;


-- ==============================================================================
-- 3. Stored Procedure: Generate Retailer Statement Data (Reconciled & Formatted)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_generate_retailer_statement_data(
    p_retailer_id UUID,
    p_statement_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_retailer_code          VARCHAR(100);
    v_owner_name             VARCHAR(255);
    v_store_name             VARCHAR(255);
    v_legal_name             VARCHAR(255);
    v_pan_number             VARCHAR(50);
    v_email                  VARCHAR(255);
    v_company_name           VARCHAR(255);
    v_company_id             UUID;
    v_tenant_id              UUID;
    v_period_start           TIMESTAMPTZ;
    v_period_end             TIMESTAMPTZ;
    v_opening_balance        NUMERIC(18,2) := 0.00;
    v_closing_balance        NUMERIC(18,2) := 0.00;
    v_ledger_closing         NUMERIC(18,2) := 0.00;
    v_total_credit           NUMERIC(18,2) := 0.00;
    v_total_debit            NUMERIC(18,2) := 0.00;
    v_total_commission       NUMERIC(18,2) := 0.00;
    v_total_gst              NUMERIC(18,2) := 0.00;
    v_transaction_count      INTEGER := 0;
    v_calculated_closing     NUMERIC(18,2) := 0.00;
    v_diff                   NUMERIC(18,2) := 0.00;
    v_reconciliation_status  VARCHAR(30) := 'RECONCILED';
    v_tx_rows                JSONB := '[]'::jsonb;
    v_has_txns               BOOLEAN := FALSE;
BEGIN
    v_period_start := (p_statement_date::TEXT || ' 00:00:00+00')::TIMESTAMPTZ;
    v_period_end   := (p_statement_date::TEXT || ' 23:59:59+00')::TIMESTAMPTZ;

    -- 1. Fetch Retailer Details
    SELECT 
        r.retailer_code,
        COALESCE(r.owner_name, r.legal_name, 'Retailer'),
        COALESCE(r.store_name, r.owner_name, 'Retailer Store'),
        COALESCE(r.legal_name, r.store_name, 'SUPER REX PRODUCTS PRIVATE LIMITED'),
        UPPER(COALESCE(k.pan_number, '')),
        COALESCE(c.email, ''),
        COALESCE(comp.legal_name, comp.company_name, 'SUPER REX PRODUCTS PRIVATE LIMITED'),
        r.company_id,
        r.tenant_id
    INTO 
        v_retailer_code,
        v_owner_name,
        v_store_name,
        v_legal_name,
        v_pan_number,
        v_email,
        v_company_name,
        v_company_id,
        v_tenant_id
    FROM public.retailer r
    LEFT JOIN public.retailer_kyc k ON k.retailer_id = r.public_id AND k.is_deleted = FALSE
    LEFT JOIN public.retailer_contact c ON c.retailer_id = r.public_id AND c.is_deleted = FALSE
    LEFT JOIN public.company comp ON comp.public_id = r.company_id
    WHERE r.public_id = p_retailer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'RETAILER_NOT_FOUND',
            'message', 'Retailer with given public_id does not exist.'
        );
    END IF;

    -- 2. Aggregate Transactions for Statement Date
    SELECT 
        COUNT(*),
        COALESCE(SUM(CASE WHEN t.entry_type = 'CREDIT' THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN t.entry_type = 'DEBIT' THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN (t.narration ILIKE '%charge%' OR t.narration ILIKE '%commission%' OR t.service_name ILIKE '%charge%') THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN (t.narration ILIKE '%gst%' OR t.service_name ILIKE '%gst%') THEN t.amount ELSE 0 END), 0.00)
    INTO
        v_transaction_count,
        v_total_credit,
        v_total_debit,
        v_total_commission,
        v_total_gst
    FROM public.transactions t
    WHERE t.retailer_id = p_retailer_id
      AND DATE(t.created_at) = p_statement_date
      AND t.is_deleted = FALSE;

    IF v_transaction_count > 0 THEN
        v_has_txns := TRUE;

        -- Earliest transaction: opening balance
        SELECT t.balance_before
        INTO v_opening_balance
        FROM public.transactions t
        WHERE t.retailer_id = p_retailer_id
          AND DATE(t.created_at) = p_statement_date
          AND t.is_deleted = FALSE
        ORDER BY t.created_at ASC, t.id ASC
        LIMIT 1;

        -- Latest transaction: ledger closing balance
        SELECT t.balance_after
        INTO v_ledger_closing
        FROM public.transactions t
        WHERE t.retailer_id = p_retailer_id
          AND DATE(t.created_at) = p_statement_date
          AND t.is_deleted = FALSE
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT 1;

        -- Calculate closing balance via accounting formula
        v_calculated_closing := ROUND(v_opening_balance + v_total_credit - v_total_debit, 2);
        v_diff := ROUND(v_calculated_closing - v_ledger_closing, 2);

        IF ABS(v_diff) < 0.01 THEN
            v_reconciliation_status := 'RECONCILED';
            v_closing_balance := v_ledger_closing;
        ELSE
            v_reconciliation_status := 'FAILED';
            v_closing_balance := v_ledger_closing;
        END IF;

        -- Fetch line items
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'created_at', to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
                'created_at_iso', t.created_at,
                'date_formatted', to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-Mon-YYYY HH24:MI'),
                'txn_id', t.txn_id,
                'ref_id', COALESCE(t.ref_id, '-'),
                'service_name', COALESCE(t.service_name, 'General'),
                'description', COALESCE(t.narration, t.service_name, 'Transaction'),
                'entry_type', t.entry_type,
                'credit_amount', CASE WHEN t.entry_type = 'CREDIT' THEN t.amount ELSE 0.00 END,
                'debit_amount', CASE WHEN t.entry_type = 'DEBIT' THEN t.amount ELSE 0.00 END,
                'amount', t.amount,
                'balance_before', t.balance_before,
                'balance_after', t.balance_after,
                'status', COALESCE(t.status, 'SUCCESS')
            ) ORDER BY t.created_at ASC, t.id ASC
        )
        INTO v_tx_rows
        FROM public.transactions t
        WHERE t.retailer_id = p_retailer_id
          AND DATE(t.created_at) = p_statement_date
          AND t.is_deleted = FALSE;

    ELSE
        -- No transactions today: opening balance = balance before today or current wallet balance
        SELECT t.balance_after
        INTO v_opening_balance
        FROM public.transactions t
        WHERE t.retailer_id = p_retailer_id
          AND DATE(t.created_at) < p_statement_date
          AND t.is_deleted = FALSE
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT 1;

        IF v_opening_balance IS NULL THEN
            SELECT COALESCE(w.wallet_balance, 0.00)
            INTO v_opening_balance
            FROM public.retailer_wallet w
            WHERE w.retailer_id = p_retailer_id
              AND w.is_deleted = FALSE
              AND w.wallet_type = 'MAIN';
        END IF;

        v_opening_balance := COALESCE(v_opening_balance, 0.00);
        v_closing_balance := v_opening_balance;
        v_total_credit := 0.00;
        v_total_debit := 0.00;
        v_total_commission := 0.00;
        v_total_gst := 0.00;
        v_reconciliation_status := 'RECONCILED';
        v_diff := 0.00;
        v_tx_rows := '[]'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'retailer_id', p_retailer_id,
        'retailer_code', v_retailer_code,
        'owner_name', v_owner_name,
        'store_name', v_store_name,
        'legal_name', v_legal_name,
        'pan_number', v_pan_number,
        'email', v_email,
        'company_name', v_company_name,
        'company_id', v_company_id,
        'tenant_id', v_tenant_id,
        'statement_date', p_statement_date,
        'period_start', v_period_start,
        'period_end', v_period_end,
        'period_formatted', to_char(p_statement_date, 'DD Month YYYY') || ' 00:00 – 23:59',
        'statement_date_formatted', to_char(p_statement_date, 'DD Month YYYY'),
        'opening_balance', v_opening_balance,
        'total_credit', v_total_credit,
        'total_debit', v_total_debit,
        'total_commission', v_total_commission,
        'total_gst', v_total_gst,
        'closing_balance', v_closing_balance,
        'transaction_count', v_transaction_count,
        'reconciliation_status', v_reconciliation_status,
        'reconciliation_difference', v_diff,
        'can_send_email', (v_reconciliation_status = 'RECONCILED' AND v_email != '' AND position('@' in v_email) > 1),
        'transactions', COALESCE(v_tx_rows, '[]'::jsonb)
    );
END;
$$;


-- ==============================================================================
-- 4. Stored Procedure: Generate Admin / Company Statement Data
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_generate_admin_statement_data(
    p_company_id UUID,
    p_statement_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_name           VARCHAR(255);
    v_pan_number             VARCHAR(50);
    v_tenant_id              UUID;
    v_period_start           TIMESTAMPTZ;
    v_period_end             TIMESTAMPTZ;
    v_opening_balance        NUMERIC(18,2) := 0.00;
    v_closing_balance        NUMERIC(18,2) := 0.00;
    v_total_credit           NUMERIC(18,2) := 0.00;
    v_total_debit            NUMERIC(18,2) := 0.00;
    v_total_commission       NUMERIC(18,2) := 0.00;
    v_total_gst              NUMERIC(18,2) := 0.00;
    v_transaction_count      INTEGER := 0;
    v_tx_rows                JSONB := '[]'::jsonb;
    v_admin_email            VARCHAR(255) := 'admin@pay2pay.in';
BEGIN
    v_period_start := (p_statement_date::TEXT || ' 00:00:00+00')::TIMESTAMPTZ;
    v_period_end   := (p_statement_date::TEXT || ' 23:59:59+00')::TIMESTAMPTZ;

    -- Fetch Company details
    SELECT 
        COALESCE(comp.legal_name, comp.company_name, 'SUPER REX PRODUCTS PRIVATE LIMITED'),
        UPPER(COALESCE(comp.pan_number, 'AABCP1234F')),
        comp.tenant_id
    INTO
        v_company_name,
        v_pan_number,
        v_tenant_id
    FROM public.company comp
    WHERE comp.public_id = p_company_id;

    IF NOT FOUND THEN
        v_company_name := 'SUPER REX PRODUCTS PRIVATE LIMITED';
        v_pan_number := 'AABCP1234F';
        v_tenant_id := '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    -- Aggregate all company transactions on statement date
    SELECT 
        COUNT(*),
        COALESCE(SUM(CASE WHEN t.entry_type = 'CREDIT' THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN t.entry_type = 'DEBIT' THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN (t.narration ILIKE '%charge%' OR t.narration ILIKE '%commission%' OR t.service_name ILIKE '%charge%') THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN (t.narration ILIKE '%gst%' OR t.service_name ILIKE '%gst%') THEN t.amount ELSE 0 END), 0.00)
    INTO
        v_transaction_count,
        v_total_credit,
        v_total_debit,
        v_total_commission,
        v_total_gst
    FROM public.transactions t
    WHERE (p_company_id IS NULL OR t.company_id = p_company_id)
      AND DATE(t.created_at) = p_statement_date
      AND t.is_deleted = FALSE;

    -- Total platform opening balance from active retailer wallets at start of day
    SELECT COALESCE(SUM(w.wallet_balance), 0.00)
    INTO v_closing_balance
    FROM public.retailer_wallet w
    WHERE w.is_deleted = FALSE
      AND w.wallet_type = 'MAIN';

    v_opening_balance := ROUND(v_closing_balance - v_total_credit + v_total_debit, 2);

    -- Fetch platform transactions (top 500 ordered)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'created_at', to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
            'date_formatted', to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'DD-Mon-YYYY HH24:MI'),
            'txn_id', t.txn_id,
            'ref_id', COALESCE(t.ref_id, '-'),
            'retailer_name', COALESCE(t.retailer_name, 'Retailer'),
            'service_name', COALESCE(t.service_name, 'Platform Service'),
            'description', COALESCE(t.narration, t.service_name, 'Transaction'),
            'entry_type', t.entry_type,
            'credit_amount', CASE WHEN t.entry_type = 'CREDIT' THEN t.amount ELSE 0.00 END,
            'debit_amount', CASE WHEN t.entry_type = 'DEBIT' THEN t.amount ELSE 0.00 END,
            'amount', t.amount,
            'balance_before', t.balance_before,
            'balance_after', t.balance_after,
            'status', COALESCE(t.status, 'SUCCESS')
        ) ORDER BY t.created_at ASC, t.id ASC
    )
    INTO v_tx_rows
    FROM (
        SELECT * FROM public.transactions t
        WHERE (p_company_id IS NULL OR t.company_id = p_company_id)
          AND DATE(t.created_at) = p_statement_date
          AND t.is_deleted = FALSE
        ORDER BY t.created_at ASC, t.id ASC
        LIMIT 500
    ) t;

    RETURN jsonb_build_object(
        'success', TRUE,
        'company_id', p_company_id,
        'company_name', v_company_name,
        'pan_number', v_pan_number,
        'tenant_id', v_tenant_id,
        'admin_email', v_admin_email,
        'statement_date', p_statement_date,
        'period_start', v_period_start,
        'period_end', v_period_end,
        'period_formatted', to_char(p_statement_date, 'DD Month YYYY') || ' 00:00 – 23:59',
        'statement_date_formatted', to_char(p_statement_date, 'DD Month YYYY'),
        'opening_balance', v_opening_balance,
        'total_credit', v_total_credit,
        'total_debit', v_total_debit,
        'total_commission', v_total_commission,
        'total_gst', v_total_gst,
        'closing_balance', v_closing_balance,
        'transaction_count', v_transaction_count,
        'reconciliation_status', 'RECONCILED',
        'reconciliation_difference', 0.00,
        'can_send_email', TRUE,
        'transactions', COALESCE(v_tx_rows, '[]'::jsonb)
    );
END;
$$;


-- ==============================================================================
-- 5. Stored Procedure: Record / Upsert Daily Account Statement Log
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_record_account_statement_log(
    p_statement_number           VARCHAR,
    p_tenant_id                  UUID,
    p_company_id                 UUID,
    p_retailer_id                UUID,
    p_statement_type             VARCHAR,
    p_statement_date             DATE,
    p_period_start               TIMESTAMPTZ,
    p_period_end                 TIMESTAMPTZ,
    p_opening_balance            NUMERIC,
    p_total_credit               NUMERIC,
    p_total_debit                NUMERIC,
    p_closing_balance            NUMERIC,
    p_total_commission           NUMERIC,
    p_total_gst                  NUMERIC,
    p_transaction_count          INTEGER,
    p_reconciliation_status      VARCHAR,
    p_reconciliation_difference  NUMERIC,
    p_pdf_file_path              VARCHAR,
    p_email_recipient            VARCHAR,
    p_email_status               VARCHAR,
    p_error_message              TEXT DEFAULT NULL,
    p_metadata_json              JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    statement_id     UUID,
    statement_num    VARCHAR,
    is_new           BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    SELECT public_id INTO v_existing_id
    FROM public.daily_account_statement_log
    WHERE company_id = p_company_id
      AND COALESCE(retailer_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_retailer_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND statement_date = p_statement_date;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.daily_account_statement_log
        SET
            opening_balance           = p_opening_balance,
            total_credit              = p_total_credit,
            total_debit               = p_total_debit,
            closing_balance           = p_closing_balance,
            total_commission          = p_total_commission,
            total_gst                 = p_total_gst,
            transaction_count         = p_transaction_count,
            reconciliation_status     = p_reconciliation_status,
            reconciliation_difference = p_reconciliation_difference,
            pdf_file_path             = COALESCE(p_pdf_file_path, pdf_file_path),
            email_recipient           = COALESCE(p_email_recipient, email_recipient),
            email_status              = p_email_status,
            email_sent_at             = CASE WHEN p_email_status = 'SENT' THEN NOW() ELSE email_sent_at END,
            error_message             = p_error_message,
            metadata_json             = COALESCE(p_metadata_json, metadata_json),
            updated_at                = NOW()
        WHERE public_id = v_existing_id;

        RETURN QUERY SELECT v_existing_id, p_statement_number, FALSE;
    ELSE
        INSERT INTO public.daily_account_statement_log (
            statement_number, tenant_id, company_id, retailer_id, statement_type,
            statement_date, period_start, period_end,
            opening_balance, total_credit, total_debit, closing_balance,
            total_commission, total_gst, transaction_count,
            reconciliation_status, reconciliation_difference,
            pdf_file_path, email_recipient, email_status,
            email_sent_at, error_message, metadata_json,
            created_at, updated_at
        )
        VALUES (
            p_statement_number, p_tenant_id, p_company_id, p_retailer_id, p_statement_type,
            p_statement_date, p_period_start, p_period_end,
            p_opening_balance, p_total_credit, p_total_debit, p_closing_balance,
            p_total_commission, p_total_gst, p_transaction_count,
            p_reconciliation_status, p_reconciliation_difference,
            p_pdf_file_path, p_email_recipient, p_email_status,
            CASE WHEN p_email_status = 'SENT' THEN NOW() ELSE NULL END,
            p_error_message, p_metadata_json,
            NOW(), NOW()
        )
        RETURNING public_id, statement_number INTO v_existing_id, p_statement_number;

        RETURN QUERY SELECT v_existing_id, p_statement_number, TRUE;
    END IF;
END;
$$;


-- ==============================================================================
-- 6. Stored Procedure: Get Daily Statements For Admin Dashboard
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_get_daily_statements_admin(
    p_statement_date DATE DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_search VARCHAR DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset           INTEGER;
    v_total_records    INTEGER := 0;
    v_reconciled_cnt   INTEGER := 0;
    v_failed_cnt       INTEGER := 0;
    v_delivered_cnt    INTEGER := 0;
    v_pending_cnt      INTEGER := 0;
    v_volume_sum       NUMERIC(18,2) := 0.00;
    v_items            JSONB := '[]'::jsonb;
    v_search_pattern   VARCHAR;
BEGIN
    v_offset := (GREATEST(p_page, 1) - 1) * p_page_size;
    v_search_pattern := '%' || LOWER(COALESCE(p_search, '')) || '%';

    -- Summary Metrics Query
    SELECT 
        COUNT(*),
        COALESCE(COUNT(*) FILTER (WHERE l.reconciliation_status = 'RECONCILED'), 0),
        COALESCE(COUNT(*) FILTER (WHERE l.reconciliation_status = 'FAILED'), 0),
        COALESCE(COUNT(*) FILTER (WHERE l.email_status = 'SENT'), 0),
        COALESCE(COUNT(*) FILTER (WHERE l.email_status IN ('PENDING', 'SUPPRESSED_RECONCILIATION_FAILED')), 0),
        COALESCE(SUM(l.total_credit + l.total_debit), 0.00)
    INTO
        v_total_records,
        v_reconciled_cnt,
        v_failed_cnt,
        v_delivered_cnt,
        v_pending_cnt,
        v_volume_sum
    FROM public.daily_account_statement_log l
    LEFT JOIN public.retailer r ON r.public_id = l.retailer_id
    WHERE (p_statement_date IS NULL OR l.statement_date = p_statement_date)
      AND (p_status IS NULL OR p_status = 'ALL' 
           OR l.reconciliation_status = p_status 
           OR l.email_status = p_status)
      AND (p_search IS NULL OR p_search = '' 
           OR LOWER(l.statement_number) LIKE v_search_pattern
           OR LOWER(COALESCE(r.retailer_code, '')) LIKE v_search_pattern
           OR LOWER(COALESCE(r.owner_name, '')) LIKE v_search_pattern
           OR LOWER(COALESCE(r.store_name, '')) LIKE v_search_pattern);

    -- Paginated Items Query
    SELECT jsonb_agg(
        jsonb_build_object(
            'public_id', l.public_id,
            'statement_number', l.statement_number,
            'statement_type', l.statement_type,
            'statement_date', l.statement_date,
            'statement_date_formatted', to_char(l.statement_date, 'DD-Mon-YYYY'),
            'period_start', l.period_start,
            'period_end', l.period_end,
            'retailer_id', l.retailer_id,
            'retailer_code', COALESCE(r.retailer_code, 'COMPANY-ADMIN'),
            'owner_name', COALESCE(r.owner_name, r.legal_name, 'SUPER REX PRODUCTS PRIVATE LIMITED'),
            'store_name', COALESCE(r.store_name, 'Pay2Pay Platform'),
            'pan_number', COALESCE(k.pan_number, comp.pan_number, 'AABCP1234F'),
            'opening_balance', l.opening_balance,
            'total_credit', l.total_credit,
            'total_debit', l.total_debit,
            'closing_balance', l.closing_balance,
            'total_commission', l.total_commission,
            'total_gst', l.total_gst,
            'transaction_count', l.transaction_count,
            'reconciliation_status', l.reconciliation_status,
            'reconciliation_difference', l.reconciliation_difference,
            'pdf_file_path', l.pdf_file_path,
            'email_recipient', l.email_recipient,
            'email_status', l.email_status,
            'email_sent_at', l.email_sent_at,
            'error_message', l.error_message,
            'created_at', l.created_at
        ) ORDER BY l.statement_date DESC, l.id DESC
    )
    INTO v_items
    FROM (
        SELECT l.*
        FROM public.daily_account_statement_log l
        LEFT JOIN public.retailer r ON r.public_id = l.retailer_id
        WHERE (p_statement_date IS NULL OR l.statement_date = p_statement_date)
          AND (p_status IS NULL OR p_status = 'ALL' 
               OR l.reconciliation_status = p_status 
               OR l.email_status = p_status)
          AND (p_search IS NULL OR p_search = '' 
               OR LOWER(l.statement_number) LIKE v_search_pattern
               OR LOWER(COALESCE(r.retailer_code, '')) LIKE v_search_pattern
               OR LOWER(COALESCE(r.owner_name, '')) LIKE v_search_pattern
               OR LOWER(COALESCE(r.store_name, '')) LIKE v_search_pattern)
        ORDER BY l.statement_date DESC, l.id DESC
        LIMIT p_page_size OFFSET v_offset
    ) l
    LEFT JOIN public.retailer r ON r.public_id = l.retailer_id
    LEFT JOIN public.retailer_kyc k ON k.retailer_id = l.retailer_id AND k.is_deleted = FALSE
    LEFT JOIN public.company comp ON comp.public_id = l.company_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'page', p_page,
        'page_size', p_page_size,
        'total_records', v_total_records,
        'total_pages', CEIL(v_total_records::NUMERIC / GREATEST(p_page_size, 1)),
        'summary', jsonb_build_object(
            'total_generated', v_total_records,
            'total_reconciled', v_reconciled_cnt,
            'total_failed', v_failed_cnt,
            'total_delivered', v_delivered_cnt,
            'total_pending', v_pending_cnt,
            'total_volume', v_volume_sum
        ),
        'items', COALESCE(v_items, '[]'::jsonb)
    );
END;
$$;


-- ==============================================================================
-- 7. Stored Procedure: Get Statement Details By ID (For Modal & PDF Download)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_get_daily_statement_details(
    p_statement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_row RECORD;
    v_data    JSONB;
BEGIN
    SELECT * INTO v_log_row
    FROM public.daily_account_statement_log
    WHERE public_id = p_statement_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'STATEMENT_NOT_FOUND',
            'message', 'Daily account statement with given ID was not found.'
        );
    END IF;

    IF v_log_row.statement_type = 'ADMIN' THEN
        v_data := public.sp_generate_admin_statement_data(v_log_row.company_id, v_log_row.statement_date);
    ELSE
        v_data := public.sp_generate_retailer_statement_data(v_log_row.retailer_id, v_log_row.statement_date);
    END IF;

    -- Merge log delivery fields
    v_data := v_data || jsonb_build_object(
        'statement_id', v_log_row.public_id,
        'statement_number', v_log_row.statement_number,
        'statement_type', v_log_row.statement_type,
        'pdf_file_path', v_log_row.pdf_file_path,
        'email_recipient', v_log_row.email_recipient,
        'email_status', v_log_row.email_status,
        'email_sent_at', v_log_row.email_sent_at,
        'error_message', v_log_row.error_message
    );

    RETURN v_data;
END;
$$;


-- ==============================================================================
-- 8. Stored Procedure: Update Statement Delivery Status (Resend / Async Email)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_update_statement_delivery_status(
    p_statement_id UUID,
    p_email_status VARCHAR,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.daily_account_statement_log
    SET 
        email_status = p_email_status,
        email_sent_at = CASE WHEN p_email_status = 'SENT' THEN NOW() ELSE email_sent_at END,
        error_message = p_error_message,
        updated_at = NOW()
    WHERE public_id = p_statement_id;

    RETURN FOUND;
END;
$$;

