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
