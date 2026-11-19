import asyncio
import os
import json
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    db_url = os.environ.get("DATABASE_URL")
    print(f"Connecting to: {db_url.split('@')[1] if '@' in db_url else db_url}")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        # Check companies
        res = await conn.execute(text("SELECT company_ref_id, company_name, company_code FROM public.company ORDER BY company_ref_id"))
        companies = [dict(r) for r in res.mappings().all()]
        print("\n=== COMPANIES ===")
        print(json.dumps(companies, indent=2))

        # Check payin_vendors
        res = await conn.execute(text("SELECT * FROM public.payin_vendors ORDER BY payin_vendor_ref_id"))
        vendors = [dict(r) for r in res.mappings().all()]
        print("\n=== PAYIN_VENDORS ===")
        print(json.dumps(vendors, default=str, indent=2))

        # Check payin_card_types
        res = await conn.execute(text("SELECT * FROM public.payin_card_types ORDER BY payin_card_type_ref_id"))
        card_types = [dict(r) for r in res.mappings().all()]
        print("\n=== PAYIN_CARD_TYPES ===")
        print(json.dumps(card_types, default=str, indent=2))

        # Check payin_company_vendors
        res = await conn.execute(text("SELECT * FROM public.payin_company_vendors ORDER BY company_ref_id, display_order"))
        company_vendors = [dict(r) for r in res.mappings().all()]
        print("\n=== PAYIN_COMPANY_VENDORS ===")
        print(json.dumps(company_vendors, default=str, indent=2))

        # Check payin_mdr_cfg
        res = await conn.execute(text("SELECT * FROM public.payin_mdr_cfg ORDER BY company_ref_id, payin_vendor_ref_id"))
        mdr_cfg = [dict(r) for r in res.mappings().all()]
        print("\n=== PAYIN_MDR_CFG ===")
        print(json.dumps(mdr_cfg, default=str, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
