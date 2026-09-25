-- Pay2Pay Enterprise POS MDR Change Request & Workflow Schema
-- Compliant with Pay2Pay BigInteger Reference Key & Multi-Tenant/Company standards

CREATE TABLE IF NOT EXISTS pos_mdr_change_request (
    mdr_request_ref_id BIGSERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    
    -- Scoping Identifiers
    tenant_id UUID NOT NULL,
    tenant_ref_id BIGINT NULL,
    company_id UUID NULL,
    company_ref_id BIGINT NULL,
    
    -- Requester Details (Auto-derived from Auth)
    requester_user_type_ref_id INT NOT NULL, -- 2: Retailer, 3: Distributor, 4: Super Distributor, 5: Sales/ASM
    requester_user_ref_id BIGINT NOT NULL,
    requester_public_id UUID NOT NULL,
    requester_name VARCHAR(255) NOT NULL,
    requester_mobile VARCHAR(20) NOT NULL,
    requester_role VARCHAR(50) NOT NULL DEFAULT 'RETAILER',
    
    -- Hierarchy Snapshot (Auto-resolved)
    super_distributor_id UUID NULL,
    super_distributor_ref_id BIGINT NULL,
    super_distributor_name VARCHAR(255) NULL,
    
    distributor_id UUID NULL,
    distributor_ref_id BIGINT NULL,
    distributor_name VARCHAR(255) NULL,
    
    retailer_id UUID NULL,
    retailer_ref_id BIGINT NULL,
    retailer_name VARCHAR(255) NULL,
    
    pos_machine_id UUID NULL,
    pos_serial_number VARCHAR(100) NULL,
    pos_tid VARCHAR(50) NULL,
    
    -- Assigned Sales Officer / ASM (Auto-resolved from Hierarchy Mapping)
    asm_user_id UUID NULL,
    asm_user_ref_id BIGINT NULL,
    asm_name VARCHAR(255) NULL,
    asm_employee_code VARCHAR(50) NULL,
    asm_mobile VARCHAR(20) NULL,
    
    -- Commitment & Commercial Parameters
    commitment_month INT NOT NULL CHECK (commitment_month >= 1 AND commitment_month <= 12),
    commitment_year INT NOT NULL CHECK (commitment_year >= 2020),
    expected_monthly_volume NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Rates Snapshots (JSON format: {visa: float, mastercard: float, rupay: float, amex_diners: float})
    current_mdr JSONB NOT NULL DEFAULT '{}'::jsonb,
    requested_mdr JSONB NOT NULL DEFAULT '{}'::jsonb,
    final_mdr JSONB NULL,
    
    reason TEXT NOT NULL,
    supporting_documents JSONB NULL DEFAULT '[]'::jsonb,
    
    -- Workflow Status & Decision
    status VARCHAR(50) NOT NULL DEFAULT 'ASM_PENDING',
    asm_decision VARCHAR(30) NULL,
    asm_decision_reason TEXT NULL,
    asm_decision_at TIMESTAMPTZ NULL,
    
    admin_user_id UUID NULL,
    admin_user_ref_id BIGINT NULL,
    admin_name VARCHAR(255) NULL,
    admin_decision_reason TEXT NULL,
    admin_updated_at TIMESTAMPTZ NULL,
    effective_date TIMESTAMPTZ NULL,
    
    -- Audit & Temporal Keys
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,
    daykey INT NULL,
    monthkey INT NULL,
    yearkey INT NULL,
    financialyearkey INT NULL
);

-- Indexes for fast queue queries and tenant isolation
CREATE INDEX IF NOT EXISTS idx_pmcr_tenant_comp ON pos_mdr_change_request (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_pmcr_status ON pos_mdr_change_request (status);
CREATE INDEX IF NOT EXISTS idx_pmcr_asm_id ON pos_mdr_change_request (asm_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pmcr_requester ON pos_mdr_change_request (requester_public_id, status);
CREATE INDEX IF NOT EXISTS idx_pmcr_retailer ON pos_mdr_change_request (retailer_id);
CREATE INDEX IF NOT EXISTS idx_pmcr_pos_tid ON pos_mdr_change_request (pos_tid);
CREATE INDEX IF NOT EXISTS idx_pmcr_commitment ON pos_mdr_change_request (commitment_year, commitment_month);
CREATE INDEX IF NOT EXISTS idx_pmcr_created_at ON pos_mdr_change_request (created_at DESC);

-- Dedicated Audit Table for Workflow Lifecycle Transitions
CREATE TABLE IF NOT EXISTS pos_mdr_change_request_audit (
    audit_ref_id BIGSERIAL PRIMARY KEY,
    request_ref_id BIGINT NOT NULL,
    request_public_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    company_id UUID NULL,
    actor_type VARCHAR(50) NOT NULL, -- REQUESTER, ASM, ADMIN, SYSTEM
    actor_id UUID NULL,
    actor_ref_id BIGINT NULL,
    actor_name VARCHAR(255) NULL,
    action VARCHAR(50) NOT NULL, -- CREATED, SUBMITTED, VIEWED, ASM_APPROVED, ASM_REJECTED, ASM_HELD, RESUBMITTED, ADMIN_VIEWED, MDR_UPDATED, COMPLETED
    action_reason TEXT NULL,
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    metadata_snapshot JSONB NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmcra_request_ref ON pos_mdr_change_request_audit (request_ref_id);
CREATE INDEX IF NOT EXISTS idx_pmcra_tenant_id ON pos_mdr_change_request_audit (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pmcra_action ON pos_mdr_change_request_audit (action);
CREATE INDEX IF NOT EXISTS idx_pmcra_created_at ON pos_mdr_change_request_audit (created_at DESC);
