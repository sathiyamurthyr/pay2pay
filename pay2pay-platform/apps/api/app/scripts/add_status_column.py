import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate_status_column():
    async with engine.begin() as conn:
        print("[DB Migration] Adding status column to beneficiary_master if missing...")
        await conn.execute(text("""
            ALTER TABLE beneficiary_master 
            ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_beneficiary_master_status 
            ON beneficiary_master(status);
        """))
        print("[DB Migration] Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate_status_column())
