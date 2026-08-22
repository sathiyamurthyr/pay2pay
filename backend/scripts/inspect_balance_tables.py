import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND (table_name LIKE '%wallet%' OR table_name LIKE '%balance%' OR table_name LIKE '%ledger%')
            ORDER BY table_name;
        """))
        tables = [r[0] for r in res.fetchall()]
        print("=== MATCHING BALANCE / WALLET / LEDGER TABLES ===")
        for t in tables:
            try:
                cnt = await db.scalar(text(f'SELECT count(*) FROM "{t}"'))
                print(f"Table: {t:35} | Row Count: {cnt}")
            except Exception as e:
                print(f"Table: {t:35} | Error: {e}")

        print("\n=== SAMPLE DATA FROM WALLET / BALANCE TABLES ===")
        # Check wallet table
        for t in ["wallets", "retailer_wallets", "wallet_ledgers", "wallet_statement", "customer_wallets"]:
            if t in tables:
                print(f"\n--- Top 5 Rows in {t} ---")
                rows = (await db.execute(text(f'SELECT * FROM "{t}" LIMIT 5'))).fetchall()
                for r in rows:
                    print(r)

if __name__ == "__main__":
    asyncio.run(main())
