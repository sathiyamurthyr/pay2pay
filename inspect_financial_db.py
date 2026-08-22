import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        for t in ["retailer_wallet", "transaction_ledger_entries", "transactions", "payout_transactions"]:
            print("=" * 60)
            print(f"COLUMNS FOR TABLE: {t}")
            print("=" * 60)
            res = await session.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{t}' 
                ORDER BY ordinal_position;
            """))
            for r in res.fetchall():
                print(f"  {r[0]}: {r[1]}")

        print("\n" + "=" * 60)
        print("ALL TRANSACTION LEDGER ENTRIES:")
        print("=" * 60)
        res2 = await session.execute(text("SELECT * FROM transaction_ledger_entries ORDER BY created_at ASC;"))
        for r in res2.fetchall():
            print(dict(r._mapping))

        print("\n" + "=" * 60)
        print("ALL TRANSACTIONS:")
        print("=" * 60)
        res3 = await session.execute(text("SELECT * FROM transactions ORDER BY created_at ASC;"))
        for r in res3.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(check())
