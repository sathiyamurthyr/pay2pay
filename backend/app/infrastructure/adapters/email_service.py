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

        smtp_server = self.smtp_server or getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
        smtp_port = self.smtp_port or getattr(settings, "SMTP_PORT", 587)
        smtp_username = self.smtp_username or getattr(settings, "SMTP_USERNAME", "Paymebalu@gmail.com")
        smtp_password = self.smtp_password or getattr(settings, "SMTP_PASSWORD", "pbcr sgsm cugn ducm")
        from_email = self.from_email or getattr(settings, "SMTP_FROM_EMAIL", "Paymebalu@gmail.com")
        from_name = self.from_name or getattr(settings, "SMTP_FROM_NAME", "Pay2Pay Enterprise")

        if smtp_password:
            # Gmail App passwords may contain spaces for readability - strip them for SMTP auth
            smtp_password = smtp_password.strip()

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
                "message": "SMTP credentials not configured. Outputting simulated OTP."
            }

        # Try Port 587 (STARTTLS) first, fallback to Port 465 (SSL)
        try:
            with smtplib.SMTP(smtp_server, int(smtp_port), timeout=12.0) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            logger.info(f"[EMAIL SERVICE SUCCESS] Real Email OTP {otp_code} sent to {recipient_email} via Port {smtp_port}")
            return {
                "status": "SUCCESS",
                "delivered": True,
                "recipient": recipient_email,
                "otp_code": otp_code
            }
        except Exception as ex587:
            logger.warning(f"[EMAIL SERVICE 587 FAILED] Attempting Port 465 SSL fallback: {ex587}")
            try:
                with smtplib.SMTP_SSL(smtp_server, 465, timeout=12.0) as ssl_server:
                    ssl_server.ehlo()
                    ssl_server.login(smtp_username, smtp_password)
                    ssl_server.send_message(msg)
                logger.info(f"[EMAIL SERVICE SUCCESS] Real Email OTP {otp_code} sent to {recipient_email} via Port 465 SSL")
                return {
                    "status": "SUCCESS",
                    "delivered": True,
                    "recipient": recipient_email,
                    "otp_code": otp_code
                }
            except Exception as ex465:
                logger.error(f"[EMAIL SERVICE ERROR] Failed to send email to {recipient_email} via 587 and 465: {ex465}")
                return {
                    "status": "FAILED",
                    "delivered": False,
                    "recipient": recipient_email,
                    "detail": str(ex465)
                }

    async def send_otp(self, recipient_email: str, otp_code: str) -> Dict[str, Any]:
        """Async wrapper for dispatching email OTP."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
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
                "subject": subject
            }

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            logger.info(f"Password reset email sent to {recipient_email}")
            return {
                "status": "SENT",
                "delivered": True,
                "recipient": recipient_email
            }
        except Exception as e:
            logger.error(f"Failed to send password reset email to {recipient_email}: {str(e)}")
            return {
                "status": "FAILED",
                "delivered": False,
                "error": str(e),
                "recipient": recipient_email
            }

    def _build_topup_approval_html(self, data: Dict[str, Any]) -> str:
        req_id = data.get("topup_request_id", "N/A")
        ret_name = data.get("retailer_name", "Valued Retailer")
        ret_code = data.get("retailer_code", "N/A")
        payment_mode = data.get("payment_method", "POS - Instant")
        payment_ref = data.get("payment_reference", "N/A")
        requested_amt = float(data.get("requested_amount", 0.0))
        mdr = float(data.get("mdr_charge", 0.0))
        gst = float(data.get("gst_amount", 0.0))
        charges = float(data.get("charges", 0.0))
        approved_amt = float(data.get("approved_amount", data.get("received_amount", requested_amt)))
        current_bal = float(data.get("current_balance", 0.0))
        approved_at = data.get("approved_at", "")
        admin_notes = data.get("admin_notes", "")
        txn_ref = data.get("transaction_reference", "N/A")

        fee_rows = ""
        if mdr > 0:
            fee_rows += f"""
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">MDR / Platform Fee:</td>
              <td style="padding: 8px 0; color: #f59e0b; font-weight: 700; text-align: right; font-size: 13px;">- ₹{mdr:,.2f}</td>
            </tr>
            """
        if gst > 0:
            fee_rows += f"""
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">GST (18%):</td>
              <td style="padding: 8px 0; color: #f59e0b; font-weight: 700; text-align: right; font-size: 13px;">- ₹{gst:,.2f}</td>
            </tr>
            """
        if charges > 0 and charges != mdr:
            fee_rows += f"""
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Total Charges:</td>
              <td style="padding: 8px 0; color: #f59e0b; font-weight: 700; text-align: right; font-size: 13px;">- ₹{charges:,.2f}</td>
            </tr>
            """

        notes_section = ""
        if admin_notes:
            notes_section = f"""
            <div style="background-color: #0f172a; border-radius: 12px; padding: 12px 16px; margin: 16px 0; border-left: 3px solid #3b82f6; text-align: left;">
              <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Admin Remarks:</div>
              <div style="font-size: 13px; color: #e2e8f0; margin-top: 4px;">{admin_notes}</div>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b1329; margin: 0; padding: 20px; color: #f8fafc; }}
            .container {{ max-width: 560px; margin: 0 auto; background-color: #151f38; border-radius: 24px; border: 1px solid #293556; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }}
            .header {{ background: linear-gradient(135deg, #059669, #0d9488); padding: 28px 24px; text-align: center; }}
            .badge {{ display: inline-block; background-color: rgba(255,255,255,0.2); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }}
            .logo {{ font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }}
            .sub-logo {{ font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }}
            .content {{ padding: 32px 24px; text-align: center; }}
            .title {{ font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 6px; }}
            .subtitle {{ font-size: 13px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }}
            .amount-box {{ background: linear-gradient(180deg, #0f172a, #1e293b); border: 2px solid #10b981; border-radius: 20px; padding: 22px 20px; margin: 20px 0; text-align: center; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.2); }}
            .amount-label {{ font-size: 11px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }}
            .amount-value {{ font-size: 38px; font-weight: 900; color: #ffffff; font-family: monospace; }}
            .table-box {{ width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left; }}
            .table-box td {{ padding: 10px 0; border-bottom: 1px solid #24304f; }}
            .footer {{ background-color: #0b1329; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #293556; }}
            .security-note {{ font-size: 11px; color: #94a3b8; line-height: 1.5; margin-top: 20px; text-align: left; background-color: #0f172a; padding: 14px; border-radius: 12px; border-left: 3px solid #10b981; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge">✓ Payment Verified</div>
              <div class="logo">Pay2Pay Enterprise</div>
              <div class="sub-logo">Wallet Credit Confirmation</div>
            </div>
            <div class="content">
              <div class="title">Wallet Top-up Approved!</div>
              <div class="subtitle">Dear <strong style="color: #60a5fa;">{ret_name}</strong> ({ret_code}),<br>Your top-up request has been verified and funds have been credited to your live wallet.</div>
              
              <div class="amount-box">
                <div class="amount-label">Net Received &amp; Credited Amount</div>
                <div class="amount-value">₹{approved_amt:,.2f}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">Updated Wallet Balance: <strong style="color: #34d399;">₹{current_bal:,.2f}</strong></div>
              </div>

              <table class="table-box">
                <tr>
                  <td style="color: #94a3b8; font-size: 13px;">Top-up Request ID:</td>
                  <td style="color: #ffffff; font-weight: 700; text-align: right; font-family: monospace; font-size: 13px;">{req_id}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 13px;">Bank Ref / UTR:</td>
                  <td style="color: #ffffff; font-weight: 700; text-align: right; font-family: monospace; font-size: 13px;">{payment_ref}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 13px;">Payment Mode:</td>
                  <td style="color: #ffffff; font-weight: 700; text-align: right; font-size: 13px;">{payment_mode}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 13px;">Transaction Amount (Gross):</td>
                  <td style="color: #ffffff; font-weight: 700; text-align: right; font-size: 13px;">₹{requested_amt:,.2f}</td>
                </tr>
                {fee_rows}
                <tr>
                  <td style="color: #94a3b8; font-size: 13px; font-weight: 700;">Approved / Received Amount:</td>
                  <td style="color: #10b981; font-weight: 900; text-align: right; font-size: 14px;">₹{approved_amt:,.2f}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 13px;">Ledger Reference:</td>
                  <td style="color: #38bdf8; font-weight: 700; text-align: right; font-family: monospace; font-size: 12px;">{txn_ref}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 13px;">Approved At:</td>
                  <td style="color: #cbd5e1; font-weight: 600; text-align: right; font-size: 12px;">{approved_at}</td>
                </tr>
              </table>

              {notes_section}

              <div class="security-note">
                <strong>💡 Note:</strong> Your updated wallet balance is immediately available for payouts, DMT, BBPS, and recharge services.
              </div>
            </div>
            <div class="footer">
              &copy; 2026 Pay2Pay Financial Technologies Pvt. Ltd. All rights reserved.<br>
              Need help? Contact support at <a href="mailto:support@pay2pay.in" style="color: #38bdf8; text-decoration: none;">support@pay2pay.in</a>
            </div>
          </div>
        </body>
        </html>
        """

    def send_topup_approval_email_sync(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch Topup Approval Confirmation email to Retailer."""
        recipient_email = payload.get("recipient_email")
        if not recipient_email or "@" not in recipient_email:
            logger.info(f"[EMAIL SERVICE SKIPPED] No valid email address provided for topup approval: {recipient_email}")
            return {"status": "SKIPPED", "message": "No valid recipient email address."}

        smtp_server = self.smtp_server or getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
        smtp_port = self.smtp_port or getattr(settings, "SMTP_PORT", 587)
        smtp_username = self.smtp_username or getattr(settings, "SMTP_USERNAME", "Paymebalu@gmail.com")
        smtp_password = self.smtp_password or getattr(settings, "SMTP_PASSWORD", "pbcr sgsm cugn ducm")
        from_email = self.from_email or getattr(settings, "SMTP_FROM_EMAIL", "Paymebalu@gmail.com")
        from_name = self.from_name or getattr(settings, "SMTP_FROM_NAME", "Pay2Pay Enterprise")

        if smtp_password:
            smtp_password = smtp_password.strip()

        req_id = payload.get("topup_request_id", "N/A")
        approved_amt = float(payload.get("approved_amount", payload.get("received_amount", 0.0)))
        subject = f"Topup Approved: ₹{approved_amt:,.2f} Credited to Your Wallet [Req: {req_id}]"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = recipient_email

        html_content = self._build_topup_approval_html(payload)
        msg.attach(MIMEText(html_content, "html"))

        if not smtp_username or not smtp_password:
            logger.info(f"[EMAIL SERVICE SIMULATED] Topup approval email for {recipient_email} | Amount: ₹{approved_amt:,.2f}")
            return {"status": "SIMULATED", "delivered": True, "recipient": recipient_email}

        try:
            with smtplib.SMTP(smtp_server, int(smtp_port), timeout=12.0) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            logger.info(f"[EMAIL SERVICE SUCCESS] Topup approval email sent to {recipient_email}")
            return {"status": "SUCCESS", "delivered": True, "recipient": recipient_email}
        except Exception as ex587:
            logger.warning(f"[EMAIL SERVICE 587 FAILED] Attempting Port 465 SSL: {ex587}")
            try:
                with smtplib.SMTP_SSL(smtp_server, 465, timeout=12.0) as ssl_server:
                    ssl_server.ehlo()
                    ssl_server.login(smtp_username, smtp_password)
                    ssl_server.send_message(msg)
                logger.info(f"[EMAIL SERVICE SUCCESS] Topup approval email sent to {recipient_email} via Port 465 SSL")
                return {"status": "SUCCESS", "delivered": True, "recipient": recipient_email}
            except Exception as ex465:
                logger.error(f"[EMAIL SERVICE ERROR] Failed to send topup approval email to {recipient_email}: {ex465}")
                return {"status": "FAILED", "delivered": False, "detail": str(ex465)}

    async def send_topup_approval_email(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Async wrapper for dispatching topup approval email."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.send_topup_approval_email_sync, payload)

email_service = EmailService()
