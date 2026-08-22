import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        print("\n" + "="*115)
        print("LIVE TRANSACTION & LEDGER BALANCE HISTORY (wallet_ledger_record)")
        print("="*115)
        rows = (await db.execute(text("""
            SELECT id, account_code, entry_type, amount, running_balance, created_date 
            FROM wallet_ledger_record 
            ORDER BY id DESC 
            LIMIT 10;
        """))).mappings().all()
        
        print(f"{'ID':<4} | {'Account Code':<30} | {'Type':<8} | {'Amount (Rs.)':<14} | {'Running Balance (Rs.)':<22} | {'Date'}")
        print("-" * 115)
        for r in rows:
            acc = r['account_code']
            etype = r['entry_type']
            amt = float(r['amount'] or 0)
            run_bal = float(r['running_balance'] or 0)
            date_str = str(r['created_date'])[:19]
            print(f"{r['id']:<4} | {acc:<30} | {etype:<8} | Rs.{amt:<11.2f} | Rs.{run_bal:<19.2f} | {date_str}")
        print("="*115 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
