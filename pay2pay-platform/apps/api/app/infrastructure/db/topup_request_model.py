"""
Topup Request Database Model.

Enterprise data model for Retailer Topup Requests with payment slip proof,
Admin verification, atomic wallet credit, and double-entry ledger integration.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, Numeric, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, Base


class TopupRequestModel(BaseEntity, EnterpriseBaseMixin):
    """
    Retailer Topup Request Table.
    Captures end-to-end lifecycle of wallet topup requests from submission to approval.
    """
    __tablename__ = "topup_requests"
    __table_args__ = (
        Index("idx_topup_req_id", "topup_request_id"),
        Index("idx_topup_retailer", "retailer_id"),
        Index("idx_topup_wallet", "wallet_id"),
        Index("idx_topup_status", "status"),
        Index("idx_topup_payment_ref", "payment_reference"),
        Index("idx_topup_submitted_at", "submitted_at"),
        Index("idx_topup_created_date", "created_date"),
        {"extend_existing": True}
    )

    # Core Identifiers
    topup_request_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("retailer.public_id", ondelete="CASCADE"), nullable=False, index=True)
    wallet_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    # Financial Amounts & POS MDR Snapshot
    requested_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    approved_amount: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    mdr_charge: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    gst_amount: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    charges: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    received_amount: Mapped[Optional[float]] = mapped_column(Numeric(18, 2), nullable=True)
    mdr_config_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    # Payment Proof & Reference
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True) # UTR or Bank Ref #
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="UPI")   # UPI, IMPS, NEFT, RTGS, CASH_DEPOSIT, BANK_TRANSFER
    payment_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Slip Storage Metadata
    slip_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    slip_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    slip_storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    slip_original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    slip_mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    slip_file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    slip_checksum: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Lifecycle Status
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING", index=True) # PENDING, UNDER_REVIEW, APPROVED, REJECTED, CANCELLED
    retailer_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps & Actors
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Linked Transaction
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    # Additional Telemetry & Context
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
