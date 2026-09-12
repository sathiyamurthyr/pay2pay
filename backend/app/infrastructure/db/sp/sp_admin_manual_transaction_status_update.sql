-- ==============================================================================
-- STORED PROCEDURE: public.sp_admin_manual_transaction_status_update
-- Description: Authoritative procedure for manual admin resolution of PENDING
--              transactions across all services and vendors.
-- Rules:
-- 1. Allowed transitions: PENDING -> SUCCESS, PENDING -> FAILED only.
-- 2. Reject terminal status (SUCCESS, FAILED, REVERSED).
-- 3. Idempotent: strictly prevent double reversal (no duplicate credit/debit).
-- 4. Reversal uses exact original accounting breakdown from transactions table.
-- 5. Full audit logging in transaction_audit_logs.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sp_admin_manual_transaction_status_update(
    p_transaction_id     VARCHAR(100),
    p_new_status         VARCHAR(30),
    p_admin_id           VARCHAR(100),
    p_admin_name         VARCHAR(255) DEFAULT 'System Admin',
    p_failure_reason     VARCHAR(255) DEFAULT NULL,
    p_remarks            TEXT DEFAULT NULL,
    p_ip_address         VARCHAR(45) DEFAULT NULL
)
RETURNS TABLE(
    success              BOOLEAN,
    transaction_id       VARCHAR(100),
    new_status           VARCHAR(30),
    reversal_completed   BOOLEAN,
    reversal_reference   VARCHAR(100),
    reversed_amount      NUMERIC(18,2),
    new_wallet_balance   NUMERIC(18,2),
    message              VARCHAR(500)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
    v_norm_status        VARCHAR(30);
    v_clean_txn_id       VARCHAR(100);
    v_service            VARCHAR(50);
    v_cur_status         VARCHAR(30);
    v_retailer_id        UUID;
    v_retailer_name      VARCHAR(255);
    v_vendor_name        VARCHAR(100);
    v_tenant_id          UUID;
    v_company_id         UUID;

    -- Payout record
    v_pt_rec             RECORD;
    v_rev_payout_res     RECORD;

    -- Recharge record
    v_rt_rec             RECORD;
    v_rev_recharge_res   RECORD;

    -- Generic reversal variables
    v_total_dr           NUMERIC(18,2) := 0.00;
    v_base_amount        NUMERIC(18,2) := 0.00;
    v_charge_amount      NUMERIC(18,2) := 0.00;
    v_gst_amount         NUMERIC(18,2) := 0.00;
    v_wallet_res         RECORD;
    v_rev_ref            VARCHAR(100);
    v_new_bal            NUMERIC(18,2) := 0.00;
BEGIN
    v_clean_txn_id := TRIM(p_transaction_id);
    v_norm_status := UPPER(TRIM(p_new_status));

    -- 1. Validate Input Status
    IF v_norm_status NOT IN ('SUCCESS', 'FAILED') THEN
        RETURN QUERY SELECT FALSE, v_clean_txn_id, v_norm_status, FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
            'Invalid target status. Status update only supports SUCCESS or FAILED.'::VARCHAR(500);
        RETURN;
    END IF;

    -- If FAILED, require failure reason
    IF v_norm_status = 'FAILED' AND (p_failure_reason IS NULL OR TRIM(p_failure_reason) = '') THEN
        RETURN QUERY SELECT FALSE, v_clean_txn_id, v_norm_status, FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
            'Failure reason is mandatory when marking a transaction as FAILED.'::VARCHAR(500);
        RETURN;
    END IF;

    -- 2. Identify and Lock Transaction
    -- A. Check Payout Transaction
    SELECT pt.transaction_number, pt.status, pt.retailer_id, pt.vendor_name, pt.tenant_id, pt.company_id
    INTO v_pt_rec
    FROM public.payout_transaction pt
    WHERE pt.transaction_number = v_clean_txn_id
       OR pt.gateway_reference = v_clean_txn_id
    ORDER BY pt.created_date DESC
    LIMIT 1
    FOR UPDATE;

    IF v_pt_rec.transaction_number IS NOT NULL THEN
        v_clean_txn_id := v_pt_rec.transaction_number;
        v_service := 'PAYOUT';
        v_cur_status := UPPER(TRIM(v_pt_rec.status));
        v_retailer_id := v_pt_rec.retailer_id;
        v_vendor_name := v_pt_rec.vendor_name;
        v_tenant_id := v_pt_rec.tenant_id;
        v_company_id := v_pt_rec.company_id;
    ELSE
        -- B. Check Recharge Transaction
        SELECT rt.public_id, rt.transaction_id, rt.status, rt.retailer_id, rt.retailer_name, rt.vendor_name, rt.tenant_id, rt.company_id, rt.net_wallet_debit
        INTO v_rt_rec
        FROM public.recharge_transactions rt
        WHERE rt.transaction_id = v_clean_txn_id
           OR rt.reference_id = v_clean_txn_id
        ORDER BY rt.created_at DESC
        LIMIT 1
        FOR UPDATE;

        IF v_rt_rec.transaction_id IS NOT NULL THEN
            v_clean_txn_id := v_rt_rec.transaction_id;
            v_service := 'RECHARGE';
            v_cur_status := UPPER(TRIM(v_rt_rec.status));
            v_retailer_id := v_rt_rec.retailer_id;
            v_retailer_name := v_rt_rec.retailer_name;
            v_vendor_name := v_rt_rec.vendor_name;
            v_tenant_id := v_rt_rec.tenant_id;
            v_company_id := v_rt_rec.company_id;
        ELSE
            -- C. Check Generic in transactions
            SELECT t.service_name, t.status, t.retailer_id, t.retailer_name, t.vendor_name, t.tenant_id, t.company_id
            INTO v_service, v_cur_status, v_retailer_id, v_retailer_name, v_vendor_name, v_tenant_id, v_company_id
            FROM public.transactions t
            WHERE t.txn_id = v_clean_txn_id
            ORDER BY t.created_at DESC
            LIMIT 1;

            IF v_service IS NOT NULL THEN
                v_cur_status := UPPER(TRIM(v_cur_status));
            ELSE
                RETURN QUERY SELECT FALSE, v_clean_txn_id, v_norm_status, FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
                    FORMAT('Transaction %s not found in any service ledger.', v_clean_txn_id)::VARCHAR(500);
                RETURN;
            END IF;
        END IF;
    END IF;

    -- 3. Enforce State Transition Rules (Terminal Protection)
    IF v_cur_status NOT IN ('PENDING', 'PROCESSING', 'INITIATED') THEN
        RETURN QUERY SELECT FALSE, v_clean_txn_id, v_cur_status, FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
            FORMAT('Status transition rejected: Transaction is currently in terminal status ''%s''. Only PENDING/PROCESSING transactions can be modified.', v_cur_status)::VARCHAR(500);
        RETURN;
    END IF;

    -- 4. Execute Status Transition
    -- =========================================================================
    -- BRANCH A: MARK AS SUCCESS
    -- =========================================================================
    IF v_norm_status = 'SUCCESS' THEN
        IF v_service = 'PAYOUT' THEN
            -- Update Payout Records
            UPDATE public.payout_transaction
            SET status = 'SUCCESS',
                error_message = NULL,
                updated_date = NOW()
            WHERE transaction_number = v_clean_txn_id;

            UPDATE public.payout_workflow_transactions
            SET status = 'SUCCESS',
                completed_at = COALESCE(completed_at, NOW()),
                failure_reason = NULL,
                updated_date = NOW()
            WHERE transaction_number = v_clean_txn_id;

            UPDATE public.payout_receipt
            SET status = 'SUCCESS',
                status_text = 'TRANSACTION SUCCESSFUL - REAL-TIME CBS SETTLED',
                updated_date = NOW()
            WHERE transaction_number = v_clean_txn_id;

        ELSIF v_service = 'RECHARGE' THEN
            -- Update Recharge Records
            UPDATE public.recharge_transactions
            SET status = 'SUCCESS',
                failure_reason = NULL,
                completed_at = COALESCE(completed_at, NOW()),
                updated_at = NOW()
            WHERE public_id = v_rt_rec.public_id;

        ELSE
            -- Generic service handling
            NULL;
        END IF;

        -- Record Audit Log
        INSERT INTO public.transaction_audit_logs (
            public_id,
            tenant_id,
            transaction_reference,
            action,
            previous_status,
            new_status,
            actor_type,
            actor_id,
            details,
            created_at
        ) VALUES (
            gen_random_uuid(),
            COALESCE(v_tenant_id, '547aa7bb-a790-4fe2-bd5b-27214ed176c8'::uuid),
            v_clean_txn_id,
            'MANUAL_STATUS_UPDATE',
            v_cur_status,
            'SUCCESS',
            'ADMIN',
            COALESCE(p_admin_id, 'ADMIN'),
            jsonb_build_object(
                'admin_name', p_admin_name,
                'service', v_service,
                'vendor', v_vendor_name,
                'remarks', p_remarks,
                'ip_address', p_ip_address,
                'action_taken', 'Status updated to SUCCESS with accounting preserved'
            ),
            NOW()
        );

        RETURN QUERY SELECT TRUE, v_clean_txn_id, 'SUCCESS'::VARCHAR(30), FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
            FORMAT('Transaction %s marked as SUCCESS successfully. Original accounting preserved.', v_clean_txn_id)::VARCHAR(500);
        RETURN;

    -- =========================================================================
    -- BRANCH B: MARK AS FAILED (WITH ATOMIC ACCOUNTING REVERSAL)
    -- =========================================================================
    ELSIF v_norm_status = 'FAILED' THEN
        -- Verify Idempotency: Has this transaction already been reversed?
        IF EXISTS (
            SELECT 1 FROM public.transactions
            WHERE txn_id = v_clean_txn_id AND UPPER(entry_type) = 'CREDIT'
        ) THEN
            RETURN QUERY SELECT FALSE, v_clean_txn_id, v_cur_status, FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
                FORMAT('Reversal blocked: Transaction %s has already received a CREDIT reversal. Double reversal prevented.', v_clean_txn_id)::VARCHAR(500);
            RETURN;
        END IF;

        IF v_service = 'PAYOUT' THEN
            -- Call Authoritative Payout Reversal Procedure
            SELECT * INTO v_rev_payout_res
            FROM public.reverse_failed_payout_transaction(
                p_transaction_number => v_clean_txn_id,
                p_failure_reason     => p_failure_reason
            );

            IF v_rev_payout_res.success = FALSE THEN
                RETURN QUERY SELECT FALSE, v_clean_txn_id, v_cur_status, FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
                    FORMAT('Payout reversal failed: %s', v_rev_payout_res.error_message)::VARCHAR(500);
                RETURN;
            END IF;

            -- Update Payout Workflow & Receipt
            UPDATE public.payout_workflow_transactions
            SET status = 'FAILED',
                failure_reason = p_failure_reason,
                completed_at = COALESCE(completed_at, NOW()),
                updated_date = NOW()
            WHERE transaction_number = v_clean_txn_id;

            UPDATE public.payout_receipt
            SET status = 'FAILED',
                status_text = 'TRANSACTION FAILED - REFUND PROCESSED',
                updated_date = NOW()
            WHERE transaction_number = v_clean_txn_id;

            v_rev_ref := 'REV-' || v_clean_txn_id;
            v_new_bal := v_rev_payout_res.new_wallet_balance;

            -- Record Audit Log
            INSERT INTO public.transaction_audit_logs (
                public_id,
                tenant_id,
                transaction_reference,
                action,
                previous_status,
                new_status,
                actor_type,
                actor_id,
                details,
                created_at
            ) VALUES (
                gen_random_uuid(),
                COALESCE(v_tenant_id, '547aa7bb-a790-4fe2-bd5b-27214ed176c8'::uuid),
                v_clean_txn_id,
                'MANUAL_STATUS_UPDATE',
                v_cur_status,
                'FAILED',
                'ADMIN',
                COALESCE(p_admin_id, 'ADMIN'),
                jsonb_build_object(
                    'admin_name', p_admin_name,
                    'service', v_service,
                    'vendor', v_vendor_name,
                    'failure_reason', p_failure_reason,
                    'reversal_amount', v_rev_payout_res.reversed_amount,
                    'new_wallet_balance', v_rev_payout_res.new_wallet_balance,
                    'reversal_reference', v_rev_ref,
                    'remarks', p_remarks,
                    'ip_address', p_ip_address,
                    'action_taken', 'Status updated to FAILED and wallet reversal credited'
                ),
                NOW()
            );

            RETURN QUERY SELECT TRUE, v_clean_txn_id, 'FAILED'::VARCHAR(30), TRUE, v_rev_ref,
                v_rev_payout_res.reversed_amount, v_rev_payout_res.new_wallet_balance,
                FORMAT('Transaction %s marked as FAILED. Refund of ₹%s credited to retailer wallet.', v_clean_txn_id, v_rev_payout_res.reversed_amount)::VARCHAR(500);
            RETURN;

        ELSIF v_service = 'RECHARGE' THEN
            -- Call Authoritative Recharge Reversal Procedure
            SELECT * INTO v_rev_recharge_res
            FROM public.sp_recharge_reverse_transaction(
                p_recharge_public_id => v_rt_rec.public_id,
                p_reversal_reason    => p_failure_reason
            );

            IF v_rev_recharge_res.success = FALSE THEN
                RETURN QUERY SELECT FALSE, v_clean_txn_id, v_cur_status, FALSE, NULL::VARCHAR, 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2),
                    FORMAT('Recharge reversal failed: %s', v_rev_recharge_res.message)::VARCHAR(500);
                RETURN;
            END IF;

            -- Record Audit Log
            INSERT INTO public.transaction_audit_logs (
                public_id,
                tenant_id,
                transaction_reference,
                action,
                previous_status,
                new_status,
                actor_type,
                actor_id,
                details,
                created_at
            ) VALUES (
                gen_random_uuid(),
                COALESCE(v_tenant_id, '547aa7bb-a790-4fe2-bd5b-27214ed176c8'::uuid),
                v_clean_txn_id,
                'MANUAL_STATUS_UPDATE',
                v_cur_status,
                'FAILED',
                'ADMIN',
                COALESCE(p_admin_id, 'ADMIN'),
                jsonb_build_object(
                    'admin_name', p_admin_name,
                    'service', v_service,
                    'vendor', v_vendor_name,
                    'failure_reason', p_failure_reason,
                    'reversal_amount', v_rev_recharge_res.reversed_amount,
                    'new_wallet_balance', v_rev_recharge_res.new_balance,
                    'reversal_reference', v_rev_recharge_res.reversal_txn_id,
                    'remarks', p_remarks,
                    'ip_address', p_ip_address,
                    'action_taken', 'Recharge marked as FAILED and wallet reversal credited'
                ),
                NOW()
            );

            RETURN QUERY SELECT TRUE, v_clean_txn_id, 'FAILED'::VARCHAR(30), TRUE, v_rev_recharge_res.reversal_txn_id,
                v_rev_recharge_res.reversed_amount, v_rev_recharge_res.new_balance,
                FORMAT('Recharge transaction %s marked as FAILED. Refund of ₹%s credited.', v_clean_txn_id, v_rev_recharge_res.reversed_amount)::VARCHAR(500);
            RETURN;

        ELSE
            -- Generic service reversal: calculate sum of debits from transactions
            SELECT
                COALESCE(SUM(t.amount), 0.00),
                COALESCE(SUM(CASE WHEN t.narration ILIKE '%Charge%' THEN t.amount ELSE 0 END), 0.00),
                COALESCE(SUM(CASE WHEN t.narration ILIKE '%GST%' THEN t.amount ELSE 0 END), 0.00)
            INTO v_total_dr, v_charge_amount, v_gst_amount
            FROM public.transactions t
            WHERE t.txn_id = v_clean_txn_id AND UPPER(t.entry_type) = 'DEBIT';

            IF v_total_dr > 0 AND v_retailer_id IS NOT NULL THEN
                v_rev_ref := 'REV-' || v_clean_txn_id;
                SELECT * INTO v_wallet_res
                FROM public.wallet_balance_update(
                    p_tenant_id        => v_tenant_id,
                    p_company_id       => v_company_id,
                    p_retailer_id      => v_retailer_id,
                    p_txn_id           => v_rev_ref,
                    p_ref_id           => v_clean_txn_id,
                    p_table_ref_id     => NULL,
                    p_entry_type       => 'CREDIT',
                    p_total_amount     => v_total_dr,
                    p_payout_amount    => (v_total_dr - v_charge_amount - v_gst_amount),
                    p_charge_amount    => v_charge_amount,
                    p_gst_amount       => v_gst_amount,
                    p_service_name     => v_service || '_REVERSAL',
                    p_wallet_type      => 'MAIN',
                    p_user_type        => 'RETAILER',
                    p_retailer_name    => v_retailer_name,
                    p_narration        => FORMAT('Manual Reversal for Failed %s (Ref: %s) - %s', v_service, v_clean_txn_id, p_failure_reason)
                );
                v_new_bal := COALESCE(v_wallet_res.balance_after, 0.00);
            END IF;

            -- Record Audit Log
            INSERT INTO public.transaction_audit_logs (
                public_id,
                tenant_id,
                transaction_reference,
                action,
                previous_status,
                new_status,
                actor_type,
                actor_id,
                details,
                created_at
            ) VALUES (
                gen_random_uuid(),
                COALESCE(v_tenant_id, '547aa7bb-a790-4fe2-bd5b-27214ed176c8'::uuid),
                v_clean_txn_id,
                'MANUAL_STATUS_UPDATE',
                v_cur_status,
                'FAILED',
                'ADMIN',
                COALESCE(p_admin_id, 'ADMIN'),
                jsonb_build_object(
                    'admin_name', p_admin_name,
                    'service', v_service,
                    'vendor', v_vendor_name,
                    'failure_reason', p_failure_reason,
                    'reversal_amount', v_total_dr,
                    'new_wallet_balance', v_new_bal,
                    'reversal_reference', v_rev_ref,
                    'remarks', p_remarks,
                    'ip_address', p_ip_address,
                    'action_taken', 'Status updated to FAILED and wallet reversal credited'
                ),
                NOW()
            );

            RETURN QUERY SELECT TRUE, v_clean_txn_id, 'FAILED'::VARCHAR(30), (v_total_dr > 0), v_rev_ref,
                v_total_dr, v_new_bal,
                FORMAT('Transaction %s marked as FAILED. Refund of ₹%s processed.', v_clean_txn_id, v_total_dr)::VARCHAR(500);
            RETURN;
        END IF;
    END IF;
END;
$function$;
