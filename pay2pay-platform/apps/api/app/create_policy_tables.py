import asyncio
from sqlalchemy import text
from app.core.database import engine

CREATE_POLICY_SQL = """
CREATE TABLE IF NOT EXISTS policy_publish_log (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    organization_id UUID, company_id UUID, business_unit_id UUID, branch_id UUID,
    policy_id UUID REFERENCES policy_master(public_id) ON DELETE CASCADE NOT NULL,
    published_version INTEGER NOT NULL,
    published_by VARCHAR(100) NOT NULL,
    publish_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS policy_assignment (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    organization_id UUID, company_id UUID, business_unit_id UUID, branch_id UUID,
    policy_id UUID REFERENCES policy_master(public_id) ON DELETE CASCADE NOT NULL,
    assigned_entity_type VARCHAR(50) NOT NULL,
    assigned_entity_id UUID NOT NULL,
    is_override BOOLEAN DEFAULT FALSE NOT NULL,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS policy_history (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    organization_id UUID, company_id UUID, business_unit_id UUID, branch_id UUID,
    policy_id UUID REFERENCES policy_master(public_id) ON DELETE CASCADE NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_version INTEGER,
    new_version INTEGER NOT NULL,
    change_reason TEXT,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS policy_audit (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id UUID NOT NULL,
    organization_id UUID, company_id UUID, business_unit_id UUID, branch_id UUID,
    policy_id UUID REFERENCES policy_master(public_id) ON DELETE CASCADE NOT NULL,
    action_name VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    details JSONB,
    day_key INT, week_key INT, month_key INT, quarter_key INT, year_key INT,
    financial_year_key VARCHAR(20), financial_quarter_key VARCHAR(20), financial_month_key VARCHAR(20),
    date_key INT, time_key INT, partition_year INT, partition_month INT, partition_day INT,
    created_by VARCHAR(255), created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by VARCHAR(255), updated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_no INTEGER DEFAULT 1 NOT NULL, record_status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, is_deleted BOOLEAN DEFAULT FALSE NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE
);
"""

async def run():
    print("Creating additional Policy Engine tables in Supabase...", flush=True)
    async with engine.begin() as conn:
        for stmt in CREATE_POLICY_SQL.split(";"):
            stmt_clean = stmt.strip()
            if stmt_clean:
                await conn.execute(text(stmt_clean))
    print("ADDITIONAL POLICY TABLES CREATED SUCCESSFULLY!", flush=True)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run())
