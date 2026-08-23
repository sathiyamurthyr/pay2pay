import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def check_user():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.connect() as conn:
        print("=== Checking users table for 9176669426 ===")
        try:
            res = await conn.execute(text("SELECT * FROM public.users WHERE mobile_number LIKE '%9176669426%' OR phone LIKE '%9176669426%' OR email LIKE '%9176669426%' OR username LIKE '%9176669426%';"))
            rows = res.fetchall()
            print(f"Found {len(rows)} rows in users:")
            for r in rows:
                print(dict(r._mapping))
        except Exception as e:
            print("Error querying users:", e)

        print("\n=== Checking retailers table for 9176669426 ===")
        try:
            res = await conn.execute(text("SELECT * FROM public.retailers WHERE mobile LIKE '%9176669426%' OR phone LIKE '%9176669426%' OR mobile_number LIKE '%9176669426%' OR contact_number LIKE '%9176669426%';"))
            rows = res.fetchall()
            print(f"Found {len(rows)} rows in retailers:")
            for r in rows:
                print(dict(r._mapping))
        except Exception as e:
            print("Error querying retailers:", e)

        print("\n=== Finding all tables with column named mobile or phone ===")
        try:
            res = await conn.execute(text("""
                SELECT table_name, column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND (column_name ILIKE '%phone%' OR column_name ILIKE '%mobile%' OR column_name ILIKE '%user%' OR column_name ILIKE '%pass%');
            """))
            rows = res.fetchall()
            print("Relevant columns in DB:")
            for r in rows:
                print(f"  {r[0]}.{r[1]}")
        except Exception as e:
            print("Error searching columns:", e)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_user())
