import asyncio
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT public_id, transaction_reference, status, amount, charges, net_amount, created_at FROM transactions ORDER BY created_at DESC LIMIT 10"))
        print("=== TRANSACTIONS TABLE ===")
        for r in res.fetchall():
            print(dict(r._mapping))
        
        res_l = await db.execute(text("SELECT public_id, transaction_reference, entry_type, amount, balance_before, balance_after, created_at FROM transaction_ledger_entries ORDER BY created_at DESC LIMIT 10"))
        print("\n=== TRANSACTION LEDGER ENTRIES ===")
        for r in res_l.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(check())
