import asyncio
import os
import sys
from decimal import Decimal

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


MIGRATION_SQL = """
-- 1. Ensure UrbanRupee Payout Admin Operation Wallet exists in public.admin_service_vendor_wallet
INSERT INTO public.admin_service_vendor_wallet (
    tenant_id,
    service_code,
    service_name,
    vendor_code,
    vendor_name,
    wallet_number,
    available_balance,
    hold_balance,
    currency,
    is_active,
    is_deleted,
    created_date,
    updated_date,
    created_by,
    updated_by,
    version_no
) VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'PAYOUT',
    'Payout',
    'URBANRUPEE',
    'UrbanRupee',
    'ADM-WAL-PAYOUT-URBANRUPEE',
    83166.1200,
    0.0000,
    'INR',
    TRUE,
    FALSE,
    NOW(),
    NOW(),
    'SYSTEM_SEED',
    'SYSTEM_SEED',
    1
)
ON CONFLICT (wallet_number) DO UPDATE
SET 
    service_code = 'PAYOUT',
    service_name = 'Payout',
    vendor_code = 'URBANRUPEE',
    vendor_name = 'UrbanRupee',
    is_active = TRUE,
    is_deleted = FALSE,
    updated_date = NOW();

-- 2. Ensure Payout Gateway Configs priority: UrbanRupee = 1, Utkal = 2, BulkPe = 3
UPDATE public.payout_gateway_configs
SET priority = 1, is_default = TRUE, status = 'ACTIVE', is_active = TRUE, updated_date = NOW()
WHERE provider_code = 'URBANRUPEE';

UPDATE public.payout_gateway_configs
SET priority = 2, is_default = FALSE, updated_date = NOW()
WHERE provider_code = 'UTKALDIGITAL';

UPDATE public.payout_gateway_configs
SET priority = 3, is_default = FALSE, updated_date = NOW()
WHERE provider_code = 'BULKPE';

-- 3. Update Payout Routing Policy to URBANRUPEE Priority
UPDATE public.payout_routing_policies
SET active_primary_provider = 'URBANRUPEE', routing_mode = 'PRIORITY', updated_date = NOW(), updated_by = 'SYSTEM';

-- 4. Update sp_get_admin_service_vendor_wallets to prioritize UrbanRupee Payout wallet
CREATE OR REPLACE FUNCTION public.sp_get_admin_service_vendor_wallets(
    p_tenant_id UUID DEFAULT NULL,
    p_service VARCHAR DEFAULT NULL,
    p_vendor VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    public_id UUID,
    tenant_id UUID,
    company_id UUID,
    service_code VARCHAR,
    service_name VARCHAR,
    vendor_code VARCHAR,
    vendor_name VARCHAR,
    wallet_number VARCHAR,
    available_balance NUMERIC,
    hold_balance NUMERIC,
    currency VARCHAR,
    is_active BOOLEAN,
    created_date TIMESTAMPTZ,
    updated_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.public_id,
        w.tenant_id,
        w.company_id,
        w.service_code,
        w.service_name,
        w.vendor_code,
        w.vendor_name,
        w.wallet_number,
        w.available_balance::NUMERIC,
        w.hold_balance::NUMERIC,
        w.currency,
        w.is_active,
        w.created_date,
        w.updated_date
    FROM public.admin_service_vendor_wallet w
    WHERE w.is_deleted = false
      AND (p_service IS NULL OR p_service = '' OR UPPER(w.service_code) = UPPER(p_service) OR UPPER(w.service_name) = UPPER(p_service))
      AND (p_vendor IS NULL OR p_vendor = '' OR UPPER(w.vendor_code) = UPPER(p_vendor) OR UPPER(w.vendor_name) = UPPER(p_vendor))
    ORDER BY 
        CASE 
            WHEN UPPER(w.service_code) = 'PAYOUT' AND (UPPER(w.vendor_code) LIKE '%URBAN%' OR UPPER(w.vendor_name) LIKE '%URBAN%') THEN 1
            WHEN UPPER(w.service_code) = 'PAYOUT' THEN 2
            ELSE 3
        END ASC,
        w.service_code ASC,
        w.id ASC;
END;
$$;

-- 5. Update sp_validate_pos_topup_approval to default to UrbanRupee (Priority 1)
CREATE OR REPLACE FUNCTION public.sp_validate_pos_topup_approval(
    p_topup_id UUID,
    p_approved_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_topup RECORD;
    v_mode VARCHAR;
    v_is_t1 BOOLEAN := FALSE;
    v_req_cal_date DATE;
    v_curr_cal_date DATE;
    v_date_eligible BOOLEAN := TRUE;
    v_date_block_reason VARCHAR := '';
    v_service VARCHAR := 'Payout';
    v_vendor VARCHAR := 'UrbanRupee';
    v_wallet RECORD;
    v_effective_amount NUMERIC;
    v_balance_eligible BOOLEAN := TRUE;
    v_wallet_eligible BOOLEAN := TRUE;
    v_block_reason VARCHAR := '';
    v_shortfall NUMERIC := 0.00;
    v_can_approve BOOLEAN := TRUE;
    v_meta JSONB;
BEGIN
    -- 1. Load Topup Request Record
    SELECT * INTO v_topup
    FROM public.topup_requests
    WHERE (public_id = p_topup_id OR id::text = p_topup_id::text)
      AND is_deleted = false
    LIMIT 1;

    IF v_topup IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'is_eligible', FALSE,
            'can_approve', FALSE,
            'block_reason', 'Topup request not found.'
        );
    END IF;

    -- 2. Status Check
    IF UPPER(v_topup.status) NOT IN ('PENDING', 'UNDER_REVIEW') THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'is_eligible', FALSE,
            'can_approve', FALSE,
            'status', v_topup.status,
            'block_reason', 'This request has already been processed. Please refresh the page.'
        );
    END IF;

    -- 3. Calculate Effective Amount
    v_effective_amount := COALESCE(
        p_approved_amount,
        v_topup.received_amount,
        v_topup.approved_amount,
        v_topup.requested_amount
    );

    -- 4. POS Approval Date Validation (IST Calendar Date)
    v_mode := UPPER(COALESCE(v_topup.payment_method, '') || ' ' || COALESCE(v_topup.metadata_json->>'payment_mode', ''));
    v_is_t1 := (v_mode LIKE '%T1%' OR v_mode LIKE '%T+1%' OR v_mode LIKE '%POS+T1%' OR v_mode LIKE '%POS - T1%');

    -- Calculate IST Calendar Dates
    v_req_cal_date := (COALESCE(v_topup.payment_date, v_topup.submitted_at, v_topup.created_date) AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_curr_cal_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

    IF v_is_t1 THEN
        IF v_req_cal_date >= v_curr_cal_date THEN
            v_date_eligible := FALSE;
            v_date_block_reason := 'POS T1 requests can be approved from T+1 only.';
        END IF;
    ELSE
        IF v_req_cal_date > v_curr_cal_date THEN
            v_date_eligible := FALSE;
            v_date_block_reason := 'Future-dated topup requests cannot be approved.';
        END IF;
    END IF;

    -- 5. Resolve Service and Vendor (Dynamic with UrbanRupee Priority 1 default)
    BEGIN
        IF v_topup.metadata_json IS NOT NULL THEN
            v_meta := v_topup.metadata_json::JSONB;
            IF v_meta->>'vendor_name' IS NOT NULL AND v_meta->>'vendor_name' <> '' THEN
                v_vendor := v_meta->>'vendor_name';
            END IF;
            IF v_meta->>'service_name' IS NOT NULL AND v_meta->>'service_name' <> '' THEN
                v_service := v_meta->>'service_name';
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_service := 'Payout';
        v_vendor := 'UrbanRupee';
    END;

    -- 6. Retrieve Mapped Admin Service + Vendor Wallet
    SELECT * INTO v_wallet
    FROM public.admin_service_vendor_wallet
    WHERE is_deleted = false
      AND UPPER(service_code) = UPPER(v_service)
      AND (
          UPPER(vendor_code) = UPPER(v_vendor) 
          OR UPPER(vendor_name) = UPPER(v_vendor)
          OR (UPPER(v_vendor) LIKE '%' || UPPER(vendor_code) || '%')
          OR (UPPER(vendor_code) LIKE '%' || UPPER(v_vendor) || '%')
      )
    ORDER BY is_active DESC, available_balance DESC
    LIMIT 1;

    -- Fallback 1: Default to Priority 1 Payout + UrbanRupee wallet
    IF v_wallet.id IS NULL THEN
        SELECT * INTO v_wallet
        FROM public.admin_service_vendor_wallet
        WHERE is_deleted = false
          AND is_active = true
          AND UPPER(service_code) = 'PAYOUT'
          AND (UPPER(vendor_code) LIKE '%URBAN%' OR UPPER(vendor_name) LIKE '%URBAN%')
        LIMIT 1;
    END IF;

    -- Fallback 2: Any active Payout wallet
    IF v_wallet.id IS NULL THEN
        SELECT * INTO v_wallet
        FROM public.admin_service_vendor_wallet
        WHERE is_deleted = false
          AND is_active = true
          AND UPPER(service_code) = 'PAYOUT'
        ORDER BY available_balance DESC
        LIMIT 1;
    END IF;

    IF v_wallet.id IS NULL THEN
        v_wallet_eligible := FALSE;
        v_block_reason := 'Admin wallet configuration is not available for this Service and Vendor. Approval cannot continue.';
    ELSIF v_wallet.is_active = FALSE THEN
        v_wallet_eligible := FALSE;
        v_block_reason := 'The mapped Admin wallet is inactive. Approval cannot continue.';
    ELSIF v_wallet.available_balance < v_effective_amount THEN
        v_balance_eligible := FALSE;
        v_shortfall := v_effective_amount - v_wallet.available_balance;
        v_block_reason := 'Admin balance is low. Please add funds to continue the approval.';
    END IF;

    -- 7. Combine Approval Eligibility
    IF NOT v_date_eligible THEN
        v_can_approve := FALSE;
        v_block_reason := v_date_block_reason;
    ELSIF NOT v_wallet_eligible OR NOT v_balance_eligible THEN
        v_can_approve := FALSE;
    ELSE
        v_can_approve := TRUE;
        v_block_reason := '';
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'topup_id', v_topup.public_id,
        'topup_request_id', v_topup.topup_request_id,
        'status', v_topup.status,
        'is_eligible', v_can_approve,
        'can_approve', v_can_approve,
        'date_eligible', v_date_eligible,
        'wallet_eligible', v_wallet_eligible,
        'balance_eligible', v_balance_eligible,
        'is_pos_t1', v_is_t1,
        'pos_type', CASE WHEN v_is_t1 THEN 'POS T1' ELSE 'POS Instant' END,
        'payment_mode', COALESCE(v_topup.payment_method, 'POS - Instant'),
        'service', COALESCE(v_wallet.service_name, v_service),
        'service_code', COALESCE(v_wallet.service_code, 'PAYOUT'),
        'vendor', COALESCE(v_wallet.vendor_name, v_vendor),
        'vendor_code', COALESCE(v_wallet.vendor_code, 'URBANRUPEE'),
        'admin_wallet_id', v_wallet.public_id,
        'admin_available_balance', COALESCE(v_wallet.available_balance, 0.00),
        'required_amount', v_effective_amount,
        'shortfall_amount', v_shortfall,
        'block_reason', v_block_reason,
        'request_date', v_req_cal_date,
        'current_business_date', v_curr_cal_date
    );
END;
$$;
"""


