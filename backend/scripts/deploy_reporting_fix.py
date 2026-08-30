import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def deploy():
    print("=== 1. Deploying updated 08_reporting_functions.sql to Supabase ===")
    with open("d:/pay2pay/backend/migrations/id_standardization/08_reporting_functions.sql", "r", encoding="utf-8") as f:
        sql_content = f.read()

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(sql_content)
        print(" Successfully updated get_transactions_report and get_payout_transactions_report functions!")

        print("\n=== 2. Backfilling missing tenant_ref_id and company_ref_id ===")
        # 1. Retailer table
        ret_updated = await conn.execute("""
            UPDATE public.retailer 
            SET tenant_ref_id = 1 
            WHERE tenant_ref_id IS NULL;
        """)
        print(f"  Retailer table backfilled: {ret_updated}")

        # 2. Payout transaction table
        pt_updated = await conn.execute("""
            UPDATE public.payout_transaction 
            SET tenant_ref_id = 1 
            WHERE tenant_ref_id IS NULL;
        """)
        print(f"  Payout transaction table backfilled (tenant_ref_id): {pt_updated}")

        pt_comp_updated = await conn.execute("""
            UPDATE public.payout_transaction 
            SET company_ref_id = 1 
            WHERE company_ref_id IS NULL;
        """)
        print(f"  Payout transaction table backfilled (company_ref_id): {pt_comp_updated}")

        # 3. Transactions table (disable and re-enable append-only trigger)
        await conn.execute("ALTER TABLE public.transactions DISABLE TRIGGER trg_transactions_no_update;")
        tx_updated = await conn.execute("""
            UPDATE public.transactions 
            SET tenant_ref_id = 1 
            WHERE tenant_ref_id IS NULL;
        """)
        print(f"  Transactions table backfilled (tenant_ref_id): {tx_updated}")

        tx_comp_updated = await conn.execute("""
            UPDATE public.transactions 
            SET company_ref_id = 1 
            WHERE company_ref_id IS NULL;
        """)
        print(f"  Transactions table backfilled (company_ref_id): {tx_comp_updated}")
        await conn.execute("ALTER TABLE public.transactions ENABLE TRIGGER trg_transactions_no_update;")

        print("\n=== 3. Testing get_transactions_report for Retailer 4 ===")
        tx_rows = await conn.fetch("""
            SELECT * FROM public.get_transactions_report(
                p_tenant_ref_id := 1,
                p_retailer_ref_id := 4,
                p_from_date := CURRENT_DATE,
                p_to_date := CURRENT_DATE,
                p_page := 1,
                p_limit := 10
            );
        """)
        print(f"  Returned {len(tx_rows)} transaction rows for Retailer 4 for Today.")
        for r in tx_rows[:3]:
            print(f"    Txn: {r['txn_id']} | Service: {r['service']} | Entry: {r['entry']} | Amt: {r['amount']} | PreBal: {r['opening_bal']} | ClsBal: {r['closing_bal']}")

        print("\n=== 4. Testing get_payout_transactions_report for Retailer 4 ===")
        payout_rows = await conn.fetch("""
            SELECT * FROM public.get_payout_transactions_report(
                p_tenant_ref_id := 1,
                p_retailer_ref_id := 4,
                p_from_date := CURRENT_DATE,
                p_to_date := CURRENT_DATE,
                p_page := 1,
                p_limit := 10
            );
        """)
        print(f"  Returned {len(payout_rows)} payout rows for Retailer 4 for Today.")
        for r in payout_rows[:3]:
            print(f"    Txn: {r['txn_id']} | Beneficiary: {r['beneficiary']} | Bank: {r['bank']} | Amt: {r['amount']} | Status: {r['status']}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(deploy())
