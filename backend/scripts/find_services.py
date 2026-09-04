import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name ILIKE '%service%'
            ORDER BY table_name;
        """))
        for r in res.fetchall():
            print("SERVICE TABLE:", r[0])

if __name__ == "__main__":
    asyncio.run(check())
