import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id, public_id, customer_number, first_name, last_name, full_name, mobile_number, kyc_status FROM customer WHERE mobile_number LIKE '%9884465374%'"))
        rows = res.fetchall()
        print(f"Found {len(rows)} customer records:")
        for row in rows:
            print("CUSTOMER:", row)

        res_all = await db.execute(text("SELECT id, customer_number, full_name, mobile_number, kyc_status FROM customer WHERE full_name LIKE '%DEMO%' OR customer_number LIKE '%844120%'"))
        print("\nDemo customers in DB:")
        for row in res_all.fetchall():
            print("DEMO CUST:", row)

if __name__ == "__main__":
    asyncio.run(check())
