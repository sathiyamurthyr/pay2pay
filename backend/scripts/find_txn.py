import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as s:
        # Check in payout_workflow_transactions
        r1 = await s.execute(text("SELECT id, transaction_number, reference_number, utr_number, amount, net_debit, charges, status, created_date FROM public.payout_workflow_transactions WHERE transaction_number LIKE '%030926225500117%' LIMIT 1;"))
        row1 = r1.mappings().first()
        print("payout_workflow_transactions row:")
        if row1:
            print(dict(row1))
        else:
            print("Not found in payout_workflow_transactions")

        # Check in central_transaction
        r2 = await s.execute(text("SELECT txn_id, entry_type, service_name, total_amount, balance_before, balance_after, status, created_date FROM public.central_transaction WHERE txn_id LIKE '%030926225500117%' LIMIT 2;"))
        rows2 = [dict(r) for r in r2.mappings().all()]
        print("\ncentral_transaction rows:", rows2)

if __name__ == "__main__":
    asyncio.run(main())