async def main():
    print("=== Executing UrbanRupee Payout Priority 1 DB Migration ===")
    statements = [
        """
        INSERT INTO public.admin_service_vendor_wallet (
            tenant_id,
            service_code,
            service_name,
            vendor_code,
            vendor_name,
            wallet_number,
            available_balance,
            hold_balance,
            currency,
            is_active,
            is_deleted,
            created_date,
            updated_date,
            created_by,
            updated_by,
            version_no
        ) VALUES (
            '00000000-0000-0000-0000-000000000001'::UUID,
            'PAYOUT',
            'Payout',
            'URBANRUPEE',
            'UrbanRupee',
            'ADM-WAL-PAYOUT-URBANRUPEE',
            83166.1200,
            0.0000,
            'INR',
            TRUE,
            FALSE,
            NOW(),
            NOW(),
            'SYSTEM_SEED',
            'SYSTEM_SEED',
            1
        )
        ON CONFLICT (wallet_number) DO UPDATE
        SET 
            service_code = 'PAYOUT',
            service_name = 'Payout',
            vendor_code = 'URBANRUPEE',
            vendor_name = 'UrbanRupee',
            available_balance = EXCLUDED.available_balance,
            is_active = TRUE,
            is_deleted = FALSE,
            updated_date = NOW();
        """,
        """
        UPDATE public.payout_gateway_configs
        SET priority = 1, is_default = TRUE, status = 'ACTIVE', is_active = TRUE, updated_date = NOW()
        WHERE provider_code = 'URBANRUPEE';
        """,
        """
        UPDATE public.payout_gateway_configs
        SET priority = 2, is_default = FALSE, updated_date = NOW()
        WHERE provider_code = 'UTKALDIGITAL';
        """,
        """
        UPDATE public.payout_gateway_configs
        SET priority = 3, is_default = FALSE, updated_date = NOW()
        WHERE provider_code = 'BULKPE';
        """,
        """
        UPDATE public.payout_routing_policies
        SET active_primary_provider = 'URBANRUPEE', routing_mode = 'PRIORITY', updated_date = NOW(), updated_by = 'SYSTEM';
        """,
        """
        CREATE OR REPLACE FUNCTION public.sp_get_admin_service_vendor_wallets(
            p_tenant_id UUID DEFAULT NULL,
            p_service VARCHAR DEFAULT NULL,
            p_vendor VARCHAR DEFAULT NULL
        )
        RETURNS TABLE (
            id BIGINT,
            public_id UUID,
            tenant_id UUID,
            company_id UUID,
            service_code VARCHAR,
            service_name VARCHAR,
            vendor_code VARCHAR,
            vendor_name VARCHAR,
            wallet_number VARCHAR,
            available_balance NUMERIC,
            hold_balance NUMERIC,
            currency VARCHAR,
            is_active BOOLEAN,
            created_date TIMESTAMPTZ,
            updated_date TIMESTAMPTZ
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                w.id,
                w.public_id,
                w.tenant_id,
                w.company_id,
                w.service_code,
                w.service_name,
                w.vendor_code,
                w.vendor_name,
                w.wallet_number,
                w.available_balance::NUMERIC,
                w.hold_balance::NUMERIC,
                w.currency,
                w.is_active,
                w.created_date,
                w.updated_date
            FROM public.admin_service_vendor_wallet w
            WHERE w.is_deleted = false
              AND (p_service IS NULL OR p_service = '' OR UPPER(w.service_code) = UPPER(p_service) OR UPPER(w.service_name) = UPPER(p_service))
              AND (p_vendor IS NULL OR p_vendor = '' OR UPPER(w.vendor_code) = UPPER(p_vendor) OR UPPER(w.vendor_name) = UPPER(p_vendor))
            ORDER BY 
                CASE 
                    WHEN UPPER(w.service_code) = 'PAYOUT' AND (UPPER(w.vendor_code) LIKE '%URBAN%' OR UPPER(w.vendor_name) LIKE '%URBAN%') THEN 1
                    WHEN UPPER(w.service_code) = 'PAYOUT' THEN 2
                    ELSE 3
                END ASC,
                w.service_code ASC,
                w.id ASC;
        END;
        $$;
        """,
        """
        CREATE OR REPLACE FUNCTION public.sp_validate_pos_topup_approval(
            p_topup_id UUID,
            p_approved_amount NUMERIC DEFAULT NULL
        )
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
            v_topup RECORD;
            v_mode VARCHAR;
            v_is_t1 BOOLEAN := FALSE;
            v_req_cal_date DATE;
            v_curr_cal_date DATE;
            v_date_eligible BOOLEAN := TRUE;
            v_date_block_reason VARCHAR := '';
            v_service VARCHAR := 'Payout';
            v_vendor VARCHAR := 'UrbanRupee';
            v_wallet RECORD;
            v_effective_amount NUMERIC;
            v_balance_eligible BOOLEAN := TRUE;
            v_wallet_eligible BOOLEAN := TRUE;
            v_block_reason VARCHAR := '';
            v_shortfall NUMERIC := 0.00;
            v_can_approve BOOLEAN := TRUE;
            v_meta JSONB;
        BEGIN
            -- 1. Load Topup Request Record
            SELECT * INTO v_topup
            FROM public.topup_requests
            WHERE (public_id = p_topup_id OR id::text = p_topup_id::text)
              AND is_deleted = false
            LIMIT 1;

            IF v_topup IS NULL THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'is_eligible', FALSE,
                    'can_approve', FALSE,
                    'block_reason', 'Topup request not found.'
                );
            END IF;

            -- 2. Status Check
            IF UPPER(v_topup.status) NOT IN ('PENDING', 'UNDER_REVIEW') THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'is_eligible', FALSE,
                    'can_approve', FALSE,
                    'status', v_topup.status,
                    'block_reason', 'This request has already been processed. Please refresh the page.'
                );
            END IF;

            -- 3. Calculate Effective Amount
            v_effective_amount := COALESCE(
                p_approved_amount,
                v_topup.received_amount,
                v_topup.approved_amount,
                v_topup.requested_amount
            );

            -- 4. POS Approval Date Validation (IST Calendar Date)
            v_mode := UPPER(COALESCE(v_topup.payment_method, '') || ' ' || COALESCE(v_topup.metadata_json->>'payment_mode', ''));
            v_is_t1 := (v_mode LIKE '%T1%' OR v_mode LIKE '%T+1%' OR v_mode LIKE '%POS+T1%' OR v_mode LIKE '%POS - T1%');

            -- Calculate IST Calendar Dates
            v_req_cal_date := (COALESCE(v_topup.payment_date, v_topup.submitted_at, v_topup.created_date) AT TIME ZONE 'Asia/Kolkata')::DATE;
            v_curr_cal_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

            IF v_is_t1 THEN
                IF v_req_cal_date >= v_curr_cal_date THEN
                    v_date_eligible := FALSE;
                    v_date_block_reason := 'POS T1 requests can be approved from T+1 only.';
                END IF;
            ELSE
                IF v_req_cal_date > v_curr_cal_date THEN
                    v_date_eligible := FALSE;
                    v_date_block_reason := 'Future-dated topup requests cannot be approved.';
                END IF;
            END IF;

            -- 5. Resolve Service and Vendor (Dynamic with UrbanRupee Priority 1 default)
            BEGIN
                IF v_topup.metadata_json IS NOT NULL THEN
                    v_meta := v_topup.metadata_json::JSONB;
                    IF v_meta->>'vendor_name' IS NOT NULL AND v_meta->>'vendor_name' <> '' THEN
                        v_vendor := v_meta->>'vendor_name';
                    END IF;
                    IF v_meta->>'service_name' IS NOT NULL AND v_meta->>'service_name' <> '' THEN
                        v_service := v_meta->>'service_name';
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_service := 'Payout';
                v_vendor := 'UrbanRupee';
            END;

            -- 6. Retrieve Mapped Admin Service + Vendor Wallet
            SELECT * INTO v_wallet
            FROM public.admin_service_vendor_wallet
            WHERE is_deleted = false
              AND UPPER(service_code) = UPPER(v_service)
              AND (
                  UPPER(vendor_code) = UPPER(v_vendor) 
                  OR UPPER(vendor_name) = UPPER(v_vendor)
                  OR (UPPER(v_vendor) LIKE '%' || UPPER(vendor_code) || '%')
                  OR (UPPER(vendor_code) LIKE '%' || UPPER(v_vendor) || '%')
              )
            ORDER BY is_active DESC, available_balance DESC
            LIMIT 1;

            -- Fallback 1: Default to Priority 1 Payout + UrbanRupee wallet
            IF v_wallet.id IS NULL THEN
                SELECT * INTO v_wallet
                FROM public.admin_service_vendor_wallet
                WHERE is_deleted = false
                  AND is_active = true
                  AND UPPER(service_code) = 'PAYOUT'
                  AND (UPPER(vendor_code) LIKE '%URBAN%' OR UPPER(vendor_name) LIKE '%URBAN%')
                LIMIT 1;
            END IF;

            -- Fallback 2: Any active Payout wallet
            IF v_wallet.id IS NULL THEN
                SELECT * INTO v_wallet
                FROM public.admin_service_vendor_wallet
                WHERE is_deleted = false
                  AND is_active = true
                  AND UPPER(service_code) = 'PAYOUT'
                ORDER BY available_balance DESC
                LIMIT 1;
            END IF;

            IF v_wallet.id IS NULL THEN
                v_wallet_eligible := FALSE;
                v_block_reason := 'Admin wallet configuration is not available for this Service and Vendor. Approval cannot continue.';
            ELSIF v_wallet.is_active = FALSE THEN
                v_wallet_eligible := FALSE;
                v_block_reason := 'The mapped Admin wallet is inactive. Approval cannot continue.';
            ELSIF v_wallet.available_balance < v_effective_amount THEN
                v_balance_eligible := FALSE;
                v_shortfall := v_effective_amount - v_wallet.available_balance;
                v_block_reason := 'Admin balance is low. Please add funds to continue the approval.';
            END IF;

            -- 7. Combine Approval Eligibility
            IF NOT v_date_eligible THEN
                v_can_approve := FALSE;
                v_block_reason := v_date_block_reason;
            ELSIF NOT v_wallet_eligible OR NOT v_balance_eligible THEN
                v_can_approve := FALSE;
            ELSE
                v_can_approve := TRUE;
                v_block_reason := '';
            END IF;

            RETURN jsonb_build_object(
                'success', TRUE,
                'topup_id', v_topup.public_id,
                'topup_request_id', v_topup.topup_request_id,
                'status', v_topup.status,
                'is_eligible', v_can_approve,
                'can_approve', v_can_approve,
                'date_eligible', v_date_eligible,
                'wallet_eligible', v_wallet_eligible,
                'balance_eligible', v_balance_eligible,
                'is_pos_t1', v_is_t1,
                'pos_type', CASE WHEN v_is_t1 THEN 'POS T1' ELSE 'POS Instant' END,
                'payment_mode', COALESCE(v_topup.payment_method, 'POS - Instant'),
                'service', COALESCE(v_wallet.service_name, v_service),
                'service_code', COALESCE(v_wallet.service_code, 'PAYOUT'),
                'vendor', COALESCE(v_wallet.vendor_name, v_vendor),
                'vendor_code', COALESCE(v_wallet.vendor_code, 'URBANRUPEE'),
                'admin_wallet_id', v_wallet.public_id,
                'admin_available_balance', COALESCE(v_wallet.available_balance, 0.00),
                'required_amount', v_effective_amount,
                'shortfall_amount', v_shortfall,
                'block_reason', v_block_reason,
                'request_date', v_req_cal_date,
                'current_business_date', v_curr_cal_date
            );
        END;
        $$;
        """
    ]

    async with AsyncSessionLocal() as session:
        for stmt in statements:
            s_clean = stmt.strip()
            if s_clean:
                await session.execute(text(s_clean))
        await session.commit()
        print("✅ Migration executed and committed successfully.")

        # Verify admin_service_vendor_wallet
        print("\n--- Verified admin_service_vendor_wallet entries ---")
        res = await session.execute(text(
            "SELECT id, service_code, vendor_code, vendor_name, wallet_number, available_balance, is_active "
            "FROM public.admin_service_vendor_wallet ORDER BY id;"
        ))
        for row in res.mappings().all():
            print(dict(row))

        # Verify SP return order
        print("\n--- Verified public.sp_get_admin_service_vendor_wallets return ---")
        sp_res = await session.execute(text(
            "SELECT id, service_code, vendor_code, vendor_name, wallet_number, available_balance, is_active "
            "FROM public.sp_get_admin_service_vendor_wallets('00000000-0000-0000-0000-000000000001', NULL, NULL);"
        ))
        for row in sp_res.mappings().all():
            print(dict(row))

        # Verify payout gateway configs
        print("\n--- Verified payout_gateway_configs ---")
        gw_res = await session.execute(text(
            "SELECT id, provider_code, provider_name, priority, is_default, status, is_active "
            "FROM public.payout_gateway_configs ORDER BY priority ASC;"
        ))
        for row in gw_res.mappings().all():
            print(dict(row))


if __name__ == "__main__":
    asyncio.run(main())
