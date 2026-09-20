"""
Enterprise Distributor Database Models.

Additive schema strictly following Pay2Pay enterprise standards:
- First column MUST be <table_name>_ref_id BIGINT PRIMARY KEY
- dist_wallet: Dedicated wallet table for Distributors
- distributor_retailer: Mapping table between Distributor and Retailers
- distributor_mdr: Retailer-specific MDR rates configured by Distributor
- distributor_invitations: Secure retailer onboarding invitation tracking
"""

import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import (
    String, Text, Boolean, Integer, BigInteger, Numeric, DateTime, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DistWalletModel(Base):
    """
    Dedicated Distributor Wallet Table.
    Authoritative balance source of truth. Default balance: 0.00.
    """
    __tablename__ = "dist_wallet"
    __table_args__ = (
        UniqueConstraint("distributor_ref_id", name="uq_dist_wallet_distributor"),
        Index("idx_dist_wallet_distributor_ref_id", "distributor_ref_id"),
        Index("idx_dist_wallet_tenant_comp", "tenant_id", "company_id"),
        {"extend_existing": True}
    )

    dist_wallet_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_frozen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    freeze_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DistributorRetailerMappingModel(Base):
    """
    Distributor to Retailer Mapping Table.
    Ownership relationship: distributor_ref_id -> retailer_ref_id.
    """
    __tablename__ = "distributor_retailer"
    __table_args__ = (
        UniqueConstraint("distributor_ref_id", "retailer_ref_id", name="uq_distributor_retailer"),
        Index("idx_dist_ret_distributor_ref_id", "distributor_ref_id"),
        Index("idx_dist_ret_retailer_ref_id", "retailer_ref_id"),
        {"extend_existing": True}
    )

    distributor_retailer_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    retailer_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DistributorMdrModel(Base):
    """
    Distributor Retailer-Specific MDR Configuration.
    Distributor can configure MDR ONLY for retailers mapped to that distributor.
    """
    __tablename__ = "distributor_mdr"
    __table_args__ = (
        UniqueConstraint("distributor_ref_id", "retailer_ref_id", "service_name", "payment_mode", name="uq_distributor_mdr"),
        Index("idx_dist_mdr_dist_ret", "distributor_ref_id", "retailer_ref_id"),
        {"extend_existing": True}
    )

    distributor_mdr_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    retailer_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(50), nullable=False, default="POS_TOPUP")
    payment_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    card_type_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    mdr: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    mdr_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE")
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("18.00"))
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    company_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SuperDistributorMdrModel(Base):
    """
    Super Distributor Retailer-Specific MDR Configuration.
    First column MUST be super_distributor_mdr_ref_id BIGINT AUTO_INCREMENT PRIMARY KEY.
    Super Distributor can configure MDR ONLY for retailers within its authorized downstream hierarchy.
    """
    __tablename__ = "super_distributor_mdr"
    __table_args__ = (
        UniqueConstraint("super_distributor_ref_id", "retailer_ref_id", "service_name", "payment_mode", name="uq_super_distributor_mdr"),
        Index("idx_sd_mdr_sd_ret", "super_distributor_ref_id", "retailer_ref_id"),
        Index("idx_sd_mdr_card_type", "card_type_ref_id"),
        {"extend_existing": True}
    )

    super_distributor_mdr_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    super_distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    retailer_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(50), nullable=False, default="POS_TOPUP")
    payment_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    card_type_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    mdr: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    mdr_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE")
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("18.00"))
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    company_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DistributorInvitationModel(Base):
    """
    Distributor Retailer Invitation Tracking.
    Tracks invited retailer mobile, unique invite code, and status.
    """
    __tablename__ = "distributor_invitations"
    __table_args__ = (
        Index("idx_dist_invite_code", "invite_code"),
        Index("idx_dist_invite_mobile", "retailer_mobile"),
        Index("idx_dist_invite_distributor", "distributor_ref_id"),
        {"extend_existing": True}
    )

    distributor_invitations_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    invite_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    retailer_mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    retailer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    retailer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
