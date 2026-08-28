"""
Payout Slab Database Model.

Enterprise data model for Payout Slabs and Financial Configurations.
Supports multi-slab tiering, tenant/company isolation, immutable versioning,
financial NUMERIC types, and full audit logging.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, Base


class PayoutSlabModel(BaseEntity, EnterpriseBaseMixin):
    """
    Payout Slab Configuration Table.
    Defines fee, commission, GST, TDS, vendor, and company charge tiers per transaction range.
    """
    __tablename__ = "payout_slab"
    __table_args__ = (
        Index("idx_payout_slab_tenant", "tenant_id"),
        Index("idx_payout_slab_company", "company_id"),
        Index("idx_payout_slab_service", "service_code"),
        Index("idx_payout_slab_range", "min_amount", "max_amount"),
        Index("idx_payout_slab_status", "is_active", "is_deleted"),
        Index("idx_payout_slab_effective", "effective_from", "effective_to"),
        {"extend_existing": True}
    )

    # Service & Category Scope
    service_code: Mapped[str] = mapped_column(String(50), nullable=False, default="PAYOUT", index=True)
    slab_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Monetary Amount Range (DECIMAL / NUMERIC for financial safety)
    min_amount: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    max_amount: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)

    # Commission (Retailer / Partner)
    commission: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0.0)
    commission_type: Mapped[str] = mapped_column(String(20), nullable=False, default="FIXED")  # FIXED, PERCENTAGE

    # GST on Commission / Transaction
    gst: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0.0)
    gst_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE")  # FIXED, PERCENTAGE

    # Vendor Charge
    vendor_charge: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0.0)
    vendor_charge_type: Mapped[str] = mapped_column(String(20), nullable=False, default="FIXED")  # FIXED, PERCENTAGE

    # Company Charges / Convenience Fee
    company_charges: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0.0)
    company_charges_type: Mapped[str] = mapped_column(String(20), nullable=False, default="FIXED")  # FIXED, PERCENTAGE

    # Company GST
    company_gst: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0.0)
    company_gst_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE")  # FIXED, PERCENTAGE

    # TDS
    tds: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0.0)
    tds_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE")  # FIXED, PERCENTAGE

    # Other Charges
    other_charges: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0.0)
    other_charges_type: Mapped[str] = mapped_column(String(20), nullable=False, default="FIXED")  # FIXED, PERCENTAGE

    # Currency
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")

    # Effective Date Range
    effective_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Soft Delete & Versioning
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Audit Trail Relationship
    audit_logs: Mapped[List["PayoutSlabAuditModel"]] = relationship(
        "PayoutSlabAuditModel",
        back_populates="payout_slab",
        cascade="all, delete-orphan",
        order_by="desc(PayoutSlabAuditModel.changed_at)"
    )


class PayoutSlabAuditModel(BaseEntity):
    """
    Payout Slab Audit History Table.
    Captures all configuration creations, modifications, activations, and deactivations.
    """
    __tablename__ = "payout_slab_audit"
    __table_args__ = (
        Index("idx_payout_slab_audit_slab", "payout_slab_id"),
        Index("idx_payout_slab_audit_tenant", "tenant_id"),
        Index("idx_payout_slab_audit_company", "company_id"),
        Index("idx_payout_slab_audit_changed_at", "changed_at"),
        {"extend_existing": True}
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    payout_slab_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payout_slab.public_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    action: Mapped[str] = mapped_column(String(50), nullable=False)  # CREATE, UPDATE, ACTIVATE, DEACTIVATE, EXPIRE
    old_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    changed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship back to PayoutSlabModel
    payout_slab: Mapped["PayoutSlabModel"] = relationship("PayoutSlabModel", back_populates="audit_logs")
