import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id, full_name, masked_aadhaar, customer_id FROM aadhaar_verification;"))
        rows = res.fetchall()
        print(f"Total rows in aadhaar_verification: {len(rows)}")
        for r in rows:
            print("  ", r)

if __name__ == "__main__":
    asyncio.run(check())
