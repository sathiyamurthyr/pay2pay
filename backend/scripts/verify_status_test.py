import asyncio
import json
import httpx
from app.application.utkaldigital_client import (
    UtkalDigitalApiClient,
    UTKAL_STATUS_URL,
    mask_sensitive_payload
)

async def test_verify():
    auth, mp = UtkalDigitalApiClient.get_credentials()
    
    # Let's test verify with ServiceId 27 and 26
    for s_id in ["27", "26"]:
        # Case A: RequestID = P2P1787389548238
        payload_a = {
            "Authcode": auth,
            "Mpin": mp,
            "RequestID": "P2P1787389548238",
            "ServiceId": s_id,
            "SenderName": "Sathiya Murthy",
            "SenderMobile": "9176669426",
            "BankName": "STATE BANK OF INDIA",
            "BankCode": "SBIN",
            "AccountNo": "32501959302",
            "Ifsc": "SBIN0000001",
            "AdharNo": "123456789205",
            "PanNo": "CWMPS5725E",
            "Lat": "16.53333",
            "Long": "23.55212"
        }
        
        # Case B: New RequestID with TransId
        payload_b = dict(payload_a)
        payload_b["RequestID"] = f"VER{int(asyncio.get_event_loop().time()*1000)}"
        payload_b["TransId"] = "298092"
        payload_b["TransactionId"] = "298092"
        
        async with httpx.AsyncClient(transport=UtkalDigitalApiClient.get_transport(), timeout=25.0) as client:
            print(f"\n--- Testing Verify ServiceId={s_id} Case A (Original RequestID) ---")
            res_a = await client.post(UTKAL_STATUS_URL, json=payload_a)
            print(f"Status: {res_a.status_code}, Response: {res_a.text}")
            
            print(f"\n--- Testing Verify ServiceId={s_id} Case B (New RequestID + TransId) ---")
            res_b = await client.post(UTKAL_STATUS_URL, json=payload_b)
            print(f"Status: {res_b.status_code}, Response: {res_b.text}")

if __name__ == '__main__':
    asyncio.run(test_verify())
