-- =============================================================================
-- PAY2PAY REPORTING STORED FUNCTIONS
-- SUPABASE / POSTGRESQL (POST-MIGRATION BIGINT *_ref_id STANDARDIZATION)
--
-- 1. GET /api/v1/payout/transactions
--    -> get_payout_transactions_report()
--
-- 2. GET /api/v1/transactions/report
--    -> get_transactions_report()
--
-- Default date = TODAY (Asia/Kolkata IST)
-- Pagination supported
-- Role-based filtering supported by parameters including user_type_ref_id
-- No SELECT *
-- =============================================================================

-- =============================================================================
-- 1. PAYOUT TRANSACTION REPORT STORED FUNCTION
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_payout_transactions_report(BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, DATE, DATE, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_payout_transactions_report(BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, DATE, DATE, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, BIGINT);

CREATE OR REPLACE FUNCTION public.get_payout_transactions_report(
    p_tenant_ref_id       BIGINT,
    p_company_ref_id      BIGINT DEFAULT NULL,
    p_retailer_ref_id     BIGINT DEFAULT NULL,
    p_rm_ref_id            BIGINT DEFAULT NULL,
    p_user_type            VARCHAR(50) DEFAULT NULL,

    p_from_date            DATE DEFAULT CURRENT_DATE,
    p_to_date              DATE DEFAULT CURRENT_DATE,

    p_status               VARCHAR(50) DEFAULT NULL,
    p_mode                 VARCHAR(50) DEFAULT NULL,
    p_search               VARCHAR(200) DEFAULT NULL,

    p_page                 INTEGER DEFAULT 1,
    p_limit                INTEGER DEFAULT 25,
    p_user_type_ref_id     BIGINT DEFAULT NULL
)
RETURNS TABLE (
    txn_id                VARCHAR(100),
    date_time             TIMESTAMPTZ,
    company               VARCHAR(500),
    retailer              VARCHAR(500),
    customer              VARCHAR(500),
    beneficiary           VARCHAR(500),
    account               VARCHAR(100),
    bank                  VARCHAR(500),
    ifsc                  VARCHAR(100),
    amount                NUMERIC(18,2),
    charge                NUMERIC(18,2),
    gst                   NUMERIC(18,2),
    debit                 NUMERIC(18,2),
    mode                  VARCHAR(100),
    utr                   VARCHAR(500),
    status                VARCHAR(100),
    vendor                VARCHAR(500),
    api_status            VARCHAR(100),
    api_response          TEXT,
    comments              VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset  INTEGER;
    v_from_dt TIMESTAMPTZ;
    v_to_dt   TIMESTAMPTZ;
BEGIN
    p_page := GREATEST(COALESCE(p_page, 1), 1);
    p_limit := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
    v_offset := (p_page - 1) * p_limit;

    -- Timezone handling: Default to Asia/Kolkata (IST: UTC+05:30) bounds
    v_from_dt := (COALESCE(p_from_date, CURRENT_DATE)::TEXT || ' 00:00:00+05:30')::TIMESTAMPTZ;
    v_to_dt   := (COALESCE(p_to_date, CURRENT_DATE)::TEXT || ' 23:59:59.999999+05:30')::TIMESTAMPTZ;

    RETURN QUERY
    SELECT
        pt.transaction_number::VARCHAR(100) AS txn_id,
        pt.created_date AS date_time,
        COALESCE(c.company_name, c.display_name, c.legal_name, 'Pay2Pay')::VARCHAR(500) AS company,
        COALESCE(r.store_name, r.legal_name, r.owner_name, 'Retailer')::VARCHAR(500) AS retailer,
        COALESCE(cu.full_name, 'Customer')::VARCHAR(500) AS customer,
        COALESCE(bm.account_holder_name, 'Beneficiary')::VARCHAR(500) AS beneficiary,
        CASE
            WHEN bm.account_number IS NULL THEN NULL
            WHEN LENGTH(bm.account_number) <= 4 THEN bm.account_number
            ELSE 'XXXXXX' || RIGHT(bm.account_number, 4)
        END::VARCHAR(100) AS account,
        COALESCE(bm.bank_name, '')::VARCHAR(500) AS bank,
        COALESCE(bm.ifsc_code, '')::VARCHAR(100) AS ifsc,
        COALESCE(t_amt.amount, 0.00)::NUMERIC(18,2) AS amount,
        COALESCE(t_chg.charge, 0.00)::NUMERIC(18,2) AS charge,
        COALESCE(t_gst.gst, 0.00)::NUMERIC(18,2) AS gst,
        (COALESCE(t_amt.amount, 0.00) + COALESCE(t_chg.charge, 0.00) + COALESCE(t_gst.gst, 0.00))::NUMERIC(18,2) AS debit,
        COALESCE(pt.mode, 'IMPS')::VARCHAR(100) AS mode,
        COALESCE(pt.utr_number, '')::VARCHAR(500) AS utr,
        COALESCE(pt.status, 'PENDING')::VARCHAR(100) AS status,
        COALESCE(pt.vendor_name, '')::VARCHAR(500) AS vendor,
        CASE
            WHEN UPPER(pt.status) = 'SUCCESS' THEN 'SUCCESS'
            WHEN UPPER(pt.status) = 'FAILED' THEN 'FAILED'
            WHEN UPPER(pt.status) = 'PENDING' THEN 'PENDING'
            WHEN UPPER(pt.status) = 'INITIATED' THEN 'REQUESTED'
            ELSE COALESCE(pt.api_response_code, 'NOT_CALLED')
        END::VARCHAR(100) AS api_status,
        COALESCE(pt.api_response, '')::TEXT AS api_response,
        CASE
            WHEN UPPER(pt.status) = 'SUCCESS' THEN 'Payout successful'
            WHEN UPPER(pt.status) = 'FAILED' THEN 'Payout failed - wallet reversed'
            WHEN UPPER(pt.status) = 'PENDING' THEN 'Payout pending - status check required'
            WHEN UPPER(pt.status) = 'INITIATED' THEN 'Payout initiated'
            ELSE 'Payout status updated'
        END::VARCHAR(500) AS comments
    FROM public.payout_transaction pt
    LEFT JOIN public.company c ON c.company_ref_id = pt.company_ref_id
    LEFT JOIN public.retailer r ON r.retailer_ref_id = pt.retailer_ref_id
    LEFT JOIN public.customer cu ON cu.customer_ref_id = pt.customer_ref_id
    LEFT JOIN public.beneficiary_master bm ON bm.beneficiary_master_ref_id = pt.beneficiary_master_ref_id
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(t.amount), 0.00) AS amount
        FROM public.transactions t
        WHERE t.txn_id = pt.transaction_number
          AND UPPER(t.entry_type) = 'DEBIT'
          AND (t.narration ILIKE '%Payout Amount%' OR t.narration = 'Payout Amount')
    ) t_amt ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(t.amount), 0.00) AS charge
        FROM public.transactions t
        WHERE t.txn_id = pt.transaction_number
          AND UPPER(t.entry_type) = 'DEBIT'
          AND (t.narration ILIKE '%Payout Charge%' OR t.narration ILIKE '%Charge%' OR t.narration ILIKE '%Fee%')
    ) t_chg ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(t.amount), 0.00) AS gst
        FROM public.transactions t
        WHERE t.txn_id = pt.transaction_number
          AND UPPER(t.entry_type) = 'DEBIT'
          AND (t.narration ILIKE '%GST%' OR t.narration = 'GST')
    ) t_gst ON true
    WHERE
        (p_tenant_ref_id IS NULL OR COALESCE(pt.tenant_ref_id, r.tenant_ref_id, 1) = p_tenant_ref_id OR pt.tenant_ref_id IS NULL)
        AND (pt.is_deleted IS NULL OR pt.is_deleted = FALSE)
        AND (pt.is_active IS NULL OR pt.is_active = TRUE)
        AND pt.created_date >= v_from_dt
        AND pt.created_date <= v_to_dt
        AND (p_company_ref_id IS NULL OR COALESCE(pt.company_ref_id, r.company_ref_id, 1) = p_company_ref_id OR pt.company_ref_id IS NULL)
        AND (p_retailer_ref_id IS NULL OR pt.retailer_ref_id = p_retailer_ref_id)
        AND (p_rm_ref_id IS NULL OR COALESCE(r.regional_manager_ref_id, 0) = p_rm_ref_id)
        AND (p_user_type_ref_id IS NULL OR pt.user_type_ref_id = p_user_type_ref_id)
        AND (p_user_type IS NULL OR p_user_type = 'ALL' OR UPPER(COALESCE(pt.user_type, 'RETAILER')) = UPPER(p_user_type))
        AND (p_status IS NULL OR p_status = 'ALL' OR UPPER(pt.status) = UPPER(p_status))
        AND (p_mode IS NULL OR p_mode = 'ALL' OR UPPER(pt.mode) = UPPER(p_mode))
        AND (
            p_search IS NULL
            OR pt.transaction_number ILIKE '%' || p_search || '%'
            OR pt.utr_number ILIKE '%' || p_search || '%'
            OR bm.account_holder_name ILIKE '%' || p_search || '%'
            OR cu.full_name ILIKE '%' || p_search || '%'
            OR r.store_name ILIKE '%' || p_search || '%'
            OR r.legal_name ILIKE '%' || p_search || '%'
            OR c.company_name ILIKE '%' || p_search || '%'
            OR c.display_name ILIKE '%' || p_search || '%'
        )
    ORDER BY pt.created_date DESC, pt.payout_transaction_ref_id DESC
    LIMIT p_limit
    OFFSET v_offset;
