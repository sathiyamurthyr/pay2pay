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

    async with AsyncSessionLocal() as s:
        # Delete from aadhaar_verification
        del_stmt = text("DELETE FROM public.aadhaar_verification WHERE aadhaar_ref_token = :h OR masked_aadhaar = :masked RETURNING id, masked_aadhaar, full_name")
        res = await s.execute(del_stmt, {"h": h, "masked": masked})
        deleted = res.mappings().all()
        await s.commit()

        print(f"✅ Successfully deleted {len(deleted)} record(s) from public.aadhaar_verification:")
        for r in deleted:
            print(dict(r))

        # Check if any remaining
        check = await s.execute(text("SELECT count(*) as cnt FROM public.aadhaar_verification WHERE aadhaar_ref_token = :h"), {"h": h})
        cnt = check.mappings().first()["cnt"]
        print(f"Remaining records with hash {h}: {cnt}")

if __name__ == "__main__":
    asyncio.run(main())
