import sys
import os
sys.path.insert(0, os.getcwd())

import asyncio
from app.core.database import engine, Base
import app.infrastructure.db.auth_models  # Import all 14 models

async def create_tables():
    async with engine.begin() as conn:
        print("\n================ CREATING ENTERPRISE AUTHENTICATION TABLES ================")
        await conn.run_sync(Base.metadata.create_all)
        print(" Successfully created all enterprise authentication tables in PostgreSQL DB.")
        print("===========================================================================\n")

if __name__ == "__main__":
    asyncio.run(create_tables())
