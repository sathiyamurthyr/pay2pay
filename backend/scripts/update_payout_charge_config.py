import asyncio
import sys
sys.path.insert(0, ".")
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def main():
    async with AsyncSessionLocal() as session:
        print("=== Updating public.payout_slab ===")
        # Set default payout charge configuration for all existing slabs:
        # Base Charge (commission) = 22.00 FIXED
        # GST = 3.00 FIXED
        # Total = 25.00
        # Vendor charge, Company charges, Other charges = 0.00 FIXED
        update_payout_slab_sql = """
        UPDATE public.payout_slab
        SET 
            commission = 22.0000,
            commission_type = 'FIXED',
            gst = 3.0000,
            gst_type = 'FIXED',
            vendor_charge = 0.0000,
            vendor_charge_type = 'FIXED',
            company_charges = 0.0000,
            company_charges_type = 'FIXED',
            other_charges = 0.0000,
            other_charges_type = 'FIXED',
            company_gst = 0.0000,
            company_gst_type = 'FIXED',
            tds = 0.0000,
            tds_type = 'FIXED',
            is_active = TRUE,
            is_deleted = FALSE,
            updated_date = NOW(),
            updated_by = 'SYSTEM_PAYOUT_CONFIG_UPDATE'
        WHERE service_code = 'PAYOUT';
        """
        res1 = await session.execute(text(update_payout_slab_sql))
        print(f"payout_slab updated rows: {res1.rowcount}")

        print("=== Updating public.payout_slab_matrix ===")
        # Update all 7 rows across all amount ranges:
        # fee_value = 22.00 (FLAT)
        # gst_percentage = 3.00 (Fixed GST value)
        # status = 'ACTIVE'
        update_matrix_sql = """
        UPDATE public.payout_slab_matrix
        SET
            fee_value = 22.0000,
            fee_type = 'FLAT',
            gst_percentage = 3.0000,
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE 1=1;
        """
        res2 = await session.execute(text(update_matrix_sql))
        print(f"payout_slab_matrix updated rows: {res2.rowcount}")

        await session.commit()
        print("Database commit successful.")

        # Verification check
        print("\n--- Verified payout_slab rows ---")
        rows1 = await session.execute(text("SELECT id, slab_name, min_amount, max_amount, commission, commission_type, gst, gst_type, is_active FROM payout_slab WHERE service_code = 'PAYOUT' ORDER BY min_amount ASC"))
        for r in rows1.fetchall():
            print(dict(r._mapping))

        print("\n--- Verified payout_slab_matrix rows ---")
        rows2 = await session.execute(text("SELECT id, slab_name, min_amount, max_amount, fee_type, fee_value, gst_percentage, status FROM payout_slab_matrix ORDER BY min_amount ASC"))
        for r in rows2.fetchall():
            print(dict(r._mapping))

if __name__ == "__main__":
    asyncio.run(main())
