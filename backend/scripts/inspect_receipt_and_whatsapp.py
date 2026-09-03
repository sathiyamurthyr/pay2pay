import asyncio
import sys
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as s:
        # Check payout_receipt entries
        r = await s.execute(text("SELECT id, receipt_token, transaction_number, amount, whatsapp_status, whatsapp_message_id, created_date FROM public.payout_receipt ORDER BY id DESC LIMIT 10;"))
        rows = [dict(row) for row in r.mappings().all()]
        print(f"payout_receipt entries count: {len(rows)}")
        for r_row in rows:
            print(r_row)

        # Look specifically for P2P-95D9E6AB or UPAY030926225500117 (from screenshot)
        r_target = await s.execute(text("SELECT * FROM public.payout_receipt WHERE receipt_token LIKE '%95D9E6AB%' OR transaction_number LIKE '%030926225500117%';"))
        target_rows = [dict(row) for row in r_target.mappings().all()]
        print("\nTarget receipt search:", target_rows)

if __name__ == "__main__":
    asyncio.run(main())
