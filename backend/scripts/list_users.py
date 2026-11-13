import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        # Check tables in database
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [r[0] for r in res.fetchall()]
        print("Tables:", tables[:20])

        user_table = None
        for t in ["users", "user", "retailer", "retailers", "merchant", "auth_user"]:
            if t in tables:
                user_table = t
                break
        
        if user_table:
            print(f"Querying {user_table}...")
            cols = await session.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{user_table}'"))
            col_names = [c[0] for c in cols.fetchall()]
            print("Columns:", col_names[:10])
            rows = await session.execute(text(f"SELECT * FROM {user_table} LIMIT 5"))
            for r in rows.fetchall():
                print(r)

if __name__ == "__main__":
    asyncio.run(main())
