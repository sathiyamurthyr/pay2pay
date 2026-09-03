"""
Database migration & configuration script for Pay2Pay POS Admin Retailer Charge Configuration.

Updates:
1. Default POS - Instant: Total Charge = 1.65%, GST = 18.00%
2. Default POS+T1: Total Charge = 1.70%, GST = 18.00%
3. Updates all active pos_mdr_configuration rows to have gst_rate = 18.00%
4. Updates provision_default_mdr_for_approved_retailers() stored procedure
"""

import asyncio
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, ".")
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def update_pos_mdr_configuration():
    print("=== Updating POS MDR Charge Configurations in Database ===")
    async with AsyncSessionLocal() as session:
        # 1. Update Default POS - Instant (retailer_id IS NULL)
        await session.execute(text("""
            UPDATE public.pos_mdr_configuration
            SET mdr = 1.6500,
                gst_rate = 18.0000,
                remarks = 'Default Total Charge for POS - Instant (1.65% incl. 18% GST)',
                updated_date = NOW(),
                updated_by = 'ADMIN_CONFIG_UPDATE'
            WHERE retailer_id IS NULL
              AND payment_mode = 'POS - Instant'
              AND is_deleted = false;
        """))
        print("✓ Updated Default POS - Instant -> 1.65% (incl. 18% GST)")

        # 2. Update Default POS+T1 (retailer_id IS NULL)
        await session.execute(text("""
            UPDATE public.pos_mdr_configuration
            SET mdr = 1.7000,
                gst_rate = 18.0000,
                remarks = 'Default Total Charge for POS+T1 (1.70% incl. 18% GST)',
                updated_date = NOW(),
                updated_by = 'ADMIN_CONFIG_UPDATE'
            WHERE retailer_id IS NULL
              AND payment_mode = 'POS+T1'
              AND is_deleted = false;
        """))
        print("✓ Updated Default POS+T1 -> 1.70% (incl. 18% GST)")

        # 3. Update all other active configurations to have gst_rate = 18.00
        await session.execute(text("""
            UPDATE public.pos_mdr_configuration
            SET gst_rate = 18.0000,
                updated_date = NOW(),
                updated_by = 'ADMIN_CONFIG_UPDATE'
            WHERE is_deleted = false;
        """))
        print("✓ Updated all active pos_mdr_configuration records to gst_rate = 18.00%")

        # 4. Update Stored Procedure provision_default_mdr_for_approved_retailers
        await session.execute(text("""
            CREATE OR REPLACE FUNCTION public.provision_default_mdr_for_approved_retailers()
            RETURNS TABLE(provisioned_count integer)
            LANGUAGE plpgsql
            AS $function$
            DECLARE
                v_ret RECORD;
                v_mode RECORD;
                v_count integer := 0;
            BEGIN
                FOR v_ret IN 
                    SELECT r.public_id, r.tenant_id, r.company_id 
                    FROM public.retailer r
                    WHERE r.is_deleted = false AND UPPER(r.status) IN ('ACTIVE', 'APPROVED')
                LOOP
                    FOR v_mode IN
                        SELECT * FROM (VALUES 
                            ('POS - Instant', 1.6500, 'PERCENTAGE', 18.00, 'Default Total Charge for POS - Instant (1.65% incl. 18% GST)'),
                            ('POS+T1', 1.7000, 'PERCENTAGE', 18.00, 'Default Total Charge for POS+T1 (1.70% incl. 18% GST)')
                        ) AS t(payment_mode, mdr, mdr_type, gst_rate, remarks)
                    LOOP
                        IF NOT EXISTS (
                            SELECT 1 FROM public.pos_mdr_configuration
                            WHERE retailer_id = v_ret.public_id 
                              AND payment_mode = v_mode.payment_mode
                              AND is_deleted = false
                        ) THEN
                            INSERT INTO public.pos_mdr_configuration (
                                public_id, retailer_id, tenant_id, company_id,
                                payment_mode, mdr, mdr_type, gst_rate,
                                effective_from, is_active, is_deleted,
                                remarks, created_by, updated_by, created_date, updated_date
                            ) VALUES (
                                gen_random_uuid(), v_ret.public_id, v_ret.tenant_id, v_ret.company_id,
                                v_mode.payment_mode, v_mode.mdr, v_mode.mdr_type, v_mode.gst_rate,
                                NOW(), true, false,
                                v_mode.remarks, 'SYSTEM_DEFAULT_PROVISION', 'SYSTEM_DEFAULT_PROVISION', NOW(), NOW()
                            );
                            v_count := v_count + 1;
                        END IF;
                    END LOOP;
                END LOOP;

                RETURN QUERY SELECT v_count;
            END;
            $function$;
        """))
        print("✓ Updated SP public.provision_default_mdr_for_approved_retailers()")

        await session.commit()
        print("=== POS MDR Database Configuration Successfully Committed ===")

if __name__ == "__main__":
    asyncio.run(update_pos_mdr_configuration())
