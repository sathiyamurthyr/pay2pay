"""
Enterprise Unisus Pay Integration Database Models.
Module: QR Code Management, Partner Payment Requests, and Webhook Telemetry.
Strictly scoped to SATHUS Company and authorized Super Distributors, Distributors, and Retailers.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import (
    String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey, Index, BigInteger, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, Base


# Default Sathus Company Details
SATHUS_COMPANY_ID = uuid.UUID("0bf4371b-4c74-4916-a817-61c203b353e8")
SATHUS_COMPANY_REF_ID = 2
DEFAULT_TENANT_ID = uuid.UUID("fa480c2d-2725-43bd-a7ba-6fc60a89a1cb")


class UnisusPayQrCodeModel(Base):
    """
    Locally cached QR codes delivered by Unisus Pay via webhook (QR_CALLBACK)
    or manual fallback fetch (/api/apiclient/qr-code).
    Replaced whenever a fresh QR list is received.
    """
    __tablename__ = "unisus_pay_qr_codes"
    __table_args__ = (
        Index("idx_unisus_qr_id", "qr_id", unique=True),
        Index("idx_unisus_qr_company", "company_id"),
        Index("idx_unisus_qr_active", "is_active"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=DEFAULT_TENANT_ID, nullable=False, index=True)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=SATHUS_COMPANY_ID, nullable=False, index=True)

    qr_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Primary Collection QR")
    qr_image_base64: Mapped[str] = mapped_column(Text, nullable=False)
    is_default_qr: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unisus_user_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class UnisusPayPaymentRequestModel(Base):
    """
    Tracks payment requests submitted to Unisus Pay (/api/apiclient/payment-request)
    and status callbacks received (/api/v1/unisus/webhook with event PAYMENT_REQUEST_STATUS).
    """
    __tablename__ = "unisus_pay_payment_requests"
    __table_args__ = (
        Index("idx_unisus_pr_ref", "reference_no", unique=True),
        Index("idx_unisus_pr_topup_id", "topup_request_id"),
        Index("idx_unisus_pr_status", "status"),
        Index("idx_unisus_pr_company", "company_id"),
        Index("idx_unisus_pr_user", "user_id"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=DEFAULT_TENANT_ID, nullable=False, index=True)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=SATHUS_COMPANY_ID, nullable=False, index=True)

    # Internal links
    topup_request_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    user_type: Mapped[str] = mapped_column(String(50), nullable=False, default="RETAILER") # RETAILER, DISTRIBUTOR, SUPER_DISTRIBUTOR
    user_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    # Unisus Pay fields
    unisus_payment_request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True) # e.g. PR0001234
    unisus_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # e.g. _id in response
    reference_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True) # UTR or Bank Ref
    qr_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING", index=True) # PENDING, SUCCESS, FAIL
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    receipt_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_remark: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    raw_response: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    raw_callback: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    callback_received_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class UnisusPayConfigModel(Base):
    """
    Configuration and session state storage for Unisus Pay partner API.
    Maintains cached bearer token to prevent unneeded login calls.
    """
    __tablename__ = "unisus_pay_config"
    __table_args__ = (
        Index("idx_unisus_cfg_service", "service_name", unique=True),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    service_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, default="UNISUSPAY")
    base_url: Mapped[str] = mapped_column(String(255), nullable=False, default="https://api.unisuspe.com/api/apiclient")
    email: Mapped[str] = mapped_column(String(255), nullable=False, default="admin@sathus.in")
    password: Mapped[str] = mapped_column(String(255), nullable=False, default="Sathus@1621")
    web_code: Mapped[str] = mapped_column(String(50), nullable=False, default="UNISUSPAY")

    cached_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    wallet_balance: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    last_balance_check_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_qr_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
