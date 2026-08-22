import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def list_tables():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
        tables = [r[0] for r in res.fetchall()]
        print("ALL PUBLIC TABLES IN DATABASE:")
        for t in tables:
            print(" -", t)
            
        print("\n=== SEARCHING FOR SATHIYA / MURTHYR / BALAKASAIAH / DANDURI ===")
        for t in tables:
            try:
                c_res = await session.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{t}'"))
                cols = [r[0] for r in c_res.fetchall()]
                where_clauses = [f"{c}::text ILIKE :q" for c in cols]
                sql = f"SELECT * FROM {t} WHERE " + " OR ".join(where_clauses)
                
                for q in ["%Sathiya%", "%BALAKASAIAH%", "%DANDURI%"]:
                    res = await session.execute(text(sql), {"q": q})
                    rows = res.fetchall()
                    if rows:
                        print(f"\n>>> MATCH in table `{t}` for query `{q}` ({len(rows)} records):")
                        for r in rows:
                            d = dict(r._mapping)
                            print(json.dumps({k: str(v) for k, v in d.items()}, indent=2))
            except Exception as e:
                await session.rollback()

if __name__ == '__main__':
    asyncio.run(list_tables())
