import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def run():
    async with AsyncSessionLocal() as session:
        # Check retailers
        print("=== 1. RETAILERS / USERS ===")
        res = await session.execute(text("SELECT id, public_id, retailer_code, store_name, owner_name, mobile, company_id, tenant_id FROM retailers WHERE store_name ILIKE '%Sathiya%' OR owner_name ILIKE '%Sathiya%' OR mobile ILIKE '%9176669426%' OR retailer_code = 'RET-10928'"))
        for r in res.fetchall():
            print("Retailer:", dict(r._mapping))
            
        # Check dmt_customers if exists
        try:
            res = await session.execute(text("SELECT * FROM dmt_customers WHERE name ILIKE '%Sathiya%' OR mobile_number ILIKE '%9176669426%'"))
            for r in res.fetchall():
                print("DMT Customer:", dict(r._mapping))
        except Exception as e:
            print("dmt_customers table error:", e)

        # Check dmt_beneficiaries if exists
        try:
            res = await session.execute(text("SELECT * FROM dmt_beneficiaries WHERE beneficiary_name ILIKE '%BALAKASAIAH%' OR name ILIKE '%BALAKASAIAH%'"))
            for r in res.fetchall():
                print("DMT Beneficiary:", dict(r._mapping))
        except Exception as e:
            print("dmt_beneficiaries table error:", e)

        # Check all tables containing 'beneficiar'
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%beneficiar%'"))
        bene_tables = [r[0] for r in res.fetchall()]
        print("\n=== 2. BENEFICIARY TABLES ===", bene_tables)
        for bt in bene_tables:
            try:
                res = await session.execute(text(f"SELECT * FROM {bt} WHERE beneficiary_name ILIKE '%BALAKASAIAH%' OR name ILIKE '%BALAKASAIAH%' OR account_number ILIKE '%16578383%'"))
                rows = res.fetchall()
                print(f"In {bt} ({len(rows)} rows):")
                for r in rows:
                    print(json.dumps({k: str(v) for k, v in dict(r._mapping).items()}, indent=2))
            except Exception as e:
                print(f"Error in {bt}:", e)

        # Check all tables containing 'customer'
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%customer%'"))
        cust_tables = [r[0] for r in res.fetchall()]
        print("\n=== 3. CUSTOMER TABLES ===", cust_tables)
        for ct in cust_tables:
            try:
                res = await session.execute(text(f"SELECT * FROM {ct} LIMIT 5"))
                print(f"Sample from {ct}:")
                for r in res.fetchall():
                    print(dict(r._mapping))
            except Exception as e:
                print(f"Error in {ct}:", e)

        # Check Utkal gateway / connector config
        print("\n=== 4. UTKAL GATEWAY / CONNECTOR ===")
        res = await session.execute(text("SELECT id, name, code, service_type, is_active FROM services WHERE code ILIKE '%utkal%' OR name ILIKE '%utkal%' OR name ILIKE '%payout%'"))
        for r in res.fetchall():
            print("Service:", dict(r._mapping))

        try:
            res = await session.execute(text("SELECT * FROM provider_configuration WHERE provider_code ILIKE '%utkal%' OR provider_name ILIKE '%utkal%'"))
            for r in res.fetchall():
                print("Provider config:", dict(r._mapping))
        except Exception as e:
            print("provider_configuration table error:", e)

if __name__ == '__main__':
    asyncio.run(run())
