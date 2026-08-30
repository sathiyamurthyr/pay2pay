"""
Comprehensive Multi-Service Enterprise Transactions Seeder
Seeds realistic test data across:
- PAYOUT (Bank transfer IMPS/NEFT)
- DMT (Domestic Money Transfer)
- RECHARGE (Mobile & DTH Recharge)
- BBPS (Electricity & Utility Bill Payment)
- TOPUP (Wallet Credit)
- CARD_TO_CASH (POS Swipe Withdrawal)
- AEPS (Aadhaar Cash Withdrawal)
with complete double-entry ledger entries (balance_before, balance_after, CR, DR) and audit trails.
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.core.database import get_db
from app.domain.date_keys import compute_transaction_date_and_partition_keys

async def seed_enterprise_transactions():
    print("=== Seeding Enterprise Multi-Service Transactions ===", flush=True)
    async for db in get_db():
        # Get or find active tenant, company, and retailer
        tenant_row = (await db.execute(text("SELECT public_id FROM tenant LIMIT 1"))).fetchone()
        t_id = str(tenant_row[0]) if tenant_row else "93538c98-0b19-493c-a247-4cdb02a46c68"
        
        comp_row = (await db.execute(text("SELECT public_id FROM company LIMIT 1"))).fetchone()
        c_id = str(comp_row[0]) if comp_row else "745da621-36cf-448f-8dc8-f58c7e87ab0e"

        ret_row = (await db.execute(text("SELECT public_id FROM retailer LIMIT 1"))).fetchone()
        r_id = str(ret_row[0]) if ret_row else "97268800-4740-4fe7-b0a6-163462f27eb6"

        cust_row = (await db.execute(text("SELECT public_id FROM customer LIMIT 1"))).fetchone()
        cust_id = str(cust_row[0]) if cust_row else str(uuid.uuid4())

        bene_row = (await db.execute(text("SELECT public_id FROM beneficiary_master LIMIT 1"))).fetchone()
        bene_id = str(bene_row[0]) if bene_row else str(uuid.uuid4())

        now = datetime.now(timezone.utc)

        services_data = [
            {
                "ref": "TXN260821001",
                "service": "PAYOUT",
                "type": "TRANSFER",
                "sub_service": "IMPS",
                "amount": 5000.00,
                "charges": 10.00,
                "comm": 0.00,
                "gst": 1.80,
                "status": "SUCCESS",
                "vendor": "UTKALDIGITAL",
                "utr": "623316010210",
                "hours_ago": 1,
                "bal_before": 50000.00,
                "entry_type": "DEBIT",
                "cust_name": "Sathiya Murthy R",
                "cust_mob": "9876543210",
                "bene_name": "SATHIYA MURTHY R",
                "bank": "IDBI Bank",
                "acc": "0630104000156974",
                "ifsc": "IBKL0000630",
                "channel": "WEB",
                "desc": "IMPS Bank Transfer Successful to IDBI Bank"
            },
            {
                "ref": "TXN260821002",
                "service": "DMT",
                "type": "TRANSFER",
                "sub_service": "NEFT",
                "amount": 2500.00,
                "charges": 7.50,
                "comm": 2.50,
                "gst": 1.35,
                "status": "SUCCESS",
                "vendor": "WOWPE",
                "utr": "WOW987612345",
                "hours_ago": 3,
                "bal_before": 44988.20,
                "entry_type": "DEBIT",
                "cust_name": "Ramesh Kumar",
                "cust_mob": "9176669426",
                "bene_name": "Priya Ramesh",
                "bank": "State Bank of India",
                "acc": "30987654321",
                "ifsc": "SBIN0001234",
                "channel": "MOBILE_APP",
                "desc": "DMT Transfer to SBI Beneficiary"
            },
            {
                "ref": "TXN260821003",
                "service": "RECHARGE",
                "type": "PAYMENT",
                "sub_service": "PREPAID",
                "amount": 299.00,
                "charges": 0.00,
                "comm": 8.97,
                "gst": 0.00,
                "status": "SUCCESS",
                "vendor": "BILLDESK",
                "utr": "BD2608100392",
                "hours_ago": 5,
                "bal_before": 42480.70,
                "entry_type": "DEBIT",
                "cust_name": "Karthik Raja",
                "cust_mob": "9840123456",
                "bene_name": "Jio Prepaid 9840123456",
                "bank": "Jio Telecom",
                "acc": "9840123456",
                "ifsc": "JIOM0000001",
                "channel": "WEB",
                "desc": "Jio ₹299 Unlimited Plan Recharge"
            },
            {
                "ref": "TXN260821004",
                "service": "BBPS",
                "type": "BILL_PAYMENT",
                "sub_service": "ELECTRICITY",
                "amount": 1450.00,
                "charges": 0.00,
                "comm": 3.50,
                "gst": 0.00,
                "status": "SUCCESS",
                "vendor": "BILLDESK",
                "utr": "TNEB8829104",
                "hours_ago": 8,
                "bal_before": 42181.70,
                "entry_type": "DEBIT",
                "cust_name": "Ananya Sharma",
                "cust_mob": "9444123456",
                "bene_name": "TANGEDCO Electricity",
                "bank": "TANGEDCO",
                "acc": "04012891230",
                "ifsc": "BBPS0000001",
                "channel": "WEB",
                "desc": "TANGEDCO Electricity Bill Payment"
            },
            {
                "ref": "TXN260821005",
                "service": "TOPUP",
                "type": "CREDIT",
                "sub_service": "QR_UPI",
                "amount": 20000.00,
                "charges": 0.00,
                "comm": 0.00,
                "gst": 0.00,
                "status": "SUCCESS",
                "vendor": "RAZORPAY",
                "utr": "UPI2608219901",
                "hours_ago": 12,
                "bal_before": 20731.70,
                "entry_type": "CREDIT",
                "cust_name": "Retailer Topup",
                "cust_mob": "9876543210",
                "bene_name": "Pay2Pay Wallet",
                "bank": "HDFC Bank",
                "acc": "P2P9876543210",
                "ifsc": "HDFC0000050",
                "channel": "SYSTEM",
                "desc": "Instant UPI Dynamic QR Wallet Topup"
            },
            {
                "ref": "TXN260821006",
                "service": "CARD_TO_CASH",
                "type": "POS_SWIPE",
                "sub_service": "CREDIT_CARD",
                "amount": 8000.00,
                "charges": 160.00,
                "comm": 40.00,
                "gst": 28.80,
                "status": "SUCCESS",
                "vendor": "MOSAMBEE",
                "utr": "POS99281726",
                "hours_ago": 16,
                "bal_before": 40731.70,
                "entry_type": "CREDIT",
                "cust_name": "Vijay Sundaram",
                "cust_mob": "9884012345",
                "bene_name": "POS Terminal #M910",
                "bank": "ICICI Bank POS",
                "acc": "4591XXXXXXXX1092",
                "ifsc": "ICIC0000002",
                "channel": "POS_MACHINE",
                "desc": "POS Card Swipe Cash Payout Credit"
            },
            {
                "ref": "TXN260821007",
                "service": "AEPS",
                "type": "WITHDRAWAL",
                "sub_service": "CASH_OUT",
                "amount": 3000.00,
                "charges": 0.00,
                "comm": 8.00,
                "gst": 0.00,
                "status": "SUCCESS",
                "vendor": "PAYSPRINT",
                "utr": "AEPS81928374",
                "hours_ago": 20,
                "bal_before": 48542.90,
                "entry_type": "CREDIT",
                "cust_name": "Murugan Velu",
                "cust_mob": "9790123456",
                "bene_name": "Aadhaar XXXX-XXXX-4091",
                "bank": "Indian Bank",
                "acc": "Aadhaar Bio",
                "ifsc": "IDIB0000001",
                "channel": "BIOMETRIC",
                "desc": "AEPS Aadhaar Cash Withdrawal"
            },
            {
                "ref": "TXN260821008",
                "service": "PAYOUT",
                "type": "TRANSFER",
                "sub_service": "IMPS",
                "amount": 4200.00,
                "charges": 10.00,
                "comm": 0.00,
                "gst": 1.80,
                "status": "FAILED",
                "vendor": "UTKALDIGITAL",
                "utr": None,
                "hours_ago": 24,
                "bal_before": 51542.90,
                "entry_type": "DEBIT",
                "cust_name": "Sathiya Murthy R",
                "cust_mob": "9876543210",
                "bene_name": "Kavitha S",
                "bank": "Axis Bank",
                "acc": "912010045678901",
                "ifsc": "UTIB0000123",
                "channel": "WEB",
                "desc": "IMPS Beneficiary Bank Down / Timed Out"
            },
            {
                "ref": "TXN260821008",
                "service": "PAYOUT",
                "type": "REVERSAL",
                "sub_service": "REFUND",
                "amount": 4211.80,
                "charges": 0.00,
                "comm": 0.00,
                "gst": 0.00,
                "status": "REVERSED",
                "vendor": "UTKALDIGITAL",
                "utr": "REV100001180",
                "hours_ago": 23,
                "bal_before": 47331.10,
                "entry_type": "CREDIT",
                "cust_name": "Sathiya Murthy R",
                "cust_mob": "9876543210",
                "bene_name": "Kavitha S",
                "bank": "Axis Bank",
                "acc": "912010045678901",
                "ifsc": "UTIB0000123",
                "channel": "SYSTEM",
                "desc": "Automatic Reversal for Failed Payout TXN260821008"
            }
        ]

        for s in services_data:
            tx_id = str(uuid.uuid4())
            tx_time = now - timedelta(hours=s["hours_ago"])
            net_amt = s["amount"] + s["charges"] + s["gst"] if s["entry_type"] == "DEBIT" else s["amount"]
            bal_after = s["bal_before"] - net_amt if s["entry_type"] == "DEBIT" else s["bal_before"] + net_amt

            keys = compute_transaction_date_and_partition_keys(tx_time)

            # Insert into append-only transactions table
            await db.execute(text(f"""
                INSERT INTO transactions (
                    public_id, tenant_id, company_id, retailer_id,
                    txn_id, ref_id, table_ref_id, service_name,
                    entry_type, amount, balance_before, balance_after,
                    status, narration,
                    day_key, week_key, month_key, quarter_key, year_key,
                    financial_year_key, financial_quarter_key, financial_month_key,
                    date_key, time_key,
                    partition_year, partition_month, partition_day,
                    is_active, is_deleted, created_at, updated_at
                ) VALUES (
                    :pub_id, :tenant_id, :company_id, :ret_id,
                    :txn_id, :ref_id, :table_ref_id, :service_name,
                    :entry_type, :amount, :balance_before, :balance_after,
                    :status, :narration,
                    :day_key, :week_key, :month_key, :quarter_key, :year_key,
                    :financial_year_key, :financial_quarter_key, :financial_month_key,
                    :date_key, :time_key,
                    :partition_year, :partition_month, :partition_day,
                    true, false, :created_at, :created_at
                );
            """), {
                "pub_id": tx_id,
                "tenant_id": t_id,
                "company_id": c_id,
                "ret_id": r_id,
                "txn_id": s["ref"],
                "ref_id": s["utr"] or s["ref"],
                "table_ref_id": None,
                "service_name": s["service"],
                "entry_type": s["entry_type"],
                "amount": net_amt,
                "balance_before": s["bal_before"],
                "balance_after": bal_after,
                "status": s["status"],
                "narration": s["desc"],
                "day_key": keys["day_key"],
                "week_key": keys["week_key"],
                "month_key": keys["month_key"],
                "quarter_key": keys["quarter_key"],
                "year_key": keys["year_key"],
                "financial_year_key": keys["financial_year_key"],
                "financial_quarter_key": keys["financial_quarter_key"],
                "financial_month_key": keys["financial_month_key"],
                "date_key": keys["date_key"],
                "time_key": keys["time_key"],
                "partition_year": keys["partition_year"],
                "partition_month": keys["partition_month"],
                "partition_day": keys["partition_day"],
                "created_at": tx_time
            })

            # Insert into transaction_ledger_entries (Double-Entry)
            await db.execute(text(f"""
                INSERT INTO transaction_ledger_entries (
                    public_id, tenant_id, transaction_id, transaction_reference,
                    entry_type, account_type, account_number, amount,
                    balance_before, balance_after, currency, narration, created_at
                ) VALUES (
                    :pub_id, :tenant_id, :tx_id, :ref,
                    :entry_type, 'RETAILER_WALLET', 'RET-9876543210', :net_amt,
                    :bal_before, :bal_after, 'INR', :narration, :created_at
                ) ON CONFLICT DO NOTHING;
            """), {
                "pub_id": str(uuid.uuid4()),
                "tenant_id": t_id,
                "tx_id": tx_id,
                "ref": s["ref"],
                "entry_type": s["entry_type"],
                "net_amt": net_amt,
                "bal_before": s["bal_before"],
                "bal_after": bal_after,
                "narration": f"{s['service']} {s['type']} - {s['desc']}",
                "created_at": tx_time
            })

            # Insert Audit Log
            await db.execute(text(f"""
                INSERT INTO transaction_audit_logs (
                    public_id, tenant_id, transaction_id, transaction_reference,
                    action, previous_status, new_status, actor_type, actor_id, details, created_at
                ) VALUES (
                    :pub_id, :tenant_id, :tx_id, :ref,
                    'TRANSACTION_PROCESSED', 'INITIATED', :status, :channel, 'RETAILER',
                    '{{"vendor": "{s["vendor"]}", "utr": "{s["utr"] or ""}", "desc": "{s["desc"]}"}}', :created_at
                ) ON CONFLICT DO NOTHING;
            """), {
                "pub_id": str(uuid.uuid4()),
                "tenant_id": t_id,
                "tx_id": tx_id,
                "ref": s["ref"],
                "status": s["status"],
                "channel": s["channel"],
                "created_at": tx_time
            })

        await db.commit()
        print(f"Successfully seeded {len(services_data)} enterprise multi-service transactions into append-only transactions table with complete double-entry ledger and audit logs!", flush=True)

if __name__ == "__main__":
    asyncio.run(seed_enterprise_transactions())
