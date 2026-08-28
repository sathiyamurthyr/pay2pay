"""
Migration script for POS Payment Modes and Dynamic MDR Configurations.

Executes single DDL/DML statements for asyncpg compatibility.
"""

import asyncio
import sys
sys.path.insert(0, r"d:\pay2pay\backend")

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def migrate():
    print("=== STARTING POS MDR MIGRATION ===")
    async with AsyncSessionLocal() as session:
        # 1. Create pos_payment_mode_config table & indexes
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS pos_payment_mode_config (
                id SERIAL PRIMARY KEY,
                public_id UUID NOT NULL DEFAULT gen_random_uuid(),
                tenant_id UUID,
                company_id UUID,
                organization_id UUID,
                business_unit_id UUID,
                branch_id UUID,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 1,
                settlement_type VARCHAR(50) NOT NULL DEFAULT 'INSTANT',
                description TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                record_status VARCHAR(50) DEFAULT 'ACTIVE',
                version_no INTEGER DEFAULT 1,
                created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by VARCHAR(100) DEFAULT 'SYSTEM',
                updated_by VARCHAR(100) DEFAULT 'SYSTEM',
                deleted_at TIMESTAMPTZ
            )
        """))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_pm_code ON pos_payment_mode_config(code)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_pm_order ON pos_payment_mode_config(display_order)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_pm_active ON pos_payment_mode_config(is_active, is_deleted)"))
        print("  [OK] Created pos_payment_mode_config table")

        # 2. Create pos_mdr_configuration table & indexes
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS pos_mdr_configuration (
                id SERIAL PRIMARY KEY,
                public_id UUID NOT NULL DEFAULT gen_random_uuid(),
                tenant_id UUID,
                company_id UUID,
                organization_id UUID,
                business_unit_id UUID,
                branch_id UUID,
                retailer_id UUID,
                payment_mode VARCHAR(50) NOT NULL,
                mdr NUMERIC(10, 4) NOT NULL,
                mdr_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
                gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
                effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                effective_to TIMESTAMPTZ,
                remarks TEXT,
                metadata_json JSONB,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                record_status VARCHAR(50) DEFAULT 'ACTIVE',
                version_no INTEGER DEFAULT 1,
                created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by VARCHAR(100) DEFAULT 'SYSTEM',
                updated_by VARCHAR(100) DEFAULT 'SYSTEM',
                deleted_at TIMESTAMPTZ
            )
        """))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_mdr_retailer ON pos_mdr_configuration(retailer_id)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_mdr_pm ON pos_mdr_configuration(payment_mode)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_mdr_active ON pos_mdr_configuration(is_active, is_deleted)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_mdr_dates ON pos_mdr_configuration(effective_from, effective_to)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS idx_pos_mdr_tenant_comp ON pos_mdr_configuration(tenant_id, company_id)"))
        print("  [OK] Created pos_mdr_configuration table")

        # 3. Add columns to topup_requests
        cols = [
            ("mdr_charge", "NUMERIC(18, 2)"),
            ("gst_amount", "NUMERIC(18, 2)"),
            ("charges", "NUMERIC(18, 2)"),
            ("received_amount", "NUMERIC(18, 2)"),
            ("mdr_config_id", "UUID")
        ]
        for col, col_type in cols:
            await session.execute(text(f"""
                ALTER TABLE topup_requests 
                ADD COLUMN IF NOT EXISTS {col} {col_type}
            """))
        print("  [OK] Added snapshot columns to topup_requests table")

        # 4. Deactivate old payment modes in pos_payment_mode_config
        await session.execute(text("""
            UPDATE pos_payment_mode_config
            SET is_active = FALSE, updated_date = NOW(), updated_by = 'MIGRATION'
            WHERE code NOT IN ('POS - Instant', 'POS+T1', 'POS+T2')
        """))

        # 5. Insert/Update the 3 allowed active payment modes
        modes = [
            ("POS - Instant", "POS - Instant", 1, "INSTANT", "Instant Real-Time POS Settlement"),
            ("POS+T1", "POS+T1", 2, "T1", "Next Business Day (T+1) POS Settlement"),
            ("POS+T2", "POS+T2", 3, "T2", "Two Business Days (T+2) POS Settlement")
        ]
        for code, name, order, stype, desc in modes:
            await session.execute(text("""
                INSERT INTO pos_payment_mode_config (
                    code, name, display_order, settlement_type, description, is_active, is_deleted, created_date, updated_date
                ) VALUES (
                    :code, :name, :order, :stype, :desc, TRUE, FALSE, NOW(), NOW()
                )
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    display_order = EXCLUDED.display_order,
                    settlement_type = EXCLUDED.settlement_type,
                    description = EXCLUDED.description,
                    is_active = TRUE,
                    is_deleted = FALSE,
                    updated_date = NOW()
            """), {"code": code, "name": name, "order": order, "stype": stype, "desc": desc})
        print("  [OK] Seeded active payment modes: POS - Instant, POS+T1, POS+T2")

        # 6. Seed/Update Default MDR Configurations
        default_mdrs = [
            ("POS - Instant", 1.70, "PERCENTAGE", 18.00, "Default MDR for POS - Instant (1.70%)"),
            ("POS+T1", 1.60, "PERCENTAGE", 18.00, "Default MDR for POS+T1 (1.60%)"),
            ("POS+T2", 1.50, "PERCENTAGE", 18.00, "Default MDR for POS+T2 (1.50%)")
        ]
        for pmode, rate, mtype, gst, remarks in default_mdrs:
            chk = await session.execute(text("""
                SELECT id FROM pos_mdr_configuration
                WHERE retailer_id IS NULL 
                  AND payment_mode = :pmode 
                  AND is_active = TRUE 
                  AND is_deleted = FALSE
            """), {"pmode": pmode})
            existing_row = chk.fetchone()
            if existing_row:
                await session.execute(text("""
                    UPDATE pos_mdr_configuration
                    SET mdr = :mdr, gst_rate = :gst, remarks = :remarks, updated_date = NOW(), updated_by = 'UPDATE_RATES'
                    WHERE id = :row_id
                """), {"mdr": rate, "gst": gst, "remarks": remarks, "row_id": existing_row[0]})
                print(f"  [OK] Updated Default MDR for {pmode}: {rate}% (GST: {gst}%)")
            else:
                await session.execute(text("""
                    INSERT INTO pos_mdr_configuration (
                        retailer_id, payment_mode, mdr, mdr_type, gst_rate,
                        effective_from, remarks, is_active, is_deleted, created_date, updated_date, created_by
                    ) VALUES (
                        NULL, :pmode, :mdr, :mtype, :gst,
                        NOW() - INTERVAL '1 day', :remarks, TRUE, FALSE, NOW(), NOW(), 'SYSTEM'
                    )
                """), {"pmode": pmode, "mdr": rate, "mtype": mtype, "gst": gst, "remarks": remarks})
                print(f"  [OK] Seeded Default MDR for {pmode}: {rate}% (GST: {gst}%)")

        await session.commit()
        print("=== MIGRATION COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(migrate())
