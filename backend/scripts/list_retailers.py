import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        # Check all tables
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
        all_tables = [r[0] for r in res.fetchall()]
        print("Total tables:", len(all_tables))
        
        # Check users
        print("\n--- ALL USERS ---")
        users = await session.execute(text("SELECT id, username, mobile, role, is_active FROM users") if "username" in all_tables else text("SELECT * FROM users LIMIT 10"))
        for u in users.fetchall():
            print(u)

        # Check retailer / retailer_profile / merchants
        for t in ["retailer", "retailers", "retailer_profile", "merchant", "merchants", "distributor"]:
            if t in all_tables:
                print(f"\n--- {t.upper()} ---")
                rows = await session.execute(text(f"SELECT * FROM {t} LIMIT 5"))
                for r in rows.fetchall():
                    print(r)

if __name__ == "__main__":
    asyncio.run(main())

