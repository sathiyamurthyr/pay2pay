import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def deploy():
    print("=== Deploying 08_reporting_functions.sql via asyncpg ===")
    with open("d:/pay2pay/backend/migrations/id_standardization/08_reporting_functions.sql", "r", encoding="utf-8") as f:
        sql_content = f.read()

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(sql_content)
        print(" Successfully executed 08_reporting_functions.sql script on Supabase!")
        
        print("\n--- Verifying Function Signatures in pg_proc ---")
        rows = await conn.fetch("""
            SELECT proname, pg_get_function_identity_arguments(oid) as args
            FROM pg_proc
            WHERE proname IN ('get_payout_transactions_report', 'get_transactions_report')
            ORDER BY proname;
        """)
        for r in rows:
            print(f"  Function: {r['proname']}")
            print(f"  Arguments: {r['args']}")

        print("\n--- Testing get_payout_transactions_report (Default Today) ---")
        payout_rows = await conn.fetch("""
            SELECT * FROM public.get_payout_transactions_report(
                p_tenant_ref_id := 1,
                p_page := 1,
                p_limit := 3
            );
        """)
        print(f"  Returned {len(payout_rows)} rows for Today.")
        for r in payout_rows:
            print("  ", dict(r))

        print("\n--- Testing get_transactions_report (Default Today) ---")
        tx_rows = await conn.fetch("""
            SELECT * FROM public.get_transactions_report(
                p_tenant_ref_id := 1,
                p_page := 1,
                p_limit := 3
            );
        """)
        print(f"  Returned {len(tx_rows)} rows for Today.")
        for r in tx_rows:
            print("  ", dict(r))

    finally:
        await conn.close()
    print("\n=== Deployment and Verification Complete! ===")

if __name__ == "__main__":
    asyncio.run(deploy())
