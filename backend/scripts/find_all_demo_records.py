import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        # Check aadhaar_verification table
        print("=== Checking aadhaar_verification ===")
        try:
            res = await db.execute(text("SELECT id, full_name, masked_aadhaar, customer_id FROM aadhaar_verification WHERE full_name ILIKE '%DEMO%' OR masked_aadhaar ILIKE '%9574%';"))
            rows = res.fetchall()
            for r in rows:
                print("aadhaar_verification:", r)
        except Exception as e:
            print("Error in aadhaar_verification:", e)

        # Check customer_verification table
        print("\n=== Checking customer_verification ===")
        try:
            res = await db.execute(text("SELECT id, full_name, masked_aadhaar, customer_id FROM customer_verification WHERE full_name ILIKE '%DEMO%' OR masked_aadhaar ILIKE '%9574%';"))
            rows = res.fetchall()
            for r in rows:
                print("customer_verification:", r)
        except Exception as e:
            print("Error in customer_verification:", e)

        # Check ANY table with full_name or name ILIKE '%DEMO%'
        print("\n=== Searching ALL tables in public schema for 'DEMO CUSTOMER' ===")
        res = await db.execute(text("""
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (column_name ILIKE '%name%' OR column_name ILIKE '%aadhaar%' OR column_name ILIKE '%text%' OR column_name ILIKE '%holder%');
        """))
        cols = res.fetchall()
        for tbl, col in cols:
            try:
                q = await db.execute(text(f"SELECT COUNT(*) FROM {tbl} WHERE {col}::text ILIKE '%DEMO CUSTOMER%'"))
                cnt = q.scalar()
                if cnt > 0:
                    print(f"FOUND in {tbl}.{col}: {cnt} rows")
            except Exception:
                pass

if __name__ == "__main__":
    asyncio.run(check())
