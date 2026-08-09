import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, Float
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class AuthUserModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "auth_users"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True, index=True, default=uuid.uuid4)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(250), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="RETAILER")
    account_status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)


class LoginHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "enterprise_login_history"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(100), nullable=False)
    request_id: Mapped[str] = mapped_column(String(100), nullable=False)
    login_method: Mapped[str] = mapped_column(String(50), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_level: Mapped[str] = mapped_column(String(30), nullable=False, default="LOW")
    public_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    private_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    device_fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    os_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    logged_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    logged_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class TrustedDeviceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "trusted_devices"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    device_fingerprint: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    device_name: Mapped[str] = mapped_column(String(150), nullable=False)
    trust_duration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class DeviceRegistryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "device_registry"
    __table_args__ = {"extend_existing": True}

    device_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False, default="DESKTOP")
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    os_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    os_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cpu_cores: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ram_gb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    touch_support: Mapped[bool] = mapped_column(Boolean, default=False)
    webauthn_support: Mapped[bool] = mapped_column(Boolean, default=False)


class DeviceFingerprintModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "device_fingerprint"
    __table_args__ = {"extend_existing": True}

    fingerprint_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    canvas_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    webgl_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    audio_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fonts_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    screen_geometry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class DeviceSessionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "device_sessions"
    __table_args__ = {"extend_existing": True}

    session_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(100), nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class SecurityEventModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "security_events"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(30), nullable=False, default="HIGH")
    public_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class AuditLoginModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "audit_login"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class AuditActivityModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "audit_activity"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(150), nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    http_status: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class OtpTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "otp_transactions"
    __table_args__ = {"extend_existing": True}

    otp_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    otp_code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(30), nullable=False, default="WHATSAPP")
    purpose: Mapped[str] = mapped_column(String(50), nullable=False, default="LOGIN")
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class FailedLoginAttemptModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "failed_login_attempts"
    __table_args__ = {"extend_existing": True}

    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_failed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class RiskAssessmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "risk_assessment"
    __table_args__ = {"extend_existing": True}

    assessment_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(30), nullable=False)
    recommended_action: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class BrowserRegistryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "browser_registry"
    __table_args__ = {"extend_existing": True}

    browser_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    browser_name: Mapped[str] = mapped_column(String(100), nullable=False)
    browser_version: Mapped[str] = mapped_column(String(50), nullable=False)
    engine: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[str] = mapped_column(Text, nullable=False)


class LocationHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "location_history"
    __table_args__ = {"extend_existing": True}

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
