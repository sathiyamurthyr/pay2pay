"""
Enterprise Account Migration History Database Model.

Additive schema strictly following Pay2Pay enterprise standards:
- First column MUST be <table_name>_ref_id BIGINT AUTO_INCREMENT PRIMARY KEY
- Audit trail for admin-only account migrations (Retailer -> Distributor, Distributor -> Super Distributor)
- Records source and destination account references, admin identity, contact info, KYC linkage,
  opening balance (INR 0.00), automatic approval, and timestamps.
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


class AccountMigrationHistoryModel(Base):
    """
    Dedicated Account Migration History and Audit Trail Table.

    Columns:
    - account_migration_history_ref_id: BIGINT AUTO_INCREMENT PK (project convention)
    - migration_reference_no: Unique migration tracking code (e.g., MIG-20261017-XXXXXX)
    - migration_type: RETAILER_TO_DISTRIBUTOR | DISTRIBUTOR_TO_SUPER_DISTRIBUTOR
    - source_account_ref_id: BIGINT NOT NULL (original retailer or distributor ref_id)
    - source_account_id: UUID NOT NULL (original public_id)
    - source_account_code: VARCHAR(50) NOT NULL (e.g. RET-..., P2P-R..., DIST-...)
    - source_role: VARCHAR(50) NOT NULL (RETAILER | DISTRIBUTOR)
    - destination_account_ref_id: BIGINT NULL (newly created distributor or super distributor ref_id)
    - destination_account_id: UUID NULL (newly created public_id)
    - destination_account_code: VARCHAR(50) NULL (e.g. P2P-D..., P2P-SD...)
    - destination_role: VARCHAR(50) NOT NULL (DISTRIBUTOR | SUPER_DISTRIBUTOR)
    - admin_user_ref_id: BIGINT NULL (admin user id if available)
    - admin_user_id: UUID NOT NULL (admin user public_id)
    - admin_username: VARCHAR(100) NOT NULL (admin identity performing the migration)
    - destination_mobile: VARCHAR(20) NOT NULL (new destination mobile number)
    - destination_email: VARCHAR(255) NOT NULL (new destination email address)
    - kyc_reference: VARCHAR(255) NULL (e.g., PAN / source KYC linkage reference)
    - status: VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' (COMPLETED | FAILED | IN_PROGRESS)
    - auto_approval_status: VARCHAR(30) NOT NULL DEFAULT 'APPROVED'
    - opening_balance: NUMERIC(18, 2) NOT NULL DEFAULT 0.00 (strictly 0.00)
    - failure_reason: TEXT NULL (error details if failed)
    - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
    - completed_at: TIMESTAMPTZ NULL
    - tenant_id: UUID NOT NULL
    - company_id: UUID NOT NULL
    - metadata_json: JSONB NULL (audit metadata snapshot without sensitive credentials)
    """
    __tablename__ = "account_migration_history"
    __table_args__ = (
        UniqueConstraint("migration_reference_no", name="uq_migration_ref_no"),
        Index("idx_mig_source", "source_account_ref_id", "source_role"),
        Index("idx_mig_dest", "destination_account_ref_id", "destination_role"),
        Index("idx_mig_tenant_comp", "tenant_id", "company_id"),
        Index("idx_mig_dest_mobile", "destination_mobile"),
        Index("idx_mig_dest_email", "destination_email"),
        {"extend_existing": True}
    )

    account_migration_history_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    migration_reference_no: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    migration_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_account_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    source_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_account_code: Mapped[str] = mapped_column(String(50), nullable=False)
    source_role: Mapped[str] = mapped_column(String(50), nullable=False)
    destination_account_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    destination_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    destination_account_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    destination_role: Mapped[str] = mapped_column(String(50), nullable=False)
    admin_user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    admin_username: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    destination_email: Mapped[str] = mapped_column(String(255), nullable=False)
    kyc_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="COMPLETED")
    auto_approval_status: Mapped[str] = mapped_column(String(30), nullable=False, default="APPROVED")
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
