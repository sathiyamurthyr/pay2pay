import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        # Check all references to customer 18
        tables_to_check = [
            "customer",
            "customer_profile",
            "customer_kyc",
            "customer_identity",
            "customer_identities",
            "customer_address",
            "customer_addresses",
            "customer_timeline",
            "beneficiary_customer_mapping",
            "beneficiary",
            "dmt_transaction",
            "dmt_transactions"
        ]
        cust_row = (await db.execute(text("SELECT id, public_id, customer_number, full_name, mobile_number FROM customer WHERE mobile_number = '9884465374'"))).fetchone()
        print("Target customer row:", cust_row)
        if not cust_row:
            print("No customer found for 9884465374")
            return

        c_id, c_uuid, c_num, c_name, c_mob = cust_row
        for tbl in tables_to_check:
            try:
                res = await db.execute(text(f"SELECT count(*) FROM {tbl} WHERE customer_id = '{c_uuid}' OR customer_id = '{c_id}'"))
                cnt = res.scalar()
                if cnt:
                    print(f"Table {tbl}: {cnt} records")
            except Exception as e:
                pass

if __name__ == "__main__":
    asyncio.run(check())
