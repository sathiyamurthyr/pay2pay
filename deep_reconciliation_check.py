import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def deep_check():
    async with AsyncSessionLocal() as session:
        print("=" * 80)
        print("1. RETAILERS AND THEIR WALLETS")
        print("=" * 80)
        res = await session.execute(text("""
            SELECT r.id, r.public_id, r.retailer_code, r.owner_name, r.store_name, w.id as wallet_id, w.wallet_balance, w.updated_date
            FROM retailer r
            LEFT JOIN retailer_wallet w ON r.public_id = w.retailer_id
            ORDER BY r.id ASC;
        """))
        for row in res.fetchall():
            print(dict(row._mapping))

        print("\n" + "=" * 80)
        print("2. ALL TRANSACTION LEDGER ENTRIES (FULL AUDIT)")
        print("=" * 80)
        res2 = await session.execute(text("""
            SELECT id, transaction_id, transaction_reference, entry_type, account_type, amount, balance_before, balance_after, narration, created_at
            FROM transaction_ledger_entries
            ORDER BY created_at ASC;
        """))
        for row in res2.fetchall():
            print(dict(row._mapping))

        print("\n" + "=" * 80)
        print("3. ALL TRANSACTIONS (CENTRAL TABLE)")
        print("=" * 80)
        res3 = await session.execute(text("""
            SELECT id, public_id, transaction_reference, service_type, amount, charges, commission, gst_amount, net_amount, status, created_at
            FROM transactions
            ORDER BY created_at ASC;
        """))
        for row in res3.fetchall():
            print(dict(row._mapping))

        print("\n" + "=" * 80)
        print("4. ALL ENTERPRISE PAYOUT TRANSACTIONS")
        print("=" * 80)
        try:
            res4 = await session.execute(text("""
                SELECT id, public_id, transaction_number, amount, charges, commission, net_debit, wallet_before, wallet_after, status, is_reversed, reversal_transaction_id, created_date
                FROM enterprise_payout_transactions
                ORDER BY created_date ASC;
            """))
            for row in res4.fetchall():
                print(dict(row._mapping))
        except Exception as e:
            print("enterprise_payout_transactions error:", e)

        print("\n" + "=" * 80)
        print("5. ALL PAYOUT DOUBLE ENTRY LEDGER ENTRIES")
        print("=" * 80)
        try:
            res5 = await session.execute(text("""
                SELECT id, transaction_id, entry_number, entry_type, account_type, amount, balance_after, is_reversal_entry, created_date
                FROM payout_double_entry_ledger
                ORDER BY created_date ASC;
            """))
            for row in res5.fetchall():
                print(dict(row._mapping))
        except Exception as e:
            print("payout_double_entry_ledger error:", e)

if __name__ == "__main__":
    asyncio.run(deep_check())
