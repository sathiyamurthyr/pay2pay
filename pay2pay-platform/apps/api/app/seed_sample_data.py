"""
End-to-End Sample Data Seeder for Supabase PostgreSQL
Inserts valid sample records directly into dmt_transaction and aeps_transaction.
"""
import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def seed_end_to_end_sample_data():
    print("🌱 Connecting to Supabase PostgreSQL to seed sample transaction data...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    tenant_id = str(uuid.uuid4())
    retailer_id = str(uuid.uuid4())
    customer_id = str(uuid.uuid4())
    beneficiary_id = str(uuid.uuid4())
    dmt_id = str(uuid.uuid4())
    aeps_id = str(uuid.uuid4())
    date_key = int(datetime.now().strftime("%Y%m%d"))
    now_str = datetime.now(timezone.utc).isoformat()

    try:
        async with engine.begin() as conn:
            # 1. Insert DMT Transaction (EPIC-024)
            await conn.execute(text(f"""
                INSERT INTO dmt_transaction (
                    public_id, tenant_id, transaction_number, customer_id, beneficiary_id, retailer_id,
                    service_type, transaction_mode, transfer_amount, service_charge, gst_amount,
                    total_debit_amount, net_beneficiary_credit, currency, bank_account_number, bank_ifsc,
                    bank_name, beneficiary_name, transaction_status, utr, rrn, initiated_at, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES (
                    '{dmt_id}', '{tenant_id}', 'DMT202607300001', '{customer_id}', '{beneficiary_id}', '{retailer_id}',
                    'DMT', 'IMPS', 10000.00, 100.00, 18.00,
                    10118.00, 10000.00, 'INR', '987654321012', 'HDFC0001234',
                    'HDFC Bank Ltd', 'Priya Sharma', 'SUCCESS', 'UTR20260730998811', 'RRN20260730554411', '{now_str}', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [1/2] ✅ Seeded DMT Transaction: DMT202607300001 (₹10,000.00 IMPS, UTR: UTR20260730998811)")

            # 2. Insert AEPS Transaction (EPIC-025)
            await conn.execute(text(f"""
                INSERT INTO aeps_transaction (
                    public_id, tenant_id, transaction_number, customer_id, retailer_id,
                    service_type, transaction_mode, transfer_amount, service_charge, gst_amount,
                    total_debit_amount, net_beneficiary_credit, currency, bank_account_number, bank_ifsc,
                    bank_name, beneficiary_name, transaction_status, utr, rrn, initiated_at, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES (
                    '{aeps_id}', '{tenant_id}', 'AEPS202607300001', '{customer_id}', '{retailer_id}',
                    'AEPS', 'BIOMETRIC', 2000.00, 0.00, 0.00,
                    2000.00, 2000.00, 'INR', 'XXXX-XXXX-1012', 'SBIN0000607',
                    'State Bank of India', 'Rajesh Sharma', 'SUCCESS', 'UTR20260730776655', 'RRN20260730776655', '{now_str}', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [2/2] ✅ Seeded AEPS Transaction: AEPS202607300001 (₹2,000.00 Cash Withdrawal, SBI)")

        print("\n🎉 Sample Transaction Records Successfully Inserted into Supabase!")

    except Exception as e:
        print(f"❌ Seeding Failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_end_to_end_sample_data())
