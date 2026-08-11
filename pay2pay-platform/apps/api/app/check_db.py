"""
Direct Supabase PostgreSQL Database Inspector & Query Tester
Runs test queries against live Supabase database tables.
"""
import sys
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def test_database_connection_and_queries():
    print("Connecting to Supabase PostgreSQL Database...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.connect() as conn:
            # 1. Test PostgreSQL Version
            ver_res = await conn.execute(text("SELECT version();"))
            ver = ver_res.scalar()
            print(f"✅ Connection Successful!\n   PostgreSQL Version: {ver}\n")
            
            # 2. Query Total Table Count in 'public' schema
            count_res = await conn.execute(text(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
            ))
            table_count = count_res.scalar()
            print(f"✅ Total Database Tables in 'public' Schema: {table_count}\n")
            
            # 3. List Sample Schema Tables
            tables_res = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 15;"
            ))
            sample_tables = [row[0] for row in tables_res.fetchall()]
            print("📋 Sample Database Tables:")
            for t in sample_tables:
                print(f"   - {t}")
                
            print("\n✅ Supabase Query Test Passed Successfully!")
            
    except Exception as e:
        print(f"❌ Database Connection / Query Failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_database_connection_and_queries())
