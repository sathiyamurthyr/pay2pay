import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check_db_schema_and_rows():
    async with AsyncSessionLocal() as db:
        print("--- COLUMNS IN transaction_ledger_entries ---")
        res = await db.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transaction_ledger_entries' ORDER BY ordinal_position"))
        for row in res.fetchall():
            print(f"  {row[0]} ({row[1]})")

        print("\n--- RECENT ROWS IN transaction_ledger_entries ---")
        res2 = await db.execute(text("SELECT id, transaction_id, transaction_reference, entry_type, account_type, account_number, amount, balance_before, balance_after, narration, created_at FROM transaction_ledger_entries ORDER BY created_at DESC LIMIT 10"))
        for r in res2.fetchall():
            print(f"  Ref: {r.transaction_reference} | Type: {r.entry_type} | Amt: {r.amount} | Narration: {r.narration}")

        print("\n--- RECENT ROWS IN transactions ---")
        res3 = await db.execute(text("SELECT public_id, transaction_reference, service_type, transaction_type, amount, status, created_at, retailer_id FROM transactions ORDER BY created_at DESC LIMIT 10"))
        for r in res3.fetchall():
            print(f"  Ref: {r.transaction_reference} | Service: {r.service_type} | Type: {r.transaction_type} | Amt: {r.amount} | Status: {r.status} | Ret: {r.retailer_id}")

        print("\n--- RECENT ROWS IN topup_requests ---")
        res4 = await db.execute(text("SELECT topup_request_id, requested_amount, approved_amount, status, created_date, retailer_id FROM topup_requests ORDER BY created_date DESC LIMIT 10"))
        for r in res4.fetchall():
            print(f"  Req: {r.topup_request_id} | ReqAmt: {r.requested_amount} | ApprAmt: {r.approved_amount} | Status: {r.status} | Ret: {r.retailer_id}")

if __name__ == '__main__':
    asyncio.run(check_db_schema_and_rows())
