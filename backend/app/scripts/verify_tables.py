import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT customer_number, full_name, mobile_number FROM customer;"))
        rows = res.fetchall()
        print("CUSTOMER TABLE ROWS COUNT:", len(rows))
        for r in rows:
            print("  -", r)

        res2 = await db.execute(text("SELECT beneficiary_number, full_name FROM beneficiary;"))
        rows2 = res2.fetchall()
        print("BENEFICIARY TABLE ROWS COUNT:", len(rows2))
        for r2 in rows2:
            print("  -", r2)

if __name__ == "__main__":
    asyncio.run(check())
