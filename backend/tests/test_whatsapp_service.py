import pytest
from app.infrastructure.adapters.whatsapp_service import WhatsAppService, whatsapp_service
from app.infrastructure.adapters.global_notification_platform_client import global_notification_platform_client

def test_whatsapp_service_initialization():
    service = WhatsAppService()
    assert service.api_url is not None
    assert service.phone_number_id is not None
    assert service.auth_token is not None

@pytest.mark.asyncio
async def test_whatsapp_otp_dynamic_dispatch():
    res = await whatsapp_service.send_otp(
        mobile_number="9876543210",
        otp_code="998877",
        company_context="SMSPAY"
    )
    assert res["status"] == "SUCCESS"
    assert res.get("project_code") == "SMSPAY"
    assert res.get("delivered") is True

@pytest.mark.asyncio
async def test_whatsapp_payout_dynamic_dispatch():
    res = await whatsapp_service.send_payout_status_notification(
        mobile_number="9876543210",
        customer_name="Ramesh",
        amount=1500.0,
        transaction_id="TXN-UNIT-100",
        date_time_str="15 Nov 2026, 03:30 PM",
        status="SUCCESS",
        receipt_token="RCP-UNIT-100",
        company_context="NEAR4YOU"
    )
    assert res["status"] == "SUCCESS"
    assert res.get("project_code") == "NEAR4YOU"
    assert "near4you.store" in res.get("receipt_url", "")
