import asyncio
from sqlalchemy import text
from app.core.database import engine

CREATE_SQL = """
-- 1. Financial Configuration Header
CREATE TABLE IF NOT EXISTS financial_configuration (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    organization_id UUID,
    business_unit_id UUID,
    branch_id UUID,
    config_code VARCHAR(100) NOT NULL,
    config_type VARCHAR(50) NOT NULL,
    config_name VARCHAR(150) NOT NULL,
    hierarchy_level VARCHAR(50) DEFAULT 'COMPANY' NOT NULL,
    entity_target_id UUID,
    priority INTEGER DEFAULT 5 NOT NULL,
    version VARCHAR(20) DEFAULT '1.0' NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    approval_status VARCHAR(30) DEFAULT 'APPROVED' NOT NULL,
    approved_by VARCHAR(255),
    approved_date TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. MDR Configuration Details
CREATE TABLE IF NOT EXISTS mdr_configuration (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    organization_id UUID,
    business_unit_id UUID,
    branch_id UUID,
    config_id UUID REFERENCES financial_configuration(public_id) ON DELETE CASCADE NOT NULL,
    level VARCHAR(50) DEFAULT 'COMPANY' NOT NULL,
    percentage DOUBLE PRECISION DEFAULT 1.5 NOT NULL,
    fixed_charge DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    minimum_charge DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    maximum_charge DOUBLE PRECISION DEFAULT 500.0 NOT NULL,
    gst_applicable BOOLEAN DEFAULT TRUE NOT NULL,
    priority INTEGER DEFAULT 5 NOT NULL,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. GST Configuration Details
CREATE TABLE IF NOT EXISTS gst_configuration (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    organization_id UUID,
    business_unit_id UUID,
    branch_id UUID,
    config_id UUID REFERENCES financial_configuration(public_id) ON DELETE CASCADE NOT NULL,
    gst_code VARCHAR(30) DEFAULT 'GST18' NOT NULL,
    cgst_pct DOUBLE PRECISION DEFAULT 9.0 NOT NULL,
    sgst_pct DOUBLE PRECISION DEFAULT 9.0 NOT NULL,
    igst_pct DOUBLE PRECISION DEFAULT 18.0 NOT NULL,
    cess_pct DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    hsn_code VARCHAR(20) DEFAULT '998599' NOT NULL,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

-- 4. TDS Configuration Details
CREATE TABLE IF NOT EXISTS tds_configuration (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    organization_id UUID,
    business_unit_id UUID,
    branch_id UUID,
    config_id UUID REFERENCES financial_configuration(public_id) ON DELETE CASCADE NOT NULL,
    tds_section VARCHAR(30) DEFAULT '194O' NOT NULL,
    tds_percentage DOUBLE PRECISION DEFAULT 1.0 NOT NULL,
    threshold_amount DOUBLE PRECISION DEFAULT 500000.0 NOT NULL,
    pan_required BOOLEAN DEFAULT TRUE NOT NULL,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

-- 5. Commission Configuration Details
CREATE TABLE IF NOT EXISTS commission_configuration (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    organization_id UUID,
    business_unit_id UUID,
    branch_id UUID,
    config_id UUID REFERENCES financial_configuration(public_id) ON DELETE CASCADE NOT NULL,
    hierarchy_level VARCHAR(50) DEFAULT 'DISTRIBUTOR' NOT NULL,
    rm_commission_pct DOUBLE PRECISION DEFAULT 2.0 NOT NULL,
    super_distributor_commission_pct DOUBLE PRECISION DEFAULT 5.0 NOT NULL,
    distributor_commission_pct DOUBLE PRECISION DEFAULT 10.0 NOT NULL,
    retailer_commission_pct DOUBLE PRECISION DEFAULT 83.0 NOT NULL,
    fixed_amount DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

-- 6. Settlement Configuration Details
CREATE TABLE IF NOT EXISTS settlement_configuration (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    company_id UUID,
    organization_id UUID,
    business_unit_id UUID,
    branch_id UUID,
    config_id UUID REFERENCES financial_configuration(public_id) ON DELETE CASCADE NOT NULL,
    settlement_mode VARCHAR(30) DEFAULT 'AUTO' NOT NULL,
    settlement_cycle VARCHAR(20) DEFAULT 'T_1' NOT NULL,
    cut_off_time VARCHAR(10) DEFAULT '18:00' NOT NULL,
    retry_count INTEGER DEFAULT 3 NOT NULL,
    holiday_handling VARCHAR(50) DEFAULT 'NEXT_WORKING_DAY' NOT NULL,
    auto_settlement_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);
"""

async def run():
    print("Executing targeted DDL for Financial Configuration tables...", flush=True)
    async with engine.begin() as conn:
        for stmt in CREATE_SQL.split(";"):
            stmt_clean = stmt.strip()
            if stmt_clean:
                await conn.execute(text(stmt_clean))
    print("SUCCESSFULLY CREATED FINANCIAL CONFIGURATION TABLES IN SUPABASE!", flush=True)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
