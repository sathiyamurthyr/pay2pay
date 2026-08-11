import sys
from sqlalchemy import create_engine, text
from app.core.database import Base

# Import all ORM models to populate Base.metadata
import app.infrastructure.db.models
import app.infrastructure.db.dmt_models
import app.infrastructure.db.aeps_models
import app.infrastructure.db.audio_models
import app.infrastructure.db.beneficiary_models
import app.infrastructure.db.customer_models
import app.infrastructure.db.policy_models

SYNC_DB_URL = "postgresql+psycopg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

def sync_create_schema():
    print("Connecting to Supabase PostgreSQL using synchronous engine...", flush=True)
    engine = create_engine(SYNC_DB_URL, echo=False, pool_pre_ping=True)
    tables = Base.metadata.sorted_tables
    print(f"Discovered {len(tables)} ORM models across all domains.", flush=True)
    
    success_count = 0
    fail_count = 0

    with engine.connect() as conn:
        for table in tables:
            try:
                # Check if table exists
                res = conn.execute(text(
                    f"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '{table.name}');"
                ))
                exists = res.scalar()
                if not exists:
                    table.create(conn, checkfirst=True)
                    conn.commit()
                    success_count += 1
                else:
                    success_count += 1
            except Exception as e:
                conn.rollback()
                fail_count += 1
                print(f"Skipping table '{table.name}' due to error: {e}", flush=True)

    print(f"SCHEMA CREATION COMPLETED: {success_count} tables ready, {fail_count} skipped.", flush=True)
    engine.dispose()

if __name__ == "__main__":
    sync_create_schema()
