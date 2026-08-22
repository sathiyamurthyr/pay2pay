"""
Database script to create topup_requests table on PostgreSQL database.
"""

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

SQL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS topup_requests (
        id SERIAL PRIMARY KEY,
        public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        company_id UUID,
        retailer_id UUID NOT NULL REFERENCES retailer(public_id) ON DELETE CASCADE,
        wallet_id UUID,
        
        topup_request_id VARCHAR(50) NOT NULL UNIQUE,
        requested_amount NUMERIC(18, 2) NOT NULL,
        approved_amount NUMERIC(18, 2),
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        
        payment_reference VARCHAR(100),
        payment_method VARCHAR(50) DEFAULT 'UPI',
        payment_date TIMESTAMPTZ,
        
        slip_id VARCHAR(100),
        slip_url TEXT,
        slip_storage_path VARCHAR(500),
        slip_original_filename VARCHAR(255),
        slip_mime_type VARCHAR(100),
        slip_file_size_bytes INTEGER,
        slip_checksum VARCHAR(100),
        
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        retailer_remarks TEXT,
        admin_notes TEXT,
        rejection_reason TEXT,
        
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_by VARCHAR(100),
        approved_at TIMESTAMPTZ,
        rejected_by VARCHAR(100),
        rejected_at TIMESTAMPTZ,
        
        transaction_id UUID,
        transaction_reference VARCHAR(50),
        request_id VARCHAR(100),
        correlation_id VARCHAR(100),
        
        metadata_json JSONB,
        
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        record_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        version_no INTEGER NOT NULL DEFAULT 1,
        created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
        updated_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM'
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_topup_req_id ON topup_requests(topup_request_id);",
    "CREATE INDEX IF NOT EXISTS idx_topup_retailer ON topup_requests(retailer_id);",
    "CREATE INDEX IF NOT EXISTS idx_topup_wallet ON topup_requests(wallet_id);",
    "CREATE INDEX IF NOT EXISTS idx_topup_status ON topup_requests(status);",
    "CREATE INDEX IF NOT EXISTS idx_topup_payment_ref ON topup_requests(payment_reference);",
    "CREATE INDEX IF NOT EXISTS idx_topup_submitted_at ON topup_requests(submitted_at);",
    "CREATE INDEX IF NOT EXISTS idx_topup_created_date ON topup_requests(created_date);"
]

async def main():
    print(">>> Creating topup_requests table on PostgreSQL database...")
    async with AsyncSessionLocal() as session:
        for stmt in SQL_STATEMENTS:
            await session.execute(text(stmt))
        await session.commit()
        print(">>> Table topup_requests and composite indexes created successfully!")

if __name__ == "__main__":
    asyncio.run(main())