END;
$$;


-- =============================================================================
-- 2. GENERAL TRANSACTION REPORT STORED FUNCTION
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_transactions_report(BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, DATE, DATE, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_transactions_report(BIGINT, BIGINT, BIGINT, BIGINT, VARCHAR, DATE, DATE, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, BIGINT);

CREATE OR REPLACE FUNCTION public.get_transactions_report(
    p_tenant_ref_id       BIGINT,
    p_company_ref_id      BIGINT DEFAULT NULL,
    p_retailer_ref_id     BIGINT DEFAULT NULL,
    p_rm_ref_id            BIGINT DEFAULT NULL,
    p_user_type            VARCHAR(50) DEFAULT NULL,

    p_from_date            DATE DEFAULT CURRENT_DATE,
    p_to_date              DATE DEFAULT CURRENT_DATE,

    p_service              VARCHAR(100) DEFAULT NULL,
    p_wallet               VARCHAR(450) DEFAULT NULL,
    p_entry                VARCHAR(10) DEFAULT NULL,
    p_status               VARCHAR(100) DEFAULT NULL,

    p_search               VARCHAR(200) DEFAULT NULL,

    p_page                 INTEGER DEFAULT 1,
    p_limit                INTEGER DEFAULT 25,
    p_user_type_ref_id     BIGINT DEFAULT NULL
)
RETURNS TABLE (
    txn_id                VARCHAR(100),
    ref_id                VARCHAR(500),
    service               VARCHAR(100),
    wallet                VARCHAR(450),
    entry                 VARCHAR(10),
    amount                NUMERIC(18,2),
    opening_bal           NUMERIC(18,2),
    closing_bal           NUMERIC(18,2),
    description           VARCHAR(5000),
    date_time             TIMESTAMPTZ,
    status                VARCHAR(100),
    company               VARCHAR(500),
    retailer              VARCHAR(500),
    distributor           VARCHAR(500),
    sd                    VARCHAR(500),
    rm                    VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset  INTEGER;
    v_from_dt TIMESTAMPTZ;
    v_to_dt   TIMESTAMPTZ;
BEGIN
    p_page := GREATEST(COALESCE(p_page, 1), 1);
    p_limit := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
    v_offset := (p_page - 1) * p_limit;

    -- Timezone handling: Default to Asia/Kolkata (IST: UTC+05:30) bounds
    v_from_dt := (COALESCE(p_from_date, CURRENT_DATE)::TEXT || ' 00:00:00+05:30')::TIMESTAMPTZ;
    v_to_dt   := (COALESCE(p_to_date, CURRENT_DATE)::TEXT || ' 23:59:59.999999+05:30')::TIMESTAMPTZ;

    RETURN QUERY
    SELECT
        t.txn_id::VARCHAR(100) AS txn_id,
        COALESCE(t.ref_id, t.txn_id, '')::VARCHAR(500) AS ref_id,
        COALESCE(t.service_name, 'PAYOUT')::VARCHAR(100) AS service,
        COALESCE(t.wallet_type, 'MAIN')::VARCHAR(450) AS wallet,
        COALESCE(t.entry_type, 'DEBIT')::VARCHAR(10) AS entry,
        COALESCE(t.amount, 0.00)::NUMERIC(18,2) AS amount,
        COALESCE(t.balance_before, 0.00)::NUMERIC(18,2) AS opening_bal,
        COALESCE(t.balance_after, 0.00)::NUMERIC(18,2) AS closing_bal,
        COALESCE(t.narration, '')::VARCHAR(5000) AS description,
        t.created_at AS date_time,
        COALESCE(t.status, 'SUCCESS')::VARCHAR(100) AS status,
        COALESCE(c.company_name, c.display_name, c.legal_name, 'Pay2Pay')::VARCHAR(500) AS company,
        COALESCE(r.store_name, r.legal_name, t.retailer_name, r.owner_name, 'Retailer')::VARCHAR(500) AS retailer,
        COALESCE(t.dist_name, d.business_name, d.owner_name, '')::VARCHAR(500) AS distributor,
        COALESCE(t.sd_name, sd.business_name, sd.owner_name, '')::VARCHAR(500) AS sd,
        COALESCE(t.rm_name, rm.full_name, '')::VARCHAR(500) AS rm
    FROM public.transactions t
    LEFT JOIN public.retailer r ON r.retailer_ref_id = t.retailer_ref_id
    LEFT JOIN public.company c ON c.company_ref_id = COALESCE(t.company_ref_id, r.company_ref_id)
    LEFT JOIN public.distributor d ON d.distributor_ref_id = t.distributor_ref_id
    LEFT JOIN public.super_distributor sd ON sd.super_distributor_ref_id = t.super_distributor_ref_id
    LEFT JOIN public.regional_manager rm ON rm.regional_manager_ref_id = COALESCE(t.regional_manager_ref_id, r.regional_manager_ref_id)
    WHERE
        (p_tenant_ref_id IS NULL OR COALESCE(t.tenant_ref_id, r.tenant_ref_id, 1) = p_tenant_ref_id OR t.tenant_ref_id IS NULL)
        AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
        AND (t.is_active IS NULL OR t.is_active = TRUE)
        AND t.created_at >= v_from_dt
        AND t.created_at <= v_to_dt
        AND (p_company_ref_id IS NULL OR COALESCE(t.company_ref_id, r.company_ref_id, 1) = p_company_ref_id OR t.company_ref_id IS NULL)
        AND (p_retailer_ref_id IS NULL OR t.retailer_ref_id = p_retailer_ref_id)
        AND (p_rm_ref_id IS NULL OR COALESCE(t.regional_manager_ref_id, r.regional_manager_ref_id) = p_rm_ref_id)
        AND (p_user_type_ref_id IS NULL OR t.user_type_ref_id = p_user_type_ref_id)
        AND (p_user_type IS NULL OR p_user_type = 'ALL' OR UPPER(COALESCE(t.user_type, 'RETAILER')) = UPPER(p_user_type))
        AND (p_service IS NULL OR p_service = 'ALL' OR UPPER(t.service_name) = UPPER(p_service))
        AND (p_wallet IS NULL OR p_wallet = 'ALL' OR UPPER(COALESCE(t.wallet_type, 'MAIN')) = UPPER(p_wallet))
        AND (p_entry IS NULL OR p_entry = 'ALL' OR UPPER(t.entry_type) = UPPER(p_entry) OR (UPPER(p_entry) = 'CR' AND UPPER(t.entry_type) = 'CREDIT') OR (UPPER(p_entry) = 'DR' AND UPPER(t.entry_type) = 'DEBIT'))
        AND (p_status IS NULL OR p_status = 'ALL' OR UPPER(t.status) = UPPER(p_status))
        AND (
            p_search IS NULL
            OR t.txn_id ILIKE '%' || p_search || '%'
            OR t.ref_id ILIKE '%' || p_search || '%'
            OR t.service_name ILIKE '%' || p_search || '%'
            OR t.narration ILIKE '%' || p_search || '%'
            OR t.retailer_name ILIKE '%' || p_search || '%'
            OR r.store_name ILIKE '%' || p_search || '%'
            OR r.legal_name ILIKE '%' || p_search || '%'
            OR c.company_name ILIKE '%' || p_search || '%'
        )
    ORDER BY t.created_at DESC, t.transactions_ref_id DESC
    LIMIT p_limit
    OFFSET v_offset;
END;
$$;
