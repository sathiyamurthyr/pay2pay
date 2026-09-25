"""
Enterprise UPI QR Vendor Configuration Models.
Module: UPI QR Vendor Management & MDR Configuration.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey, Index, BigInteger, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, Base


class UpiVendorConfigurationModel(Base):
    """
    Enterprise Dynamic UPI QR Vendor Configuration Table.
    Stores vendor details, Company MDR, Retailer MDR, B2 QR storage, UPI URI payload,
    Vendor Status (ACTIVE/INACTIVE), and QR Status (ENABLED/DISABLED).
    """
    __tablename__ = "upi_vendor_configuration"
    __table_args__ = (
        Index("idx_upi_vendor_company", "company_id"),
        Index("idx_upi_vendor_code", "vendor_code"),
        Index("idx_upi_vendor_status", "vendor_status"),
        Index("idx_upi_vendor_qr_status", "qr_status"),
        Index("idx_upi_vendor_upi_id", "upi_id"),
        Index("idx_upi_vendor_active", "is_active", "is_deleted"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    vendor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False)

    company_mdr: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0.0000)
    retailer_mdr: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0.0000)

    qr_image_url: Mapped[str] = mapped_column(Text, nullable=False)
    qr_image_storage_key: Mapped[str] = mapped_column(String(500), nullable=False)

    upi_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    payee_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    merchant_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    upi_uri: Mapped[str] = mapped_column(Text, nullable=False)
    qr_payload: Mapped[str] = mapped_column(Text, nullable=False)

    vendor_status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE") # ACTIVE, INACTIVE
    qr_status: Mapped[str] = mapped_column(String(20), nullable=False, default="ENABLED")     # ENABLED, DISABLED

    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    audits: Mapped[List["UpiVendorAuditModel"]] = relationship(
        "UpiVendorAuditModel", back_populates="vendor", cascade="all, delete-orphan", order_by="desc(UpiVendorAuditModel.created_at)"
    )


class UpiVendorAuditModel(Base):
    """
    Audit log tracking all changes to UPI Vendor Configurations.
    """
    __tablename__ = "upi_vendor_audit"
    __table_args__ = (
        Index("idx_upi_vendor_audit_vendor", "vendor_config_id"),
        Index("idx_upi_vendor_audit_created", "created_at"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vendor_config_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("upi_vendor_configuration.id", ondelete="CASCADE"), nullable=False)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    admin_id: Mapped[str] = mapped_column(String(255), nullable=False)

    action: Mapped[str] = mapped_column(String(50), nullable=False) # CREATE, UPDATE, MDR_UPDATE, STATUS_TOGGLE, QR_STATUS_TOGGLE, QR_CHANGED
    field_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vendor: Mapped["UpiVendorConfigurationModel"] = relationship("UpiVendorConfigurationModel", back_populates="audits")
