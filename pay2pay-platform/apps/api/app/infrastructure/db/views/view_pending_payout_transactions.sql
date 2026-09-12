-- ============================================================================
-- VIEW: public.view_pending_payout_transactions
-- Description: Real-time queryable view of PENDING UrbanRupee payout transactions ONLY.
-- Excludes all other vendors. Used exclusively by the automated 5-minute UrbanRupee
-- status poller and UrbanRupee status check endpoints.
-- ============================================================================

CREATE OR REPLACE VIEW public.view_pending_payout_transactions AS
SELECT 
    pt.transaction_number,
    COALESCE(NULLIF(pt.gateway_reference, ''), pt.transaction_number) AS order_id,
    pt.gateway_reference,
    pt.bank_reference,
    pt.vendor_name,
    pt.status,
    COALESCE(pwt.amount, t_deb.amount, 0.0) AS amount,
    COALESCE(pwt.net_debit, t_deb.amount, 0.0) AS net_debit,
    pt.retailer_id,
    r.store_name AS retailer_name,
    r.retailer_code,
    pt.created_date,
    pt.processed_time
FROM public.payout_transaction pt
LEFT JOIN public.payout_workflow_transactions pwt 
    ON pwt.transaction_number = pt.transaction_number
LEFT JOIN LATERAL (
    SELECT t.amount
    FROM public.transactions t
    WHERE t.txn_id = pt.transaction_number 
      AND UPPER(t.entry_type) = 'DEBIT'
      AND (t.narration ILIKE '%Payout Amount%' OR t.narration ILIKE '%Payout%')
    ORDER BY t.created_at DESC
    LIMIT 1
) t_deb ON TRUE
LEFT JOIN public.retailer r 
    ON (r.public_id = pt.retailer_id OR r.retailer_code = pt.retailer_id::text)
WHERE UPPER(pt.status) = 'PENDING'
  AND (pt.vendor_name ILIKE '%URBAN%')
  AND (pt.is_deleted IS NULL OR pt.is_deleted = FALSE);

COMMENT ON VIEW public.view_pending_payout_transactions IS 'Live view of pending UrbanRupee payout transactions only, for automated 5-minute polling and reconciliation';
