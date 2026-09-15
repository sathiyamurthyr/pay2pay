-- ==============================================================================
-- CONSOLIDATED TRANSACTION RECONCILIATION SCHEMA & STORED PROCEDURES
-- Pay2Pay Enterprise Transaction Platform
-- ==============================================================================

-- 1. Batch Table
CREATE TABLE IF NOT EXISTS public.txn_reconciliation_batch (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    batch_number VARCHAR(64) NOT NULL UNIQUE,
    vendor_code VARCHAR(50) NOT NULL,
    vendor_name VARCHAR(100) NOT NULL,
    service_name VARCHAR(50) NOT NULL DEFAULT 'ALL',
    report_date DATE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    file_b2_storage_key VARCHAR(500) NOT NULL,
    file_b2_url TEXT NOT NULL,
    column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
    error_message TEXT NULL,

    -- Dynamic KPI Metrics
    total_vendor_records INT NOT NULL DEFAULT 0,
    total_internal_records INT NOT NULL DEFAULT 0,
    matched_records INT NOT NULL DEFAULT 0,
    amount_mismatch_records INT NOT NULL DEFAULT 0,
    status_mismatch_records INT NOT NULL DEFAULT 0,
    missing_in_internal_records INT NOT NULL DEFAULT 0,
    missing_in_vendor_records INT NOT NULL DEFAULT 0,
    duplicate_vendor_records INT NOT NULL DEFAULT 0,
    invalid_vendor_records INT NOT NULL DEFAULT 0,
    pending_review_records INT NOT NULL DEFAULT 0,

    -- Financial Breakdown
    vendor_total_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    internal_total_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    matched_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    amount_difference NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    vendor_success_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    vendor_failed_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    vendor_pending_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    internal_success_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    internal_failed_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    internal_pending_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,

    -- Multi-tenant & Metadata
    tenant_id UUID NOT NULL DEFAULT '547aa7bb-a790-4fe2-bd5b-27214ed176c8'::uuid,
    company_id UUID NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_trb_batch_number ON public.txn_reconciliation_batch(batch_number);
CREATE INDEX IF NOT EXISTS idx_trb_vendor_code ON public.txn_reconciliation_batch(vendor_code);
CREATE INDEX IF NOT EXISTS idx_trb_service_name ON public.txn_reconciliation_batch(service_name);
CREATE INDEX IF NOT EXISTS idx_trb_report_date ON public.txn_reconciliation_batch(report_date);
CREATE INDEX IF NOT EXISTS idx_trb_status ON public.txn_reconciliation_batch(status);
CREATE INDEX IF NOT EXISTS idx_trb_uploaded_at ON public.txn_reconciliation_batch(uploaded_at DESC);


-- 2. Staging Table (Raw parsed rows from vendor report)
CREATE TABLE IF NOT EXISTS public.txn_reconciliation_staging (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES public.txn_reconciliation_batch(id) ON DELETE CASCADE,
    row_index INT NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    vendor_txn_id VARCHAR(100) NULL,
    amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL,
    normalized_status VARCHAR(30) NOT NULL,
    utr VARCHAR(100) NULL,
    service VARCHAR(50) NULL,
    retailer_id VARCHAR(100) NULL,
    transaction_date TIMESTAMPTZ NULL,
    payment_mode VARCHAR(50) NULL,
    currency VARCHAR(10) NULL DEFAULT 'INR',
    response_code VARCHAR(50) NULL,
    response_message TEXT NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    occurrence_count INT NOT NULL DEFAULT 1,
    validation_error TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_trs_batch_id ON public.txn_reconciliation_staging(batch_id);
CREATE INDEX IF NOT EXISTS idx_trs_batch_txn ON public.txn_reconciliation_staging(batch_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_trs_is_duplicate ON public.txn_reconciliation_staging(batch_id, is_duplicate);


-- 3. Results Table (Consolidated Two-Way Comparison Output)
CREATE TABLE IF NOT EXISTS public.txn_reconciliation_result (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    batch_id BIGINT NOT NULL REFERENCES public.txn_reconciliation_batch(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) NOT NULL,
    recon_status VARCHAR(50) NOT NULL,
    -- Statuses: 'MATCHED', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'MISSING_IN_INTERNAL', 'MISSING_IN_VENDOR', 'DUPLICATE_VENDOR_TRANSACTION', 'INVALID_VENDOR_TRANSACTION', 'DATA_MISMATCH'

    -- Vendor Side
    vendor_amount NUMERIC(18,2) NULL,
    vendor_status VARCHAR(50) NULL,
    vendor_utr VARCHAR(100) NULL,
    vendor_txn_id VARCHAR(100) NULL,
    vendor_service VARCHAR(50) NULL,
    vendor_retailer VARCHAR(100) NULL,
    vendor_date TIMESTAMPTZ NULL,
    vendor_payload JSONB NULL,

    -- Internal Side
    internal_amount NUMERIC(18,2) NULL,
    internal_status VARCHAR(50) NULL,
    internal_utr VARCHAR(100) NULL,
    internal_ref_id VARCHAR(100) NULL,
    internal_service VARCHAR(50) NULL,
    internal_retailer_id VARCHAR(100) NULL,
    internal_retailer_name VARCHAR(255) NULL,
    internal_date TIMESTAMPTZ NULL,
    internal_payload JSONB NULL,

    -- Variances & Discrepancies
    amount_difference NUMERIC(18,2) NOT NULL DEFAULT 0.00, -- Vendor Amount - Internal Amount
    is_exception BOOLEAN NOT NULL DEFAULT FALSE,
    exception_category VARCHAR(50) NULL,
    mismatch_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended_action TEXT NULL,

    -- Manual Review (No automatic wallet or status mutations)
    review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'REVIEWED', 'RESOLVED', 'IGNORED'
    reviewed_by VARCHAR(100) NULL,
    reviewed_at TIMESTAMPTZ NULL,
    review_remarks TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_trr_batch_id ON public.txn_reconciliation_result(batch_id);
CREATE INDEX IF NOT EXISTS idx_trr_transaction_id ON public.txn_reconciliation_result(transaction_id);
CREATE INDEX IF NOT EXISTS idx_trr_recon_status ON public.txn_reconciliation_result(batch_id, recon_status);
CREATE INDEX IF NOT EXISTS idx_trr_is_exception ON public.txn_reconciliation_result(batch_id, is_exception);
CREATE INDEX IF NOT EXISTS idx_trr_review_status ON public.txn_reconciliation_result(batch_id, review_status);


-- 4. Vendor Column & Status Configuration Table
CREATE TABLE IF NOT EXISTS public.txn_vendor_column_config (
    id BIGSERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(100) NOT NULL,
    service_name VARCHAR(50) NOT NULL DEFAULT 'ALL',
    column_mapping JSONB NOT NULL,
    status_mapping JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-seed known vendor configurations
INSERT INTO public.txn_vendor_column_config (vendor_code, vendor_name, service_name, column_mapping, status_mapping)
VALUES
(
    'CASHFREE',
    'Cashfree Payments',
    'ALL',
    '{
        "transaction_id": ["transferId", "referenceId", "Transfer ID", "Reference ID", "transaction_id"],
        "vendor_txn_id": ["utr", "cfTransferId", "UTR", "Bank Reference"],
        "amount": ["amount", "Transfer Amount", "Amount"],
        "status": ["status", "Transfer Status", "Status"],
        "utr": ["utr", "UTR", "Bank UTR"],
        "transaction_date": ["addedOn", "Created Date", "Date"]
    }'::jsonb,
    '{
        "SUCCESS": ["SUCCESS", "SUCCESSFUL", "TRANSFER_SUCCESS", "PAID"],
        "FAILED": ["FAILED", "FAILURE", "TRANSFER_FAILED", "REJECTED"],
        "PENDING": ["PENDING", "PROCESSING", "RECEIVED", "INITIATED", "IN_PROGRESS"]
    }'::jsonb
),
(
    'URBANRUPEE',
    'UrbanRupee Payout',
    'ALL',
    '{
        "transaction_id": ["order_id", "client_ref_id", "Order ID", "Txn ID", "transaction_id"],
        "vendor_txn_id": ["ur_txn_id", "urbanrupee_id", "Vendor Ref"],
        "amount": ["amount", "txn_amount", "Amount"],
        "status": ["status", "txn_status", "Status"],
        "utr": ["rrn", "utr", "RRN", "UTR"],
        "transaction_date": ["created_at", "Date Time", "txn_date"]
    }'::jsonb,
    '{
        "SUCCESS": ["SUCCESS", "SUCCESSFUL", "COMPLETED", "SETTLED"],
        "FAILED": ["FAILED", "FAILURE", "ERROR", "REJECTED"],
        "PENDING": ["PENDING", "PROCESSING", "SUBMITTED", "QUEUED"]
    }'::jsonb
),
(
    'BULKPE',
    'BulkPe Gateway',
    'ALL',
    '{
        "transaction_id": ["client_reference_id", "txn_id", "Reference ID", "transaction_id"],
        "vendor_txn_id": ["bulkpe_reference_id", "order_id", "Order ID"],
        "amount": ["amount", "order_amount", "Amount"],
        "status": ["status", "payment_status", "Status"],
        "utr": ["utr", "bank_rrn", "UTR"],
        "transaction_date": ["created_at", "Date", "Timestamp"]
    }'::jsonb,
    '{
        "SUCCESS": ["SUCCESS", "SUCCESSFUL", "COMPLETED"],
        "FAILED": ["FAILED", "REJECTED", "CANCELLED"],
        "PENDING": ["PENDING", "PROCESSING", "INITIATED"]
    }'::jsonb
),
(
    'MSWIPE',
    'Mswipe POS / UPI',
    'ALL',
    '{
        "transaction_id": ["orig_txn_id", "stan_no", "Transaction ID", "Txn Ref", "transaction_id"],
        "vendor_txn_id": ["rrn", "rr_number", "RRN"],
        "amount": ["amount", "txn_amount", "Amount"],
        "status": ["status", "response_status", "Status"],
        "utr": ["rrn", "utr", "RRN"],
        "transaction_date": ["txn_date_time", "Date", "DateTime"]
    }'::jsonb,
    '{
        "SUCCESS": ["APPROVED", "SUCCESS", "SUCCESSFUL"],
        "FAILED": ["DECLINED", "FAILED", "REJECTED", "ERROR"],
        "PENDING": ["PENDING", "IN_PROCESS"]
    }'::jsonb
),
(
    'PAYU',
    'PayU Payments',
    'ALL',
    '{
        "transaction_id": ["txnid", "merchant_txn_id", "Transaction ID"],
        "vendor_txn_id": ["payu_id", "mihpayid", "PayU ID"],
        "amount": ["amount", "net_amount_debit", "Amount"],
        "status": ["status", "payment_status", "Status"],
        "utr": ["bank_ref_num", "bank_arn", "Bank Reference", "UTR"],
        "transaction_date": ["addedon", "created_date", "Date"]
    }'::jsonb,
    '{
        "SUCCESS": ["SUCCESS", "SUCCESSFUL", "CAPTURED"],
        "FAILED": ["FAILED", "FAILURE", "BOUNCED", "DROPPED"],
        "PENDING": ["PENDING", "IN_PROGRESS"]
    }'::jsonb
),
(
    'UTKALDIGITAL',
    'Utkal Digital',
    'ALL',
    '{
        "transaction_id": ["client_id", "txn_id", "Reference ID", "transaction_id"],
        "vendor_txn_id": ["utkal_id", "operator_id", "Vendor ID"],
        "amount": ["amount", "recharge_amount", "Amount"],
        "status": ["status", "txn_status", "Status"],
        "utr": ["operator_ref", "utr", "Ref Number"],
        "transaction_date": ["created_at", "txn_date", "Date"]
    }'::jsonb,
    '{
        "SUCCESS": ["SUCCESS", "SUCCESSFUL", "DONE"],
        "FAILED": ["FAILED", "FAILURE", "REJECTED"],
        "PENDING": ["PENDING", "PROCESSING"]
    }'::jsonb
),
(
    'GENERIC_VENDOR',
    'Generic / Custom Vendor',
    'ALL',
    '{
        "transaction_id": ["Transaction ID", "Txn ID", "transaction_id", "order_id", "Reference ID", "Ref No"],
        "vendor_txn_id": ["Vendor Ref", "Vendor Txn ID", "Order ID", "vendor_ref"],
        "amount": ["Amount", "Txn Amount", "amount", "Value"],
        "status": ["Status", "Txn Status", "status", "State"],
        "utr": ["UTR", "RRN", "utr", "rrn", "Bank Reference"],
        "service": ["Service", "Service Name", "service"],
        "retailer_id": ["Retailer ID", "Retailer Code", "retailer_id"],
        "transaction_date": ["Date", "Transaction Date", "Created Date", "Date Time", "created_at"]
    }'::jsonb,
    '{
        "SUCCESS": ["SUCCESS", "SUCCESSFUL", "APPROVED", "COMPLETED", "SETTLED", "PAID", "DONE"],
        "FAILED": ["FAILED", "FAILURE", "DECLINED", "REJECTED", "ERROR", "CANCELLED"],
        "PENDING": ["PENDING", "PROCESSING", "IN_PROGRESS", "QUEUED", "INITIATED", "SUBMITTED"]
    }'::jsonb
)
ON CONFLICT (vendor_code) DO NOTHING;


