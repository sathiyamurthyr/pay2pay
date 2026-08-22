import urllib.request
import json

payload = {
    "customer_id": "7013914767",
    "beneficiary_id": "86fe112a-ba72-418d-a0cc-9990d4912b35",
    "account_number": "0630104000156974",
    "ifsc_code": "IBKL0000630",
    "account_holder_name": "Sathiya Murthy R",
    "bank_name": "IDBI Bank",
    "amount": 100.0,
    "mpin": "2468",
    "mode": "IMPS"
}

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/payout/bulkpe/initiate",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as response:
        print("API Response Code:", response.status)
        print("API Response Body:", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Body:", e.read().decode("utf-8"))
except Exception as ex:
    print("Exception:", ex)
