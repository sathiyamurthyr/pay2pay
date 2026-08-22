import asyncio
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def find_txn():
    queries = [
        ("transactions", "SELECT * FROM transactions WHERE transaction_reference LIKE '%CB75A2A5%'"),
        ("enterprise_payout_transactions", "SELECT * FROM enterprise_payout_transactions WHERE transaction_number LIKE '%CB75A2A5%'"),
        ("payout_workflow_transactions", "SELECT * FROM payout_workflow_transactions WHERE transaction_number LIKE '%CB75A2A5%'"),
        ("transaction_ledger_entries", "SELECT * FROM transaction_ledger_entries WHERE transaction_reference LIKE '%CB75A2A5%'")
    ]
    for tbl, q in queries:
        async with AsyncSessionLocal() as db:
            try:
                res = await db.execute(text(q))
                rows = res.fetchall()
                print(f"Table {tbl}: {len(rows)} rows found")
                for r in rows:
                    print(dict(r._mapping))
            except Exception as e:
                print(f"Error checking {tbl}: {e}")

if __name__ == "__main__":
    asyncio.run(find_txn())
