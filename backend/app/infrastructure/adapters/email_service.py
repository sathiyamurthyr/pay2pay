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
        """Async wrapper for dispatching Email OTP."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.send_otp_sync, recipient_email, otp_code)

    def send_password_reset_email_sync(self, recipient_email: str, reset_link: str) -> Dict[str, Any]:
        """Dispatch Enterprise Password Reset email with 30-min secure link."""
        if not recipient_email or "@" not in recipient_email:
            return {"status": "ERROR", "message": "Invalid recipient email address."}

        smtp_server = self.smtp_server if self.smtp_server is not None else getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
        smtp_port = self.smtp_port if self.smtp_port is not None else getattr(settings, "SMTP_PORT", 587)
        smtp_username = self.smtp_username if self.smtp_username is not None else getattr(settings, "SMTP_USERNAME", "")
        smtp_password = self.smtp_password if self.smtp_password is not None else getattr(settings, "SMTP_PASSWORD", "")
        from_email = self.from_email if self.from_email is not None else getattr(settings, "SMTP_FROM_EMAIL", "noreply@pay2pay.in")
        from_name = self.from_name if self.from_name is not None else getattr(settings, "SMTP_FROM_NAME", "Pay2Pay Enterprise")

        subject = "Reset Your Pay2Pay Password"
        html_content = f"""
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
            .content {{ padding: 32px 24px; text-align: left; }}
            .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 16px; text-align: center; }}
            .btn {{ display: block; width: 80%; margin: 24px auto; padding: 14px 20px; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; text-align: center; text-decoration: none; font-weight: 800; font-size: 14px; border-radius: 12px; shadow: 0 4px 12px rgba(37,99,235,0.3); }}
            .footer {{ background-color: #0f172a; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-t: 1px solid #334155; }}
            .security-note {{ font-size: 12px; color: #94a3b8; line-height: 1.6; margin-top: 20px; background-color: #0f172a; padding: 16px; border-radius: 12px; border-left: 4px solid #3b82f6; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Pay2Pay</div>
              <div class="sub-logo">Enterprise Security Team</div>
            </div>
            <div class="content">
              <div class="title">Reset Your Pay2Pay Password</div>
              <p style="font-size: 14px; color: #cbd5e1;">Hello,</p>
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                We received a request to reset the password for your Pay2Pay account.
              </p>
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                Click the secure link below to create a new password.
              </p>
              <a href="{reset_link}" class="btn" target="_blank">Reset Password</a>
              <div class="security-note">
                ⏱ <strong>The link is valid for 30 minutes.</strong><br><br>
                If you did not request this change, you can safely ignore this email.
              </div>
              <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
                Regards,<br>
                <strong>Pay2Pay Security Team</strong>
              </p>
            </div>
            <div class="footer">
              &copy; 2026 Pay2Pay Financial Technologies. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = recipient_email
        msg.attach(MIMEText(html_content, "html"))

        if not smtp_username or not smtp_password:
            logger.info(f"[EMAIL SERVICE SIMULATED] Password reset email for {recipient_email} | Link: {reset_link}")
            return {
                "status": "SIMULATED",
                "delivered": True,
                "recipient": recipient_email,
                "reset_link": reset_link
            }

        try:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10.0) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            logger.info(f"[EMAIL SERVICE SUCCESS] Password reset email sent to {recipient_email}")
            return {"status": "SUCCESS", "delivered": True, "recipient": recipient_email}
        except Exception as ex:
            logger.error(f"[EMAIL SERVICE ERROR] Failed to send email to {recipient_email}: {ex}")
            return {"status": "FAILED", "delivered": False, "detail": str(ex)}

    async def send_password_reset_email(self, recipient_email: str, reset_link: str) -> Dict[str, Any]:
        """Async wrapper for dispatching password reset email."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.send_password_reset_email_sync, recipient_email, reset_link)

    def send_welcome_email_sync(self, recipient_email: str, retailer_name: str, retailer_id: str) -> Dict[str, Any]:
        """Send official Pay2Pay Welcome & Activation email without plaintext credentials."""
        if not recipient_email or "@" not in recipient_email:
            return {"status": "ERROR", "message": "Invalid recipient email address."}

        smtp_server = self.smtp_server if self.smtp_server is not None else getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
        smtp_port = self.smtp_port if self.smtp_port is not None else getattr(settings, "SMTP_PORT", 587)
        smtp_username = self.smtp_username if self.smtp_username is not None else getattr(settings, "SMTP_USERNAME", "")
        smtp_password = self.smtp_password if self.smtp_password is not None else getattr(settings, "SMTP_PASSWORD", "")
        from_email = self.from_email if self.from_email is not None else getattr(settings, "SMTP_FROM_EMAIL", "noreply@pay2pay.in")
        from_name = self.from_name if self.from_name is not None else getattr(settings, "SMTP_FROM_NAME", "Pay2Pay Enterprise")

        subject = f"Welcome to Pay2Pay! Your Retailer Account {retailer_id} is Active"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }}
            .container {{ max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }}
            .header {{ background: linear-gradient(135deg, #16a34a, #2563eb); padding: 28px; text-align: center; }}
            .logo {{ font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }}
            .sub-logo {{ font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }}
            .content {{ padding: 32px 24px; text-align: left; }}
            .title {{ font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px; }}
            .card {{ background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0; }}
            .card-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
            .btn {{ display: block; width: 85%; margin: 24px auto; padding: 14px 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-align: center; text-decoration: none; font-weight: 800; font-size: 14px; border-radius: 12px; }}
            .footer {{ background-color: #0f172a; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }}
            .note {{ font-size: 12px; color: #94a3b8; line-height: 1.5; background-color: #0f172a; padding: 14px; border-radius: 10px; border-left: 3px solid #16a34a; margin-top: 20px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Pay2Pay</div>
              <div class="sub-logo">Official Account Activation</div>
            </div>
            <div class="content">
              <div class="title">Welcome, {retailer_name}! 🎉</div>
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                Congratulations! Your Pay2Pay Retailer Onboarding & KYC verification has been <strong>APPROVED</strong>. Your workstation is now fully active.
              </p>
              
              <div class="card">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">Retailer Business Credentials</div>
                <div style="font-size: 14px; color: #f8fafc; margin-bottom: 6px;"><strong>Retailer ID:</strong> <span style="font-family: monospace; color: #60a5fa; font-weight: 800;">{retailer_id}</span></div>
                <div style="font-size: 14px; color: #f8fafc; margin-bottom: 6px;"><strong>Merchant Name:</strong> {retailer_name}</div>
                <div style="font-size: 14px; color: #f8fafc;"><strong>Account Status:</strong> <span style="color: #4ade80; font-weight: 700;">ACTIVE</span></div>
              </div>

              <a href="https://pay2pay.in/login" class="btn" target="_blank">Login to Retailer Workstation</a>

              <div class="note">
                <strong>🔒 Security Notice:</strong> For your security, your password and MPIN are encrypted and never sent via email. If you need any assistance, contact our 24/7 Support Desk at <a href="mailto:support@pay2pay.in" style="color: #60a5fa;">support@pay2pay.in</a>.
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

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = recipient_email
        msg.attach(MIMEText(html_content, "html"))

        if not smtp_username or not smtp_password:
            logger.info(f"[EMAIL SERVICE SIMULATED] Welcome email sent to {recipient_email} for Retailer {retailer_id}")
            return {
                "status": "SIMULATED",
                "delivered": True,
                "recipient": recipient_email,
                "retailer_id": retailer_id
            }

        try:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=10.0) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            logger.info(f"[EMAIL SERVICE SUCCESS] Welcome email sent to {recipient_email}")
            return {"status": "SUCCESS", "delivered": True, "recipient": recipient_email}
        except Exception as ex:
            logger.error(f"[EMAIL SERVICE ERROR] Failed to send welcome email to {recipient_email}: {ex}")
            return {"status": "FAILED", "delivered": False, "detail": str(ex)}

    async def send_welcome_email(self, recipient_email: str, retailer_name: str, retailer_id: str) -> Dict[str, Any]:
        """Async wrapper for dispatching welcome email."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.send_welcome_email_sync, recipient_email, retailer_name, retailer_id)

email_service = EmailService()
