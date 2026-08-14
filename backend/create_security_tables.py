"""
Migration script to create the user_security_settings table.
Run: python create_security_tables.py
"""
import asyncio
import sys
sys.path.insert(0, ".")

from app.core.database import engine, Base
import app.infrastructure.db.session_security_models  # Register models


async def create_tables():
    print("Creating user_security_settings table...")
    async with engine.begin() as conn:
        # Create only the new tables (won't drop existing ones)
        await conn.run_sync(Base.metadata.create_all)
    print("Done! user_security_settings table created.")

if __name__ == "__main__":
    asyncio.run(create_tables())
