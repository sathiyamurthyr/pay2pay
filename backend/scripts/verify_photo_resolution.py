import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.presentation.api.v1.retailer_profile_router import resolve_retailer_context
from app.infrastructure.db.registration_models import RegistrationAadhaarModel
from sqlalchemy import select, desc

async def main():
    async with AsyncSessionLocal() as db:
        print("=== 1. TEST resolve_retailer_context with retailer_id=None ===")
        ident, mob, r_uuid, uid, email = await resolve_retailer_context(None, None, db)
        print(f"Result: ident={ident}, mob={mob}, r_uuid={r_uuid}")
        
        a_stmt = select(RegistrationAadhaarModel).where(RegistrationAadhaarModel.registration_id == ident).order_by(desc(RegistrationAadhaarModel.created_date))
        aadhaar = (await db.execute(a_stmt)).scalars().first()
        print(f"Resolved Aadhaar Photo URL for default session: {aadhaar.photo_url if aadhaar else None}")

        print("\n=== 2. TEST resolve_retailer_context with retailer_id='RET-10928' ===")
        ident, mob, r_uuid, uid, email = await resolve_retailer_context(None, "RET-10928", db)
        print(f"Result: ident={ident}, mob={mob}, r_uuid={r_uuid}")
        
        a_stmt = select(RegistrationAadhaarModel).where(RegistrationAadhaarModel.registration_id == ident).order_by(desc(RegistrationAadhaarModel.created_date))
        aadhaar = (await db.execute(a_stmt)).scalars().first()
        print(f"Resolved Aadhaar Photo URL for RET-10928: {aadhaar.photo_url if aadhaar else None}")

if __name__ == "__main__":
    asyncio.run(main())
