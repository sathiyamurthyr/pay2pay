import asyncio
import hashlib
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

def compute_aadhaar_hash(clean_aadhaar: str) -> str:
    return hashlib.sha256(f"PAY2PAY_AADHAAR_SALT_{clean_aadhaar}".encode("utf-8")).hexdigest()

async def main():
    aadhaar_num = "323512899574"
    h = compute_aadhaar_hash(aadhaar_num)
    masked = f"XXXX-XXXX-{aadhaar_num[-4:]}"
    print(f"Target Aadhaar: {aadhaar_num}")
    print(f"Hash: {h}")

    async with AsyncSessionLocal() as s:
        res = await s.execute(text("SELECT id, customer_id, verification_id, masked_aadhaar, aadhaar_ref_token, full_name FROM public.aadhaar_verification WHERE aadhaar_ref_token = :h OR masked_aadhaar = :masked OR masked_aadhaar LIKE '%9574'"), {"h": h, "masked": masked})
        rows = res.mappings().all()
        print(f"\n--- Found {len(rows)} rows in public.aadhaar_verification ---")
        for r in rows:
            print("ID:", r["id"], "cust_id:", r["customer_id"], "ver_id:", r["verification_id"], "masked:", r["masked_aadhaar"], "name:", r["full_name"])

    async with AsyncSessionLocal() as s:
        res = await s.execute(text("SELECT id, public_id, first_name, last_name, mobile_number, kyc_status, aadhaar_number FROM public.customers WHERE aadhaar_number LIKE '%9574' OR mobile_number LIKE '%9574'"), {})
        rows = res.mappings().all()
        print(f"\n--- Found {len(rows)} rows in public.customers ---")
        for r in rows:
            print(dict(r))

    async with AsyncSessionLocal() as s:
        res = await s.execute(text("SELECT id, verification_id, customer_id, first_name, last_name, mobile, status FROM public.customer_verification WHERE mobile LIKE '%9574'"), {})
        rows = res.mappings().all()
        print(f"\n--- Found {len(rows)} rows in public.customer_verification ---")
        for r in rows:
            print(dict(r))

if __name__ == "__main__":
    asyncio.run(main())
