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

async def seed_enterprise_transactions():
    print("=== Seeding Enterprise Multi-Service Transactions ===", flush=True)
    async for db in get_db():
        # Get or find active tenant, company, and retailer
        tenant_row = (await db.execute(text("SELECT public_id FROM tenant LIMIT 1"))).fetchone()
        t_id = str(tenant_row[0]) if tenant_row else "93538c98-0b19-493c-a247-4cdb02a46c68"
        
        comp_row = (await db.execute(text("SELECT public_id FROM company LIMIT 1"))).fetchone()
        c_id = str(comp_row[0]) if comp_row else str(uuid.uuid4())

        ret_row = (await db.execute(text("SELECT public_id FROM retailer LIMIT 1"))).fetchone()
        r_id = str(ret_row[0]) if ret_row else "f89239b5-4dbb-41a9-9ba7-0f97580c9368"

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
                "utr": "REC778899001",
                "hours_ago": 5,
                "bal_before": 42480.70,
                "entry_type": "DEBIT",
                "cust_name": "Venkatesh S",
                "cust_mob": "9840123456",
                "bene_name": None,
                "bank": None,
                "acc": None,
                "ifsc": None,
                "channel": "WEB",
                "desc": "Airtel 28 Days Unlimited Prepaid Plan"
            },
            {
                "ref": "TXN260821004",
                "service": "BBPS",
                "type": "PAYMENT",
                "sub_service": "ELECTRICITY",
                "amount": 1450.00,
                "charges": 0.00,
                "comm": 5.00,
                "gst": 0.00,
                "status": "SUCCESS",
                "vendor": "NPCI_BBPS",
                "utr": "BBP556677889",
                "hours_ago": 7,
                "bal_before": 42181.70,
                "entry_type": "DEBIT",
                "cust_name": "Ananya Sharma",
                "cust_mob": "9944556677",
                "bene_name": None,
                "bank": None,
                "acc": None,
                "ifsc": None,
                "channel": "PORTAL",
                "desc": "TANGEDCO Electricity Bill Payment"
            },
            {
                "ref": "TXN260821005",
                "service": "TOPUP",
                "type": "TOPUP",
                "sub_service": "UPI_GATEWAY",
                "amount": 20000.00,
                "charges": 0.00,
                "comm": 0.00,
                "gst": 0.00,
                "status": "SUCCESS",
                "vendor": "RAZORPAY",
                "utr": "RZP998877665",
                "hours_ago": 12,
                "bal_before": 40731.70,
                "entry_type": "CREDIT",
                "cust_name": "Metro Express Point",
                "cust_mob": "9876543210",
                "bene_name": None,
                "bank": None,
                "acc": None,
                "ifsc": None,
                "channel": "API",
                "desc": "Retailer Main Wallet Instant Topup via UPI"
            },
            {
                "ref": "TXN260821006",
                "service": "CARD_TO_CASH",
                "type": "WITHDRAWAL",
                "sub_service": "POS_SWIPE",
                "amount": 3000.00,
                "charges": 15.00,
                "comm": 9.00,
                "gst": 2.70,
                "status": "SUCCESS",
                "vendor": "PAX_POS",
                "utr": "POS334455667",
                "hours_ago": 18,
                "bal_before": 60731.70,
                "entry_type": "CREDIT",
                "cust_name": "Rajesh V",
                "cust_mob": "9789012345",
                "bene_name": None,
                "bank": "HDFC Bank",
                "acc": "XXXX-XXXX-4521",
                "ifsc": "HDFC0000123",
                "channel": "POS_MACHINE",
                "desc": "Debit Card Swipe Cash Withdrawal"
            },
            {
                "ref": "TXN260821007",
                "service": "AEPS",
                "type": "WITHDRAWAL",
                "sub_service": "CASH_WITHDRAWAL",
                "amount": 2000.00,
                "charges": 0.00,
                "comm": 10.00,
                "gst": 0.00,
                "status": "SUCCESS",
                "vendor": "UTKALDIGITAL",
                "utr": "AEP112233445",
                "hours_ago": 24,
                "bal_before": 63731.70,
                "entry_type": "CREDIT",
                "cust_name": "Murugesan K",
                "cust_mob": "9443123456",
                "bene_name": None,
                "bank": "Canara Bank",
                "acc": "XXXX-XXXX-8910",
                "ifsc": "CNRB0000456",
                "channel": "BIOMETRIC_DEVICE",
                "desc": "Aadhaar Biometric Cash Withdrawal"
            },
            {
                "ref": "TXN260821008",
                "service": "PAYOUT",
                "type": "TRANSFER",
                "sub_service": "IMPS",
                "amount": 10000.00,
                "charges": 10.00,
                "comm": 0.00,
                "gst": 1.80,
                "status": "FAILED",
                "vendor": "UTKALDIGITAL",
                "utr": None,
                "hours_ago": 30,
                "bal_before": 65731.70,
                "entry_type": "DEBIT",
                "cust_name": "Sathiya Murthy R",
                "cust_mob": "9876543210",
                "bene_name": "Kavitha S",
                "bank": "Axis Bank",
                "acc": "912010045678901",
                "ifsc": "UTIB0000123",
                "channel": "WEB",
                "desc": "Service is temporarily down on vendor bank switch"
            },
            {
                "ref": "TXN260821009",
                "service": "PAYOUT",
                "type": "REVERSAL",
                "sub_service": "REVERSAL",
                "amount": 10011.80,
                "charges": 0.00,
                "comm": 0.00,
                "gst": 0.00,
                "status": "REVERSED",
                "vendor": "UTKALDIGITAL",
                "utr": "REV100001180",
                "hours_ago": 29,
                "bal_before": 55719.90,
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

            # Insert into transactions
            await db.execute(text(f"""
                INSERT INTO transactions (
                    public_id, tenant_id, company_id, retailer_id, vendor_code,
                    transaction_reference, transaction_type, service_type,
                    amount, currency, charges, commission, gst_amount, tds_amount, net_amount,
                    status, status_description, utr, response_message, created_at, updated_at,
                    created_by, updated_by, is_active, is_deleted
                ) VALUES (
                    :pub_id, :tenant_id, :company_id, :ret_id, :vendor,
                    :ref, :tx_type, :srv_type,
                    :amt, 'INR', :charges, :comm, :gst, 0.00, :net_amt,
                    :status, :desc, :utr, :desc, :created_at, :created_at,
                    'SYSTEM', 'SYSTEM', true, false
                ) ON CONFLICT (transaction_reference) DO UPDATE SET
                    status = EXCLUDED.status,
                    service_type = EXCLUDED.service_type,
                    transaction_type = EXCLUDED.transaction_type,
                    amount = EXCLUDED.amount,
                    charges = EXCLUDED.charges,
                    commission = EXCLUDED.commission,
                    gst_amount = EXCLUDED.gst_amount,
                    net_amount = EXCLUDED.net_amount,
                    utr = EXCLUDED.utr,
                    status_description = EXCLUDED.status_description;
            """), {
                "pub_id": tx_id,
                "tenant_id": t_id,
                "company_id": c_id,
                "ret_id": r_id,
                "vendor": s["vendor"],
                "ref": s["ref"],
                "tx_type": s["type"],
                "srv_type": s["service"],
                "amt": s["amount"],
                "charges": s["charges"],
                "comm": s["comm"],
                "gst": s["gst"],
                "net_amt": net_amt,
                "status": s["status"],
                "desc": s["desc"],
                "utr": s["utr"],
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
        print(f"Successfully seeded {len(services_data)} enterprise multi-service transactions with complete double-entry ledger and audit logs!", flush=True)
        break

if __name__ == "__main__":
    asyncio.run(seed_enterprise_transactions())
