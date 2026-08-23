import asyncio
import sys
import json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def inspect():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.connect() as conn:
        print("=== 1. Registration Drafts for 8838607449 ===")
        res = await conn.execute(text("SELECT * FROM public.registration_drafts WHERE mobile_number LIKE '%8838607449%';"))
        drafts = res.fetchall()
        print(f"Drafts count: {len(drafts)}")
        for d in drafts:
            d_dict = dict(d._mapping)
            print("Draft:", json.dumps({k: str(v) for k, v in d_dict.items()}, indent=2))

        print("\n=== 2. Retailer Contact for 8838607449 ===")
        res = await conn.execute(text("SELECT * FROM public.retailer_contact WHERE mobile LIKE '%8838607449%';"))
        contacts = res.fetchall()
        print(f"Contacts count: {len(contacts)}")
        for c in contacts:
            c_dict = dict(c._mapping)
            print("Contact:", json.dumps({k: str(v) for k, v in c_dict.items()}, indent=2))
            
            ret_id = c_dict.get('retailer_id')
            if ret_id:
                print(f"\n=== 3. Retailer Record for retailer_id={ret_id} ===")
                res2 = await conn.execute(text(f"SELECT * FROM public.retailer WHERE public_id = '{ret_id}';"))
                ret_rows = res2.fetchall()
                for r in ret_rows:
                    r_dict = dict(r._mapping)
                    print("Retailer:", json.dumps({k: str(v) for k, v in r_dict.items()}, indent=2))
                    
                print(f"\n=== 4. Retailer Verification for retailer_id={ret_id} ===")
                try:
                    res3 = await conn.execute(text(f"SELECT * FROM public.retailer_verifications WHERE retailer_id = '{ret_id}';"))
                    v_rows = res3.fetchall()
                    for v in v_rows:
                        v_dict = dict(v._mapping)
                        print("Verification:", json.dumps({k: str(v) for k, v in v_dict.items()}, indent=2))
                except Exception as e:
                    print("Error checking retailer_verifications:", e)

        print("\n=== 5. All Retailers with mobile in contact ===")
        res = await conn.execute(text("""
            SELECT r.public_id, r.retailer_code, r.owner_name, r.store_name, r.status, r.record_status, r.is_active, r.is_deleted, rc.mobile, rc.email 
            FROM public.retailer r 
            LEFT JOIN public.retailer_contact rc ON rc.retailer_id = r.public_id 
            WHERE rc.mobile LIKE '%8838607449%';
        """))
        for r in res.fetchall():
            print("Retailer summary:", dict(r._mapping))

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(inspect())
