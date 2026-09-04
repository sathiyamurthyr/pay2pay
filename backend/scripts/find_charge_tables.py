import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name ILIKE '%charge%' OR table_name ILIKE '%pricing%' OR table_name ILIKE '%fee%' OR table_name ILIKE '%slab%' OR table_name ILIKE '%commission%' OR table_name ILIKE '%config%' OR table_name ILIKE '%rule%')
            ORDER BY table_name;
        """))
        rows = res.fetchall()
        print("Config/Pricing/Charge tables in DB:")
        for r in rows:
            print(r[0])

if __name__ == "__main__":
    asyncio.run(check())
