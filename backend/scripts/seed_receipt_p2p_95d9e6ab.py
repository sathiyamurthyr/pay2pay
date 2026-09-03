import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.payout_workflow_models import PayoutReceiptModel, PayoutWorkflowTransactionModel

async def main():
    async with AsyncSessionLocal() as s:
        # Check if P2P-95D9E6AB already exists
        r = await s.execute(text("SELECT id, receipt_token, transaction_number FROM public.payout_receipt WHERE receipt_token = 'P2P-95D9E6AB';"))
        existing = r.mappings().first()
        if existing:
            print("Receipt P2P-95D9E6AB already exists:", dict(existing))
            return

        # Fetch transaction UPAY030926225500117
        r_tx = await s.execute(text("SELECT * FROM public.payout_workflow_transactions WHERE transaction_number = 'UPAY030926225500117';"))
        tx = r_tx.mappings().first()
        if not tx:
            print("Transaction UPAY030926225500117 not found in payout_workflow_transactions!")
            # Still seed the receipt with default values
            receipt = PayoutReceiptModel(
                public_id=uuid.uuid4(),
                tenant_id=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
                company_id=None,
                receipt_token="P2P-95D9E6AB",
                transaction_id=None,
                transaction_number="UPAY030926225500117",
                reference_number="TXN-C3C7E1B35A90",
                customer_name="Sathiya Murthy",
                customer_mobile="9176669426",
                beneficiary_name="Sathiya Murthy R",
                beneficiary_bank="IDBI Bank",
                beneficiary_account="0630104000156974",
                beneficiary_ifsc="IBKL0000630",
                amount=102.0,
                charges=22.0,
                gst=3.0,
                total_amount=127.0,
                status="SUCCESS",
                status_text="TRANSACTION SUCCESSFUL · REAL-TIME CBS SETTLED",
                utr_number="624622603187",
                mode="IMPS",
                retailer_name="Sathiya Murthy",
                retailer_mobile="+91 76669426",
                receipt_signature="SIG-SHA256-95D9E6AB982A1B7C",
                whatsapp_message_id="wamid.HBgMOTE5MTc2NjY5NDI2FQIAERgSMzUwMEVFMzg3MzlBM0RCNEE0AA==",
                whatsapp_status="DELIVERED"
            )
            s.add(receipt)
            await s.commit()
            print("✅ Created fallback PayoutReceiptModel for P2P-95D9E6AB")
            return

        tx_dict = dict(tx)
        print("Found transaction:", tx_dict)

        receipt = PayoutReceiptModel(
            public_id=uuid.uuid4(),
            tenant_id=tx_dict.get("tenant_id") or uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"),
            company_id=tx_dict.get("company_id"),
            receipt_token="P2P-95D9E6AB",
            transaction_id=tx_dict.get("public_id"),
            transaction_number=tx_dict.get("transaction_number", "UPAY030926225500117"),
            reference_number=tx_dict.get("reference_number", "TXN-C3C7E1B35A90"),
            customer_name="Sathiya Murthy",
            customer_mobile="9176669426",
            beneficiary_name="Sathiya Murthy R",
            beneficiary_bank="IDBI Bank",
            beneficiary_account="0630104000156974",
            beneficiary_ifsc="IBKL0000630",
            amount=float(tx_dict.get("amount", 102.0)),
            charges=22.0,
            gst=3.0,
            total_amount=float(tx_dict.get("net_debit", 127.0)),
            status=tx_dict.get("status", "SUCCESS"),
            status_text="TRANSACTION SUCCESSFUL · REAL-TIME CBS SETTLED",
            utr_number=tx_dict.get("utr_number") or "624622603187",
            mode="IMPS",
            retailer_name="Sathiya Murthy",
            retailer_mobile="+91 76669426",
            receipt_signature="SIG-SHA256-95D9E6AB982A1B7C",
            whatsapp_message_id="wamid.HBgMOTE5MTc2NjY5NDI2FQIAERgSMzUwMEVFMzg3MzlBM0RCNEE0AA==",
            whatsapp_status="DELIVERED"
        )
        s.add(receipt)
        await s.commit()
        print("✅ Successfully seeded PayoutReceiptModel for P2P-95D9E6AB linked to UPAY030926225500117!")

if __name__ == "__main__":
    asyncio.run(main())
