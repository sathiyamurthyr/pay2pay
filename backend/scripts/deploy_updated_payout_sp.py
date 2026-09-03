import asyncio
import sys
sys.path.insert(0, ".")
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SQL_SP = """
CREATE OR REPLACE FUNCTION public.initiate_payout_transaction(
    p_tenant_id uuid,
    p_company_id uuid,
    p_retailer_id uuid,
    p_customer_id uuid,
    p_beneficiary_id uuid,
    p_amount numeric,
    p_beneficiary_name character varying,
    p_account_number character varying,
    p_ifsc character varying,
    p_bank_name character varying,
    p_mode character varying DEFAULT 'IMPS'::character varying,
    p_vendor_id bigint DEFAULT NULL::bigint,
    p_vendor_name character varying DEFAULT 'Commercial Bank'::character varying,
    p_user_type character varying DEFAULT 'RETAILER'::character varying,
    p_beneficiary_mobile character varying DEFAULT NULL::character varying,
    p_beneficiary_email character varying DEFAULT NULL::character varying,
    p_created_by uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    success boolean,
    status character varying,
    transaction_number character varying,
    amount numeric,
    charges numeric,
    gst_amount numeric,
    total_wallet_debit numeric,
    error_code character varying,
    error_message character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    v_gst_type             VARCHAR(20)   := 'FIXED';
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
    -- 3. RETAILER SERVICE STATUS CHECK
    -- ========================================================
    v_service_enabled := TRUE;

    IF v_service_enabled = FALSE THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'SERVICE_DISABLED'::VARCHAR(50), 'Payout service is disabled for this retailer'::VARCHAR(500);
        RETURN;
    END IF;


    -- ========================================================
    -- 4. CUSTOMER MONTHLY LIMIT VALIDATION
    -- ========================================================

    v_current_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    SELECT cml.monthly_limit, cml.used_amount
    INTO v_monthly_limit, v_current_month_used
    FROM public.customer_monthly_limit cml
    WHERE cml.customer_id = p_customer_id
      AND cml.tenant_id = p_tenant_id
      AND cml.month_year = v_current_month_year
    LIMIT 1;

    IF v_monthly_limit IS NULL THEN
        v_monthly_limit := 200000.00;
        v_current_month_used := 0.00;
    END IF;

    IF (v_current_month_used + p_amount) > v_monthly_limit THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'LIMIT_EXCEEDED'::VARCHAR(50), FORMAT('Monthly transfer limit exceeded. Available limit: %s', (v_monthly_limit - v_current_month_used))::VARCHAR(500);
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
        ps.gst,
        COALESCE(ps.gst_type, 'FIXED')
    INTO
        v_slab_id,
        v_commission,
        v_vendor_charge,
        v_company_charges,
        v_other_charges,
        v_gst_rate,
        v_gst_type
    FROM public.payout_slab ps
    WHERE ps.tenant_id = p_tenant_id
      AND ps.service_code = 'PAYOUT'
      AND ps.min_amount <= p_amount
      AND ps.max_amount >= p_amount
      AND ps.is_active = TRUE
      AND ps.is_deleted = FALSE
    ORDER BY ps.effective_from DESC NULLS LAST
    LIMIT 1;

    -- Defaults if no slab matches (Standard default: Base ₹22.00 + GST ₹3.00 = Total ₹25.00)
    IF v_commission IS NULL THEN v_commission := 22.00; END IF;
    IF v_vendor_charge IS NULL THEN v_vendor_charge := 0.00; END IF;
    IF v_company_charges IS NULL THEN v_company_charges := 0.00; END IF;
    IF v_other_charges IS NULL THEN v_other_charges := 0.00; END IF;
    IF v_gst_rate IS NULL THEN v_gst_rate := 3.00; END IF;
    IF v_gst_type IS NULL THEN v_gst_type := 'FIXED'; END IF;

    v_charge_base := v_commission + v_vendor_charge + v_company_charges + v_other_charges;
    IF UPPER(COALESCE(v_gst_type, 'FIXED')) = 'FIXED' THEN
        v_gst_amount := v_gst_rate;
    ELSE
        v_gst_amount := ROUND((v_charge_base * v_gst_rate / 100.0), 2);
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
        NULL::uuid,
        r.rm_id
    INTO
        v_ret_name,
        v_dist_id,
        v_sd_id,
        v_rm_id
    FROM public.retailer r
    WHERE r.public_id = p_retailer_id;

    IF v_dist_id IS NOT NULL THEN
        SELECT COALESCE(d.store_name, d.owner_name, 'Distributor') INTO v_dist_name
        FROM public.distributor d WHERE d.public_id = v_dist_id;
    END IF;

    IF v_sd_id IS NOT NULL THEN
        SELECT COALESCE(sd.store_name, sd.owner_name, 'Super Distributor') INTO v_sd_name
        FROM public.super_distributor sd WHERE sd.public_id = v_sd_id;
    END IF;

    IF v_rm_id IS NOT NULL THEN
        v_rm_name := 'Relationship Manager';
    END IF;


    -- ========================================================
    -- 7. TRANSACTION NUMBER GENERATION
    -- ========================================================

    v_txn_id := public.generate_payout_txn_id(p_vendor_name);


    -- ========================================================
    -- 8. ATOMIC WALLET DEBIT VIA wallet_balance_update()
    -- Dynamic component lines:
    -- Line 1: Payout Amount
    -- Line 2: Payout Charge (₹22.00)
    -- Line 3: GST (₹3.00)
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

    v_payout_id := gen_random_uuid();

    BEGIN
        SELECT * INTO v_wallet_res
        FROM public.wallet_balance_update(
            p_tenant_id        => p_tenant_id,
            p_company_id       => p_company_id,
            p_retailer_id      => p_retailer_id,
            p_txn_id           => v_txn_id,
            p_ref_id           => v_txn_id,
            p_table_ref_id     => v_payout_id,
            p_entry_type       => 'DEBIT'::VARCHAR,
            p_total_amount     => v_total_wallet_debit,
            p_payout_amount    => p_amount,
            p_charge_amount    => v_charge_base,
            p_gst_amount       => v_gst_amount,
            p_service_name     => 'PAYOUT'::VARCHAR,
            p_wallet_type      => 'MAIN'::VARCHAR,
            p_user_type        => COALESCE(p_user_type, 'RETAILER')::VARCHAR,
            p_retailer_name    => v_ret_name,
            p_dist_id          => v_dist_id,
            p_dist_name        => v_dist_name,
            p_sd_id            => v_sd_id,
            p_sd_name          => v_sd_name,
            p_rm_id            => v_rm_id,
            p_rm_name          => v_rm_name,
            p_vendor_id        => NULL::UUID,
            p_vendor_name      => p_vendor_name,
            p_created_by       => p_created_by,
            p_user_ref_id      => NULL::BIGINT,
            p_user_type_ref_id => 2::BIGINT,
            p_tenant_ref_id    => NULL::BIGINT,
            p_company_ref_id   => NULL::BIGINT,
            p_narration        => 'Payout Transaction'::VARCHAR
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 'WALLET_DEBIT_FAILED'::VARCHAR(50), SQLERRM::VARCHAR(500);
        RETURN;
    END;

    IF v_wallet_res.success = FALSE THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR(30), NULL::VARCHAR(100), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), 0.00::NUMERIC(18,2), v_wallet_res.error_code, v_wallet_res.error_message;
        RETURN;
    END IF;


    -- ========================================================
    -- 9. TRANSACTION PERSISTENCE
    -- ========================================================

    INSERT INTO public.payout_transaction (
        public_id,
        tenant_id,
        company_id,
        retailer_id,
        customer_id,
        beneficiary_id,
        user_type,
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
        p_retailer_id,
        p_customer_id,
        p_beneficiary_id,
        p_user_type,
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
    -- 10. UPDATE CUSTOMER MONTHLY USAGE
    -- ========================================================

    UPDATE public.customer_monthly_limit
    SET used_amount = used_amount + p_amount,
        remaining_amount = monthly_limit - (used_amount + p_amount)
    WHERE customer_id = p_customer_id
      AND tenant_id = p_tenant_id
      AND month_year = v_current_month_year;


    -- ========================================================
    -- 11. RETURN AUTHORITATIVE RESPONSE
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
        'Payout initiated successfully'::VARCHAR(500);

END;
$function$;
"""

async def main():
    async with AsyncSessionLocal() as session:
        print("=== Deploying updated initiate_payout_transaction SP ===")
        await session.execute(text(SQL_SP))
        await session.commit()
        print("initiate_payout_transaction SP successfully updated and committed.")

if __name__ == "__main__":
    asyncio.run(main())
