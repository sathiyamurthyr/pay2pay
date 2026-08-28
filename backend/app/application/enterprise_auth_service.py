import uuid
import random
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import select, update, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.auth_models import (
    AuthUserModel, LoginHistoryModel, TrustedDeviceModel, DeviceRegistryModel,
    DeviceFingerprintModel, DeviceSessionModel, SecurityEventModel, AuditLoginModel,
    AuditActivityModel, OtpTransactionModel, FailedLoginAttemptModel, RiskAssessmentModel,
    BrowserRegistryModel, LocationHistoryModel
)

import logging
logger = logging.getLogger("enterprise_auth_service")

DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

class EnterpriseAuthService:

    @staticmethod
    def generate_captcha() -> Dict[str, str]:
        """Generates a random 6-character Captcha string and token."""
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        code = "".join(random.choices(chars, k=6))
        captcha_token = str(uuid.uuid4())
        return {
            "captcha_token": captcha_token,
            "captcha_code": code,
            "captcha_svg": f"<svg width='120' height='40' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='#F1F5F9'/><text x='15' y='28' font-family='monospace' font-size='22' font-weight='900' fill='#0F172A' letter-spacing='4'>{code}</text></svg>"
        }

    @staticmethod
    async def evaluate_risk(
        db: AsyncSession,
        mobile_number: str,
        public_ip: str,
        device_fingerprint: str,
        vpn_detected: bool = False,
        proxy_detected: bool = False,
        tor_detected: bool = False,
        location: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Calculates risk score (0-100) and returns recommended action."""
        score = 0
        risk_factors = []

        if tor_detected:
            score += 60
            risk_factors.append("TOR Exit Node Detected")
        elif vpn_detected or proxy_detected:
            score += 35
            risk_factors.append("VPN / Proxy Connection Detected")

        t_stmt = select(TrustedDeviceModel).where(
            TrustedDeviceModel.device_fingerprint == device_fingerprint,
            TrustedDeviceModel.is_active == True,
            TrustedDeviceModel.expires_at > datetime.now(timezone.utc)
        )
        trusted = (await db.execute(t_stmt)).scalars().first()
        if not trusted:
            score += 20
            risk_factors.append("Unrecognized Device Fingerprint")

        f_stmt = select(FailedLoginAttemptModel).where(
            FailedLoginAttemptModel.mobile_number == mobile_number
        )
        failed_attempt = (await db.execute(f_stmt)).scalars().first()
        if failed_attempt and failed_attempt.failed_count >= 3:
            score += 30
            risk_factors.append(f"Multiple Failed Login Attempts ({failed_attempt.failed_count})")

        if location and location.get("country") and location.get("country") != "India":
            score += 25
            risk_factors.append(f"International Login Location ({location.get('country')})")

        if score >= 75:
            risk_level = "CRITICAL"
            action = "BLOCK"
        elif score >= 50:
            risk_level = "HIGH"
            action = "REQUIRE_MFA"
        elif score >= 25:
            risk_level = "MEDIUM"
            action = "OTP_VERIFICATION"
        else:
            risk_level = "LOW"
            action = "ALLOW"

        assessment_id = f"RISK-{uuid.uuid4().hex[:12].upper()}"
        risk_record = RiskAssessmentModel(
            tenant_id=DEFAULT_TENANT_ID,
            assessment_id=assessment_id,
            score=min(100, score),
            risk_level=risk_level,
            recommended_action=action,
            risk_factors={"factors": risk_factors, "vpn": vpn_detected, "proxy": proxy_detected, "tor": tor_detected}
        )
        db.add(risk_record)
        await db.commit()

        return {
            "assessment_id": assessment_id,
            "risk_score": min(100, score),
            "risk_level": risk_level,
            "recommended_action": action,
            "risk_factors": risk_factors
        }

    @staticmethod
    async def record_telemetry(
        db: AsyncSession,
        user_id: Optional[uuid.UUID],
        telemetry: Dict[str, Any]
    ) -> None:
        """Stores client hardware, network, browser & fingerprint telemetry silently."""
        try:
            fp = telemetry.get("fingerprint", {})
            fp_hash = fp.get("hash") or hashlib.sha256(str(telemetry).encode('utf-8')).hexdigest()

            fp_stmt = select(DeviceFingerprintModel).where(DeviceFingerprintModel.fingerprint_hash == fp_hash)
            existing_fp = (await db.execute(fp_stmt)).scalars().first()
            if not existing_fp:
                new_fp = DeviceFingerprintModel(
                    tenant_id=DEFAULT_TENANT_ID,
                    fingerprint_hash=fp_hash,
                    ip_address=telemetry.get("network", {}).get("ip") or "127.0.0.1",
                    canvas_hash=fp.get("canvas"),
                    webgl_hash=fp.get("webgl"),
                    audio_hash=fp.get("audio"),
                    fonts_hash=fp.get("fonts"),
                    screen_geometry=telemetry.get("display", {}).get("geometry"),
                    timezone=telemetry.get("location", {}).get("timezone"),
                    language=telemetry.get("browser", {}).get("language")
                )
                db.add(new_fp)

            dev_id = telemetry.get("device", {}).get("id") or f"DEV-{fp_hash[:16]}"
            dev_stmt = select(DeviceRegistryModel).where(DeviceRegistryModel.device_id == dev_id)
            existing_dev = (await db.execute(dev_stmt)).scalars().first()
            if not existing_dev:
                new_dev = DeviceRegistryModel(
                    tenant_id=DEFAULT_TENANT_ID,
                    device_id=dev_id,
                    user_id=user_id,
                    device_type=telemetry.get("device", {}).get("type", "DESKTOP"),
                    manufacturer=telemetry.get("device", {}).get("manufacturer"),
                    model=telemetry.get("device", {}).get("model"),
                    os_name=telemetry.get("device", {}).get("os_name"),
                    os_version=telemetry.get("device", {}).get("os_version"),
                    cpu_cores=telemetry.get("device", {}).get("cpu_cores"),
                    ram_gb=telemetry.get("device", {}).get("ram_gb"),
                    touch_support=telemetry.get("device", {}).get("touch_support", False),
                    webauthn_support=telemetry.get("device", {}).get("webauthn_support", False)
                )
                db.add(new_dev)

            await db.commit()
        except Exception as e:
            logger.warning(f"Telemetry recording notice: {e}")

    @staticmethod
    async def create_audit_entry(
        db: AsyncSession,
        user_id: Optional[uuid.UUID],
        session_id: str,
        ip_address: str,
        user_agent: str,
        status: str,
        details: Dict[str, Any]
    ) -> None:
        """Writes audit entry to audit_login table."""
        audit = AuditLoginModel(
            tenant_id=DEFAULT_TENANT_ID,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=details
        )
        db.add(audit)
        await db.commit()

    @staticmethod
    async def check_lockout(db: AsyncSession, mobile_number: str) -> Dict[str, Any]:
        """Checks if account is currently locked due to >= 5 failed login attempts in past 30 minutes."""
        now = datetime.now(timezone.utc)
        stmt = select(FailedLoginAttemptModel).where(FailedLoginAttemptModel.mobile_number == mobile_number)
        record = (await db.execute(stmt)).scalars().first()

        if not record:
            return {"is_locked": False, "failed_count": 0, "remaining_seconds": 0}

        if record.failed_count >= 5:
            elapsed = (now - record.last_failed_at).total_seconds()
            lock_duration = 1800  # 30 minutes
            if elapsed < lock_duration:
                remaining_seconds = int(lock_duration - elapsed)
                return {
                    "is_locked": True,
                    "failed_count": record.failed_count,
                    "remaining_seconds": remaining_seconds,
                    "remaining_minutes": max(1, int(remaining_seconds / 60))
                }
            else:
                record.failed_count = 0
                await db.commit()

        return {"is_locked": False, "failed_count": record.failed_count, "remaining_seconds": 0}

    @staticmethod
    async def record_failed_attempt(db: AsyncSession, mobile_number: str, ip_address: str) -> Dict[str, Any]:
        """Increments failed attempt counter for mobile_number and checks 30-min block threshold."""
        now = datetime.now(timezone.utc)
        stmt = select(FailedLoginAttemptModel).where(FailedLoginAttemptModel.mobile_number == mobile_number)
        record = (await db.execute(stmt)).scalars().first()

        if not record:
            record = FailedLoginAttemptModel(
                tenant_id=DEFAULT_TENANT_ID,
                mobile_number=mobile_number,
                ip_address=ip_address,
                failed_count=1,
                last_failed_at=now
            )
            db.add(record)
        else:
            elapsed = (now - record.last_failed_at).total_seconds()
            if elapsed > 1800:
                record.failed_count = 1
            else:
                record.failed_count += 1
            record.last_failed_at = now
            record.ip_address = ip_address

        await db.commit()

        is_locked = record.failed_count >= 5
        remaining_seconds = 1800 if is_locked else 0
        return {
            "failed_count": record.failed_count,
            "attempts_remaining": max(0, 5 - record.failed_count),
            "is_locked": is_locked,
            "remaining_seconds": remaining_seconds,
            "remaining_minutes": int(remaining_seconds / 60)
        }

    @staticmethod
    async def reset_failed_attempts(db: AsyncSession, mobile_number: str) -> None:
        """Resets failed attempts count upon successful login."""
        stmt = select(FailedLoginAttemptModel).where(FailedLoginAttemptModel.mobile_number == mobile_number)
        record = (await db.execute(stmt)).scalars().first()
        if record:
            record.failed_count = 0
            await db.commit()
