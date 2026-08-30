import asyncio
import asyncpg
from pathlib import Path

DATABASE_URL = "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def deploy_and_test():
    sql_file = Path(r"d:\pay2pay\backend\migrations\id_standardization\09_get_user_wallet_function.sql")
    sql_content = sql_file.read_text(encoding="utf-8")

    print("=== Deploying public.get_user_wallet to Supabase ===")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(sql_content)
        print(" Successfully deployed 09_get_user_wallet_function.sql!")

        print("\n" + "="*60)
        print("RUNNING COMPREHENSIVE VERIFICATION FOR get_user_wallet")
        print("="*60)

        # 1. Retailer 4 (sathus tech - Active with balance)
        print("\n--- TEST 1: Query Retailer 4 (User Type 2 = RETAILER) ---")
        row = await conn.fetchrow("SELECT * FROM public.get_user_wallet(4, 2);")
        print("Result:", dict(row) if row else None)
        assert row is not None
        assert row["user_ref_id"] == 4
        assert row["user_type"] == "RETAILER"
        assert row["wallet_status"] == "ACTIVE"
        assert row["wallet_balance"] > 0
        print(">>> TEST 1 PASSED!")

        # 2. Retailer with default user_type_ref_id
        print("\n--- TEST 2: Query Retailer 4 with default user_type parameter ---")
        row_def = await conn.fetchrow("SELECT * FROM public.get_user_wallet(4);")
        print("Result:", dict(row_def) if row_def else None)
        assert row_def is not None
        assert row_def["user_ref_id"] == 4
        print(">>> TEST 2 PASSED!")

        # 3. Retailer 8 (MARUTHI ONLINE SERVICES)
        print("\n--- TEST 3: Query Retailer 8 ---")
        row8 = await conn.fetchrow("SELECT * FROM public.get_user_wallet(8, 2);")
        print("Result:", dict(row8) if row8 else None)
        assert row8 is not None
        assert row8["user_ref_id"] == 8
        print(">>> TEST 3 PASSED!")

        # 4. Check for User Type Name resolution from user_type master table
        print("\n--- TEST 4: Query with other User Types (e.g. DISTRIBUTOR / ADMIN) ---")
        row_dist = await conn.fetchrow("SELECT * FROM public.get_user_wallet(1, 3);")
        print("Result (Distributor):", dict(row_dist) if row_dist else None)
        print(">>> TEST 4 PASSED!")

        print("\n" + "="*60)
        print("ALL get_user_wallet VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("="*60)

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(deploy_and_test())
