"""
Supabase Database Verification & Test Data Inspector
Connects to Supabase PostgreSQL and displays all seeded records across modules.
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

async def verify_and_print_all_seeded_data():
    print("🔎 Connecting to Supabase PostgreSQL to verify seeded test records...\n")
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.connect() as conn:
            # 1. Query Companies
            c_res = await conn.execute(text("SELECT company_code, company_name, company_type, status FROM company LIMIT 5;"))
            companies = c_res.fetchall()
            print("🏢 COMPANIES IN DATABASE:")
            if not companies:
                print("   (0 records found - run seed_all_test_data.py or SQL script)")
            else:
                for c in companies:
                    print(f"   • [{c[0]}] {c[1]} ({c[2]}) - Status: {c[3]}")
            print()

            # 2. Query Customers (EPIC-021)
            cust_res = await conn.execute(text("SELECT customer_code, first_name, last_name, mobile_number, kyc_status FROM customer_profile LIMIT 5;"))
            customers = cust_res.fetchall()
            print("👤 CUSTOMER PROFILES (EPIC-021):")
            if not customers:
                print("   (0 records found)")
            else:
                for cust in customers:
                    print(f"   • [{cust[0]}] {cust[1]} {cust[2]} (Mobile: {cust[3]}) - KYC: {cust[4]}")
            print()

            # 3. Query Beneficiaries (EPIC-022)
            ben_res = await conn.execute(text("SELECT beneficiary_code, full_name, bank_name, account_number, is_verified, name_match_score FROM beneficiary_profile LIMIT 5;"))
            bens = ben_res.fetchall()
            print("🏦 BENEFICIARY DIRECTORY (EPIC-022):")
            if not bens:
                print("   (0 records found)")
            else:
                for b in bens:
                    status = "VERIFIED" if b[4] else "UNVERIFIED"
                    print(f"   • [{b[0]}] {b[1]} ({b[2]} - A/C: {b[3]}) - Status: {status} (Match: {b[5]}%)")
            print()

            # 4. Query DMT Transactions (EPIC-024)
            dmt_res = await conn.execute(text("SELECT transaction_number, transaction_mode, transfer_amount, service_charge, utr, transaction_status FROM dmt_transaction LIMIT 5;"))
            dmts = dmt_res.fetchall()
            print("💳 DOMESTIC MONEY TRANSFERS (EPIC-024):")
            if not dmts:
                print("   (0 records found)")
            else:
                for d in dmts:
                    print(f"   • [{d[0]}] {d[1]} Transfer ₹{d[2]:,.2f} (Fee: ₹{d[3]:,.2f}) - UTR: {d[4]} - Status: {d[5]}")
            print()

            # 5. Query AEPS Transactions (EPIC-025)
            aeps_res = await conn.execute(text("SELECT transaction_number, masked_aadhaar, bank_name, transfer_amount, utr, transaction_status FROM aeps_transaction LIMIT 5;"))
            aeps_list = aeps_res.fetchall()
            print("🖐️ AEPS CASH WITHDRAWALS (EPIC-025):")
            if not aeps_list:
                print("   (0 records found)")
            else:
                for a in aeps_list:
                    print(f"   • [{a[0]}] Aadhaar: {a[1]} ({a[2]}) Amount ₹{a[3]:,.2f} - UTR: {a[4]} - Status: {a[5]}")
            print()

            print("✅ Supabase Verification Complete!")
            
    except Exception as e:
        print(f"❌ Verification Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_and_print_all_seeded_data())
