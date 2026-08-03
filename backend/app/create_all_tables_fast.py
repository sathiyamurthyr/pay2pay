import asyncio
import sys
from sqlalchemy import text
from app.core.database import engine, Base

# Import all ORM models to populate Base.metadata
import app.infrastructure.db.models
import app.infrastructure.db.dmt_models
import app.infrastructure.db.aeps_models
import app.infrastructure.db.audio_models
import app.infrastructure.db.beneficiary_models
import app.infrastructure.db.customer_models
import app.infrastructure.db.policy_models

async def create_all_tables_fast():
    print(f"Discovered {len(Base.metadata.tables)} total ORM tables.", flush=True)
    async with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            table_name = table.name
            try:
                # Check if table exists
                res = await conn.execute(text(
                    f"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '{table_name}');"
                ))
                exists = res.scalar()
                if not exists:
                    print(f"  Creating missing table: {table_name}...", flush=True)
                    await conn.run_sync(lambda sync_conn: table.create(sync_conn, checkfirst=True))
                else:
                    print(f"  Table '{table_name}' already exists.", flush=True)
            except Exception as e:
                print(f"  Error creating table '{table_name}': {e}", flush=True)

    print("ALL APPLICATION TABLES CREATED AND VERIFIED SUCCESSFULLY!", flush=True)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_all_tables_fast())
