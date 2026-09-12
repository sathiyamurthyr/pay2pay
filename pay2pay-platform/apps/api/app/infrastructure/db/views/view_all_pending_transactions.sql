-- ==============================================================================
-- VIEW: public.view_all_pending_transactions
-- Description: Aggregates strictly pending/processing transactions across all services
--              (Payout, Recharge, DMT, AEPS) with dynamic vendor resolution,
--              real-time wallet impact calculation, and exclusion of draft/reversed records.
-- ==============================================================================

CREATE OR REPLACE VIEW public.view_all_pending_transactions AS
WITH txn_agg AS (
    SELECT t.txn_id,
        COALESCE(sum(
            CASE
                WHEN upper(t.entry_type::text) = 'CREDIT'::text THEN t.amount
                ELSE 0::numeric
            END), 0::numeric) AS total_cr,
        COALESCE(sum(
            CASE
                WHEN upper(t.entry_type::text) = 'DEBIT'::text THEN t.amount
                ELSE 0::numeric
            END), 0::numeric) AS total_dr,
        COALESCE(sum(
            CASE
                WHEN t.narration::text ~~* '%Commission%'::text THEN t.amount
                ELSE 0::numeric
            END), 0::numeric) AS total_comm,
        COALESCE(sum(
            CASE
                WHEN t.narration::text ~~* '%GST%'::text THEN t.amount
                ELSE 0::numeric
            END), 0::numeric) AS total_gst,
        COALESCE(sum(
            CASE
                WHEN t.narration::text ~~* '%Charge%'::text THEN t.amount
                ELSE 0::numeric
            END), 0::numeric) AS total_charge,
        COALESCE(sum(
            CASE
                WHEN t.narration::text ~~* '%Payout Amount%'::text OR t.narration::text ~~* '%Recharge Amount%'::text THEN t.amount
                ELSE 0::numeric
            END), 0::numeric) AS base_txn_amount,
        max(t.balance_before) AS bal_before,
        min(t.balance_after) AS bal_after,
        max(t.created_at) AS max_created_at
    FROM transactions t
    GROUP BY t.txn_id
), all_pending AS (
    -- 1. PAYOUT TRANSACTIONS
    SELECT pt.transaction_number AS transaction_id,
        COALESCE(NULLIF(pt.gateway_reference::text, ''::text), pt.transaction_number::text) AS external_txn_id,
        'PAYOUT'::character varying(50) AS service,
        COALESCE(
            NULLIF(REPLACE(TRIM(REGEXP_REPLACE(COALESCE(pgc_id.provider_name, pgc_name.provider_name), '(?i)\s*(payout|api|gateway).*$', '')), ' ', ''), ''),
            NULLIF(COALESCE(pgc_id.provider_code, pgc_name.provider_code), ''),
            NULLIF(pt.vendor_name, 'Commercial Bank'),
            'Payout Gateway'
        )::character varying AS vendor,
        pt.retailer_id::text AS retailer_id,
        r.retailer_code,
        COALESCE(r.store_name, pt.retailer_id::text::character varying) AS retailer_name,
        rc.mobile AS retailer_mobile,
        pt.company_id,
        pt.tenant_id,
        COALESCE(NULLIF(t_agg.base_txn_amount, 0::numeric)::double precision, pwt.amount, t_agg.total_dr::double precision, 0.00::double precision)::numeric(18,2) AS transaction_amount,
        t_agg.total_cr::numeric(18,2) AS cr_amount,
        t_agg.total_dr::numeric(18,2) AS dr_amount,
        t_agg.total_comm::numeric(18,2) AS commission,
        t_agg.total_gst::numeric(18,2) AS gst,
        t_agg.total_charge::numeric(18,2) AS service_charge,
        t_agg.total_dr::numeric(18,2) AS net_wallet_debit,
        t_agg.bal_before::numeric(18,2) AS balance_before,
        t_agg.bal_after::numeric(18,2) AS balance_after,
        pt.created_date AS created_at,
        COALESCE(pt.updated_date, pt.created_date) AS updated_at,
        pt.status AS current_status,
        pt.bank_reference AS vendor_ref,
        pt.status AS provider_status,
        COALESCE(pt.api_response, pt.vendor_response, pt.error_message::text) AS provider_response,
        COALESCE(pt.utr_number, pt.bank_reference) AS utr,
        pt.rrn,
        false AS is_reversed
    FROM payout_transaction pt
        LEFT JOIN payout_workflow_transactions pwt ON pwt.transaction_number::text = pt.transaction_number::text
        LEFT JOIN txn_agg t_agg ON t_agg.txn_id::text = pt.transaction_number::text
        LEFT JOIN retailer r ON r.public_id = pt.retailer_id OR r.retailer_code::text = pt.retailer_id::text
        LEFT JOIN retailer_contact rc ON rc.retailer_id = r.public_id OR rc.retailer_id = pt.retailer_id
        LEFT JOIN payout_gateway_configs pgc_id ON pgc_id.id = pt.vendor_id
        LEFT JOIN payout_gateway_configs pgc_name ON (
            UPPER(REPLACE(pgc_name.provider_code, ' ', '')) = UPPER(REPLACE(COALESCE(pt.vendor_name, ''), ' ', ''))
            OR UPPER(REPLACE(REGEXP_REPLACE(pgc_name.provider_name, '(?i)\s*(payout|api|gateway).*$', ''), ' ', '')) = UPPER(REPLACE(COALESCE(pt.vendor_name, ''), ' ', ''))
        )
    WHERE (upper(pt.status::text) IN ('PENDING', 'PROCESSING'))
      AND (pt.is_deleted IS NULL OR pt.is_deleted = false)
      AND NOT (EXISTS (
          SELECT 1 FROM transactions tr
          WHERE tr.txn_id::text = pt.transaction_number::text AND upper(tr.entry_type::text) = 'CREDIT'::text
      ))
    UNION ALL
    -- 2. RECHARGE TRANSACTIONS
    SELECT rt.transaction_id,
        COALESCE(rt.operator_ref, rt.vendor_transaction_id, rt.reference_id) AS external_txn_id,
        'RECHARGE'::character varying(50) AS service,
        COALESCE(NULLIF(rt.vendor_name, ''), 'RECHARGE_PROVIDER'::character varying) AS vendor,
        rt.retailer_id::text AS retailer_id,
        rt.retailer_code,
        COALESCE(rt.retailer_name, r.store_name, rt.retailer_id::text::character varying) AS retailer_name,
        COALESCE(rt.mobile_number, rc.mobile) AS retailer_mobile,
        rt.company_id,
        rt.tenant_id,
        rt.recharge_amount AS transaction_amount,
        COALESCE(t_agg.total_cr, 0.00)::numeric(18,2) AS cr_amount,
        COALESCE(t_agg.total_dr, rt.net_wallet_debit, 0.00)::numeric(18,2) AS dr_amount,
        COALESCE(rt.commission_amount, t_agg.total_comm, 0.00)::numeric(18,2) AS commission,
        COALESCE(rt.tax_amount, t_agg.total_gst, 0.00)::numeric(18,2) AS gst,
        0.00::numeric(18,2) AS service_charge,
        COALESCE(rt.net_wallet_debit, t_agg.total_dr, 0.00)::numeric(18,2) AS net_wallet_debit,
        COALESCE(rt.opening_balance, t_agg.bal_before, 0.00)::numeric(18,2) AS balance_before,
        COALESCE(rt.closing_balance, t_agg.bal_after, 0.00)::numeric(18,2) AS balance_after,
        rt.created_at,
        COALESCE(rt.updated_at, rt.created_at) AS updated_at,
        rt.status AS current_status,
        rt.vendor_reference AS vendor_ref,
        rt.status AS provider_status,
        rt.failure_reason AS provider_response,
        rt.operator_ref AS utr,
        NULL::character varying AS rrn,
        false AS is_reversed
    FROM recharge_transactions rt
        LEFT JOIN txn_agg t_agg ON t_agg.txn_id::text = rt.transaction_id::text
        LEFT JOIN retailer r ON r.public_id = rt.retailer_id OR r.retailer_code::text = rt.retailer_id::text
        LEFT JOIN retailer_contact rc ON rc.retailer_id = r.public_id OR rc.retailer_id = rt.retailer_id
    WHERE (upper(rt.status::text) IN ('PENDING', 'PROCESSING'))
      AND (rt.is_deleted IS NULL OR rt.is_deleted = false)
      AND rt.reversal_txn_id IS NULL
      AND NOT (EXISTS (
          SELECT 1 FROM transactions tr
          WHERE tr.txn_id::text = rt.transaction_id::text AND upper(tr.entry_type::text) = 'CREDIT'::text
      ))
    UNION ALL
    -- 3. DMT TRANSACTIONS
    SELECT dmt.transaction_number AS transaction_id,
        COALESCE(dmt.utr, dmt.rrn, dmt.reference_number) AS external_txn_id,
        'DMT'::character varying(50) AS service,
        COALESCE(NULLIF(dmt.bank_name, ''), 'DMT'::character varying) AS vendor,
        dmt.retailer_id::text AS retailer_id,
        r.retailer_code,
        COALESCE(r.store_name, dmt.retailer_id::text::character varying) AS retailer_name,
        rc.mobile AS retailer_mobile,
        dmt.company_id,
        dmt.tenant_id,
        dmt.transfer_amount::numeric(18,2) AS transaction_amount,
        COALESCE(t_agg.total_cr, 0.00)::numeric(18,2) AS cr_amount,
        COALESCE(dmt.total_debit_amount, t_agg.total_dr::double precision, 0.00::double precision)::numeric(18,2) AS dr_amount,
        0.00::numeric(18,2) AS commission,
        COALESCE(dmt.gst_amount, t_agg.total_gst::double precision, 0.00::double precision)::numeric(18,2) AS gst,
        COALESCE(dmt.service_charge, t_agg.total_charge::double precision, 0.00::double precision)::numeric(18,2) AS service_charge,
        COALESCE(dmt.total_debit_amount, t_agg.total_dr::double precision, 0.00::double precision)::numeric(18,2) AS net_wallet_debit,
        COALESCE(t_agg.bal_before, 0.00)::numeric(18,2) AS balance_before,
        COALESCE(t_agg.bal_after, 0.00)::numeric(18,2) AS balance_after,
        dmt.created_date AS created_at,
        COALESCE(dmt.updated_date, dmt.created_date) AS updated_at,
        dmt.transaction_status AS current_status,
        dmt.reference_number AS vendor_ref,
        dmt.transaction_status AS provider_status,
        dmt.remarks AS provider_response,
        dmt.utr,
        dmt.rrn,
        false AS is_reversed
    FROM dmt_transaction dmt
        LEFT JOIN txn_agg t_agg ON t_agg.txn_id::text = dmt.transaction_number::text
        LEFT JOIN retailer r ON r.public_id = dmt.retailer_id OR r.retailer_code::text = dmt.retailer_id::text
        LEFT JOIN retailer_contact rc ON rc.retailer_id = r.public_id OR rc.retailer_id = dmt.retailer_id
    WHERE (upper(dmt.transaction_status::text) IN ('PENDING', 'PROCESSING'))
      AND (dmt.is_deleted IS NULL OR dmt.is_deleted = false)
      AND NOT (EXISTS (
          SELECT 1 FROM transactions tr
          WHERE tr.txn_id::text = dmt.transaction_number::text AND upper(tr.entry_type::text) = 'CREDIT'::text
      ))
    UNION ALL
    -- 4. AEPS TRANSACTIONS
    SELECT aeps.transaction_number AS transaction_id,
        COALESCE(aeps.rrn, aeps.stan) AS external_txn_id,
        'AEPS'::character varying(50) AS service,
        COALESCE(NULLIF(aeps.bank_name, ''), 'AEPS'::character varying) AS vendor,
        aeps.retailer_id::text AS retailer_id,
        r.retailer_code,
        COALESCE(r.store_name, aeps.retailer_id::text::character varying) AS retailer_name,
        rc.mobile AS retailer_mobile,
        aeps.company_id,
        aeps.tenant_id,
        aeps.transaction_amount::numeric(18,2) AS transaction_amount,
        COALESCE(t_agg.total_cr, 0.00)::numeric(18,2) AS cr_amount,
        COALESCE(t_agg.total_dr, 0.00)::numeric(18,2) AS dr_amount,
        COALESCE(aeps.retailer_commission, t_agg.total_comm::double precision, 0.00::double precision)::numeric(18,2) AS commission,
        COALESCE(aeps.gst_amount, t_agg.total_gst::double precision, 0.00::double precision)::numeric(18,2) AS gst,
        COALESCE(aeps.service_charge, t_agg.total_charge::double precision, 0.00::double precision)::numeric(18,2) AS service_charge,
        COALESCE(t_agg.total_dr, 0.00)::numeric(18,2) AS net_wallet_debit,
        COALESCE(t_agg.bal_before, 0.00)::numeric(18,2) AS balance_before,
        COALESCE(t_agg.bal_after, 0.00)::numeric(18,2) AS balance_after,
        aeps.created_date AS created_at,
        COALESCE(aeps.updated_date, aeps.created_date) AS updated_at,
        aeps.transaction_status AS current_status,
        aeps.rrn AS vendor_ref,
        aeps.transaction_status AS provider_status,
        COALESCE(aeps.auth_response_message, aeps.auth_response_code::text) AS provider_response,
        aeps.rrn AS utr,
        aeps.rrn,
        false AS is_reversed
    FROM aeps_transaction aeps
        LEFT JOIN txn_agg t_agg ON t_agg.txn_id::text = aeps.transaction_number::text
        LEFT JOIN retailer r ON r.public_id = aeps.retailer_id OR r.retailer_code::text = aeps.retailer_id::text
        LEFT JOIN retailer_contact rc ON rc.retailer_id = r.public_id OR rc.retailer_id = aeps.retailer_id
    WHERE (upper(aeps.transaction_status::text) IN ('PENDING', 'PROCESSING'))
      AND (aeps.is_deleted IS NULL OR aeps.is_deleted = false)
      AND NOT (EXISTS (
          SELECT 1 FROM transactions tr
          WHERE tr.txn_id::text = aeps.transaction_number::text AND upper(tr.entry_type::text) = 'CREDIT'::text
      ))
)
SELECT transaction_id,
    external_txn_id,
    service,
    vendor,
    retailer_id,
    retailer_code,
    retailer_name,
    retailer_mobile,
    company_id,
    tenant_id,
    transaction_amount,
    cr_amount,
    dr_amount,
    commission,
    gst,
    service_charge,
    net_wallet_debit,
    balance_before,
    balance_after,
    created_at,
    updated_at,
    current_status,
    vendor_ref,
    provider_status,
    provider_response,
    utr,
    rrn,
    is_reversed
FROM all_pending;
