import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        for proc in ['sp_sales_create_super_distributor', 'sp_sales_create_distributor', 'sp_sales_create_retailer']:
            res = await db.execute(text(f"SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.proname = '{proc}';"))
            row = res.fetchone()
            print(f"=== {proc} ===")
            if row:
                definition = row[0]
                insert_idx = definition.find("INSERT INTO")
                print(definition[insert_idx:insert_idx+1500])
            else:
                print("Not Found")
            print("\n")

if __name__ == "__main__":
    asyncio.run(main())
