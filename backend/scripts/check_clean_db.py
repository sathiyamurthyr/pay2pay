import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("""
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND data_type IN ('character varying', 'text', 'character')
            ORDER BY table_name;
        """))
        cols = res.fetchall()
        found = False
        for tbl, col in cols:
            try:
                q = await db.execute(text(f"SELECT COUNT(*) FROM {tbl} WHERE {col} ILIKE '%DEMO CUSTOMER%'"))
                cnt = q.scalar()
                if cnt and cnt > 0:
                    print(f"FOUND in {tbl}.{col}: {cnt} rows")
                    found = True
            except Exception:
                pass
        if not found:
            print("ZERO tables contain 'DEMO CUSTOMER'! Clean across all tables in DB.")

if __name__ == "__main__":
    asyncio.run(check())
