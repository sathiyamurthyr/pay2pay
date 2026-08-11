import pytest
from app.infrastructure.adapters.email_service import EmailService, email_service

def test_email_service_initialization():
    service = EmailService()
    assert service.smtp_server is not None
    assert service.smtp_port is not None

def test_email_service_otp_html_building():
    service = EmailService()
    html = service._build_otp_html("556677", "test@pay2pay.in")
    assert "556677" in html
    assert "test@pay2pay.in" in html
    assert "Pay2Pay" in html

def test_email_service_invalid_recipient():
    service = EmailService()
    res = service.send_otp_sync("invalid_email", "556677")
    assert res["status"] == "ERROR"
    assert "Invalid recipient" in res["message"]

def test_email_service_simulated_mode():
    service = EmailService(smtp_username="", smtp_password="")
    res = service.send_otp_sync("retailer@pay2pay.in", "556677")
    assert res["status"] == "SIMULATED"
    assert res["otp_code"] == "556677"
    assert res["recipient"] == "retailer@pay2pay.in"

@pytest.mark.asyncio
async def test_email_service_async_send_otp():
    res = await email_service.send_otp("retailer@pay2pay.in", "556677")
    assert res["status"] in ["SIMULATED", "SUCCESS", "FAILED"]
    assert res["recipient"] == "retailer@pay2pay.in"
