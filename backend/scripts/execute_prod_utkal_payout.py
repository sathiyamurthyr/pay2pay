import asyncio
import json
import time
import httpx
import uuid
from app.application.utkaldigital_client import (
    UtkalDigitalApiClient,
    UTKAL_AUTHCODE,
    UTKAL_MPIN,
    UTKAL_PAYOUT_URL,
    mask_sensitive_payload
)

async def execute_payout():
    print("=================================================================")
    print("🚀 EXECUTING PRODUCTION ₹100 PAYOUT VIA UTKAL DIGITAL GATEWAY")
    print("=================================================================\n")
    
    # 1. Target Details
    customer_name = "Sathiya Murthy"
    customer_mobile = "9176669426"
    beneficiary_name = "MR. DANDURI  BALAKASAIAH"
    account_number = "32501959302"
    ifsc_code = "SBIN0000001"
    bank_name = "STATE BANK OF INDIA"
    bank_code = "SBIN"  # Or MAGNI
    amount = 100.00
    service_id = "27"  # 27 for IMPS
    
    # Unique RequestID
    merchant_ref = f"P2P{int(time.time()*1000)}"
    
    # 2. Build Request Payload
    auth, mp = UtkalDigitalApiClient.get_credentials()
    
    payload = {
        "Authcode": auth,
        "Mpin": mp,
        "RequestID": merchant_ref,
        "ServiceId": service_id,
        "SenderMobile": customer_mobile,
        "SenderName": customer_name,
        "BankName": bank_name,
        "BankCode": bank_code,
        "BankAccountNumber": account_number,
        "BeneficiaryName": beneficiary_name,
        "BankIfsc": ifsc_code,
        "Amount": "100",
        "AdharNo": "123456789205",
        "PanNo": "CWMPS5725E",
        "Lat": "16.53333",
        "Long": "23.55212"
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    print("--- [OUTBOUND HTTP REQUEST] ---")
    print(f"Target URL: {UTKAL_PAYOUT_URL}")
    print(f"HTTP Method: POST")
    print("Headers:", json.dumps(headers, indent=2))
    print("Payload (Masked for Security):")
    print(json.dumps(mask_sensitive_payload(payload), indent=2))
    print()

    # 3. Call Upstream Utkal API
    start_time = time.perf_counter()
    async with httpx.AsyncClient(transport=UtkalDigitalApiClient.get_transport(), timeout=45.0) as client:
        try:
            response = await client.post(UTKAL_PAYOUT_URL, json=payload, headers=headers)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            try:
                response_json = response.json()
            except Exception:
                response_json = {"raw_body": response.text, "status_code": response.status_code}
                
            print("--- [INBOUND HTTP RESPONSE FROM UTKAL DIGITAL] ---")
            print(f"HTTP Status Code: {response.status_code}")
            print(f"Latency: {latency_ms} ms")
            print("Response Body:")
            print(json.dumps(response_json, indent=2))
            print()
            
            # 4. If status is pending or success, check verify status
            req_id = response_json.get("RequestId") or response_json.get("RequestID") or merchant_ref
            print(f"--- [VERIFYING TRANSACTION STATUS FOR RequestID: {req_id}] ---")
            verify_res = await UtkalDigitalApiClient.check_payout_status(
                request_id=req_id,
                sender_name=customer_name,
                sender_mobile=customer_mobile,
                bank_name=bank_name,
                bank_code=bank_code,
                account_no=account_number,
                ifsc=ifsc_code,
                service_id="26"
            )
            print("Verification Result:")
            print(json.dumps(verify_res, indent=2))
            
            # 5. Fetch updated balance
            print("\n--- [POST-TRANSACTION LIVE UTKAL BALANCE] ---")
            bal_res = await UtkalDigitalApiClient.check_balance()
            print(f"Remaining Utkal Balance: ₹{bal_res.get('avail_balance')}")
            
            return {
                "request_payload": mask_sensitive_payload(payload),
                "response_payload": response_json,
                "verification": verify_res,
                "balance": bal_res,
                "http_status": response.status_code,
                "latency_ms": latency_ms
            }
            
        except Exception as e:
            print(f"❌ Error during payout execution: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(execute_payout())
