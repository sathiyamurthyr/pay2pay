import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def approve_retailer():
    async with AsyncSessionLocal() as session:
        # Update retailer_verifications
        r1 = await session.execute(text("""
            UPDATE retailer_verifications 
            SET verification_status = 'APPROVED', account_status = 'ACTIVE', retailer_status = 'ACTIVE', last_reviewed_at = NOW()
            WHERE retailer_id = 'RET-0CFE2B' OR registration_id = 'REG-A7110CFE2B' OR mobile_number = '7013914767'
        """))
        
        await session.commit()
        print(f"SUCCESS: Updated retailer_verifications ({r1.rowcount} rows) to APPROVED & ACTIVE.")

if __name__ == "__main__":
    asyncio.run(approve_retailer())
