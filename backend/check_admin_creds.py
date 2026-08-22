import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check():
    async with AsyncSessionLocal() as db:
        print("=== ADMIN_USER COLUMNS & ROWS ===")
        res = await db.execute(text("SELECT * FROM admin_user;"))
        cols = res.keys()
        print("Keys:", list(cols))
        for r in res.fetchall():
            row_dict = dict(zip(cols, r))
            print("Admin User:", {k: v for k, v in row_dict.items() if k not in ['created_date', 'updated_date']})

if __name__ == "__main__":
    asyncio.run(check())
