import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate_customer_mpin_columns():
    async with engine.begin() as conn:
        print("[DB Migration] Adding MPIN security columns to customer table...")
        await conn.execute(text("ALTER TABLE customer ADD COLUMN IF NOT EXISTS mpin_enabled BOOLEAN NOT NULL DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE customer ADD COLUMN IF NOT EXISTS mpin_hash VARCHAR(255) NULL;"))
        await conn.execute(text("ALTER TABLE customer ADD COLUMN IF NOT EXISTS mpin_created_at TIMESTAMP WITH TIME ZONE NULL;"))
        await conn.execute(text("ALTER TABLE customer ADD COLUMN IF NOT EXISTS mpin_last_changed_at TIMESTAMP WITH TIME ZONE NULL;"))
        await conn.execute(text("ALTER TABLE customer ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE customer ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;"))
        
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_customer_mpin_enabled ON customer(mpin_enabled);"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_customer_is_locked ON customer(is_locked);"))
        print("[DB Migration] Customer MPIN columns created successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_customer_mpin_columns())
