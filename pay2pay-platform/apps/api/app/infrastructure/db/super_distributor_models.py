"""
Enterprise Super Distributor (Master Distributor) Database Models.

Additive schema strictly following Pay2Pay enterprise standards:
- First column MUST be <table_name>_ref_id BIGINT PRIMARY KEY
- super_distributor_distributor: Explicit mapping table SD -> Distributor
- sd_wallet: Dedicated wallet table for Super Distributors
"""

import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Text, Boolean, Integer, BigInteger, Numeric, DateTime, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SuperDistributorDistributorMappingModel(Base):
    """
    Explicit Super Distributor to Distributor Mapping Table.

    Why this table is required:
    - distributor.super_distributor_ref_id is an implicit nullable FK with no status/audit.
    - This table provides ACTIVE/INACTIVE state, timestamps, and audit trail.
    - Enables strict authorization: SD can ONLY see distributors in this mapping.
    - Enables IDOR protection per distributor ref_id.

    Columns:
    - sd_distributor_ref_id: BIGINT AUTO_INCREMENT PK (project convention)
    - super_distributor_ref_id: FK to super_distributor.super_distributor_ref_id (NOT NULL)
    - distributor_ref_id: FK to distributor.distributor_ref_id (NOT NULL)
    - tenant_id: UUID (NOT NULL) — multi-tenant boundary
    - company_id: UUID (NOT NULL) — company boundary
    - status: VARCHAR(30) DEFAULT 'ACTIVE' (NOT NULL) — ACTIVE / INACTIVE
    - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
    - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
    - created_by: VARCHAR(255) NULL — audit actor email
    """
    __tablename__ = "super_distributor_distributor"
    __table_args__ = (
        UniqueConstraint(
            "super_distributor_ref_id", "distributor_ref_id",
            name="uq_sd_distributor_mapping"
        ),
        Index("idx_sd_dist_map_sd_ref_id", "super_distributor_ref_id"),
        Index("idx_sd_dist_map_dist_ref_id", "distributor_ref_id"),
        Index("idx_sd_dist_map_tenant", "tenant_id"),
        Index("idx_sd_dist_map_status", "status"),
        {"extend_existing": True}
    )

    sd_distributor_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    super_distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class SdWalletModel(Base):
    """
    Dedicated Super Distributor Wallet Table.

    Authoritative balance source of truth for Super Distributors.
    Mirrors dist_wallet pattern for Super Distributors.

    Columns:
    - sd_wallet_ref_id: BIGINT AUTO_INCREMENT PK
    - super_distributor_ref_id: BIGINT NOT NULL UNIQUE (one wallet per SD)
    - tenant_id: UUID NOT NULL
    - company_id: UUID NOT NULL
    - balance: NUMERIC(18,2) NOT NULL DEFAULT 0.00
    - currency: VARCHAR(10) NOT NULL DEFAULT 'INR'
    - status: VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    - is_active: BOOLEAN NOT NULL DEFAULT TRUE
    - is_frozen: BOOLEAN NOT NULL DEFAULT FALSE
    - freeze_reason: TEXT NULL
    - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
    - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
    """
    __tablename__ = "sd_wallet"
    __table_args__ = (
        UniqueConstraint("super_distributor_ref_id", name="uq_sd_wallet_super_distributor"),
        Index("idx_sd_wallet_sd_ref_id", "super_distributor_ref_id"),
        Index("idx_sd_wallet_tenant_comp", "tenant_id", "company_id"),
        {"extend_existing": True}
    )

    sd_wallet_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    super_distributor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_frozen: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    freeze_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
