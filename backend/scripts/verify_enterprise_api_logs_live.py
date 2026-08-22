import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def verify_live():
    print("==========================================================")
    print("LIVE PRODUCTION VERIFICATION: ENTERPRISE API LOGS MODULE")
    print("==========================================================")

    # 1. Trigger realistic multi-step transaction
    test_txn = f"TXN-E2E-AUDIT-{int(time.time())}"
    print(f"\n1. Triggering Transaction Workflow for Txn: {test_txn}")

    # Step A: Retailer Login
    headers = {
        "x-transaction-id": test_txn,
        "x-correlation-id": f"CORR-{test_txn}",
        "x-request-id": f"REQ-{test_txn}-INBOUND-1",
        "Authorization": "Bearer dummy_secret_jwt_access_token_9988",
        "x-api-key": "secret_production_key_112233"
    }
    payload = {
        "mobile_number": "9176669426",
        "password": "Admin#2026",
        "accepted_terms": True,
        "transaction_id": test_txn,
        "aadhaar": "987654321098",
        "pan": "ABCDE1234F",
        "account_number": "98765432109876",
        "card_number": "4111111111111234",
    }
    r1 = requests.post(f"{BASE_URL}/api/v1/auth/enterprise/login-password", json=payload, headers=headers)
    print(f"Step A (Inbound Auth Request): HTTP {r1.status_code}")

    # Step B: Outbound Provider Dispatch simulation
    from app.core.outbound_api_logger import log_outbound_api_call
    import asyncio

    async def step_b():
        await log_outbound_api_call(
            provider_name="WowPe",
            service_name="PAYOUT",
            endpoint="https://api.wowpe.in/api/api/api-module/payout/payout",
            http_method="POST",
            transaction_id=test_txn,
            request_id=f"REQ-{test_txn}-OUTBOUND-1",
            correlation_id=f"CORR-{test_txn}",
            provider_reference_id="WOW-UTR-99881122",
            request_headers={"Authorization": "Bearer secret_vendor_api_token_abc"},
            request_body={
                "merchant_ref": test_txn,
                "account_number": "98765432109876",
                "pan": "ABCDE1234F",
                "amount": 2500.0,
                "password": "SuperSecretPassword123"
            },
            response_body={
                "status": "SUCCESS",
                "code": "200",
                "message": "Bank Switch Accepted Payment Transfer",
                "utr": "WOW-UTR-99881122",
                "latency_ms": 380.2
            },
            http_status_code=200,
            duration_ms=380.2,
            response_status="SUCCESS",
            retailer_id="RET-10928"
        )
    asyncio.run(step_b())
    print("Step B (Outbound Provider Dispatch): Logged to database")

    time.sleep(1.5)

    # 2. Query Logs by Transaction ID
    print(f"\n2. Querying /api/v1/api-logs?search={test_txn}...")
    r_search = requests.get(f"{BASE_URL}/api/v1/api-logs?search={test_txn}")
    data = r_search.json()
    items = data.get("items", [])
    print(f"Found {len(items)} logs matching {test_txn}")
    assert len(items) >= 2, "Expected at least 2 logs (Inbound and Outbound)"

    inbound_log = next(i for i in items if i["direction"] == "INBOUND")
    outbound_log = next(i for i in items if i["direction"] == "OUTBOUND")

    print(f"  - Inbound Log: ID={inbound_log['log_id']}, Service={inbound_log['service']}, Status={inbound_log['response_status']}, Duration={inbound_log['duration_ms']}ms")
    print(f"  - Outbound Log: ID={outbound_log['log_id']}, Provider={outbound_log['provider_name']}, Status={outbound_log['response_status']}, Duration={outbound_log['duration_ms']}ms")

    # 3. Query Detailed Inspection
    print(f"\n3. Querying Full Inspection for Inbound Log {inbound_log['log_id']}...")
    r_detail = requests.get(f"{BASE_URL}/api/v1/api-logs/{inbound_log['id']}")
    detail = r_detail.json()

    print("Checking Security & Masking:")
    req_hdrs = detail.get("request_headers", {})
    req_body = detail.get("request_body", {})

    print(f"  - Authorization Header: {req_hdrs.get('authorization', req_hdrs.get('Authorization'))}")
    print(f"  - x-api-key Header: {req_hdrs.get('x-api-key')}")
    print(f"  - Password Field: {req_body.get('password')}")
    print(f"  - Aadhaar Field: {req_body.get('aadhaar')}")
    print(f"  - PAN Field: {req_body.get('pan')}")
    print(f"  - Bank Account Field: {req_body.get('account_number')}")
    print(f"  - Card Number Field: {req_body.get('card_number')}")

    assert "secret" not in str(req_hdrs), "Headers must NOT contain secrets"
    assert req_body.get("password") == "******", "Password must be masked"
    assert "XXXX" in str(req_body.get("aadhaar")), "Aadhaar must be masked"
    assert "XXXXX" in str(req_body.get("pan")), "PAN must be masked"

    # 4. Query End-to-End Trace
    print(f"\n4. Querying End-to-End Trace for {test_txn}...")
    r_trace = requests.get(f"{BASE_URL}/api/v1/api-logs/trace/{test_txn}")
    trace = r_trace.json()
    steps = trace.get("steps", [])
    print(f"Trace resolved {len(steps)} sequential steps:")
    for s in steps:
        print(f"  Step #{s['step_number']}: [{s['direction']}] {s['service']} -> {s['endpoint']} ({s['duration_ms']}ms)")
    assert len(steps) >= 2, "Trace must have sequential steps"

    # 5. Check Metrics
    print("\n5. Checking Real-Time Platform Metrics...")
    r_metrics = requests.get(f"{BASE_URL}/api/v1/api-logs/metrics")
    metrics = r_metrics.json()
    print(f"  - Total Calls Today: {metrics.get('total_calls_today')}")
    print(f"  - Inbound Calls: {metrics.get('inbound_count')}")
    print(f"  - Outbound Calls: {metrics.get('outbound_count')}")
    print(f"  - Error Rate: {metrics.get('error_rate_pct')}%")
    print(f"  - Avg Latency: {metrics.get('avg_duration_ms')} ms")

    print("\n==========================================================")
    print(">>> LIVE AUDIT & END-TO-END VERIFICATION: 100% PASSED! <<<")
    print("==========================================================")

if __name__ == "__main__":
    verify_live()
