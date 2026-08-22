import asyncio
import sys
import os
import json

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.application.financial_reconciliation_service import FinancialReconciliationService


async def main():
    print("=== STARTING AUTHORITATIVE FINANCIAL RECONCILIATION ===")
    async with AsyncSessionLocal() as db:
        res = await FinancialReconciliationService.reconcile_all_wallets(db, auto_repair=True)
        print(json.dumps(res, indent=2))
        print("=== RECONCILIATION COMPLETE ===")


if __name__ == "__main__":
    asyncio.run(main())
