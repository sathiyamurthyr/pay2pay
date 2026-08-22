import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"))
        tables = [r[0] for r in res.fetchall()]
        print(f"Total tables ({len(tables)}):", tables)

        for t in ["admin_user", "users", "user", "retailer", "distributor", "super_distributor", "company", "auth_user"]:
            if t in tables:
                print(f"\n--- TABLE: {t} ---")
                try:
                    c_res = await db.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}' ORDER BY ordinal_position;"))
                    cols = [f"{r[0]} ({r[1]})" for r in c_res.fetchall()]
                    print(" Columns:", ", ".join(cols))
                    d_res = await db.execute(text(f"SELECT * FROM {t} LIMIT 5;"))
                    rows = d_res.fetchall()
                    print(f" Rows count: {len(rows)}")
                    for row in rows:
                        print("  ", row)
                except Exception as e:
                    print(f"  Error reading {t}:", e)

if __name__ == "__main__":
    asyncio.run(check())
