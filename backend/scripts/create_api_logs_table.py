import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal, engine
from app.infrastructure.db.enterprise_api_log_model import EnterpriseApiLogModel
from app.domain.entities.base import Base

async def init_api_logs_table():
    async with engine.begin() as conn:
        print("Creating enterprise_api_log table in database...")
        await conn.run_sync(EnterpriseApiLogModel.metadata.create_all)
        print("Table creation complete!")

    async with AsyncSessionLocal() as db:
        # Check table columns & indexes
        res = await db.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_name = 'enterprise_api_log'"))
        print(f"Table exists check: {res.scalar()} (1 = YES)")

        res = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'enterprise_api_log'"))
        cols = [r[0] for r in res.fetchall()]
        print(f"Columns in enterprise_api_log ({len(cols)}):", cols)

if __name__ == "__main__":
    asyncio.run(init_api_logs_table())
