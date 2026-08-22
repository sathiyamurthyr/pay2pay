import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, public_id, transaction_reference, service_type, transaction_type, status, amount, retailer_id FROM transactions WHERE service_type = 'TOPUP' ORDER BY id DESC LIMIT 5;"))
        rows = res.all()
        print(f"Transactions matching TOPUP ({len(rows)}):")
        for r in rows:
            print("  -", dict(r._mapping))
        
        res_l = await session.execute(text("SELECT id, transaction_id, transaction_reference, entry_type, account_type, amount, balance_before, balance_after FROM transaction_ledger_entries WHERE transaction_reference LIKE 'TOP-%' ORDER BY id DESC LIMIT 5;"))
        rows_l = res_l.all()
        print(f"\nLedger entries matching TOP-% ({len(rows_l)}):")
        for rl in rows_l:
            print("  -", dict(rl._mapping))

if __name__ == "__main__":
    asyncio.run(main())
