import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        # Check row ID 3 in retailer_verifications
        r3 = (await db.execute(text("SELECT * FROM retailer_verifications WHERE id = 3"))).mappings().first()
        print("ROW 3 IN RETAILER VERIFICATIONS:")
        for k, v in r3.items():
            if v is not None:
                print(f"  {k}: {v}")

        # Update row 3 so public_id is also linked or retailer_id is 'RET-10928'
        await db.execute(text("""
            UPDATE retailer_verifications
            SET retailer_id = 'RET-10928',
                retailer_name = 'Sathiya Murthy',
                account_status = 'ACTIVE',
                retailer_status = 'ACTIVE',
                registration_status = 'COMPLETED',
                verification_status = 'APPROVED',
                updated_date = NOW()
            WHERE registration_id = 'REG-4E92DB60';
        """))
        await db.commit()
        print("Updated REG-4E92DB60 verification row to RET-10928!")

if __name__ == "__main__":
    asyncio.run(main())
