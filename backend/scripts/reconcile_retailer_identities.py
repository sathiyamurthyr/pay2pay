import asyncio
import uuid
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

RET_10928_ID = uuid.UUID("e238fb8b-beb3-4cd4-862b-319b5d05d24e")
RET_92DB60_ID = uuid.UUID("82f6eb8d-957b-4725-a126-308ad340fe1d")
CORRECT_BALANCE = 49680.53

async def reconcile_identities():
    async with AsyncSessionLocal() as db:
        print("1. Soft-deleting duplicate unmapped retailer RET-92DB60...")
        await db.execute(text("""
            UPDATE retailer 
            SET is_deleted = true, status = 'DEACTIVATED_MERGED'
            WHERE public_id = :dup_id OR retailer_code = 'RET-92DB60'
        """), {"dup_id": RET_92DB60_ID})

        await db.execute(text("""
            UPDATE retailer_contact 
            SET is_deleted = true, record_status = 'DEACTIVATED'
            WHERE retailer_id = :dup_id
        """), {"dup_id": RET_92DB60_ID})

        print(f"2. Setting authoritative balance for RET-10928 to ₹{CORRECT_BALANCE:,.2f}...")
        await db.execute(text("""
            UPDATE retailer_wallet 
            SET wallet_balance = :bal, updated_date = now()
            WHERE retailer_id = :ret_id
        """), {"bal": CORRECT_BALANCE, "ret_id": RET_10928_ID})

        await db.commit()
        print("3. Verification:")
        res = await db.execute(text("""
            SELECT r.retailer_code, r.store_name, r.owner_name, r.status, r.is_deleted, w.wallet_balance
            FROM retailer r
            LEFT JOIN retailer_wallet w ON r.public_id = w.retailer_id
            WHERE r.retailer_code IN ('RET-10928', 'RET-92DB60')
        """))
        for row in res.fetchall():
            print(dict(row._mapping))

if __name__ == "__main__":
    asyncio.run(reconcile_identities())
