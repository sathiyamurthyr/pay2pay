import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def inspect():
    async with AsyncSessionLocal() as db:
        print("=== 1. ALL CUSTOMERS IN DB ===")
        res = await db.execute(text("SELECT id, public_id, customer_number, full_name, mobile_number, kyc_status, customer_status FROM customer;"))
        customers = res.fetchall()
        print(f"Total customers: {len(customers)}")
        for c in customers:
            print("  ", c)

        print("\n=== 2. ALL BENEFICIARIES IN beneficiary TABLE ===")
        res = await db.execute(text("SELECT id, public_id, beneficiary_number, full_name, customer_id, verification_status, beneficiary_status FROM beneficiary;"))
        bens = res.fetchall()
        print(f"Total in beneficiary: {len(bens)}")
        for b in bens:
            print("  ", b)

        print("\n=== 3. ALL BENEFICIARIES IN beneficiary_master TABLE ===")
        res = await db.execute(text("SELECT id, public_id, account_holder_name, account_number_masked, ifsc_code, verification_status, penny_drop_status FROM beneficiary_master;"))
        bmasters = res.fetchall()
        print(f"Total in beneficiary_master: {len(bmasters)}")
        for bm in bmasters:
            print("  ", bm)

if __name__ == "__main__":
    asyncio.run(inspect())
