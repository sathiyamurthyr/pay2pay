import sys
import os

backend_dir = r"d:\pay2pay\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def clean_and_sync_retailers():
    async with AsyncSessionLocal() as session:
        # Delete fake generated RET_ seed rows from retailer table & child tables
        await session.execute(text("DELETE FROM retailer_kyc WHERE retailer_id IN (SELECT public_id FROM retailer WHERE retailer_code LIKE 'RET_%');"))
        await session.execute(text("DELETE FROM retailer_bank WHERE retailer_id IN (SELECT public_id FROM retailer WHERE retailer_code LIKE 'RET_%');"))
        await session.execute(text("DELETE FROM retailer_address WHERE retailer_id IN (SELECT public_id FROM retailer WHERE retailer_code LIKE 'RET_%');"))
        await session.execute(text("DELETE FROM retailer_contact WHERE retailer_id IN (SELECT public_id FROM retailer WHERE retailer_code LIKE 'RET_%');"))
        await session.execute(text("DELETE FROM retailer_wallet WHERE retailer_id IN (SELECT public_id FROM retailer WHERE retailer_code LIKE 'RET_%');"))
        await session.execute(text("DELETE FROM retailer_status_history WHERE retailer_id IN (SELECT public_id FROM retailer WHERE retailer_code LIKE 'RET_%');"))
        await session.execute(text("DELETE FROM retailer_approval WHERE retailer_id IN (SELECT public_id FROM retailer WHERE retailer_code LIKE 'RET_%');"))
        
        del_ret = await session.execute(text("DELETE FROM retailer WHERE retailer_code LIKE 'RET_%';"))
        print(f"Deleted {del_ret.rowcount} fake RET_ seed rows from table 'retailer'.")

        # Sync live registered retailer RET-0CFE2B if not present
        check_ret = await session.execute(text("SELECT public_id FROM retailer WHERE retailer_code = 'RET-0CFE2B';"))
        existing = check_ret.scalar_one_or_none()

        tenant_id = "00000000-0000-0000-0000-000000000001"
        ret_uuid = "ec273b33-d38e-4867-ac3b-f8e55ac46dcd"

        if not existing:
            await session.execute(text(f"""
                INSERT INTO retailer (public_id, tenant_id, retailer_code, store_name, legal_name, owner_name, business_category, store_type, status, record_status, is_active, version_no, created_date, is_deleted)
                VALUES ('{ret_uuid}', '{tenant_id}', 'RET-0CFE2B', 'Pay2Pay Verified Merchant', 'Sathiya Murthy Traders', 'Sathiya Murthy', 'Electronics & Mobiles', 'BRICK_AND_MORTAR', 'ACTIVE', 'ACTIVE', TRUE, 1, NOW(), FALSE);
            """))
            print("Inserted live registered retailer RET-0CFE2B into table 'retailer'.")
        else:
            await session.execute(text(f"""
                UPDATE retailer SET status = 'ACTIVE', store_name = 'Pay2Pay Verified Merchant', owner_name = 'Sathiya Murthy' WHERE retailer_code = 'RET-0CFE2B';
            """))
            print("Updated live registered retailer RET-0CFE2B status to ACTIVE.")

        await session.commit()

        # Print remaining retailers
        res = await session.execute(text("SELECT public_id, retailer_code, store_name, owner_name, status FROM retailer;"))
        remaining = res.fetchall()
        print(f"\nREMAINING RETAILERS IN DB TABLE 'retailer' ({len(remaining)} total):")
        for r in remaining:
            print(r)

if __name__ == "__main__":
    asyncio.run(clean_and_sync_retailers())
