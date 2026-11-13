import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, retailer_id, mobile, email FROM retailer_contact LIMIT 10"))
        for r in res.fetchall():
            print("RetailerContact:", r)

if __name__ == "__main__":
    asyncio.run(main())

