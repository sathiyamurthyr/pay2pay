import pytest
import base64
from unittest.mock import patch, MagicMock
from app.infrastructure.adapters.email_service import EmailService
from app.application.daily_statement_service import DailyAccountStatementService

def test_daily_statement_email_dispatches_via_notification_platform():
    """
    Verifies that daily account statement emails, including password-protected
    PDF attachments and financial variables, dispatch via the Sathus Notification Platform.
    """
    service = EmailService()
    dummy_pdf = b"%PDF-1.4 sample encrypted statement binary content"

    mock_response = {
        "notification_id": "notif_mock_stmt_12345",
        "project_id": "PAY2PAY",
        "channel": "email",
        "status": "queued"
    }

    with patch("app.core.config.settings.NOTIFICATION_PLATFORM_ENABLED", True), \
         patch("app.core.config.settings.NOTIFICATION_PLATFORM_API_KEY", "snk_live_testkey_123"), \
         patch("sathus_notification.client.SathusNotificationClient.send_event", return_value=mock_response) as mock_send_event:

        res = service.send_statement_email_sync(
            recipient_email="retailer@pay2pay.in",
            recipient_name="Mahalakshmi Agencies",
            statement_date_str="15 November 2026",
            opening_balance=25000.0,
            total_credit=80000.0,
            total_debit=45000.0,
            closing_balance=60000.0,
            pdf_bytes=dummy_pdf,
            filename="Pay2Pay_Statement_2026-11-15.pdf",
            password_hint="First 4 PAN + Last 4 Mobile"
        )

        assert res["status"] == "SUCCESS"
        assert res["delivered"] is True
        assert res["notification_id"] == "notif_mock_stmt_12345"
        assert res["platform"] == "sathus_notification_platform"

        # Verify arguments passed to notification platform
        mock_send_event.assert_called_once()
        call_kwargs = mock_send_event.call_args.kwargs
        assert call_kwargs["event_type"] == "ACCOUNT_STATEMENT"
        assert call_kwargs["event_category"] == "FINANCIAL"
        assert call_kwargs["recipient_email"] == "retailer@pay2pay.in"
        assert call_kwargs["recipient_name"] == "Mahalakshmi Agencies"
        assert call_kwargs["data"]["opening_balance"] == 25000.0
        assert call_kwargs["data"]["closing_balance"] == 60000.0

        # Verify base64 attachment
        attachments = call_kwargs["attachments"]
        assert len(attachments) == 1
        assert attachments[0]["filename"] == "Pay2Pay_Statement_2026-11-15.pdf"
        assert attachments[0]["content_base64"] == base64.b64encode(dummy_pdf).decode("utf-8")

def test_auth_otp_dispatches_via_notification_platform():
    """Verifies that verification OTPs dispatch via Sathus Notification Platform."""
    service = EmailService()
    mock_response = {
        "notification_id": "notif_mock_otp_9988",
        "project_id": "PAY2PAY",
        "channel": "email",
        "status": "queued"
    }

    with patch("app.core.config.settings.NOTIFICATION_PLATFORM_ENABLED", True), \
         patch("app.core.config.settings.NOTIFICATION_PLATFORM_API_KEY", "snk_live_testkey_123"), \
         patch("sathus_notification.client.SathusNotificationClient.send_event", return_value=mock_response) as mock_send_event:

        res = service.send_otp_sync("new_retailer@pay2pay.in", "778899")
        assert res["status"] == "SUCCESS"
        assert res["notification_id"] == "notif_mock_otp_9988"
        assert res["platform"] == "sathus_notification_platform"

        mock_send_event.assert_called_once()
        call_kwargs = mock_send_event.call_args.kwargs
        assert call_kwargs["event_type"] == "AUTH_OTP"
        assert call_kwargs["event_category"] == "AUTH"
        assert call_kwargs["data"]["otp_code"] == "778899"

def test_platform_failure_falls_back_to_smtp_gracefully():
    """Verifies that if the notification platform encounters an error, it falls back without crashing."""
    service = EmailService()

    with patch("app.core.config.settings.NOTIFICATION_PLATFORM_ENABLED", True), \
         patch("app.core.config.settings.NOTIFICATION_PLATFORM_API_KEY", "snk_live_testkey_123"), \
         patch("sathus_notification.client.SathusNotificationClient.send_event", side_effect=Exception("Connection refused")):

        # Should fall back to simulated SMTP mode (when no SMTP credentials)
        res = service.send_otp_sync("retailer@pay2pay.in", "112233")
        assert res["status"] in ("SIMULATED", "SUCCESS", "FAILED")

@pytest.mark.asyncio
async def test_whatsapp_otp_dispatches_via_notification_platform():
    """Verifies that WhatsApp OTP dispatches via Sathus Notification Platform."""
    from app.infrastructure.adapters.whatsapp_service import WhatsAppService
    service = WhatsAppService()
    mock_response = {
        "id": "notif_wa_mock_001",
        "status": "queued",
        "channel": "whatsapp"
    }

    with patch("app.core.config.settings.NOTIFICATION_PLATFORM_ENABLED", True), \
         patch("app.core.config.settings.NOTIFICATION_PLATFORM_API_KEY", "snk_live_testkey_123"), \
         patch("sathus_notification.client.SathusNotificationClient.send", return_value=mock_response) as mock_send:

        res = await service.send_otp("9876543210", "554433")
        assert res["status"] == "SUCCESS"
        assert res["delivered"] is True
        assert res["platform"] == "sathus_notification_platform"
        assert res["message_id"] == "notif_wa_mock_001"

        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        assert call_kwargs["channel"] == "whatsapp"
        assert call_kwargs["recipient"]["phone"] == "919876543210"
        assert call_kwargs["template_code"] == "ss_auth_otp_v1"
        assert call_kwargs["variables"]["otp_code"] == "554433"

@pytest.mark.asyncio
async def test_whatsapp_payout_dispatches_via_notification_platform():
    """Verifies that WhatsApp Payout status dispatches via Sathus Notification Platform."""
    from app.infrastructure.adapters.whatsapp_service import WhatsAppService
    service = WhatsAppService()
    mock_response = {
        "id": "notif_wa_mock_002",
        "status": "queued",
        "channel": "whatsapp"
    }

    with patch("app.core.config.settings.NOTIFICATION_PLATFORM_ENABLED", True), \
         patch("app.core.config.settings.NOTIFICATION_PLATFORM_API_KEY", "snk_live_testkey_123"), \
         patch("sathus_notification.client.SathusNotificationClient.send", return_value=mock_response) as mock_send:

        res = await service.send_payout_status_notification(
            mobile_number="9876543210",
            customer_name="Sathiya",
            amount=1500.0,
            transaction_id="TXN123456",
            date_time_str="15-11-2026 13:30",
            status="SUCCESS",
            receipt_token="RCPT789"
        )
        assert res["status"] == "SUCCESS"
        assert res["delivered"] is True
        assert res["platform"] == "sathus_notification_platform"
        assert res["message_id"] == "notif_wa_mock_002"

        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        assert call_kwargs["channel"] == "whatsapp"
        assert call_kwargs["template_code"] == "txn_status"
        assert call_kwargs["variables"]["amount"] == "1500.00"
        assert call_kwargs["variables"]["receipt_token"] == "RCPT789"
