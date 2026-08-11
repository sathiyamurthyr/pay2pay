"""
DMT Transaction Query Tester for Supabase PostgreSQL
Runs the DMT transaction query and outputs formatted tabular results.
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def run_dmt_query():
    print("Executing query on Supabase PostgreSQL:\n")
    print("SELECT dmt_number, transfer_mode, transfer_amount, fee_amount, utr_number, status FROM dmt_transaction LIMIT 10;\n")
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.connect() as conn:
            query = text("SELECT dmt_number, transfer_mode, transfer_amount, fee_amount, utr_number, status FROM dmt_transaction LIMIT 10;")
            res = await conn.execute(query)
            rows = res.fetchall()
            
            if not rows:
                print("ℹ️ Query executed successfully. Table 'dmt_transaction' currently has 0 rows (ready for transaction intake).")
            else:
                print(f"{'DMT NUMBER':<18} | {'MODE':<6} | {'AMOUNT (₹)':<12} | {'FEE (₹)':<8} | {'UTR NUMBER':<20} | {'STATUS':<10}")
                print("-" * 85)
                for r in rows:
                    print(f"{r[0]:<18} | {r[1]:<6} | {r[2]:<12.2f} | {r[3]:<8.2f} | {r[4]:<20} | {r[5]:<10}")
                    
            print(f"\n✅ Total Rows Returned: {len(rows)}")
    except Exception as e:
        print(f"❌ Query Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_dmt_query())
