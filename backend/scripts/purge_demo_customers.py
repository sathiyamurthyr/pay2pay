import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id, public_id, customer_number, full_name, mobile_number FROM customer WHERE full_name ILIKE '%DEMO%' OR mobile_number = '9884465374'"))
        rows = res.fetchall()
        print("Demo customers to remove:", rows)
        for r in rows:
            c_uuid = r[1]
            tables = [
                'customer_address', 'customer_consent', 'customer_document', 'customer_identity',
                'customer_kyc', 'customer_limit_override', 'customer_monthly_counter', 'customer_preference',
                'customer_profile', 'customer_relationship', 'customer_risk_profile', 'customer_service',
                'customer_status_history', 'customer_timeline', 'customer_transaction_counter',
                'customer_yearly_counter', 'customer_whitelist', 'beneficiary_customer_mapping'
            ]
            for tbl in tables:
                try:
                    del_res = await db.execute(text(f"DELETE FROM {tbl} WHERE customer_id = '{c_uuid}'"))
                    if del_res.rowcount > 0:
                        print(f"Deleted {del_res.rowcount} rows from {tbl}")
                except Exception as e:
                    # table may not exist or no customer_id
                    pass
            del_cust = await db.execute(text(f"DELETE FROM customer WHERE id = {r[0]}"))
            print(f"Deleted customer {r[0]} ({r[3]}, {r[4]}): {del_cust.rowcount} rows deleted")
        await db.commit()
        print("Successfully purged all DEMO CUSTOMER records and 9884465374 from DB.")

if __name__ == "__main__":
    asyncio.run(check())
