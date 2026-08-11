import sys
import asyncio
from app.core.database import engine, Base
import app.infrastructure.db.models
import app.infrastructure.db.dmt_models
import app.infrastructure.db.aeps_models
import app.infrastructure.db.audio_models
import app.infrastructure.db.beneficiary_models
import app.infrastructure.db.customer_models
import app.infrastructure.db.policy_models

async def create_tables():
    print("Starting database schema migration / table creation...", flush=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("ALL TABLES CREATED SUCCESSFULLY IN SUPABASE POSTGRESQL!", flush=True)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())
