import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.application.payout_callback_service import PayoutCallbackService


@pytest.mark.asyncio
async def test_get_callback_urls_catalog():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/payout/callback/urls")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert "vendors" in data
        assert "bulkpe" in data["vendors"]
        assert "wowpe" in data["vendors"]
        assert "cashfree" in data["vendors"]
        assert "razorpay" in data["vendors"]
        assert "decentro" in data["vendors"]
        assert "universal_callback_url" in data


@pytest.mark.asyncio
async def test_universal_callback_post_bulkpe_format():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "vendor_tx_id": "BULKPE-TXN-12345",
            "reference_id": "ORD-998877",
            "status": "SUCCESS",
            "utr": "UTR1234567890",
            "message": "Transaction settled successfully"
        }
        res = await client.post("/api/v1/payout/callback", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("SUCCESS", "ACK")


@pytest.mark.asyncio
async def test_vendor_specific_callback_wowpe():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "statusCode": "1",
            "clientOrderId": "WOWPE-REF-001",
            "orderId": "WP-987654",
            "utr": "UTR9988776655",
            "message": "Completed"
        }
        res = await client.post("/api/v1/payout/callback/wowpe", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "SUCCESS"


@pytest.mark.asyncio
async def test_vendor_specific_callback_cashfree():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "transferId": "CF_TRX_9999",
            "referenceId": "CLIENT_REF_8888",
            "status": "SUCCESS",
            "utr": "CF_UTR_445566",
            "reason": "Transfer Successful"
        }
        res = await client.post("/api/v1/payout/callback/cashfree", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("SUCCESS", "ACK")


@pytest.mark.asyncio
async def test_vendor_specific_callback_razorpay():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "event": "payout.processed",
            "payload": {
                "payout": {
                    "entity": {
                        "id": "pout_123456789",
                        "reference_id": "RZP_ORDER_5544",
                        "status": "processed",
                        "utr": "RZP_UTR_112233"
                    }
                }
            }
        }
        res = await client.post("/api/v1/payout/callback/razorpay", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("SUCCESS", "ACK")


@pytest.mark.asyncio
async def test_vendor_get_callback_url_encoded():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/payout/callback/easebuzz?txnid=EB12345&status=success&bank_ref_num=EB_UTR_8899")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("SUCCESS", "ACK")
