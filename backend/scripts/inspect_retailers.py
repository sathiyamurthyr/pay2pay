import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def inspect():
    async with AsyncSessionLocal() as db:
        print("=== RET-10928 vs RET-92DB60 ===")
        res = await db.execute(text("SELECT * FROM retailer WHERE retailer_code IN ('RET-10928', 'RET-92DB60')"))
        for r in res.fetchall():
            print(dict(r._mapping))

        print("\n=== WALLETS ===")
        res = await db.execute(text("SELECT w.*, r.retailer_code FROM retailer_wallet w JOIN retailer r ON w.retailer_id = r.public_id WHERE r.retailer_code IN ('RET-10928', 'RET-92DB60')"))
        for r in res.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(inspect())
