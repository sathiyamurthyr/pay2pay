import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id, customer_number, full_name, mobile_number, kyc_status FROM customer WHERE customer_number = 'CUST844120'"))
        print("CUSTOMER TABLE:", res.fetchall())

        try:
            res_p = await db.execute(text("SELECT * FROM customer_profile WHERE customer_code = 'CUST844120' OR mobile_number LIKE '%9884465374%'"))
            print("CUSTOMER_PROFILE TABLE:", res_p.fetchall())
        except Exception as e:
            print("customer_profile err:", e)

if __name__ == "__main__":
    asyncio.run(check())
