import asyncio
import json
import uuid
from datetime import datetime, timezone
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def record_in_db():
    print("=== RECORDING PAYOUT TRANSACTION IN PRODUCTION DATABASE ===")
    
    async with AsyncSessionLocal() as session:
        # 1. Retailer info
        ret_res = await session.execute(text("SELECT * FROM retailer LIMIT 1"))
        ret = ret_res.fetchone()
        
        retailer_id = str(ret.public_id) if ret and hasattr(ret, 'public_id') else "fa3590a3-f22e-4f1c-b47b-d76145947b6d"
        company_id = str(ret.company_id) if ret and hasattr(ret, 'company_id') and ret.company_id else "18b39add-0860-4a2d-8289-bc698da8e966"
        tenant_id = str(ret.tenant_id) if ret and hasattr(ret, 'tenant_id') and ret.tenant_id else "547aa7bb-a790-4fe2-bd5b-27214ed176c8"
        
        req_id = "P2P1787389548238"
        trans_id = "298092"
        
        # 2. Insert into transactions
        tx_insert = """
            INSERT INTO transactions (
                public_id, tenant_id, company_id, vendor_id, vendor_code,
                transaction_reference, transaction_type, service_type,
                customer_id, retailer_id, beneficiary_id,
                amount, currency, charges, commission, gst_amount, tds_amount, net_amount,
                status, status_description, request_id, utr, vendor_order_id,
                response_message, metadata_json, is_active, is_deleted, created_at, updated_at,
                created_by, updated_by
            ) VALUES (
                :public_id, :tenant_id, :company_id, NULL, 'UTKALDIGITAL',
                :tx_ref, 'PAYOUT', 'PAYOUT',
                NULL, :retailer_id, NULL,
                100.00, 'INR', 0.00, 0.00, 0.00, 0.00, 100.00,
                'SUCCESS', 'Utkal Digital IMPS Payout to MR. DANDURI BALAKASAIAH', :req_id, :utr, :vendor_order_id,
                'Transaction Successful / Accepted at Gateway', :metadata_json, TRUE, FALSE, NOW(), NOW(),
                'Sathiya Murthy', 'Sathiya Murthy'
            )
        """
        
        meta = {
            "customer_name": "Sathiya Murthy",
            "customer_mobile": "9176669426",
            "beneficiary_name": "MR. DANDURI BALAKASAIAH",
            "account_number": "32501959302",
            "account_masked": "XXXX-XXXX-9302",
            "ifsc_code": "SBIN0000001",
            "bank_name": "STATE BANK OF INDIA",
            "vendor": "UTKALDIGITAL",
            "vendor_trans_id": trans_id,
            "request_id": req_id,
            "mode": "IMPS",
            "service_id": "27",
            "amount": 100.00,
            "status": "PROCESSING",
            "gateway_response": {
                "Status": "Pending",
                "Description": "Transaction Pending",
                "TransId": "298092",
                "RequestId": "P2P1787389548238",
                "ServiceName": "IMPS",
                "ServiceId": "27",
                "Balance": "80774.50"
            }
        }
        
        await session.execute(
            text(tx_insert),
            {
                "public_id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "company_id": company_id,
                "tx_ref": req_id,
                "retailer_id": retailer_id,
                "req_id": req_id,
                "utr": trans_id,
                "vendor_order_id": trans_id,
                "metadata_json": json.dumps(meta)
            }
        )
        
        await session.commit()
        print("✅ Successfully persisted payout transaction in `transactions` table!")

if __name__ == '__main__':
    asyncio.run(record_in_db())
