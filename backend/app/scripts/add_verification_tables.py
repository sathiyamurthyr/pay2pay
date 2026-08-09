import asyncio
from app.core.database import engine
from app.domain.entities.base import BaseEntity
import app.infrastructure.db.verification_models  # Ensure models imported

async def init_tables():
    async with engine.begin() as conn:
        print("Creating verification workflow PostgreSQL tables...")
        await conn.run_sync(BaseEntity.metadata.create_all)
        print("[OK] All 8 verification workflow tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_tables())
