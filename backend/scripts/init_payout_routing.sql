-- Create payout_gateway_configs table
CREATE TABLE IF NOT EXISTS payout_gateway_configs (
    id SERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    provider_code VARCHAR(50) NOT NULL UNIQUE,
    provider_name VARCHAR(100) NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    client_id VARCHAR(255),
    secret_key VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    priority INTEGER NOT NULL DEFAULT 1,
    is_default BOOLEAN NOT NULL DEFAULT false,
    supports_imps BOOLEAN NOT NULL DEFAULT true,
    supports_neft BOOLEAN NOT NULL DEFAULT true,
    supports_rtgs BOOLEAN NOT NULL DEFAULT true,
    supports_upi BOOLEAN NOT NULL DEFAULT true,
    supports_account_validation BOOLEAN NOT NULL DEFAULT true,
    daily_limit DOUBLE PRECISION NOT NULL DEFAULT 10000000.0,
    current_day_volume DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    success_rate DOUBLE PRECISION NOT NULL DEFAULT 99.85,
    last_balance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_balance_checked_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payout_gateway_configs_provider_code ON payout_gateway_configs(provider_code);
CREATE INDEX IF NOT EXISTS ix_payout_gateway_configs_status ON payout_gateway_configs(status);
CREATE INDEX IF NOT EXISTS ix_payout_gateway_configs_priority ON payout_gateway_configs(priority);

-- Create payout_routing_policies table
CREATE TABLE IF NOT EXISTS payout_routing_policies (
    id SERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    routing_mode VARCHAR(50) NOT NULL DEFAULT 'PRIORITY',
    active_primary_provider VARCHAR(50) NOT NULL DEFAULT 'UTKALDIGITAL',
    auto_failover_enabled BOOLEAN NOT NULL DEFAULT true,
    failover_threshold_failures INTEGER NOT NULL DEFAULT 3,
    updated_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Policy if missing
INSERT INTO payout_routing_policies (
    public_id, tenant_id, company_id, routing_mode,
    active_primary_provider, auto_failover_enabled,
    failover_threshold_failures, updated_by, updated_at,
    is_active, is_deleted, created_date, updated_date
) 
SELECT 
    gen_random_uuid(), '547aa7bb-a790-4fe2-bd5b-27214ed176c8', '18b39add-0860-4a2d-8289-bc698da8e966',
    'PRIORITY', 'UTKALDIGITAL', true, 3, 'SYSTEM', NOW(), true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM payout_routing_policies WHERE is_deleted = false);

UPDATE payout_routing_policies SET active_primary_provider = 'UTKALDIGITAL' WHERE is_deleted = false;

-- Seed Utkal Digital Gateway
INSERT INTO payout_gateway_configs (
    public_id, tenant_id, company_id, provider_code,
    provider_name, base_url, client_id, secret_key,
    status, priority, is_default, supports_imps,
    supports_neft, supports_rtgs, supports_upi,
    supports_account_validation, daily_limit,
    current_day_volume, success_rate, last_balance,
    last_balance_checked_at, last_health_check_at,
    notes, is_active, is_deleted, created_date, updated_date
)
SELECT 
    gen_random_uuid(), '547aa7bb-a790-4fe2-bd5b-27214ed176c8', '18b39add-0860-4a2d-8289-bc698da8e966',
    'UTKALDIGITAL', 'Utkal Digital Payout API', 'https://singleptxn.utkaldigital.co.in',
    'a9f9d5c1752e49e08a', '995184', 'ACTIVE', 1, true,
    true, true, true, true, true, 10000000.0, 0.0, 99.85, 80768.50,
    NOW(), NOW(), 'Live gateway integration', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM payout_gateway_configs WHERE provider_code = 'UTKALDIGITAL');

UPDATE payout_gateway_configs SET priority = 1, is_default = true, status = 'ACTIVE' WHERE provider_code = 'UTKALDIGITAL';

-- Seed WowPe Gateway
INSERT INTO payout_gateway_configs (
    public_id, tenant_id, company_id, provider_code,
    provider_name, base_url, client_id, secret_key,
    status, priority, is_default, supports_imps,
    supports_neft, supports_rtgs, supports_upi,
    supports_account_validation, daily_limit,
    current_day_volume, success_rate, last_balance,
    last_balance_checked_at, last_health_check_at,
    notes, is_active, is_deleted, created_date, updated_date
)
SELECT 
    gen_random_uuid(), '547aa7bb-a790-4fe2-bd5b-27214ed176c8', '18b39add-0860-4a2d-8289-bc698da8e966',
    'WOWPE', 'WowPe Payout Gateway', 'https://api.wowpe.in',
    '40c86a1c-pay2pay-prod-client-id', 'e91650d0-pay2pay-prod-secret-key', 'ACTIVE', 2, false,
    true, true, true, true, true, 10000000.0, 0.0, 99.85, 85450.0,
    NOW(), NOW(), 'Secondary gateway integration', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM payout_gateway_configs WHERE provider_code = 'WOWPE');

-- Seed BulkPe Gateway
INSERT INTO payout_gateway_configs (
    public_id, tenant_id, company_id, provider_code,
    provider_name, base_url, client_id, secret_key,
    status, priority, is_default, supports_imps,
    supports_neft, supports_rtgs, supports_upi,
    supports_account_validation, daily_limit,
    current_day_volume, success_rate, last_balance,
    last_balance_checked_at, last_health_check_at,
    notes, is_active, is_deleted, created_date, updated_date
)
SELECT 
    gen_random_uuid(), '547aa7bb-a790-4fe2-bd5b-27214ed176c8', '18b39add-0860-4a2d-8289-bc698da8e966',
    'BULKPE', 'BulkPe Payout Gateway', 'https://api.bulkpe.in/client',
    'bulkpe_client_id_live', 'bulkpe_sec_key', 'ACTIVE', 3, false,
    true, true, true, true, true, 5000000.0, 0.0, 99.60, 45200.0,
    NOW(), NOW(), 'Fallback gateway integration', true, false, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM payout_gateway_configs WHERE provider_code = 'BULKPE');
