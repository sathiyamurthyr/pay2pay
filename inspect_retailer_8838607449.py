import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def inspect():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.connect() as conn:
        print("=== 1. Checking retailer & contact for 8838607449 ===")
        try:
            res = await conn.execute(text("""
                SELECT r.*, rc.mobile, rc.email 
                FROM public.retailer r
                LEFT JOIN public.retailer_contact rc ON rc.retailer_id = r.public_id
                WHERE rc.mobile LIKE '%8838607449%' OR r.retailer_code LIKE '%8838607449%' OR r.owner_name LIKE '%8838607449%';
            """))
            rows = res.fetchall()
            print(f"Found {len(rows)} rows in retailer join contact:")
            for r in rows:
                print(dict(r._mapping))
        except Exception as e:
            print("Error querying retailer:", e)

        print("\n=== 2. Checking all tables for value '8838607449' ===")
        try:
            tables_res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"))
            tables = [t[0] for t in tables_res.fetchall()]
            
            for t in tables:
                try:
                    cols_res = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}';"))
                    text_cols = [c[0] for c in cols_res.fetchall() if c[1] in ('character varying', 'text', 'character')]
                    if text_cols:
                        where_clauses = " OR ".join([f"{col} ILIKE '%8838607449%'" for col in text_cols])
                        query = f"SELECT * FROM public.{t} WHERE {where_clauses};"
                        r_res = await conn.execute(text(query))
                        matches = r_res.fetchall()
                        if matches:
                            print(f"\n[MATCH] Table: {t} ({len(matches)} rows):")
                            for m in matches:
                                print(dict(m._mapping))
                except Exception as inner_e:
                    # Ignore table query errors
                    pass
        except Exception as e:
            print("Error checking all tables:", e)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(inspect())
