import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as s:
        # Check customer_verification with this verification_id
        res = await s.execute(text("SELECT * FROM public.customer_verification WHERE verification_id = 'cc9fc1e0-0b2e-45b0-a381-4ef68502a2eb'"))
        rows = res.mappings().all()
        print("customer_verification rows:")
        for r in rows:
            print(dict(r))

        # Check all columns of aadhaar_verification for id 13
        res2 = await s.execute(text("SELECT * FROM public.aadhaar_verification WHERE id = 13"))
        rows2 = res2.mappings().all()
        print("aadhaar_verification row 13:")
        for r in rows2:
            d = dict(r)
            d.pop("photo_base64", None) # Don't flood output
            print(d)

if __name__ == "__main__":
    asyncio.run(main())
