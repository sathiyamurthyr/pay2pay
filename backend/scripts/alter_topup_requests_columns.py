"""
Database script to add all EnterpriseBaseMixin columns to topup_requests table.
"""

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

ALTER_COLUMNS = [
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS organization_id UUID;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS business_unit_id UUID;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS branch_id UUID;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS day_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS week_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS month_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS quarter_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS year_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS financial_year_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS financial_quarter_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS financial_month_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS date_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS time_key INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS partition_year INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS partition_month INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS partition_day INTEGER;",
    "ALTER TABLE topup_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;"
]

async def main():
    print(">>> Adding EnterpriseBaseMixin columns to topup_requests...")
    async with AsyncSessionLocal() as session:
        for col_stmt in ALTER_COLUMNS:
            await session.execute(text(col_stmt))
        await session.commit()
        print(">>> EnterpriseBaseMixin columns added successfully!")

if __name__ == "__main__":
    asyncio.run(main())
