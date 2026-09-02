-- ====================================================================
-- Pay2Pay Enterprise Mobile Recharge Suite
-- Stored Procedures, Tables, Seed Data & CR/DR Wallet Integration
-- ====================================================================

-- 1. Operator Master Table
CREATE TABLE IF NOT EXISTS public.recharge_operators (
    id SERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    operator_code VARCHAR(50) NOT NULL UNIQUE,
    operator_name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'PREPAID',
    logo_url TEXT,
    supported_circles JSONB DEFAULT '["All India", "Andhra Pradesh & Telangana", "Delhi NCR", "Gujarat", "Karnataka", "Kerala", "Maharashtra & Goa", "Mumbai", "Punjab", "Tamil Nadu", "UP East", "UP West", "West Bengal"]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 1,
    tenant_id UUID,
    company_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_recharge_operators_code ON public.recharge_operators (operator_code);
CREATE INDEX IF NOT EXISTS ix_recharge_operators_active ON public.recharge_operators (is_active, display_order);

-- 2. Dynamic Recharge Plans Catalog
CREATE TABLE IF NOT EXISTS public.recharge_plans (
    id SERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    operator_code VARCHAR(50) NOT NULL REFERENCES public.recharge_operators(operator_code) ON UPDATE CASCADE,
    circle VARCHAR(50) NOT NULL DEFAULT 'ALL',
    amount NUMERIC(10,2) NOT NULL,
    validity VARCHAR(50) NOT NULL,
    data_quota VARCHAR(50) NOT NULL,
    voice_benefit VARCHAR(100) NOT NULL DEFAULT 'Unlimited Calls',
    sms_benefit VARCHAR(50) NOT NULL DEFAULT '100 SMS/day',
    plan_type VARCHAR(50) NOT NULL DEFAULT 'POPULAR',
    description TEXT,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 1,
    tenant_id UUID,
    company_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_recharge_plans_op_type ON public.recharge_plans (operator_code, plan_type, is_active);
CREATE INDEX IF NOT EXISTS ix_recharge_plans_amount ON public.recharge_plans (amount);

-- 3. Dynamic Commission Configuration (No hardcoding)
CREATE TABLE IF NOT EXISTS public.recharge_commission_configs (
    id SERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    service_code VARCHAR(50) NOT NULL DEFAULT 'MOBILE_RECHARGE',
    role VARCHAR(50) NOT NULL DEFAULT 'RETAILER',
    commission_type VARCHAR(20) NOT NULL DEFAULT 'FIXED', -- FIXED, PERCENTAGE
    commission_value NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
    min_amount NUMERIC(10,2) NOT NULL DEFAULT 10.00,
    max_amount NUMERIC(10,2) NOT NULL DEFAULT 50000.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID,
    company_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_recharge_comm_cfg ON public.recharge_commission_configs (service_code, role, is_active);

-- 4. Dynamic Tax Configuration (Separate from recharge amount)
CREATE TABLE IF NOT EXISTS public.recharge_tax_configs (
    id SERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    service_code VARCHAR(50) NOT NULL DEFAULT 'MOBILE_RECHARGE',
    tax_name VARCHAR(50) NOT NULL DEFAULT 'GST',
    tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0.0000, -- 0.00% by default, or configurable e.g. 0.1800
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID,
    company_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Comprehensive Recharge Transactions Table
CREATE TABLE IF NOT EXISTS public.recharge_transactions (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    reference_id VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(150) UNIQUE,
    tenant_id UUID,
    company_id UUID,
    retailer_id UUID NOT NULL,
    retailer_code VARCHAR(50),
    retailer_name VARCHAR(150),
    mobile_number VARCHAR(20) NOT NULL,
    operator_code VARCHAR(50) NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    circle VARCHAR(50) DEFAULT 'All India',
    plan_id UUID,
    plan_type VARCHAR(50) DEFAULT 'CUSTOM',
    plan_description TEXT,
    recharge_amount NUMERIC(18,2) NOT NULL,
    commission_amount NUMERIC(18,2) NOT NULL DEFAULT 1.00,
    tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    net_wallet_debit NUMERIC(18,2) NOT NULL,
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    wallet_debit_txn_id VARCHAR(100),
    wallet_comm_txn_id VARCHAR(100),
    wallet_tax_txn_id VARCHAR(100),
    vendor_name VARCHAR(50) DEFAULT 'UTKALDIGITAL',
    vendor_reference VARCHAR(100),
    vendor_transaction_id VARCHAR(100),
    operator_ref VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    failure_reason TEXT,
    reversal_txn_id VARCHAR(100),
    reversal_reason TEXT,
    reversal_date TIMESTAMPTZ,
    ip_address VARCHAR(50),
    user_agent TEXT,
    day_key INTEGER,
    week_key INTEGER,
    month_key INTEGER,
    quarter_key INTEGER,
    year_key INTEGER,
    financial_year_key INTEGER,
    financial_quarter_key INTEGER,
    financial_month_key INTEGER,
    date_key INTEGER,
    time_key INTEGER,
    partition_year INTEGER,
    partition_month INTEGER,
    partition_day INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_recharge_tx_ret ON public.recharge_transactions (retailer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_recharge_tx_mob ON public.recharge_transactions (mobile_number);
CREATE INDEX IF NOT EXISTS ix_recharge_tx_status ON public.recharge_transactions (status);
CREATE INDEX IF NOT EXISTS ix_recharge_tx_date ON public.recharge_transactions (date_key, created_at);

-- ====================================================================
-- SEED DATA: Operators, Plans & Configs
-- ====================================================================

-- Seed Operators
INSERT INTO public.recharge_operators (operator_code, operator_name, category, logo_url, display_order)
VALUES 
    ('JIO', 'Reliance Jio', 'PREPAID', 'https://assets.pay2pay.in/operators/jio.svg', 1),
    ('AIRTEL', 'Bharti Airtel', 'PREPAID', 'https://assets.pay2pay.in/operators/airtel.svg', 2),
    ('VI', 'Vodafone Idea (Vi)', 'PREPAID', 'https://assets.pay2pay.in/operators/vi.svg', 3),
    ('BSNL', 'BSNL GSM', 'PREPAID', 'https://assets.pay2pay.in/operators/bsnl.svg', 4),
    ('MTNL', 'MTNL Mumbai / Delhi', 'PREPAID', 'https://assets.pay2pay.in/operators/mtnl.svg', 5)
ON CONFLICT (operator_code) DO UPDATE SET
    operator_name = EXCLUDED.operator_name,
    display_order = EXCLUDED.display_order,
    is_active = TRUE;

-- Seed Commission Config (Default ₹1.00 per recharge)
INSERT INTO public.recharge_commission_configs (service_code, role, commission_type, commission_value, is_active)
VALUES ('MOBILE_RECHARGE', 'RETAILER', 'FIXED', 1.0000, TRUE)
ON CONFLICT DO NOTHING;

-- Seed Tax Config (0% Default GST on recharge debit; separate identifiable ledger)
INSERT INTO public.recharge_tax_configs (service_code, tax_name, tax_rate, is_active)
VALUES ('MOBILE_RECHARGE', 'GST', 0.0000, TRUE)
ON CONFLICT DO NOTHING;

-- Seed Popular & Dynamic Plans for Top Operators
DELETE FROM public.recharge_plans WHERE circle = 'ALL';

-- JIO Plans
INSERT INTO public.recharge_plans (operator_code, circle, amount, validity, data_quota, voice_benefit, sms_benefit, plan_type, description, is_popular, is_best_seller, display_order)
VALUES
    ('JIO', 'ALL', 19.00, 'Existing Active Plan', '1.5 GB Data', 'No Voice Benefit', 'No SMS', 'DATA_ADDON', 'High speed 4G/5G booster pack with 1.5GB data.', FALSE, FALSE, 1),
    ('JIO', 'ALL', 29.00, 'Existing Active Plan', '2.5 GB Data', 'No Voice Benefit', 'No SMS', 'DATA_ADDON', 'Data booster with 2.5GB high-speed allowance.', FALSE, FALSE, 2),
    ('JIO', 'ALL', 198.00, '14 Days', '2 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', 'Unlimited True 5G data with 2GB daily quota + JioCinema.', TRUE, FALSE, 3),
    ('JIO', 'ALL', 239.00, '22 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Best budget daily pack with unlimited calls and 1.5GB/day data.', TRUE, TRUE, 4),
    ('JIO', 'ALL', 299.00, '28 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'POPULAR', 'Standard monthly plan: 1.5GB/day high-speed 4G data + Jio TV/Cinema.', TRUE, TRUE, 5),
    ('JIO', 'ALL', 349.00, '28 Days', '2 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', 'Hero True 5G Unlimited Plan with 2GB/day and JioCinema access.', TRUE, TRUE, 6),
    ('JIO', 'ALL', 399.00, '28 Days', '2.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'DAILY_DATA', 'High data daily pack with 2.5GB/day + free national roaming.', FALSE, FALSE, 7),
    ('JIO', 'ALL', 479.00, '56 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', '2-month saver plan: 84GB total data with uninterrupted voice.', TRUE, FALSE, 8),
    ('JIO', 'ALL', 666.00, '70 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'VALIDITY', 'Long validity value pack with 1.5GB/day for 70 days.', FALSE, FALSE, 9),
    ('JIO', 'ALL', 749.00, '72 Days', '2 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', 'True 5G Unlimited pack with 2GB/day + 20GB extra bonus data.', FALSE, TRUE, 10),
    ('JIO', 'ALL', 899.00, '90 Days', '2 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Quarterly superstar: 90 days validity, 2GB/day + 20GB extra.', TRUE, TRUE, 11),
    ('JIO', 'ALL', 3599.00, '365 Days', '2.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'ANNUAL', 'Full Year 365 Days Annual Plan: 2.5GB/day Unlimited True 5G.', FALSE, TRUE, 12);

-- AIRTEL Plans
INSERT INTO public.recharge_plans (operator_code, circle, amount, validity, data_quota, voice_benefit, sms_benefit, plan_type, description, is_popular, is_best_seller, display_order)
VALUES
    ('AIRTEL', 'ALL', 22.00, '1 Day', '1 GB Data', 'No Voice', 'No SMS', 'DATA_ADDON', '1 Day 1GB 4G/5G data top-up with Wynk Music access.', FALSE, FALSE, 1),
    ('AIRTEL', 'ALL', 199.00, '28 Days', '2 GB Total', 'Unlimited Calls', '100 SMS/day', 'TALKTIME', 'Budget monthly pack with truly unlimited voice calls and 2GB data.', FALSE, FALSE, 2),
    ('AIRTEL', 'ALL', 299.00, '28 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Top Seller: 1.5GB/day 4G/5G data with Wynk & Apollo 24|7 circle.', TRUE, TRUE, 3),
    ('AIRTEL', 'ALL', 349.00, '28 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', 'Unlimited 5G Data Pack with 1.5GB/day 4G base + Airtel Xstream Play.', TRUE, TRUE, 4),
    ('AIRTEL', 'ALL', 399.00, '28 Days', '3 GB/day', 'Unlimited Calls', '100 SMS/day', 'DAILY_DATA', 'Heavy user pack with 3GB daily quota + Unlimited 5G.', FALSE, FALSE, 5),
    ('AIRTEL', 'ALL', 409.00, '28 Days', '2.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', 'Airtel Xstream Play subscription included + 2.5GB daily data.', FALSE, FALSE, 6),
    ('AIRTEL', 'ALL', 479.00, '56 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Bestseller 56-day pack: 1.5GB/day + free Hellotunes.', TRUE, TRUE, 7),
    ('AIRTEL', 'ALL', 579.00, '56 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', 'Unlimited 5G for 56 days + 1.5GB/day 4G.', FALSE, FALSE, 8),
    ('AIRTEL', 'ALL', 859.00, '84 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Quarterly pack: 84 Days with 1.5GB/day and RewardsMini benefits.', TRUE, TRUE, 9),
    ('AIRTEL', 'ALL', 979.00, '84 Days', '2 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', '84 Days Unlimited 5G pack with 2GB/day 4G data + Xstream.', FALSE, TRUE, 10),
    ('AIRTEL', 'ALL', 3599.00, '365 Days', '2 GB/day', 'Unlimited Calls', '100 SMS/day', 'ANNUAL', 'Annual Mega Plan: 365 days of 2GB/day Unlimited 5G.', FALSE, TRUE, 11);

-- VI Plans
INSERT INTO public.recharge_plans (operator_code, circle, amount, validity, data_quota, voice_benefit, sms_benefit, plan_type, description, is_popular, is_best_seller, display_order)
VALUES
    ('VI', 'ALL', 24.00, '1 Day', '1 GB Data', 'No Voice', 'No SMS', 'DATA_ADDON', 'Super hour 1GB data booster pack for Vi users.', FALSE, FALSE, 1),
    ('VI', 'ALL', 199.00, '18 Days', '1 GB/day', 'Unlimited Calls', '100 SMS/day', 'TALKTIME', 'Unlimited voice calling with 1GB daily quota.', FALSE, FALSE, 2),
    ('VI', 'ALL', 299.00, '28 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Hero Unlimited: 12AM-6AM Binge All Night + Weekend Data Rollover.', TRUE, TRUE, 3),
    ('VI', 'ALL', 349.00, '28 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'TRUE_5G', 'Vi Hero Unlimited with 5GB extra data on Vi App.', TRUE, FALSE, 4),
    ('VI', 'ALL', 399.00, '28 Days', '2.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'DAILY_DATA', '2.5GB/day + Disney+ Hotstar Mobile 3-month subscription.', FALSE, TRUE, 5),
    ('VI', 'ALL', 479.00, '56 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', '56 Days validity pack with Weekend Rollover and 1.5GB/day.', TRUE, TRUE, 6),
    ('VI', 'ALL', 719.00, '84 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'VALIDITY', '84 Days long term plan with free nightly unlimited data.', FALSE, FALSE, 7),
    ('VI', 'ALL', 859.00, '84 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Quarterly Hero Unlimited with full 84 days coverage.', TRUE, TRUE, 8),
    ('VI', 'ALL', 3499.00, '365 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'ANNUAL', 'Annual 365 Days Hero Unlimited with 50GB extra data.', FALSE, TRUE, 9);

-- BSNL Plans
INSERT INTO public.recharge_plans (operator_code, circle, amount, validity, data_quota, voice_benefit, sms_benefit, plan_type, description, is_popular, is_best_seller, display_order)
VALUES
    ('BSNL', 'ALL', 107.00, '35 Days', '3 GB Total', '200 Mins Voice', 'No SMS', 'TALKTIME', 'Low cost validity extension pack with 35 days service.', TRUE, FALSE, 1),
    ('BSNL', 'ALL', 197.00, '70 Days', '2 GB/day for 18d', 'Unlimited Calls for 18d', '100 SMS/d for 18d', 'VALIDITY', '70 Days validity keeper plan with 18 days unlimited calls & data.', TRUE, TRUE, 2),
    ('BSNL', 'ALL', 249.00, '45 Days', '2 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Best value: 45 days unlimited voice with 2GB daily 4G data.', TRUE, TRUE, 3),
    ('BSNL', 'ALL', 397.00, '150 Days', '2 GB/day for 30d', 'Unlimited Calls for 30d', '100 SMS/d for 30d', 'VALIDITY', '150 Days validity pack: best for secondary SIM maintenance.', FALSE, TRUE, 4),
    ('BSNL', 'ALL', 599.00, '84 Days', '3 GB/day', 'Unlimited Calls', '100 SMS/day', 'DAILY_DATA', '84 Days with massive 3GB/day data + Zing music subscription.', TRUE, TRUE, 5),
    ('BSNL', 'ALL', 797.00, '300 Days', '2 GB/day for 60d', 'Unlimited Calls for 60d', '100 SMS/d for 60d', 'ANNUAL', '300 Days long-term budget plan with 60 days full perks.', FALSE, TRUE, 6);

-- MTNL Plans
INSERT INTO public.recharge_plans (operator_code, circle, amount, validity, data_quota, voice_benefit, sms_benefit, plan_type, description, is_popular, is_best_seller, display_order)
VALUES
    ('MTNL', 'ALL', 141.00, '365 Days', '1 GB Data', 'Free Local/STD 200m', 'No SMS', 'VALIDITY', '1 Year SIM validity extension pack for Mumbai/Delhi MTNL users.', TRUE, TRUE, 1),
    ('MTNL', 'ALL', 225.00, '30 Days', '1.5 GB/day', 'Unlimited Calls', '100 SMS/day', 'RECOMMENDED', 'Monthly MTNL Dolphin prepaid pack with 1.5GB daily data.', TRUE, FALSE, 2);

-- ====================================================================
-- STORED PROCEDURES
-- ====================================================================

-- --------------------------------------------------------------------
-- SP 1: sp_recharge_validate_request
-- Validates retailer, wallet balance, operator, computes dynamic commission & tax.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_validate_request(
    p_retailer_id      UUID,
    p_mobile_number    VARCHAR(20),
    p_operator_code    VARCHAR(50),
    p_recharge_amount  NUMERIC(18,2)
)
RETURNS TABLE (
    is_valid           BOOLEAN,
    error_code         VARCHAR(50),
    error_message      VARCHAR(255),
    opening_balance    NUMERIC(18,2),
    recharge_amount    NUMERIC(18,2),
    commission_amount  NUMERIC(18,2),
    tax_amount         NUMERIC(18,2),
    net_wallet_debit   NUMERIC(18,2),
    closing_balance    NUMERIC(18,2),
    retailer_code      VARCHAR(50),
    retailer_name      VARCHAR(150),
    operator_name      VARCHAR(100)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_retailer_code    VARCHAR(50);
    v_retailer_name    VARCHAR(150);
    v_wallet_bal       NUMERIC(18,2) := 0.00;
    v_is_active        BOOLEAN := FALSE;
    v_op_name          VARCHAR(100);
    v_comm_val         NUMERIC(18,2) := 1.00;
    v_comm_type        VARCHAR(20) := 'FIXED';
    v_tax_rate         NUMERIC(6,4) := 0.0000;
    v_tax_amt          NUMERIC(18,2) := 0.00;
    v_net_debit        NUMERIC(18,2);
    v_closing          NUMERIC(18,2);
BEGIN
    -- 1. Mobile Number Check
    IF p_mobile_number IS NULL OR LENGTH(REGEXP_REPLACE(p_mobile_number, '[^0-9]', '', 'g')) != 10 THEN
        RETURN QUERY SELECT FALSE, 'INVALID_MOBILE'::VARCHAR, 'Mobile number must be exactly 10 digits.'::VARCHAR,
            0.00::NUMERIC, p_recharge_amount, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR;
        RETURN;
    END IF;

    -- 2. Amount Check
    IF p_recharge_amount IS NULL OR p_recharge_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 'INVALID_AMOUNT'::VARCHAR, 'Recharge amount must be greater than zero.'::VARCHAR,
            0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR;
        RETURN;
    END IF;

    -- 3. Validate Operator
    SELECT ro.operator_name INTO v_op_name
    FROM public.recharge_operators ro
    WHERE ro.operator_code = UPPER(TRIM(p_operator_code)) AND ro.is_active = TRUE AND ro.is_deleted = FALSE;

    IF v_op_name IS NULL THEN
        RETURN QUERY SELECT FALSE, 'INVALID_OPERATOR'::VARCHAR, 'Selected operator is inactive or invalid.'::VARCHAR,
            0.00::NUMERIC, p_recharge_amount, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR;
        RETURN;
    END IF;

    -- 4. Validate Retailer
    SELECT r.retailer_code, COALESCE(r.owner_name, r.store_name, r.legal_name, 'Retailer'), r.is_active
    INTO v_retailer_code, v_retailer_name, v_is_active
    FROM public.retailer r
    WHERE r.public_id = p_retailer_id AND r.is_deleted = FALSE;

    IF v_retailer_code IS NULL THEN
        RETURN QUERY SELECT FALSE, 'RETAILER_NOT_FOUND'::VARCHAR, 'Retailer account not found.'::VARCHAR,
            0.00::NUMERIC, p_recharge_amount, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, NULL::VARCHAR, NULL::VARCHAR, v_op_name;
        RETURN;
    END IF;

    IF NOT v_is_active THEN
        RETURN QUERY SELECT FALSE, 'RETAILER_INACTIVE'::VARCHAR, 'Retailer account is deactivated or on hold.'::VARCHAR,
            0.00::NUMERIC, p_recharge_amount, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, 0.00::NUMERIC, v_retailer_code, v_retailer_name, v_op_name;
        RETURN;
    END IF;

    -- 5. Fetch Authoritative Wallet Balance
    SELECT COALESCE(w.wallet_balance, 0.00) INTO v_wallet_bal
    FROM public.retailer_wallet w
    WHERE w.retailer_id = p_retailer_id AND w.is_deleted = FALSE;

    -- 6. Dynamic Commission Calculation from Rules
    SELECT rc.commission_type, rc.commission_value
    INTO v_comm_type, v_comm_val
    FROM public.recharge_commission_configs rc
    WHERE rc.service_code = 'MOBILE_RECHARGE' AND rc.role = 'RETAILER' AND rc.is_active = TRUE AND rc.is_deleted = FALSE
    LIMIT 1;

    IF v_comm_type = 'PERCENTAGE' THEN
        v_comm_val := ROUND((p_recharge_amount * v_comm_val / 100.0), 2);
    ELSE
        v_comm_val := COALESCE(v_comm_val, 1.00);
    END IF;

    -- 7. Dynamic Tax Calculation from Rules
    SELECT COALESCE(rt.tax_rate, 0.0000) INTO v_tax_rate
    FROM public.recharge_tax_configs rt
    WHERE rt.service_code = 'MOBILE_RECHARGE' AND rt.is_active = TRUE AND rt.is_deleted = FALSE
    LIMIT 1;

    IF v_tax_rate > 0 THEN
        v_tax_amt := ROUND(p_recharge_amount * v_tax_rate, 2);
    ELSE
        v_tax_amt := 0.00;
    END IF;

    -- Net debit = Recharge Amount (Commission is credited separately in Step 2, Tax is debited in Step 3)
    -- Total required funds at time of initiation = Recharge Amount + Tax
    v_net_debit := p_recharge_amount + v_tax_amt;
    v_closing := v_wallet_bal - p_recharge_amount + v_comm_val - v_tax_amt;

    -- 8. Balance Sufficiency Check
    IF v_wallet_bal < v_net_debit THEN
        RETURN QUERY SELECT FALSE, 'INSUFFICIENT_BALANCE'::VARCHAR,
            FORMAT('Insufficient wallet balance. Required: ₹%s, Available: ₹%s', TO_CHAR(v_net_debit, 'FM999,990.00'), TO_CHAR(v_wallet_bal, 'FM999,990.00'))::VARCHAR,
            v_wallet_bal, p_recharge_amount, v_comm_val, v_tax_amt, v_net_debit, v_closing, v_retailer_code, v_retailer_name, v_op_name;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, NULL::VARCHAR, 'Validation Successful.'::VARCHAR,
        v_wallet_bal, p_recharge_amount, v_comm_val, v_tax_amt, v_net_debit, v_closing, v_retailer_code, v_retailer_name, v_op_name;
END;
$$;


-- --------------------------------------------------------------------
-- SP 2: sp_recharge_create_transaction
-- Idempotent transaction initialization in INITIATED status
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_create_transaction(
    p_retailer_id       UUID,
    p_mobile_number     VARCHAR(20),
    p_operator_code     VARCHAR(50),
    p_circle            VARCHAR(50),
    p_recharge_amount   NUMERIC(18,2),
    p_plan_id           UUID,
    p_plan_type         VARCHAR(50),
    p_plan_description  TEXT,
    p_idempotency_key   VARCHAR(150),
    p_ip_address        VARCHAR(50),
    p_user_agent        TEXT
)
RETURNS TABLE (
    success             BOOLEAN,
    is_idempotent       BOOLEAN,
    transaction_id      VARCHAR(100),
    reference_id        VARCHAR(100),
    recharge_public_id  UUID,
    status              VARCHAR(30),
    opening_balance     NUMERIC(18,2),
    commission_amount   NUMERIC(18,2),
    tax_amount          NUMERIC(18,2),
    net_wallet_debit    NUMERIC(18,2),
    closing_balance     NUMERIC(18,2),
    error_message       VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_val_rec           RECORD;
    v_existing_rec      RECORD;
    v_txn_id            VARCHAR(100);
    v_ref_id            VARCHAR(100);
    v_pub_id            UUID;
    v_tenant_id         UUID;
    v_company_id        UUID;
    v_now               TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Idempotency Check: if request with exact key already exists, return existing status
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        SELECT t.public_id, t.transaction_id, t.reference_id, t.status, t.opening_balance,
               t.commission_amount, t.tax_amount, t.net_wallet_debit, t.closing_balance
        INTO v_existing_rec
        FROM public.recharge_transactions t
        WHERE t.idempotency_key = TRIM(p_idempotency_key);

        IF FOUND THEN
            RETURN QUERY SELECT TRUE, TRUE, v_existing_rec.transaction_id, v_existing_rec.reference_id,
                v_existing_rec.public_id, v_existing_rec.status, v_existing_rec.opening_balance,
                v_existing_rec.commission_amount, v_existing_rec.tax_amount, v_existing_rec.net_wallet_debit,
                v_existing_rec.closing_balance, 'Idempotent request matched existing transaction.'::VARCHAR;
            RETURN;
        END IF;
    END IF;

    -- 2. Validate Request via SP 1
    SELECT * INTO v_val_rec
    FROM public.sp_recharge_validate_request(p_retailer_id, p_mobile_number, p_operator_code, p_recharge_amount);

    IF NOT v_val_rec.is_valid THEN
        RETURN QUERY SELECT FALSE, FALSE, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID, 'FAILED'::VARCHAR,
            v_val_rec.opening_balance, v_val_rec.commission_amount, v_val_rec.tax_amount, v_val_rec.net_wallet_debit,
            v_val_rec.closing_balance, v_val_rec.error_message;
        RETURN;
    END IF;

    -- 3. Resolve Tenant & Company from Retailer
    SELECT tenant_id, company_id INTO v_tenant_id, v_company_id
    FROM public.retailer
    WHERE public_id = p_retailer_id;

    -- 4. Generate Unique IDs
    v_txn_id := 'REC' || TO_CHAR(v_now, 'YYYYMMDDHH24MISS') || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    v_ref_id := 'P2P-REC-' || TO_CHAR(v_now, 'YYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    v_pub_id := gen_random_uuid();

    -- 5. Insert Transaction in INITIATED state
    INSERT INTO public.recharge_transactions (
        public_id, transaction_id, reference_id, idempotency_key,
        tenant_id, company_id, retailer_id, retailer_code, retailer_name,
        mobile_number, operator_code, operator_name, circle,
        plan_id, plan_type, plan_description,
        recharge_amount, commission_amount, tax_amount, net_wallet_debit,
        opening_balance, closing_balance,
        status, ip_address, user_agent,
        date_key, time_key, partition_year, partition_month, partition_day,
        created_at, updated_at
    ) VALUES (
        v_pub_id, v_txn_id, v_ref_id, NULLIF(TRIM(p_idempotency_key), ''),
        v_tenant_id, v_company_id, p_retailer_id, v_val_rec.retailer_code, v_val_rec.retailer_name,
        p_mobile_number, UPPER(TRIM(p_operator_code)), v_val_rec.operator_name, COALESCE(p_circle, 'All India'),
        p_plan_id, COALESCE(p_plan_type, 'CUSTOM'), p_plan_description,
        p_recharge_amount, v_val_rec.commission_amount, v_val_rec.tax_amount, v_val_rec.net_wallet_debit,
        v_val_rec.opening_balance, v_val_rec.closing_balance,
        'INITIATED', p_ip_address, p_user_agent,
        TO_CHAR(v_now, 'YYYYMMDD')::INTEGER, TO_CHAR(v_now, 'HH24MISS')::INTEGER,
        EXTRACT(YEAR FROM v_now)::INTEGER, EXTRACT(MONTH FROM v_now)::INTEGER, EXTRACT(DAY FROM v_now)::INTEGER,
        v_now, v_now
    );

    RETURN QUERY SELECT TRUE, FALSE, v_txn_id, v_ref_id, v_pub_id, 'INITIATED'::VARCHAR,
        v_val_rec.opening_balance, v_val_rec.commission_amount, v_val_rec.tax_amount, v_val_rec.net_wallet_debit,
        v_val_rec.closing_balance, 'Transaction initialized successfully.'::VARCHAR;
END;
$$;


-- --------------------------------------------------------------------
-- SP 3: sp_recharge_execute_accounting
-- Executes the atomic 3-step wallet movement via public.wallet_balance_update:
--   Step 1: DR Recharge Amount
--   Step 2: CR Retailer Commission
--   Step 3: DR Tax (if tax > 0)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_execute_accounting(
    p_recharge_public_id UUID
)
RETURNS TABLE (
    success              BOOLEAN,
    status               VARCHAR(30),
    wallet_debit_txn_id  VARCHAR(100),
    wallet_comm_txn_id   VARCHAR(100),
    wallet_tax_txn_id    VARCHAR(100),
    opening_balance      NUMERIC(18,2),
    final_balance        NUMERIC(18,2),
    error_code           VARCHAR(50),
    error_message        VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_rec                RECORD;
    v_sp_step1           RECORD;
    v_sp_step2           RECORD;
    v_sp_step3           RECORD;
    v_debit_id           VARCHAR(100);
    v_comm_id            VARCHAR(100);
    v_tax_id             VARCHAR(100);
    v_curr_bal           NUMERIC(18,2);
    v_final_bal          NUMERIC(18,2);
BEGIN
    -- 1. Fetch and Lock Transaction
    SELECT * INTO v_rec
    FROM public.recharge_transactions
    WHERE public_id = p_recharge_public_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
            0.00::NUMERIC, 0.00::NUMERIC, 'TXN_NOT_FOUND'::VARCHAR, 'Recharge transaction not found.'::VARCHAR;
        RETURN;
    END IF;

    IF v_rec.status NOT IN ('INITIATED', 'PROCESSING') THEN
        RETURN QUERY SELECT FALSE, v_rec.status, v_rec.wallet_debit_txn_id, v_rec.wallet_comm_txn_id, v_rec.wallet_tax_txn_id,
            v_rec.opening_balance, v_rec.closing_balance, 'INVALID_STATE'::VARCHAR, FORMAT('Transaction is already in %s state.', v_rec.status)::VARCHAR;
        RETURN;
    END IF;

    -- ================================================================
    -- STEP 1: DEBIT RECHARGE AMOUNT (DR)
    -- ================================================================
    v_debit_id := 'DR-' || v_rec.transaction_id;

    SELECT * INTO v_sp_step1
    FROM public.wallet_balance_update(
        p_tenant_id        := v_rec.tenant_id,
        p_company_id       := v_rec.company_id,
        p_retailer_id      := v_rec.retailer_id,
        p_txn_id           := v_debit_id,
        p_ref_id           := v_rec.reference_id,
        p_table_ref_id     := v_rec.public_id,
        p_entry_type       := 'DEBIT',
        p_total_amount     := v_rec.recharge_amount,
        p_payout_amount    := v_rec.recharge_amount,
        p_charge_amount    := 0.00,
        p_gst_amount       := 0.00,
        p_service_name     := 'RECHARGE_DEBIT',
        p_wallet_type      := 'MAIN',
        p_user_type        := 'RETAILER',
        p_retailer_name    := v_rec.retailer_name,
        p_narration        := FORMAT('Mobile Recharge DR for %s (%s) ₹%s', v_rec.mobile_number, v_rec.operator_name, v_rec.recharge_amount)
    );

    IF NOT v_sp_step1.success THEN
        UPDATE public.recharge_transactions
        SET status = 'FAILED', failure_reason = COALESCE(v_sp_step1.error_message, 'Wallet debit step failed.'), updated_at = NOW()
        WHERE public_id = p_recharge_public_id;

        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
            v_sp_step1.balance_before, v_sp_step1.balance_after, v_sp_step1.error_code, v_sp_step1.error_message;
        RETURN;
    END IF;

    v_curr_bal := v_sp_step1.balance_after;

    -- ================================================================
    -- STEP 2: CREDIT RETAILER COMMISSION (CR)
    -- ================================================================
    IF v_rec.commission_amount > 0 THEN
        v_comm_id := 'CR-COMM-' || v_rec.transaction_id;

        SELECT * INTO v_sp_step2
        FROM public.wallet_balance_update(
            p_tenant_id        := v_rec.tenant_id,
            p_company_id       := v_rec.company_id,
            p_retailer_id      := v_rec.retailer_id,
            p_txn_id           := v_comm_id,
            p_ref_id           := v_rec.reference_id,
            p_table_ref_id     := v_rec.public_id,
            p_entry_type       := 'CREDIT',
            p_total_amount     := v_rec.commission_amount,
            p_payout_amount    := v_rec.commission_amount,
            p_charge_amount    := 0.00,
            p_gst_amount       := 0.00,
            p_service_name     := 'RECHARGE_COMMISSION_CREDIT',
            p_wallet_type      := 'MAIN',
            p_user_type        := 'RETAILER',
            p_retailer_name    := v_rec.retailer_name,
            p_narration        := FORMAT('Recharge Commission CR for %s (+₹%s)', v_rec.mobile_number, v_rec.commission_amount)
        );

        IF v_sp_step2.success THEN
            v_curr_bal := v_sp_step2.balance_after;
        END IF;
    END IF;

    -- ================================================================
    -- STEP 3: DEBIT APPLICABLE TAX (DR)
    -- ================================================================
    IF v_rec.tax_amount > 0 THEN
        v_tax_id := 'DR-TAX-' || v_rec.transaction_id;

        SELECT * INTO v_sp_step3
        FROM public.wallet_balance_update(
            p_tenant_id        := v_rec.tenant_id,
            p_company_id       := v_rec.company_id,
            p_retailer_id      := v_rec.retailer_id,
            p_txn_id           := v_tax_id,
            p_ref_id           := v_rec.reference_id,
            p_table_ref_id     := v_rec.public_id,
            p_entry_type       := 'DEBIT',
            p_total_amount     := v_rec.tax_amount,
            p_payout_amount    := 0.00,
            p_charge_amount    := 0.00,
            p_gst_amount       := v_rec.tax_amount,
            p_service_name     := 'RECHARGE_TAX_DEBIT',
            p_wallet_type      := 'MAIN',
            p_user_type        := 'RETAILER',
            p_retailer_name    := v_rec.retailer_name,
            p_narration        := FORMAT('Recharge Tax DR for %s (-₹%s)', v_rec.mobile_number, v_rec.tax_amount)
        );

        IF v_sp_step3.success THEN
            v_curr_bal := v_sp_step3.balance_after;
        END IF;
    END IF;

    v_final_bal := v_curr_bal;

    -- Update Transaction Record with Ledger Txn IDs and Running Balances
    UPDATE public.recharge_transactions
    SET status = 'PROCESSING',
        opening_balance = v_sp_step1.balance_before,
        closing_balance = v_final_bal,
        wallet_debit_txn_id = v_debit_id,
        wallet_comm_txn_id = v_comm_id,
        wallet_tax_txn_id = v_tax_id,
        updated_at = NOW()
    WHERE public_id = p_recharge_public_id;

    RETURN QUERY SELECT TRUE, 'PROCESSING'::VARCHAR, v_debit_id, v_comm_id, v_tax_id,
        v_sp_step1.balance_before, v_final_bal, NULL::VARCHAR, 'Accounting executed successfully.'::VARCHAR;
END;
$$;


-- --------------------------------------------------------------------
-- SP 4: sp_recharge_finalize_transaction
-- Marks recharge transaction SUCCESS, FAILED, or PENDING with vendor refs
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_finalize_transaction(
    p_recharge_public_id      UUID,
    p_final_status            VARCHAR(30),
    p_vendor_name             VARCHAR(50),
    p_vendor_reference        VARCHAR(100),
    p_vendor_transaction_id   VARCHAR(100),
    p_operator_ref            VARCHAR(100),
    p_failure_reason          TEXT
)
RETURNS TABLE (
    success                   BOOLEAN,
    status                    VARCHAR(30),
    transaction_id            VARCHAR(100),
    reference_id              VARCHAR(100),
    operator_ref              VARCHAR(100),
    completed_at              TIMESTAMPTZ,
    error_message             VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_now                     TIMESTAMPTZ := NOW();
    v_txn_id                  VARCHAR(100);
    v_ref_id                  VARCHAR(100);
BEGIN
    UPDATE public.recharge_transactions
    SET status = p_final_status,
        vendor_name = COALESCE(p_vendor_name, public.recharge_transactions.vendor_name),
        vendor_reference = COALESCE(p_vendor_reference, public.recharge_transactions.vendor_reference),
        vendor_transaction_id = COALESCE(p_vendor_transaction_id, public.recharge_transactions.vendor_transaction_id),
        operator_ref = COALESCE(p_operator_ref, public.recharge_transactions.operator_ref),
        failure_reason = p_failure_reason,
        completed_at = v_now,
        updated_at = v_now
    WHERE public.recharge_transactions.public_id = p_recharge_public_id
    RETURNING public.recharge_transactions.transaction_id, public.recharge_transactions.reference_id INTO v_txn_id, v_ref_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TIMESTAMPTZ, 'Transaction not found.'::VARCHAR;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, p_final_status, v_txn_id, v_ref_id, p_operator_ref, v_now, 'Transaction finalized.'::VARCHAR;
END;
$$;


-- --------------------------------------------------------------------
-- SP 5: sp_recharge_reverse_transaction
-- Handles atomic reversal/refund on vendor failure:
--   CR Recharge Amount back to Retailer Wallet
--   DR Commission back if previously credited
--   CR Tax back if previously debited
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_reverse_transaction(
    p_recharge_public_id  UUID,
    p_reversal_reason     TEXT
)
RETURNS TABLE (
    success               BOOLEAN,
    status                VARCHAR(30),
    reversal_txn_id       VARCHAR(100),
    refunded_amount       NUMERIC(18,2),
    final_balance         NUMERIC(18,2),
    error_message         VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_rec                 RECORD;
    v_rev_id              VARCHAR(100);
    v_comm_rev_id         VARCHAR(100);
    v_tax_rev_id          VARCHAR(100);
    v_sp_res              RECORD;
    v_curr_bal            NUMERIC(18,2);
BEGIN
    SELECT * INTO v_rec
    FROM public.recharge_transactions
    WHERE public_id = p_recharge_public_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'FAILED'::VARCHAR, NULL::VARCHAR, 0.00::NUMERIC, 0.00::NUMERIC, 'Transaction not found.'::VARCHAR;
        RETURN;
    END IF;

    IF v_rec.status IN ('REFUNDED', 'REVERSED') THEN
        RETURN QUERY SELECT TRUE, v_rec.status, v_rec.reversal_txn_id, v_rec.recharge_amount, v_rec.closing_balance, 'Transaction was already reversed.'::VARCHAR;
        RETURN;
    END IF;

    -- Only reverse if wallet debit actually happened
    IF v_rec.wallet_debit_txn_id IS NULL THEN
        UPDATE public.recharge_transactions
        SET status = 'FAILED', failure_reason = p_reversal_reason, updated_at = NOW()
        WHERE public_id = p_recharge_public_id;

        RETURN QUERY SELECT TRUE, 'FAILED'::VARCHAR, NULL::VARCHAR, 0.00::NUMERIC, v_rec.closing_balance, 'No wallet debit occurred; marked FAILED without reversal.'::VARCHAR;
        RETURN;
    END IF;

    -- 1. Refund the Recharge Amount (CR)
    v_rev_id := 'REV-DR-' || v_rec.transaction_id;
    SELECT * INTO v_sp_res
    FROM public.wallet_balance_update(
        p_tenant_id        := v_rec.tenant_id,
        p_company_id       := v_rec.company_id,
        p_retailer_id      := v_rec.retailer_id,
        p_txn_id           := v_rev_id,
        p_ref_id           := v_rec.reference_id,
        p_table_ref_id     := v_rec.public_id,
        p_entry_type       := 'CREDIT',
        p_total_amount     := v_rec.recharge_amount,
        p_payout_amount    := v_rec.recharge_amount,
        p_charge_amount    := 0.00,
        p_gst_amount       := 0.00,
        p_service_name     := 'RECHARGE_REVERSAL_CREDIT',
        p_wallet_type      := 'MAIN',
        p_user_type        := 'RETAILER',
        p_retailer_name    := v_rec.retailer_name,
        p_narration        := FORMAT('Reversal/Refund for Failed Recharge %s (Ref: %s)', v_rec.mobile_number, v_rec.transaction_id)
    );

    v_curr_bal := v_sp_res.balance_after;

    -- 2. Reverse Commission if credited (DR)
    IF v_rec.wallet_comm_txn_id IS NOT NULL AND v_rec.commission_amount > 0 THEN
        v_comm_rev_id := 'REV-COMM-' || v_rec.transaction_id;
        SELECT * INTO v_sp_res
        FROM public.wallet_balance_update(
            p_tenant_id        := v_rec.tenant_id,
            p_company_id       := v_rec.company_id,
            p_retailer_id      := v_rec.retailer_id,
            p_txn_id           := v_comm_rev_id,
            p_ref_id           := v_rec.reference_id,
            p_table_ref_id     := v_rec.public_id,
            p_entry_type       := 'DEBIT',
            p_total_amount     := v_rec.commission_amount,
            p_payout_amount    := v_rec.commission_amount,
            p_charge_amount    := 0.00,
            p_gst_amount       := 0.00,
            p_service_name     := 'RECHARGE_COMMISSION_REVERSAL',
            p_wallet_type      := 'MAIN',
            p_user_type        := 'RETAILER',
            p_retailer_name    := v_rec.retailer_name,
            p_narration        := FORMAT('Commission clawback for Failed Recharge %s (-₹%s)', v_rec.mobile_number, v_rec.commission_amount)
        );

        IF v_sp_res.success THEN
            v_curr_bal := v_sp_res.balance_after;
        END IF;
    END IF;

    -- 3. Reverse Tax if debited (CR)
    IF v_rec.wallet_tax_txn_id IS NOT NULL AND v_rec.tax_amount > 0 THEN
        v_tax_rev_id := 'REV-TAX-' || v_rec.transaction_id;
        SELECT * INTO v_sp_res
        FROM public.wallet_balance_update(
            p_tenant_id        := v_rec.tenant_id,
            p_company_id       := v_rec.company_id,
            p_retailer_id      := v_rec.retailer_id,
            p_txn_id           := v_tax_rev_id,
            p_ref_id           := v_rec.reference_id,
            p_table_ref_id     := v_rec.public_id,
            p_entry_type       := 'CREDIT',
            p_total_amount     := v_rec.tax_amount,
            p_payout_amount    := 0.00,
            p_charge_amount    := 0.00,
            p_gst_amount       := v_rec.tax_amount,
            p_service_name     := 'RECHARGE_TAX_REVERSAL',
            p_wallet_type      := 'MAIN',
            p_user_type        := 'RETAILER',
            p_retailer_name    := v_rec.retailer_name,
            p_narration        := FORMAT('Tax refund for Failed Recharge %s (+₹%s)', v_rec.mobile_number, v_rec.tax_amount)
        );

        IF v_sp_res.success THEN
            v_curr_bal := v_sp_res.balance_after;
        END IF;
    END IF;

    -- Mark Transaction REVERSED
    UPDATE public.recharge_transactions
    SET status = 'REVERSED',
        reversal_txn_id = v_rev_id,
        reversal_reason = p_reversal_reason,
        reversal_date = NOW(),
        closing_balance = v_curr_bal,
        updated_at = NOW()
    WHERE public_id = p_recharge_public_id;

    RETURN QUERY SELECT TRUE, 'REVERSED'::VARCHAR, v_rev_id, v_rec.recharge_amount, v_curr_bal, 'Reversal executed successfully.'::VARCHAR;
END;
$$;


-- --------------------------------------------------------------------
-- SP 6: sp_recharge_get_operators
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_get_operators()
RETURNS TABLE (
    operator_id        UUID,
    operator_code      VARCHAR(50),
    operator_name      VARCHAR(100),
    category           VARCHAR(30),
    logo_url           TEXT,
    supported_circles  JSONB,
    display_order      INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ro.public_id, ro.operator_code, ro.operator_name, ro.category, ro.logo_url, ro.supported_circles, ro.display_order
    FROM public.recharge_operators ro
    WHERE ro.is_active = TRUE AND ro.is_deleted = FALSE
    ORDER BY ro.display_order ASC, ro.operator_name ASC;
$$;


-- --------------------------------------------------------------------
-- SP 7: sp_recharge_get_plans
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_get_plans(
    p_operator_code    VARCHAR(50),
    p_circle           VARCHAR(50) DEFAULT NULL,
    p_plan_type        VARCHAR(50) DEFAULT NULL,
    p_search_query     VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    plan_id            UUID,
    operator_code      VARCHAR(50),
    circle             VARCHAR(50),
    amount             NUMERIC(10,2),
    validity           VARCHAR(50),
    data_quota         VARCHAR(50),
    voice_benefit      VARCHAR(100),
    sms_benefit        VARCHAR(50),
    plan_type          VARCHAR(50),
    description        TEXT,
    is_popular         BOOLEAN,
    is_best_seller     BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rp.public_id, rp.operator_code, rp.circle, rp.amount, rp.validity, rp.data_quota,
           rp.voice_benefit, rp.sms_benefit, rp.plan_type, rp.description, rp.is_popular, rp.is_best_seller
    FROM public.recharge_plans rp
    WHERE rp.is_active = TRUE AND rp.is_deleted = FALSE
      AND rp.operator_code = UPPER(TRIM(p_operator_code))
      AND (p_circle IS NULL OR rp.circle = 'ALL' OR rp.circle ILIKE '%' || p_circle || '%')
      AND (p_plan_type IS NULL OR p_plan_type = 'ALL' OR rp.plan_type = UPPER(TRIM(p_plan_type)))
      AND (p_search_query IS NULL OR rp.description ILIKE '%' || p_search_query || '%' OR rp.amount::TEXT = p_search_query)
    ORDER BY rp.is_best_seller DESC, rp.is_popular DESC, rp.display_order ASC, rp.amount ASC;
$$;


-- --------------------------------------------------------------------
-- SP 8: sp_recharge_get_retailer_report
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_get_retailer_report(
    p_retailer_id      UUID,
    p_status           VARCHAR(30) DEFAULT NULL,
    p_mobile_number    VARCHAR(20) DEFAULT NULL,
    p_start_date       TIMESTAMPTZ DEFAULT NULL,
    p_end_date         TIMESTAMPTZ DEFAULT NULL,
    p_limit            INTEGER DEFAULT 20,
    p_offset           INTEGER DEFAULT 0
)
RETURNS TABLE (
    transaction_id     VARCHAR(100),
    reference_id       VARCHAR(100),
    mobile_number      VARCHAR(20),
    operator_code      VARCHAR(50),
    operator_name      VARCHAR(100),
    circle             VARCHAR(50),
    plan_type          VARCHAR(50),
    recharge_amount    NUMERIC(18,2),
    commission_amount  NUMERIC(18,2),
    tax_amount         NUMERIC(18,2),
    net_wallet_debit   NUMERIC(18,2),
    opening_balance    NUMERIC(18,2),
    closing_balance    NUMERIC(18,2),
    status             VARCHAR(30),
    operator_ref       VARCHAR(100),
    vendor_name        VARCHAR(50),
    failure_reason     TEXT,
    created_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    total_count        BIGINT,
    total_volume       NUMERIC(18,2),
    total_commission   NUMERIC(18,2),
    total_tax          NUMERIC(18,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_total_cnt        BIGINT := 0;
    v_vol              NUMERIC(18,2) := 0.00;
    v_comm             NUMERIC(18,2) := 0.00;
    v_tax              NUMERIC(18,2) := 0.00;
BEGIN
    SELECT COUNT(*),
           COALESCE(SUM(t.recharge_amount), 0.00),
           COALESCE(SUM(t.commission_amount), 0.00),
           COALESCE(SUM(t.tax_amount), 0.00)
    INTO v_total_cnt, v_vol, v_comm, v_tax
    FROM public.recharge_transactions t
    WHERE t.retailer_id = p_retailer_id
      AND t.is_deleted = FALSE
      AND (p_status IS NULL OR p_status = 'ALL' OR t.status = UPPER(TRIM(p_status)))
      AND (p_mobile_number IS NULL OR t.mobile_number LIKE '%' || p_mobile_number || '%')
      AND (p_start_date IS NULL OR t.created_at >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at <= p_end_date);

    RETURN QUERY
    SELECT t.transaction_id, t.reference_id, t.mobile_number, t.operator_code, t.operator_name,
           t.circle, t.plan_type, t.recharge_amount, t.commission_amount, t.tax_amount,
           t.net_wallet_debit, t.opening_balance, t.closing_balance, t.status,
           t.operator_ref, t.vendor_name, t.failure_reason, t.created_at, t.completed_at,
           v_total_cnt, v_vol, v_comm, v_tax
    FROM public.recharge_transactions t
    WHERE t.retailer_id = p_retailer_id
      AND t.is_deleted = FALSE
      AND (p_status IS NULL OR p_status = 'ALL' OR t.status = UPPER(TRIM(p_status)))
      AND (p_mobile_number IS NULL OR t.mobile_number LIKE '%' || p_mobile_number || '%')
      AND (p_start_date IS NULL OR t.created_at >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at <= p_end_date)
    ORDER BY t.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;


-- --------------------------------------------------------------------
-- SP 9: sp_recharge_get_admin_report
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sp_recharge_get_admin_report(
    p_status           VARCHAR(30) DEFAULT NULL,
    p_operator_code    VARCHAR(50) DEFAULT NULL,
    p_retailer_code    VARCHAR(50) DEFAULT NULL,
    p_start_date       TIMESTAMPTZ DEFAULT NULL,
    p_end_date         TIMESTAMPTZ DEFAULT NULL,
    p_limit            INTEGER DEFAULT 20,
    p_offset           INTEGER DEFAULT 0
)
RETURNS TABLE (
    transaction_id     VARCHAR(100),
    reference_id       VARCHAR(100),
    retailer_code      VARCHAR(50),
    retailer_name      VARCHAR(150),
    mobile_number      VARCHAR(20),
    operator_code      VARCHAR(50),
    operator_name      VARCHAR(100),
    recharge_amount    NUMERIC(18,2),
    commission_amount  NUMERIC(18,2),
    tax_amount         NUMERIC(18,2),
    net_wallet_debit   NUMERIC(18,2),
    status             VARCHAR(30),
    operator_ref       VARCHAR(100),
    vendor_name        VARCHAR(50),
    created_at         TIMESTAMPTZ,
    total_count        BIGINT,
    total_volume       NUMERIC(18,2),
    total_commission   NUMERIC(18,2),
    total_tax          NUMERIC(18,2),
    total_success      BIGINT,
    total_failed       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_total_cnt        BIGINT := 0;
    v_vol              NUMERIC(18,2) := 0.00;
    v_comm             NUMERIC(18,2) := 0.00;
    v_tax              NUMERIC(18,2) := 0.00;
    v_succ             BIGINT := 0;
    v_fail             BIGINT := 0;
BEGIN
    SELECT COUNT(*),
           COALESCE(SUM(t.recharge_amount), 0.00),
           COALESCE(SUM(t.commission_amount), 0.00),
           COALESCE(SUM(t.tax_amount), 0.00),
           COUNT(*) FILTER (WHERE t.status = 'SUCCESS'),
           COUNT(*) FILTER (WHERE t.status IN ('FAILED', 'REVERSED'))
    INTO v_total_cnt, v_vol, v_comm, v_tax, v_succ, v_fail
    FROM public.recharge_transactions t
    WHERE t.is_deleted = FALSE
      AND (p_status IS NULL OR p_status = 'ALL' OR t.status = UPPER(TRIM(p_status)))
      AND (p_operator_code IS NULL OR p_operator_code = 'ALL' OR t.operator_code = UPPER(TRIM(p_operator_code)))
      AND (p_retailer_code IS NULL OR t.retailer_code ILIKE '%' || p_retailer_code || '%')
      AND (p_start_date IS NULL OR t.created_at >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at <= p_end_date);

    RETURN QUERY
    SELECT t.transaction_id, t.reference_id, t.retailer_code, t.retailer_name,
           t.mobile_number, t.operator_code, t.operator_name,
           t.recharge_amount, t.commission_amount, t.tax_amount, t.net_wallet_debit,
           t.status, t.operator_ref, t.vendor_name, t.created_at,
           v_total_cnt, v_vol, v_comm, v_tax, v_succ, v_fail
    FROM public.recharge_transactions t
    WHERE t.is_deleted = FALSE
      AND (p_status IS NULL OR p_status = 'ALL' OR t.status = UPPER(TRIM(p_status)))
      AND (p_operator_code IS NULL OR p_operator_code = 'ALL' OR t.operator_code = UPPER(TRIM(p_operator_code)))
      AND (p_retailer_code IS NULL OR t.retailer_code ILIKE '%' || p_retailer_code || '%')
      AND (p_start_date IS NULL OR t.created_at >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at <= p_end_date)
    ORDER BY t.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;
