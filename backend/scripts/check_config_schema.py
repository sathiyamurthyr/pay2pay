import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        for tbl in ["customer_service_configuration", "retailer_charge_configuration", "gst_configuration"]:
            res = await db.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{tbl}'
                ORDER BY ordinal_position;
            """))
            cols = res.fetchall()
            print(f"\n--- Columns in {tbl} ---")
            for c in cols:
                print(f"  {c[0]} ({c[1]})")

if __name__ == "__main__":
    asyncio.run(check())
