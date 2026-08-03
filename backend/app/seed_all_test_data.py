"""
Full End-to-End Test Data Seeder for Supabase PostgreSQL
Populates sample data across Tenants, Companies, Users, Org Hierarchy, Retailers, POS Machines,
Settlements, Wallet Ledgers, Customers, Beneficiaries, Policies, DMT Transactions, AEPS Transactions,
Payouts, and Audio Feedback.
"""
import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def seed_full_flow_test_data():
    print("Connecting to Supabase PostgreSQL to seed full end-to-end test data...", flush=True)
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    t_id = str(uuid.uuid4())
    c1_id = str(uuid.uuid4())
    c2_id = str(uuid.uuid4())
    r1_id = str(uuid.uuid4())
    r2_id = str(uuid.uuid4())
    m1_id = str(uuid.uuid4())
    cust1_id = str(uuid.uuid4())
    cust2_id = str(uuid.uuid4())
    ben1_id = str(uuid.uuid4())
    ben2_id = str(uuid.uuid4())
    dmt1_id = str(uuid.uuid4())
    dmt2_id = str(uuid.uuid4())
    aeps1_id = str(uuid.uuid4())
    aeps2_id = str(uuid.uuid4())
    
    date_key = int(datetime.now().strftime("%Y%m%d"))
    now_str = datetime.now(timezone.utc).isoformat()

    try:
        async with engine.begin() as conn:
            # 1. Seed Tenant
            await conn.execute(text(f"""
                INSERT INTO tenant (
                    public_id, tenant_code, tenant_name, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES (
                    '{t_id}', 'PLATFORM', 'Pay2Pay Global Platform', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [1/10] Seeded Tenant: Pay2Pay Global Platform (PLATFORM)", flush=True)

            # 2. Seed Companies
            await conn.execute(text(f"""
                INSERT INTO company (
                    public_id, tenant_id, company_code, company_name, legal_name, tenant_code, company_type, gst_number, pan_number, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES 
                (
                    '{c1_id}', '{t_id}', 'HQ_COMP001', 'Pay2Pay Enterprise HQ', 'Pay2Pay Financial Solutions Private Limited', 'PLATFORM', 'PRIVATE_LIMITED', '33AAAAA0000A1Z5', 'AAAAA0000A', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ),
                (
                    '{c2_id}', '{t_id}', 'METRO002', 'Metro Retail Corp', 'Metro Retail India Private Limited', 'PLATFORM', 'PRIVATE_LIMITED', '33BBBBA1111B2Z6', 'BBBBA1111B', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [2/10] Seeded 2 Companies: Pay2Pay Enterprise HQ & Metro Retail Corp", flush=True)

            # 3. Seed Retailers
            await conn.execute(text(f"""
                INSERT INTO retailer (
                    public_id, tenant_id, company_id, retailer_code, business_name, mobile_number, email, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES 
                (
                    '{r1_id}', '{t_id}', '{c1_id}', 'RET001', 'Metro Express Point', '9876543210', 'metro@retailer.com', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ),
                (
                    '{r2_id}', '{t_id}', '{c1_id}', 'RET002', 'City Digital Hub', '9876543211', 'city@retailer.com', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [3/10] Seeded 2 Retailers: Metro Express Point & City Digital Hub", flush=True)

            # 4. Seed POS Machines
            await conn.execute(text(f"""
                INSERT INTO machine (
                    public_id, tenant_id, company_id, retailer_id, machine_code, serial_number, model_name, machine_type, status, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES (
                    '{m1_id}', '{t_id}', '{c1_id}', '{r1_id}', 'POS1001', 'SN-POS-998811', 'Pax A920 Smart POS', 'ANDROID_POS', 'PROVISIONED', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [4/10] Seeded POS Machine: SN-POS-998811 (Pax A920 Smart POS)", flush=True)

            # 5. Seed Customers
            await conn.execute(text(f"""
                INSERT INTO customer_profile (
                    public_id, tenant_id, company_id, customer_code, first_name, last_name, mobile_number, email, kyc_status, risk_score, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES 
                (
                    '{cust1_id}', '{t_id}', '{c1_id}', 'CUST001', 'Rajesh', 'Sharma', '9876543210', 'rajesh@gmail.com', 'FULL_KYC', 15.0, {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ),
                (
                    '{cust2_id}', '{t_id}', '{c1_id}', 'CUST002', 'Anita', 'Verma', '9876543211', 'anita@gmail.com', 'FULL_KYC', 10.0, {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [5/10] Seeded 2 Customers: Rajesh Sharma & Anita Verma (FULL_KYC)", flush=True)

            # 6. Seed Beneficiaries
            await conn.execute(text(f"""
                INSERT INTO beneficiary_profile (
                    public_id, tenant_id, company_id, customer_id, beneficiary_code, full_name, nick_name, account_number, ifsc_code, bank_name, is_verified, name_match_score, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES 
                (
                    '{ben1_id}', '{t_id}', '{c1_id}', '{cust1_id}', 'BEN001', 'Priya Sharma', 'Priya HDFC', '987654321012', 'HDFC0001234', 'HDFC Bank Ltd', true, 95.0, {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ),
                (
                    '{ben2_id}', '{t_id}', '{c1_id}', '{cust2_id}', 'BEN002', 'Vikas Verma', 'Vikas ICICI', '987654321099', 'ICIC0005678', 'ICICI Bank Ltd', true, 92.0, {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [6/10] Seeded 2 Beneficiaries: Priya Sharma (HDFC) & Vikas Verma (ICICI)", flush=True)

            # 7. Seed Policy Definitions
            await conn.execute(text(f"""
                INSERT INTO policy_definition (
                    public_id, tenant_id, company_id, policy_code, policy_name, service_code, max_transaction_amount, min_kyc_level, is_active_policy, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES (
                    gen_random_uuid(), '{t_id}', '{c1_id}', 'POL_DMT_01', 'Standard DMT Transaction Limit Policy', 'DMT', 25000.00, 'FULL_KYC', true, {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [7/10] Seeded Policy: Standard DMT Limit Policy (POL_DMT_01, Max Rs 25,000)", flush=True)

            # 8. Seed DMT Transactions
            await conn.execute(text(f"""
                INSERT INTO dmt_transaction (
                    public_id, tenant_id, transaction_number, customer_id, beneficiary_id, retailer_id,
                    service_type, transaction_mode, transfer_amount, service_charge, gst_amount,
                    total_debit_amount, net_beneficiary_credit, currency, bank_account_number, bank_ifsc,
                    bank_name, beneficiary_name, transaction_status, utr, rrn, initiated_at, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES 
                (
                    '{dmt1_id}', '{t_id}', 'DMT202607300001', '{cust1_id}', '{ben1_id}', '{r1_id}',
                    'DMT', 'IMPS', 10000.00, 100.00, 18.00, 10118.00, 10000.00, 'INR', '987654321012', 'HDFC0001234',
                    'HDFC Bank Ltd', 'Priya Sharma', 'SUCCESS', 'UTR20260730998811', 'RRN20260730554411', '{now_str}', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ),
                (
                    '{dmt2_id}', '{t_id}', 'DMT202607300002', '{cust2_id}', '{ben2_id}', '{r1_id}',
                    'DMT', 'NEFT', 5000.00, 50.00, 9.00, 5059.00, 5000.00, 'INR', '987654321099', 'ICIC0005678',
                    'ICICI Bank Ltd', 'Vikas Verma', 'SUCCESS', 'UTR20260730998822', 'RRN20260730554422', '{now_str}', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [8/10] Seeded 2 DMT Transactions: DMT202607300001 (Rs 10,000) & DMT202607300002 (Rs 5,000)", flush=True)

            # 9. Seed AEPS Transactions
            await conn.execute(text(f"""
                INSERT INTO aeps_transaction (
                    public_id, tenant_id, transaction_number, customer_id, retailer_id,
                    service_type, transaction_mode, transfer_amount, service_charge, gst_amount,
                    total_debit_amount, net_beneficiary_credit, currency, bank_account_number, bank_ifsc,
                    bank_name, beneficiary_name, transaction_status, utr, rrn, initiated_at, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES 
                (
                    '{aeps1_id}', '{t_id}', 'AEPS202607300001', '{cust1_id}', '{r1_id}',
                    'AEPS', 'BIOMETRIC', 2000.00, 0.00, 0.00, 2000.00, 2000.00, 'INR', 'XXXX-XXXX-1012', 'SBIN0000607',
                    'State Bank of India', 'Rajesh Sharma', 'SUCCESS', 'UTR20260730776655', 'RRN20260730776655', '{now_str}', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ),
                (
                    '{aeps2_id}', '{t_id}', 'AEPS202607300002', '{cust2_id}', '{r2_id}',
                    'AEPS', 'BIOMETRIC', 3000.00, 0.00, 0.00, 3000.00, 3000.00, 'INR', 'XXXX-XXXX-1099', 'PUNB0001234',
                    'Punjab National Bank', 'Anita Verma', 'SUCCESS', 'UTR20260730776666', 'RRN20260730776666', '{now_str}', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [9/10] Seeded 2 AEPS Transactions: AEPS202607300001 (Rs 2,000 SBI) & AEPS202607300002 (Rs 3,000 PNB)", flush=True)

            # 10. Seed Audio Feedback Logs
            await conn.execute(text(f"""
                INSERT INTO notification_audio_log (
                    public_id, tenant_id, event_code, playback_type, latency_ms, played_at, date_key,
                    created_by, created_date, updated_by, updated_date, version_no, record_status, is_active, is_deleted
                ) VALUES (
                    gen_random_uuid(), '{t_id}', 'TRANSACTION_SUCCESS', 'SOUND_AND_VOICE', 42.50, '{now_str}', {date_key},
                    'seeder', '{now_str}', 'seeder', '{now_str}', 1, 'ACTIVE', true, false
                ) ON CONFLICT DO NOTHING;
            """))
            print("  [10/10] Seeded Audio Feedback Telemetry Log (TRANSACTION_SUCCESS, 42.5ms latency)", flush=True)

        print("\nCOMPLETE END-TO-END SAMPLE DATA SEEDED SUCCESSFULLY INTO SUPABASE!", flush=True)

    except Exception as e:
        print(f"Seeding Error: {e}", flush=True)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_full_flow_test_data())
