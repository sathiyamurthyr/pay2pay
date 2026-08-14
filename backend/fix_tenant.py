import sys
import os

backend_dir = r"d:\pay2pay\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def fix_tenant():
    async with AsyncSessionLocal() as session:
        await session.execute(text("UPDATE retailer SET tenant_id = '547aa7bb-a790-4fe2-bd5b-27214ed176c8' WHERE retailer_code = 'RET-0CFE2B';"))
        await session.commit()
        print("Successfully updated tenant_id for RET-0CFE2B!")

if __name__ == "__main__":
    asyncio.run(fix_tenant())
