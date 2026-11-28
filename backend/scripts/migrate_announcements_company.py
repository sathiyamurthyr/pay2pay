import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Checking public.announcement schema...")
        await conn.execute(text("""
            ALTER TABLE public.announcement 
            ADD COLUMN IF NOT EXISTS company_ref_id INTEGER NULL;
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_announcement_company_ref_id 
            ON public.announcement(company_ref_id);
        """))
        print("✅ Added company_ref_id to public.announcement")

        print("Checking public.announcement_image schema...")
        await conn.execute(text("""
            ALTER TABLE public.announcement_image 
            ADD COLUMN IF NOT EXISTS company_ref_id INTEGER NULL;
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_announcement_image_company_ref_id 
            ON public.announcement_image(company_ref_id);
        """))
        print("✅ Added company_ref_id to public.announcement_image")

        print("Updating existing announcement records with company mappings...")
        
        # 1. Row 2: SMSPAY Welcome Banner (id = 2)
        await conn.execute(text("""
            UPDATE public.announcement 
            SET company_ref_id = 2,
                company_id = 'b1e02b56-7742-4549-a4ef-31f5378f00a8',
                tenant_id = '547aa7bb-a790-4fe2-bd5b-27214ed176c8',
                is_active = true,
                status = 'ACTIVE'
            WHERE id = 2;
        """))
        await conn.execute(text("""
            UPDATE public.announcement_image 
            SET company_ref_id = 2,
                company_id = 'b1e02b56-7742-4549-a4ef-31f5378f00a8',
                tenant_id = '547aa7bb-a790-4fe2-bd5b-27214ed176c8',
                is_active = true
            WHERE id = 1;
        """))
        print("✅ Configured Row 2 as SMSPAY (company_ref_id = 2)")

        # 2. Row 3: SATHUS TECHNOLOGY / Near4You Banner (id = 3)
        await conn.execute(text("""
            UPDATE public.announcement 
            SET company_ref_id = 1,
                company_id = 'c1111111-1111-1111-1111-111111111111',
                tenant_id = '93538c98-0b19-493c-a247-4cdb02a46c68',
                is_active = true,
                status = 'ACTIVE'
            WHERE id = 3;
        """))
        await conn.execute(text("""
            UPDATE public.announcement_image 
            SET company_ref_id = 1,
                company_id = 'c1111111-1111-1111-1111-111111111111',
                tenant_id = '93538c98-0b19-493c-a247-4cdb02a46c68',
                is_active = true
            WHERE id = 2;
        """))
        print("✅ Configured Row 3 as NEAR4YOU (company_ref_id = 1)")

    # Read back to verify
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT a.id, a.announcement_code, a.title, a.company_ref_id, a.company_id, a.tenant_id, a.is_active,
                   img.id AS img_id, img.image_url, img.company_ref_id AS img_cmp_ref
            FROM public.announcement a
            LEFT JOIN public.announcement_image img ON img.announcement_id = a.public_id
            ORDER BY a.id, img.id;
        """))
        rows = res.fetchall()
        print("\n=== Current State in Database ===")
        for r in rows:
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(migrate())
