import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check_retailers_id():
    async with AsyncSessionLocal() as db:
        res1 = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'retailer'"))
        cols = [c[0] for c in res1.fetchall()]
        print("Retailer columns:", cols)

        res2 = await db.execute(text("SELECT public_id, retailer_code, store_name, owner_name FROM retailer"))
        for r in res2.fetchall():
            print(f"Retailer: {r[1]} ({r[2]}) -> UUID: {r[0]}")

if __name__ == '__main__':
    asyncio.run(check_retailers_id())
