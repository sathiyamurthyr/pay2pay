import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def test_all_menus():
    print("Testing ALL Platform Menu Endpoints with sample data...", flush=True)
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Login
        login_res = await client.post(f"{BASE_URL}/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("  [Auth] Logged in as admin@pay2pay.com", flush=True)

        endpoints = [
            ("Companies Onboarding", "GET", f"{BASE_URL}/companies"),
            ("Retailer Management", "GET", f"{BASE_URL}/retailers"),
            ("POS Machine Inventory", "GET", f"{BASE_URL}/machines"),
            ("Settlements Transactions", "GET", f"{BASE_URL}/settlements/transactions"),
            ("Payout Gateways", "GET", f"{BASE_URL}/payouts/gateways"),
            ("Chart of Accounts", "GET", f"{BASE_URL}/wallet-ledger/chart-of-accounts"),
            ("Financial MDR Config", "GET", f"{BASE_URL}/financial-config?config_type=MDR"),
            ("Financial GST Config", "GET", f"{BASE_URL}/financial-config?config_type=GST"),
            ("Financial TDS Config", "GET", f"{BASE_URL}/financial-config?config_type=TDS"),
            ("Financial Commission Config", "GET", f"{BASE_URL}/financial-config?config_type=COMMISSION"),
            ("Financial Settlement Config", "GET", f"{BASE_URL}/financial-config?config_type=SETTLEMENT"),
            ("Policy Master Directory", "GET", f"{BASE_URL}/policies/"),
            ("Policy Evaluator Engine", "POST", f"{BASE_URL}/policies/evaluate"),
            ("DMT Money Transfer Engine", "GET", f"{BASE_URL}/dmt/transfers"),
            ("AEPS Cash Out Engine", "GET", f"{BASE_URL}/aeps/transfers"),
            ("Audio Telemetry Themes", "GET", f"{BASE_URL}/audio/themes"),
            ("Customer Management Engine", "GET", f"{BASE_URL}/customers/"),
            ("Beneficiary Management Engine", "GET", f"{BASE_URL}/beneficiaries/"),
        ]

        passed = 0
        failed = 0

        for name, method, url in endpoints:
            try:
                if method == "GET":
                    r = await client.get(url, headers=headers)
                else:
                    payload = {
                        "customer_id": "00000000-0000-0000-0000-000000000000",
                        "service_code": "DMT",
                        "amount": 10000.0,
                        "kyc_level": "FULL_KYC",
                        "risk_score": 15.0
                    }
                    r = await client.post(url, json=payload, headers=headers)

                if r.status_code in (200, 201):
                    passed += 1
                    print(f"  [PASS] {name} ({method} {url.replace(BASE_URL, '')}) -> HTTP {r.status_code}", flush=True)
                else:
                    failed += 1
                    print(f"  [FAIL] {name} ({method} {url.replace(BASE_URL, '')}) -> HTTP {r.status_code}: {r.text[:100]}", flush=True)
            except Exception as e:
                failed += 1
                print(f"  [ERROR] {name} -> {e}", flush=True)

        print(f"\nRESULTS: {passed} PASSED, {failed} FAILED out of {len(endpoints)} menu endpoints.", flush=True)

if __name__ == "__main__":
    asyncio.run(test_all_menus())