-- 5. Audit Table
CREATE TABLE IF NOT EXISTS public.txn_reconciliation_audit (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES public.txn_reconciliation_batch(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) NULL,
    admin_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_state TEXT NULL,
    new_state TEXT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tra_batch_id ON public.txn_reconciliation_audit(batch_id);


-- ==============================================================================
-- 6. STORED PROCEDURE: sp_process_transaction_reconciliation
-- High-performance set-based two-way reconciliation engine
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sp_process_transaction_reconciliation(p_batch_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $sp$
DECLARE
    v_batch RECORD;
    v_from_ts TIMESTAMPTZ;
    v_to_ts TIMESTAMPTZ;
    v_vendor_code VARCHAR(50);
    v_service VARCHAR(50);
    v_result JSONB;
BEGIN
    -- 1. Fetch and lock batch record
    SELECT * INTO v_batch
    FROM public.txn_reconciliation_batch
    WHERE id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reconciliation batch ID % not found', p_batch_id;
    END IF;

    -- Update batch status to PROCESSING
    UPDATE public.txn_reconciliation_batch
    SET status = 'PROCESSING', error_message = NULL
    WHERE id = p_batch_id;

    -- Clean any previous results for this batch
    DELETE FROM public.txn_reconciliation_result WHERE batch_id = p_batch_id;

    -- 2. Establish Time Window in IST (UTC+05:30)
    v_from_ts := (v_batch.report_date::TEXT || ' 00:00:00+05:30')::TIMESTAMPTZ;
    v_to_ts   := (v_batch.report_date::TEXT || ' 23:59:59.999999+05:30')::TIMESTAMPTZ;
    v_vendor_code := UPPER(TRIM(v_batch.vendor_code));
    v_service     := UPPER(TRIM(v_batch.service_name));

    -- 3. Execute High-Performance Set-Based Two-Way Reconciliation
    WITH internal_txns AS (
        -- Consolidate internal transactions from public.transactions and service enrichments
        SELECT
            t.txn_id AS internal_txn_id,
            COALESCE(t.ref_id, '') AS internal_ref_id,
            t.amount AS internal_amount,
            UPPER(TRIM(t.status)) AS internal_status,
            COALESCE(
                pt.utr_number,
                pt.bank_reference,
                rt.operator_ref,
                t.ref_id,
                ''
            ) AS internal_utr,
            t.service_name AS internal_service,
            COALESCE(t.retailer_id::TEXT, r.retailer_code, '') AS internal_retailer_id,
            COALESCE(r.store_name, t.retailer_name, '') AS internal_retailer_name,
            t.created_at AS internal_date,
            jsonb_build_object(
                'entry_type', t.entry_type,
                'wallet_type', t.wallet_type,
                'narration', t.narration,
                'balance_before', t.balance_before,
                'balance_after', t.balance_after
            ) AS internal_payload
        FROM public.transactions t
        LEFT JOIN public.retailer r ON r.public_id = t.retailer_id OR r.retailer_ref_id = t.user_ref_id
        LEFT JOIN public.payout_transaction pt ON pt.transaction_number = t.txn_id
        LEFT JOIN public.recharge_transactions rt ON rt.transaction_id = t.txn_id
        WHERE (t.is_deleted IS NULL OR t.is_deleted = FALSE)
          AND t.created_at >= v_from_ts
          AND t.created_at <= v_to_ts
          AND (v_service = 'ALL' OR UPPER(t.service_name) = v_service)
          -- Match vendor if specific vendor is specified
          AND (
              v_vendor_code = 'GENERIC_VENDOR'
              OR v_vendor_code = 'ALL'
              OR UPPER(COALESCE(t.vendor_name, '')) = v_vendor_code
              OR UPPER(COALESCE(pt.vendor_name, '')) = v_vendor_code
          )
    ),
    vendor_staging AS (
        SELECT
            s.id AS staging_id,
            s.row_index,
            s.transaction_id AS vendor_txn_id,
            s.vendor_txn_id AS vendor_secondary_ref,
            s.amount AS vendor_amount,
            s.status AS vendor_raw_status,
            s.normalized_status AS vendor_status,
            s.utr AS vendor_utr,
            s.service AS vendor_service,
            s.retailer_id AS vendor_retailer,
            s.transaction_date AS vendor_date,
            s.raw_data AS vendor_payload,
            s.is_duplicate,
            s.occurrence_count,
            s.validation_error
        FROM public.txn_reconciliation_staging s
        WHERE s.batch_id = p_batch_id
    ),
    reconciliation_matched AS (
        SELECT
            COALESCE(v.vendor_txn_id, i.internal_txn_id) AS transaction_id,
            
            -- Recon Status Logic
            CASE
                -- Duplicate in Vendor File
                WHEN v.is_duplicate = TRUE THEN 'DUPLICATE_VENDOR_TRANSACTION'
                -- Invalid Row in Vendor File
                WHEN v.validation_error IS NOT NULL THEN 'INVALID_VENDOR_TRANSACTION'
                -- Missing in Internal Ledger
                WHEN i.internal_txn_id IS NULL THEN 'MISSING_IN_INTERNAL'
                -- Missing in Vendor Report
                WHEN v.vendor_txn_id IS NULL THEN 'MISSING_IN_VENDOR'
                -- Both exist: Compare Amount and Status
                WHEN v.vendor_amount <> i.internal_amount AND v.vendor_status <> i.internal_status THEN 'AMOUNT_MISMATCH'
                WHEN v.vendor_amount <> i.internal_amount THEN 'AMOUNT_MISMATCH'
                WHEN v.vendor_status <> i.internal_status THEN 'STATUS_MISMATCH'
                ELSE 'MATCHED'
            END AS recon_status,

            -- Vendor Values
            v.vendor_amount,
            v.vendor_status,
            v.vendor_utr,
            v.vendor_secondary_ref AS vendor_ref_id,
            v.vendor_service,
            v.vendor_retailer,
            v.vendor_date,
            v.vendor_payload,

            -- Internal Values
            i.internal_amount,
            i.internal_status,
            i.internal_utr,
            i.internal_ref_id,
            i.internal_service,
            i.internal_retailer_id,
            i.internal_retailer_name,
            i.internal_date,
            i.internal_payload,

            -- Amount difference (Vendor - Internal)
            COALESCE(v.vendor_amount, 0.00) - COALESCE(i.internal_amount, 0.00) AS amount_difference,

            -- Exception Flag
            CASE
                WHEN v.is_duplicate = TRUE THEN TRUE
                WHEN v.validation_error IS NOT NULL THEN TRUE
                WHEN i.internal_txn_id IS NULL THEN TRUE
                WHEN v.vendor_txn_id IS NULL THEN TRUE
                WHEN v.vendor_amount <> i.internal_amount THEN TRUE
                WHEN v.vendor_status <> i.internal_status THEN TRUE
                ELSE FALSE
            END AS is_exception,

            -- Exception Category
            CASE
                WHEN v.is_duplicate = TRUE THEN 'DUPLICATE'
                WHEN v.validation_error IS NOT NULL THEN 'INVALID DATA'
                WHEN i.internal_txn_id IS NULL THEN 'MISSING_IN_INTERNAL'
                WHEN v.vendor_txn_id IS NULL THEN 'MISSING_IN_VENDOR'
                WHEN v.vendor_amount <> i.internal_amount THEN 'AMOUNT_MISMATCH'
                WHEN v.vendor_status <> i.internal_status THEN 'STATUS_MISMATCH'
                ELSE NULL
            END AS exception_category,

            -- Mismatch Details JSON
            jsonb_build_object(
                'amount_diff', COALESCE(v.vendor_amount, 0.00) - COALESCE(i.internal_amount, 0.00),
                'vendor_status', v.vendor_status,
                'internal_status', i.internal_status,
                'vendor_amount', v.vendor_amount,
                'internal_amount', i.internal_amount,
                'occurrence_count', COALESCE(v.occurrence_count, 1),
                'validation_error', v.validation_error
            ) AS mismatch_details,

            -- Recommended Action for Admin Review
            CASE
                WHEN v.is_duplicate = TRUE THEN 'Review duplicate file records and investigate vendor transmission log'
                WHEN v.validation_error IS NOT NULL THEN 'Correct file format, missing required fields or invalid values and re-upload'
                WHEN i.internal_txn_id IS NULL THEN 'Verify if transaction was created offline or via alternate gateway; manual intake required'
                WHEN v.vendor_txn_id IS NULL THEN 'Check with vendor gateway why internal transaction was omitted from their settlement report'
                WHEN v.vendor_amount <> i.internal_amount THEN 'Investigate MDR, convenience fee, or partial settlement discrepancy'
                WHEN v.vendor_status <> i.internal_status THEN 'Use Transaction Status Update workflow to update transaction after verifying vendor proof'
                ELSE 'Reconciliation passed; no action needed'
            END AS recommended_action

        FROM vendor_staging v
        FULL OUTER JOIN internal_txns i
            ON v.vendor_txn_id = i.internal_txn_id
    )
    INSERT INTO public.txn_reconciliation_result (
        batch_id,
        transaction_id,
        recon_status,
        vendor_amount,
        vendor_status,
        vendor_utr,
        vendor_txn_id,
        vendor_service,
        vendor_retailer,
        vendor_date,
        vendor_payload,
        internal_amount,
        internal_status,
        internal_utr,
        internal_ref_id,
        internal_service,
        internal_retailer_id,
        internal_retailer_name,
        internal_date,
        internal_payload,
        amount_difference,
        is_exception,
        exception_category,
        mismatch_details,
        recommended_action
    )
    SELECT
        p_batch_id,
        rm.transaction_id,
        rm.recon_status,
        rm.vendor_amount,
        rm.vendor_status,
        rm.vendor_utr,
        rm.vendor_ref_id,
        rm.vendor_service,
        rm.vendor_retailer,
        rm.vendor_date,
        rm.vendor_payload,
        rm.internal_amount,
        rm.internal_status,
        rm.internal_utr,
        rm.internal_ref_id,
        rm.internal_service,
        rm.internal_retailer_id,
        rm.internal_retailer_name,
        rm.internal_date,
        rm.internal_payload,
        rm.amount_difference,
        rm.is_exception,
        rm.exception_category,
        rm.mismatch_details,
        rm.recommended_action
    FROM reconciliation_matched rm;

    -- 4. Calculate Summary Aggregates and Update Batch Record
    WITH batch_metrics AS (
        SELECT
            COUNT(CASE WHEN r.vendor_amount IS NOT NULL THEN 1 END) AS total_vendor,
            COUNT(CASE WHEN r.internal_amount IS NOT NULL THEN 1 END) AS total_internal,
            COUNT(CASE WHEN r.recon_status = 'MATCHED' THEN 1 END) AS matched_count,
            COUNT(CASE WHEN r.recon_status = 'AMOUNT_MISMATCH' THEN 1 END) AS amount_mismatch_count,
            COUNT(CASE WHEN r.recon_status = 'STATUS_MISMATCH' THEN 1 END) AS status_mismatch_count,
            COUNT(CASE WHEN r.recon_status = 'MISSING_IN_INTERNAL' THEN 1 END) AS missing_internal_count,
            COUNT(CASE WHEN r.recon_status = 'MISSING_IN_VENDOR' THEN 1 END) AS missing_vendor_count,
            COUNT(CASE WHEN r.recon_status = 'DUPLICATE_VENDOR_TRANSACTION' THEN 1 END) AS duplicate_count,
            COUNT(CASE WHEN r.recon_status = 'INVALID_VENDOR_TRANSACTION' THEN 1 END) AS invalid_count,
            COUNT(CASE WHEN r.is_exception = TRUE THEN 1 END) AS pending_review_count,

            COALESCE(SUM(r.vendor_amount), 0.00) AS sum_vendor_amount,
            COALESCE(SUM(r.internal_amount), 0.00) AS sum_internal_amount,
            COALESCE(SUM(CASE WHEN r.recon_status = 'MATCHED' THEN r.vendor_amount ELSE 0.00 END), 0.00) AS sum_matched_amount,
            COALESCE(SUM(r.amount_difference), 0.00) AS sum_amount_diff,

            COALESCE(SUM(CASE WHEN r.vendor_status = 'SUCCESS' THEN r.vendor_amount ELSE 0.00 END), 0.00) AS vendor_success_amt,
            COALESCE(SUM(CASE WHEN r.vendor_status = 'FAILED' THEN r.vendor_amount ELSE 0.00 END), 0.00) AS vendor_failed_amt,
            COALESCE(SUM(CASE WHEN r.vendor_status = 'PENDING' THEN r.vendor_amount ELSE 0.00 END), 0.00) AS vendor_pending_amt,

            COALESCE(SUM(CASE WHEN r.internal_status = 'SUCCESS' THEN r.internal_amount ELSE 0.00 END), 0.00) AS internal_success_amt,
            COALESCE(SUM(CASE WHEN r.internal_status = 'FAILED' THEN r.internal_amount ELSE 0.00 END), 0.00) AS internal_failed_amt,
            COALESCE(SUM(CASE WHEN r.internal_status = 'PENDING' THEN r.internal_amount ELSE 0.00 END), 0.00) AS internal_pending_amt
        FROM public.txn_reconciliation_result r
        WHERE r.batch_id = p_batch_id
    )
    UPDATE public.txn_reconciliation_batch b
    SET
        status = 'COMPLETED',
        completed_at = NOW(),
        total_vendor_records = m.total_vendor,
        total_internal_records = m.total_internal,
        matched_records = m.matched_count,
        amount_mismatch_records = m.amount_mismatch_count,
        status_mismatch_records = m.status_mismatch_count,
        missing_in_internal_records = m.missing_internal_count,
        missing_in_vendor_records = m.missing_vendor_count,
        duplicate_vendor_records = m.duplicate_count,
        invalid_vendor_records = m.invalid_count,
        pending_review_records = m.pending_review_count,

        vendor_total_amount = m.sum_vendor_amount,
        internal_total_amount = m.sum_internal_amount,
        matched_amount = m.sum_matched_amount,
        amount_difference = m.sum_amount_diff,

        vendor_success_amount = m.vendor_success_amt,
        vendor_failed_amount = m.vendor_failed_amt,
        vendor_pending_amount = m.vendor_pending_amt,

        internal_success_amount = m.internal_success_amt,
        internal_failed_amount = m.internal_failed_amt,
        internal_pending_amount = m.internal_pending_amt
    FROM batch_metrics m
    WHERE b.id = p_batch_id;

    -- 5. Record Audit Entry
    INSERT INTO public.txn_reconciliation_audit (
        batch_id,
        transaction_id,
        admin_id,
        action,
        previous_state,
        new_state,
        remarks
    )
    VALUES (
        p_batch_id,
        NULL,
        v_batch.uploaded_by,
        'RECONCILIATION_COMPLETED',
        'PROCESSING',
        'COMPLETED',
        'Set-based two-way reconciliation finished successfully.'
    );

    -- Build return response
    SELECT jsonb_build_object(
        'batch_id', b.id,
        'batch_number', b.batch_number,
        'status', b.status,
        'total_vendor_records', b.total_vendor_records,
        'total_internal_records', b.total_internal_records,
        'matched_records', b.matched_records,
        'amount_mismatch_records', b.amount_mismatch_records,
        'status_mismatch_records', b.status_mismatch_records,
        'missing_in_internal_records', b.missing_in_internal_records,
        'missing_in_vendor_records', b.missing_in_vendor_records,
        'duplicate_vendor_records', b.duplicate_vendor_records,
        'vendor_total_amount', b.vendor_total_amount,
        'internal_total_amount', b.internal_total_amount,
        'matched_amount', b.matched_amount
    ) INTO v_result
    FROM public.txn_reconciliation_batch b
    WHERE b.id = p_batch_id;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- On unexpected failure, update batch status to FAILED with error message
    UPDATE public.txn_reconciliation_batch
    SET status = 'FAILED', error_message = SQLERRM, completed_at = NOW()
    WHERE id = p_batch_id;

    RAISE;
END;
$sp$;
