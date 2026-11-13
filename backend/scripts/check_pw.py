import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, username, phone, email, password_hash FROM admin_user WHERE phone='7013914767' OR username='admin'"))
        for r in res.fetchall():
            print(r[0], r[1], r[2], r[3], r[4][:30] if r[4] else None)

if __name__ == "__main__":
    asyncio.run(main())

