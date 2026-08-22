import asyncio
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def query_details():
    async with AsyncSessionLocal() as session:
        print("=== 1. SEARCHING FOR CUSTOMER 'Sathiya Murthyr' ===")
        res = await session.execute(text("""
            SELECT * FROM customers 
            WHERE name ILIKE '%Sathiya%' OR name ILIKE '%Murthy%' OR mobile_number ILIKE '%9176669426%'
        """))
        customers = res.fetchall()
        print(f"Found {len(customers)} matching customers:")
        for c in customers:
            print(json.dumps({k: str(v) for k, v in dict(c._mapping).items()}, indent=2))

        print("\n=== 2. SEARCHING FOR BENEFICIARY 'MR. DANDURI BALAKASAIAH' ===")
        res = await session.execute(text("""
            SELECT * FROM payout_beneficiaries 
            WHERE beneficiary_name ILIKE '%BALAKASAIAH%' OR beneficiary_name ILIKE '%DANDURI%'
        """))
        benes = res.fetchall()
        print(f"Found {len(benes)} matching beneficiaries in payout_beneficiaries:")
        for b in benes:
            print(json.dumps({k: str(v) for k, v in dict(b._mapping).items()}, indent=2))

        # Check in generic beneficiaries table if exists
        try:
            res2 = await session.execute(text("""
                SELECT * FROM beneficiaries 
                WHERE name ILIKE '%BALAKASAIAH%' OR name ILIKE '%DANDURI%'
            """))
            benes2 = res2.fetchall()
            print(f"Found {len(benes2)} matching beneficiaries in beneficiaries table:")
            for b in benes2:
                print(json.dumps({k: str(v) for k, v in dict(b._mapping).items()}, indent=2))
        except Exception as e:
            print("Beneficiaries table error:", e)

        print("\n=== 3. SEARCHING FOR UTKAL SERVICE / GATEWAY / CONNECTOR CONFIG ===")
        try:
            res = await session.execute(text("""
                SELECT id, name, code, service_type, is_active, metadata_json 
                FROM services 
                WHERE name ILIKE '%utkal%' OR code ILIKE '%utkal%' OR name ILIKE '%payout%'
            """))
            svcs = res.fetchall()
            print(f"Matching services ({len(svcs)}):")
            for s in svcs:
                print(json.dumps({k: str(v) for k, v in dict(s._mapping).items()}, indent=2))
        except Exception as e:
            print("Services table error:", e)

        try:
            res = await session.execute(text("""
                SELECT * FROM service_providers 
                WHERE name ILIKE '%utkal%' OR code ILIKE '%utkal%'
            """))
            sps = res.fetchall()
            print(f"Matching service providers ({len(sps)}):")
            for sp in sps:
                print(json.dumps({k: str(v) for k, v in dict(sp._mapping).items()}, indent=2))
        except Exception as e:
            print("Service providers error:", e)

if __name__ == '__main__':
    asyncio.run(query_details())
