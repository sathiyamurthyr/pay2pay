import asyncio
from app.core.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS beneficiary_session CASCADE;"))
        await conn.execute(text("DROP SEQUENCE IF EXISTS beneficiary_session_id_seq CASCADE;"))
    print("Database sequence successfully cleaned!")

if __name__ == "__main__":
    asyncio.run(main())
