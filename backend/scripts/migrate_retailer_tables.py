import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

SQL_COMMANDS = [
    "ALTER TABLE retailer_bank ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);",
    "ALTER TABLE retailer_bank ADD COLUMN IF NOT EXISTS branch VARCHAR(150);",
    "ALTER TABLE retailer_kyc ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);",
    "ALTER TABLE retailer_kyc ADD COLUMN IF NOT EXISTS gst_number VARCHAR(30);",
    "ALTER TABLE retailer_kyc ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);",
    "ALTER TABLE retailer_kyc ADD COLUMN IF NOT EXISTS aadhaar_hash VARCHAR(100);",
    "ALTER TABLE retailer_kyc ADD COLUMN IF NOT EXISTS rejection_reason TEXT;",
    "ALTER TABLE retailer_contact ADD COLUMN IF NOT EXISTS primary_contact VARCHAR(255);",
    "ALTER TABLE retailer_contact ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);",
    "ALTER TABLE retailer_contact ADD COLUMN IF NOT EXISTS email VARCHAR(255);",
    "ALTER TABLE retailer_address ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
    "ALTER TABLE retailer_address ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
    "ALTER TABLE retailer_address ADD COLUMN IF NOT EXISTS address TEXT;",
    "ALTER TABLE retailer_address ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);",
]

async def migrate():
    print("=== RUNNING MIGRATIONS FOR RETAILER TABLES ===")
    for sql in SQL_COMMANDS:
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text(sql))
                await db.commit()
                print(f"OK: {sql}")
        except Exception as e:
            print(f"ERR: {sql} -> {e}")
    print("Migrations finished successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
