import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def purge_all_demo():
    async with AsyncSessionLocal() as db:
        print("=== PURGING ALL DEMO CUSTOMER RECORDS ACROSS DB ===")
        
        # 1. aadhaar_verification
        try:
            res = await db.execute(text("DELETE FROM aadhaar_verification WHERE full_name ILIKE '%DEMO%';"))
            print(f"Deleted from aadhaar_verification: {res.rowcount} rows")
        except Exception as e:
            print("Error deleting from aadhaar_verification:", e)

        # 2. customer_verification
        try:
            res = await db.execute(text("DELETE FROM customer_verification WHERE first_name ILIKE '%DEMO%' OR last_name ILIKE '%DEMO%';"))
            print(f"Deleted from customer_verification: {res.rowcount} rows")
        except Exception as e:
            print("Error deleting from customer_verification:", e)

        # 3. aadhaar_ocr_result
        try:
            res = await db.execute(text("DELETE FROM aadhaar_ocr_result WHERE extracted_name ILIKE '%DEMO%';"))
            print(f"Deleted from aadhaar_ocr_result: {res.rowcount} rows")
        except Exception as e:
            print("Error deleting from aadhaar_ocr_result:", e)

        # 4. aadhaar_qr_result
        try:
            res = await db.execute(text("DELETE FROM aadhaar_qr_result WHERE name ILIKE '%DEMO%';"))
            print(f"Deleted from aadhaar_qr_result: {res.rowcount} rows")
        except Exception as e:
            print("Error deleting from aadhaar_qr_result:", e)

        # 5. customer
        try:
            res = await db.execute(text("DELETE FROM customer WHERE full_name ILIKE '%DEMO%' OR first_name ILIKE '%DEMO%';"))
            print(f"Deleted from customer: {res.rowcount} rows")
        except Exception as e:
            print("Error deleting from customer:", e)

        await db.commit()
        print("=== PURGE COMPLETE & COMMITTED ===")

        # Verify aadhaar_verification
        res = await db.execute(text("SELECT id, full_name, masked_aadhaar FROM aadhaar_verification;"))
        rows = res.fetchall()
        print("\nRemaining rows in aadhaar_verification:")
        for r in rows:
            print("  ", r)

if __name__ == "__main__":
    asyncio.run(purge_all_demo())
