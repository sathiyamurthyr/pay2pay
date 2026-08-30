import asyncio
import sys
import os

backend_dir = r"d:\pay2pay\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import engine
from sqlalchemy import text

SCRIPTS = [
    r"d:\pay2pay\backend\migrations\id_standardization\01_schema_inventory.sql",
    r"d:\pay2pay\backend\migrations\id_standardization\02_add_bigint_ref_ids.sql",
    r"d:\pay2pay\backend\migrations\id_standardization\03_id_mapping.sql",
    r"d:\pay2pay\backend\migrations\id_standardization\04_migrate_foreign_keys.sql",
    r"d:\pay2pay\backend\migrations\id_standardization\05_indexes_constraints.sql",
    r"d:\pay2pay\backend\migrations\id_standardization\06_function_updates.sql",
    r"d:\pay2pay\backend\migrations\id_standardization\07_validation.sql"
]

async def deploy_id_standardization():
    print("=" * 80)
    print("  PAY2PAY MAJOR DATABASE ID STANDARDIZATION DEPLOYMENT")
    print("=" * 80)

    async with engine.connect() as conn:
        raw_conn = await conn.get_raw_connection()
        underlying = raw_conn.driver_connection

        for idx, script_path in enumerate(SCRIPTS, 1):
            script_name = os.path.basename(script_path)
            print(f"\n[{idx}/7] Executing {script_name}...", flush=True)

            with open(script_path, "r", encoding="utf-8") as f:
                sql_content = f.read()

            try:
                # Execute full multi-statement script via asyncpg raw connection
                await underlying.execute(sql_content)
                print(f"  --> {script_name} COMPLETED SUCCESSFULLY.", flush=True)
            except Exception as e:
                print(f"  --> ERROR executing {script_name}: {str(e)}", flush=True)
                raise e

        # Query validation summary
        print("\n" + "=" * 80)
        print("  DEPLOYMENT AUDIT SUMMARY")
        print("=" * 80)
        
        rows = await underlying.fetch("""
            SELECT 
                c.relname as table_name,
                a.attname as pk_column,
                t.typname as data_type
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
            JOIN pg_type t ON t.oid = a.atttypid
            WHERE n.nspname = 'public' 
              AND con.contype = 'p'
              AND c.relname IN (
                  'tenant', 'company', 'retailer', 'distributor', 'super_distributor',
                  'regional_manager', 'customer', 'beneficiary_master', 'retailer_wallet',
                  'transactions', 'payout_transaction', 'payout_slab', 'bank_master'
              )
            ORDER BY c.relname;
        """)
        print(f"{'Table Name':<28} | {'Primary Key Column':<30} | {'Type':<10}")
        print("-" * 75)
        for r in rows:
            print(f"{r['table_name']:<28} | {r['pk_column']:<30} | {r['data_type']:<10}")

        print("=" * 80)
        print("Pay2Pay Database ID Standardization Migration is COMPLETE!")

if __name__ == "__main__":
    asyncio.run(deploy_id_standardization())
