-- =============================================================================
-- Migration: 09_get_user_wallet_function.sql
-- Description: Creates the standardized public.get_user_wallet function with
--              real-time financial ledger synchronization
-- Parameters:
--   p_user_ref_id       BIGINT   (retailer_ref_id / entity ref id)
--   p_user_type_ref_id  BIGINT   (user_type_ref_id from user_type master table)
-- Output:
--   Returns only user/retailer wallet information and wallet status
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_user_wallet(BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION public.get_user_wallet(
    p_user_ref_id       BIGINT,
    p_user_type_ref_id  BIGINT DEFAULT 2
)
RETURNS TABLE (
    wallet_ref_id            BIGINT,
    user_ref_id              BIGINT,
    user_type_ref_id         BIGINT,
    user_type                VARCHAR(50),
    wallet_balance           NUMERIC(18,2),
    daily_transaction_limit  NUMERIC(18,2),
    single_transaction_limit NUMERIC(18,2),
    is_frozen                BOOLEAN,
    freeze_reason            TEXT,
    wallet_status            VARCHAR(50),
    is_active                BOOLEAN,
    created_date             TIMESTAMPTZ,
    updated_date             TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_type_code VARCHAR(50);
BEGIN
    -- 1. Resolve User Type Code from Master Table
    SELECT ut.user_type_code INTO v_user_type_code
    FROM public.user_type ut
    WHERE ut.user_type_ref_id = p_user_type_ref_id
    LIMIT 1;

    IF v_user_type_code IS NULL THEN
        v_user_type_code := 'RETAILER';
    END IF;

    -- 2. Return Retailer Wallet Information (Synchronized with Ledger)
    IF UPPER(v_user_type_code) = 'RETAILER' OR p_user_type_ref_id = 2 THEN
        RETURN QUERY
        SELECT
            COALESCE(rw.retailer_wallet_ref_id, 0)::BIGINT AS wallet_ref_id,
            COALESCE(rw.retailer_ref_id, r.retailer_ref_id, p_user_ref_id)::BIGINT AS user_ref_id,
            COALESCE(p_user_type_ref_id, 2)::BIGINT AS user_type_ref_id,
            'RETAILER'::VARCHAR(50) AS user_type,
            COALESCE(latest_tx.balance_after, rw.wallet_balance, 0.00)::NUMERIC(18,2) AS wallet_balance,
            COALESCE(rw.daily_transaction_limit, 5000000.00)::NUMERIC(18,2) AS daily_transaction_limit,
            COALESCE(rw.single_transaction_limit, 500000.00)::NUMERIC(18,2) AS single_transaction_limit,
            COALESCE(rw.is_frozen, FALSE) AS is_frozen,
            rw.freeze_reason::TEXT AS freeze_reason,
            CASE
                WHEN COALESCE(rw.is_deleted, r.is_deleted, FALSE) = TRUE THEN 'DELETED'
                WHEN COALESCE(rw.is_active, r.is_active, TRUE) = FALSE THEN 'INACTIVE'
                WHEN COALESCE(rw.is_frozen, FALSE) = TRUE THEN 'FROZEN'
                WHEN UPPER(COALESCE(rw.record_status, r.record_status, 'ACTIVE')) = 'ACTIVE' THEN 'ACTIVE'
                ELSE UPPER(COALESCE(rw.record_status, r.record_status, 'ACTIVE'))
            END::VARCHAR(50) AS wallet_status,
            (COALESCE(rw.is_active, r.is_active, TRUE) AND NOT COALESCE(rw.is_deleted, r.is_deleted, FALSE)) AS is_active,
            COALESCE(rw.created_date, r.created_date, NOW()) AS created_date,
            COALESCE(latest_tx.created_at, rw.updated_at, rw.updated_date, r.updated_date, NOW()) AS updated_date
        FROM public.retailer r
        LEFT JOIN public.retailer_wallet rw ON rw.retailer_ref_id = r.retailer_ref_id AND (rw.is_deleted IS NULL OR rw.is_deleted = FALSE)
        LEFT JOIN LATERAL (
            SELECT t.balance_after, t.created_at
            FROM public.transactions t
            WHERE t.retailer_ref_id = r.retailer_ref_id
              AND (t.is_deleted IS NULL OR t.is_deleted = FALSE)
            ORDER BY t.created_at DESC, t.transactions_ref_id DESC
            LIMIT 1
        ) latest_tx ON TRUE
        WHERE r.retailer_ref_id = p_user_ref_id
        ORDER BY rw.retailer_wallet_ref_id DESC NULLS LAST
        LIMIT 1;
    ELSE
        -- Return from enterprise_wallet if another user type is queried
        RETURN QUERY
        SELECT
            COALESCE(ew.enterprise_wallet_ref_id, 0)::BIGINT AS wallet_ref_id,
            p_user_ref_id AS user_ref_id,
            p_user_type_ref_id AS user_type_ref_id,
            v_user_type_code::VARCHAR(50) AS user_type,
            0.00::NUMERIC(18,2) AS wallet_balance,
            5000000.00::NUMERIC(18,2) AS daily_transaction_limit,
            500000.00::NUMERIC(18,2) AS single_transaction_limit,
            FALSE AS is_frozen,
            NULL::TEXT AS freeze_reason,
            'ACTIVE'::VARCHAR(50) AS wallet_status,
            TRUE AS is_active,
            NOW() AS created_date,
            NOW() AS updated_date
        FROM public.enterprise_wallet ew
        WHERE ew.enterprise_wallet_ref_id = p_user_ref_id
        LIMIT 1;
    END IF;
END;
$$;
