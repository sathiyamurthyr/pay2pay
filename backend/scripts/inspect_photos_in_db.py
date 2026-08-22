import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        print("=== 1. ALL AADHAAR RECORDS ===")
        rows = (await db.execute(text("SELECT id, registration_id, aadhaar_masked, photo_url FROM registration_aadhaar ORDER BY id"))).mappings().all()
        for r in rows:
            print(f"ID: {r['id']}, Reg: {r.get('registration_id')}, Aadhaar: {r.get('aadhaar_masked')}, Photo: {r.get('photo_url')}")

        print("\n=== 2. ALL VERIFICATION RECORDS ===")
        rows = (await db.execute(text("SELECT id, retailer_id, registration_id, mobile_number, email FROM retailer_verifications ORDER BY id"))).mappings().all()
        for r in rows:
            print(f"ID: {r['id']}, RetailerID: {r.get('retailer_id')}, RegID: {r.get('registration_id')}, Mobile: {r.get('mobile_number')}, Email: {r.get('email')}")

        print("\n=== 3. ALL DRAFTS ===")
        rows = (await db.execute(text("SELECT id, registration_id, mobile_number, draft_data FROM registration_drafts ORDER BY id"))).mappings().all()
        for r in rows:
            dd = r.get('draft_data') or {}
            photo = dd.get('photo_url') or dd.get('avatar_url')
            name = dd.get('owner_name') or dd.get('full_name')
            print(f"ID: {r['id']}, Reg: {r.get('registration_id')}, Mobile: {r.get('mobile_number')}, Name: {name}, Photo: {photo}")

        print("\n=== 4. SATHIYA MURTHY USER ===")
        rows = (await db.execute(text("SELECT * FROM admin_user WHERE email LIKE '%sathiya%' OR username LIKE '%sathiya%'"))).mappings().all()
        for r in rows:
            print(f"ID: {r['id']}, PublicID: {r['public_id']}, Username: {r.get('username')}, Email: {r.get('email')}, Avatar: {r.get('avatar_url')}")

if __name__ == "__main__":
    asyncio.run(main())
