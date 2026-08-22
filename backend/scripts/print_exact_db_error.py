import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.presentation.api.v1.enterprise_transaction_report_router import build_unified_transactions_query

async def main():
    list_sql, count_sql, params = build_unified_transactions_query(search="TOP-")
    async with AsyncSessionLocal() as session:
        try:
            res = await session.execute(text(list_sql), params)
            print("Success!", len(res.all()))
        except Exception as e:
            print("EXACT_ERROR_IS:", getattr(e, "orig", e))

if __name__ == "__main__":
    asyncio.run(main())
