import asyncio
from app.core.database import AsyncSessionLocal
from app.presentation.api.v1.beneficiary import search_epic014_bank_master

async def main():
    async with AsyncSessionLocal() as db:
        print("=== TEST 1: Empty Query (All/Top Banks) ===")
        res1 = await search_epic014_bank_master(query=None, limit=50, db=db)
        print(f"Status: {res1['status']} | Source: {res1['source']} | Total: {res1['total']}")
        for b in res1['data'][:5]:
            print(" -", b['bank_name'], "| IFSC Prefix:", b['ifsc_prefix'], "| Top:", b.get('is_top'))

        print("\n=== TEST 2: Query='HDFC' ===")
        res2 = await search_epic014_bank_master(query="HDFC", limit=50, db=db)
        print(f"Status: {res2['status']} | Source: {res2['source']} | Total: {res2['total']}")
        for b in res2['data'][:5]:
            print(" -", b['bank_name'], "| IFSC Prefix:", b['ifsc_prefix'])

        print("\n=== TEST 3: Query='Cooperative' ===")
        res3 = await search_epic014_bank_master(query="Cooperative", limit=50, db=db)
        print(f"Status: {res3['status']} | Source: {res3['source']} | Total: {res3['total']}")
        for b in res3['data'][:5]:
            print(" -", b['bank_name'], "| IFSC Prefix:", b['ifsc_prefix'])

if __name__ == "__main__":
    asyncio.run(main())
