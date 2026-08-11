import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, Float, DateTime, Text, JSON, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class ErrorMasterModel(Base):
    __tablename__ = "error_master"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)

    internal_error_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vendor_name: Mapped[str] = mapped_column(String(50), nullable=False, default="GLOBAL", index=True)
    vendor_error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor_http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vendor_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer_message: Mapped[str] = mapped_column(Text, nullable=False)
    retailer_message: Mapped[str] = mapped_column(Text, nullable=False)
    admin_message: Mapped[str] = mapped_column(Text, nullable=False)

    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="MEDIUM")
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="PAYOUT")

    retry_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    rollback_required: Mapped[bool] = mapped_column(Boolean, default=True)
    notification_required: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class VendorApiLogModel(Base):
    __tablename__ = "vendor_api_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)

    vendor_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vendor_url: Mapped[str] = mapped_column(String(500), nullable=False)
    http_method: Mapped[str] = mapped_column(String(10), nullable=False, default="POST")

    headers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    request_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    response_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    http_status: Mapped[int] = mapped_column(Integer, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trace_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    environment: Mapped[str] = mapped_column(String(20), nullable=False, default="production")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )


class TransactionErrorModel(Base):
    __tablename__ = "transaction_error"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)

    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    internal_error_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    friendly_message: Mapped[str] = mapped_column(Text, nullable=False)

    vendor_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    rollback_status: Mapped[str] = mapped_column(String(30), nullable=False, default="NONE")
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
