import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        # Check admin_user
        res = await session.execute(text("SELECT id, username, phone, email, is_active FROM admin_user"))
        for r in res.fetchall():
            print("AdminUser:", r)

if __name__ == "__main__":
    asyncio.run(main())

