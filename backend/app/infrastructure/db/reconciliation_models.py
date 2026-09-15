import uuid
from datetime import datetime, timezone, date
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlalchemy import (
    String, Integer, BigInteger, Numeric, Boolean, DateTime, Date,
    ForeignKey, Text, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TxnReconciliationBatchModel(Base):
    """
    Authoritative reconciliation batch record.
    Represents an uploaded vendor report and holds consolidated KPIs & financial breakdown.
    """
    __tablename__ = "txn_reconciliation_batch"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    batch_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vendor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    service_name: Mapped[str] = mapped_column(String(50), nullable=False, default="ALL", index=True)
    report_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    file_b2_storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    file_b2_url: Mapped[str] = mapped_column(Text, nullable=False)
    column_mapping: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="UPLOADED", nullable=False, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dynamic KPI Metrics
    total_vendor_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_internal_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    matched_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    amount_mismatch_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status_mismatch_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_in_internal_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_in_vendor_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_vendor_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_vendor_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pending_review_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Financial Breakdown
    vendor_total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    internal_total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    matched_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    amount_difference: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    vendor_success_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    vendor_failed_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    vendor_pending_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    internal_success_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    internal_failed_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    internal_pending_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)

    # Governance & Metadata
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8"), nullable=False)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    uploaded_by: Mapped[str] = mapped_column(String(100), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    staging_rows: Mapped[List["TxnReconciliationStagingModel"]] = relationship("TxnReconciliationStagingModel", back_populates="batch", cascade="all, delete-orphan")
    results: Mapped[List["TxnReconciliationResultModel"]] = relationship("TxnReconciliationResultModel", back_populates="batch", cascade="all, delete-orphan")
    audits: Mapped[List["TxnReconciliationAuditModel"]] = relationship("TxnReconciliationAuditModel", back_populates="batch", cascade="all, delete-orphan")


class TxnReconciliationStagingModel(Base):
    """
    Staging table for raw vendor transaction rows parsed from the uploaded file.
    """
    __tablename__ = "txn_reconciliation_staging"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("txn_reconciliation_batch.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    vendor_txn_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    normalized_status: Mapped[str] = mapped_column(String(30), nullable=False)
    utr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    service: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    retailer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    transaction_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), default="INR", nullable=True)
    response_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    response_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    validation_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    batch: Mapped["TxnReconciliationBatchModel"] = relationship("TxnReconciliationBatchModel", back_populates="staging_rows")


class TxnReconciliationResultModel(Base):
    """
    Consolidated two-way reconciliation output row.
    """
    __tablename__ = "txn_reconciliation_result"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    batch_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("txn_reconciliation_batch.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    recon_status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # Vendor fields
    vendor_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    vendor_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vendor_utr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor_txn_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor_service: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vendor_retailer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    vendor_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    # Internal fields
    internal_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    internal_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    internal_utr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    internal_ref_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    internal_service: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    internal_retailer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    internal_retailer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    internal_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    internal_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    # Variances & Discrepancies
    amount_difference: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    is_exception: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    exception_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mismatch_details: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    recommended_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Manual Review
    review_status: Mapped[str] = mapped_column(String(30), default="PENDING_REVIEW", nullable=False, index=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    batch: Mapped["TxnReconciliationBatchModel"] = relationship("TxnReconciliationBatchModel", back_populates="results")


class TxnVendorColumnConfigModel(Base):
    """
    Known vendor column header mapping and status normalization configuration.
    """
    __tablename__ = "txn_vendor_column_config"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    service_name: Mapped[str] = mapped_column(String(50), default="ALL", nullable=False)
    column_mapping: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    status_mapping: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class TxnReconciliationAuditModel(Base):
    """
    Audit log of reconciliation batch operations and admin manual review notes.
    """
    __tablename__ = "txn_reconciliation_audit"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("txn_reconciliation_batch.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    admin_id: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    previous_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    batch: Mapped["TxnReconciliationBatchModel"] = relationship("TxnReconciliationBatchModel", back_populates="audits")
