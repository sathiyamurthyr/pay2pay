import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, String, Text, JSON
)
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, UUID
JSONB = JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin

class SessionAuditLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "session_audit_log"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # SESSION_LOCKED | TIMEOUT_WARNING | UNLOCK_SUCCESS | UNLOCK_FAILED | LOGOUT | SWITCH_USER
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    os_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class RetailerSecuritySettingsModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "retailer_security_settings"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    auto_lock_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    idle_timeout_minutes: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1, 2, 5, 10, 15, 30, 0 (Never)
    warning_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    lock_on_minimize: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    lock_on_sleep: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    biometric_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_failed_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
