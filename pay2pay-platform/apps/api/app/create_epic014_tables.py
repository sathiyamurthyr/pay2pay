import asyncio
import sys
from app.core.database import engine, Base
import app.infrastructure.db.epic014_models

async def create_tables():
    print("Creating EPIC-014 tables in PostgreSQL database...", flush=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("EPIC-014 TABLES CREATED SUCCESSFULLY!", flush=True)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())
