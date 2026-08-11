"""
Pay2Pay Enterprise Email Dispatcher Service
Handles HTML email templates and SMTP transmission for Email OTP Verification & Account Notifications.
"""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("email_service")

class EmailService:
    """Centralized Email Adapter for Pay2Pay Enterprise Platform."""

    def __init__(
        self,
        smtp_server: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_username: Optional[str] = None,
        smtp_password: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ):
        self.smtp_server = smtp_server if smtp_server is not None else getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = smtp_port if smtp_port is not None else getattr(settings, "SMTP_PORT", 587)
        self.smtp_username = smtp_username if smtp_username is not None else getattr(settings, "SMTP_USERNAME", "")
        self.smtp_password = smtp_password if smtp_password is not None else getattr(settings, "SMTP_PASSWORD", "")
        self.from_email = from_email if from_email is not None else getattr(settings, "SMTP_FROM_EMAIL", "noreply@pay2pay.in")
        self.from_name = from_name if from_name is not None else getattr(settings, "SMTP_FROM_NAME", "Pay2Pay Enterprise")

    def _build_otp_html(self, otp_code: str, recipient_email: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }}
            .container {{ max-width: 520px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }}
            .header {{ background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 24px; text-align: center; }}
            .logo {{ font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }}
            .sub-logo {{ font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }}
            .content {{ padding: 32px 24px; text-align: center; }}
            .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }}
            .subtitle {{ font-size: 13px; color: #94a3b8; margin-bottom: 24px; font-weight: 500; }}
            .otp-box {{ background-color: #0f172a; border: 2px dashed #3b82f6; border-radius: 16px; padding: 20px; margin: 20px 0; display: inline-block; width: 80%; }}
            .otp-code {{ font-size: 36px; font-weight: 900; color: #60a5fa; letter-spacing: 8px; font-family: monospace; }}
            .expiry {{ font-size: 11px; font-weight: 700; color: #f59e0b; margin-top: 8px; }}
            .footer {{ background-color: #0f172a; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-t: 1px solid #334155; }}
            .security-note {{ font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 20px; text-align: left; background-color: #0f172a; padding: 12px; border-radius: 10px; border-left: 3px solid #3b82f6; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Pay2Pay</div>
              <div class="sub-logo">Enterprise Retailer Platform</div>
            </div>
            <div class="content">
              <div class="title">Verify Your Email Address</div>
              <div class="subtitle">Use the verification code below to complete your retailer registration for <strong style="color: #60a5fa;">{recipient_email}</strong>.</div>
              <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
                <div class="expiry">⏱ Valid for 10 minutes</div>
              </div>
              <div class="security-note">
                <strong>🔒 Security Reminder:</strong> Pay2Pay staff will never ask for your verification code, password, or MPIN over call or chat. Do not share this code with anyone.
              </div>
            </div>
            <div class="footer">
              &copy; 2026 Pay2Pay Financial Technologies. All rights reserved.<br>
              RBI Authorized Payments Platform
            </div>
          </div>
        </body>
        </html>
        """

    def send_otp_sync(self, recipient_email: str, otp_code: str) -> Dict[str, Any]:
        """Synchronous helper for SMTP dispatch."""
        if not recipient_email or "@" not in recipient_email:
            return {"status": "ERROR", "message": "Invalid recipient email address."}

        smtp_server = self.smtp_server if self.smtp_server is not None else getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
        smtp_port = self.smtp_port if self.smtp_port is not None else getattr(settings, "SMTP_PORT", 587)
        smtp_username = self.smtp_username if self.smtp_username is not None else getattr(settings, "SMTP_USERNAME", "")
        smtp_password = self.smtp_password if self.smtp_password is not None else getattr(settings, "SMTP_PASSWORD", "")
        from_email = self.from_email if self.from_email is not None else getattr(settings, "SMTP_FROM_EMAIL", "noreply@pay2pay.in")
        from_name = self.from_name if self.from_name is not None else getattr(settings, "SMTP_FROM_NAME", "Pay2Pay Enterprise")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp_code} is your Pay2Pay Email Verification Code"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = recipient_email

        html_content = self._build_otp_html(otp_code, recipient_email)
        msg.attach(MIMEText(html_content, "html"))

        if not smtp_username or not smtp_password:
            logger.info(f"[EMAIL SERVICE SIMULATED] OTP {otp_code} for {recipient_email} (No SMTP Credentials configured)")
            return {
                "status": "SIMULATED",
                "delivered": False,
                "recipient": recipient_email,
                "otp_code": otp_code,
                "message": "SMTP credentials not configured in backend .env. Outputting simulated OTP."
            }

        try:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10.0) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            logger.info(f"[EMAIL SERVICE SUCCESS] Real Email OTP {otp_code} sent to {recipient_email}")
            return {
                "status": "SUCCESS",
                "delivered": True,
                "recipient": recipient_email,
                "otp_code": otp_code
            }
        except Exception as ex:
            logger.error(f"[EMAIL SERVICE ERROR] Failed to send email to {recipient_email}: {ex}")
            return {
                "status": "FAILED",
                "delivered": False,
                "recipient": recipient_email,
                "detail": str(ex)
            }

    async def send_otp(self, recipient_email: str, otp_code: str) -> Dict[str, Any]:
        """Async wrapper for dispatching email OTP."""
        return await asyncio.to_thread(self.send_otp_sync, recipient_email, otp_code)

email_service = EmailService()
