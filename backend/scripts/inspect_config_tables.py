import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        for tbl in ["customer_service_configuration", "retailer_charge_configuration", "system_configuration", "gst_configuration"]:
            try:
                res = await db.execute(text(f"SELECT * FROM {tbl} LIMIT 5"))
                rows = res.fetchall()
                print(f"=== {tbl} ({len(rows)} rows) ===")
                for r in rows:
                    print(r)
            except Exception as e:
                print(f"Error querying {tbl}: {e}")

if __name__ == "__main__":
    asyncio.run(check())
