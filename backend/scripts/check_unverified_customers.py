import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check_unverified():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("""
            SELECT id, public_id, customer_number, full_name, mobile_number, kyc_status, customer_status 
            FROM customer 
            WHERE kyc_status IN ('PENDING', 'PENDING_KYC', 'DRAFT', 'MINIMUM_KYC', 'REJECTED')
               OR full_name IN ('sa sa', 'Balu Balu', 'New Customer', 'Customer User');
        """))
        unverified = res.fetchall()
        print(f"Found {len(unverified)} unverified/dummy customer records:")
        for u in unverified:
            print("  ", u)

if __name__ == "__main__":
    asyncio.run(check_unverified())
