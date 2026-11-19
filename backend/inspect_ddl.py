import asyncio
import os
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    db_url = os.environ.get("DATABASE_URL")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        for tbl in ['payin_vendors', 'payin_card_types', 'payin_company_vendors', 'payin_mdr_cfg', 'payin_audit_logs', 'payin_txns']:
            res = await conn.execute(text(f"""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = '{tbl}' AND table_schema = 'public'
                ORDER BY ordinal_position
            """))
            cols = [dict(r) for r in res.mappings().all()]
            print(f"\n=== TABLE: {tbl} ===")
            for c in cols:
                print(f"  {c['column_name']}: {c['data_type']} (nullable={c['is_nullable']}, default={c['column_default']})")

if __name__ == "__main__":
    asyncio.run(main())
