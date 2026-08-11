import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import engine, Base
from app.infrastructure.db import registration_models

async def create_tables():
    print("================ CREATING REGISTRATION ONBOARDING TABLES ================")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(" Successfully created all registration onboarding tables in PostgreSQL DB.")
    print("===========================================================================")

if __name__ == "__main__":
    asyncio.run(create_tables())
