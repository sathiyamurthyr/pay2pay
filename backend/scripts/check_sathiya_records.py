import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        print("=== 1. ADMIN USERS ===")
        res = await db.execute(text("SELECT id, public_id, username, email, full_name, is_active FROM admin_user WHERE email LIKE '%sathiya%' OR username LIKE '%sathiya%'"))
        users = res.mappings().all()
        for u in users:
            print("ADMIN USER:", dict(u))

        print("\n=== 2. RETAILER TABLE ===")
        res = await db.execute(text("SELECT id, public_id, store_name, owner_name, retailer_code, status FROM retailer WHERE owner_name ILIKE '%Sathiya%' OR store_name ILIKE '%Sathu%' OR retailer_code IN ('RET-10928', 'RET-92DB60')"))
        retailers = res.mappings().all()
        for r in retailers:
            print("RETAILER:", dict(r))

        print("\n=== 3. RETAILER VERIFICATIONS ===")
        res = await db.execute(text("SELECT id, public_id, retailer_id, registration_id, retailer_name, mobile_number, email FROM retailer_verifications WHERE mobile_number LIKE '%9176669426%' OR email LIKE '%sathiya%' OR retailer_name ILIKE '%Sathiya%'"))
        verifs = res.mappings().all()
        for v in verifs:
            print("VERIFICATION:", dict(v))

        print("\n=== 4. REGISTRATION AADHAAR ===")
        res = await db.execute(text("SELECT id, registration_id, full_name, aadhaar_masked, photo_url FROM registration_aadhaar WHERE registration_id IN ('REG-4E92DB60', 'REG-74B73A9485')"))
        aadhaar = res.mappings().all()
        for a in aadhaar:
            print("AADHAAR:", dict(a))

if __name__ == "__main__":
    asyncio.run(main())
