import asyncio
import sys
sys.path.insert(0, "/home/ubuntu/pay2pay/backend")
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def purge_unverified():
    target_ids = [15, 19, 20, 31]
    target_uuids = [
        '4045f857-6b9f-4a4d-bfde-3af87ce6ed5c',
        '39fb5478-6426-4d28-a758-964d51f3034f',
        '8667a353-9755-4869-b8f0-37b09642cb61',
        '9a9431c8-edba-44d7-858e-51660974b55a'
    ]
    uuid_str = ", ".join([f"'{u}'" for u in target_uuids])
    id_str = ", ".join([str(i) for i in target_ids])

    tables = [
        ("customer_pin", "customer_id"),
        ("customer_monthly_limit", "customer_id"),
        ("customer_address", "customer_id"),
        ("customer_kyc", "customer_id"),
        ("customer_identity", "customer_id"),
        ("customer_profile", "customer_id"),
        ("customer", "id")
    ]

    for tbl, col in tables:
        async with AsyncSessionLocal() as db:
            try:
                cond = f"{col} IN ({uuid_str})" if col == "customer_id" else f"{col} IN ({id_str})"
                res = await db.execute(text(f"DELETE FROM {tbl} WHERE {cond};"))
                await db.commit()
                print(f"Successfully deleted {res.rowcount} rows from {tbl}")
            except Exception as e:
                print(f"Notice on {tbl}: {e}")

    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT id, customer_number, full_name, mobile_number, kyc_status FROM customer;"))
        rows = res.fetchall()
        print(f"\nRemaining customers in database: {len(rows)}")
        for r in rows:
            print("  ", r)

if __name__ == "__main__":
    asyncio.run(purge_unverified())
