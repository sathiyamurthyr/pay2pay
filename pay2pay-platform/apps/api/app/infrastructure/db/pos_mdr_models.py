"""
POS Payment Modes & Dynamic MDR Configuration Models.

Supports:
- Dynamic payment mode registry (POS - Instant, POS+T1, POS+T2)
- Retailer-specific and Default MDR configurations
- FIXED and PERCENTAGE MDR calculations
- Dynamic GST rate on MDR
- Effective date intervals and active status tracking
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import (
    String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, Base


class PosPaymentModeConfigModel(BaseEntity, EnterpriseBaseMixin):
    """
    Registry of allowed POS Payment Modes.
    Active allowed modes: POS - Instant, POS+T1, POS+T2.
    """
    __tablename__ = "pos_payment_mode_config"
    __table_args__ = (
        Index("idx_pos_pm_code", "code"),
        Index("idx_pos_pm_order", "display_order"),
        Index("idx_pos_pm_active", "is_active", "is_deleted"),
        {"extend_existing": True}
    )

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    settlement_type: Mapped[str] = mapped_column(String(50), nullable=False, default="INSTANT") # INSTANT, T1, T2
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PosMdrConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    """
    Enterprise Dynamic MDR Configuration Table.
    Priority Resolution:
    1. Retailer-Specific MDR (retailer_id == specific_retailer_uuid)
    2. Default MDR (retailer_id IS NULL)
    3. If neither exists -> Configuration error.
    """
    __tablename__ = "pos_mdr_configuration"
    __table_args__ = (
        Index("idx_pos_mdr_retailer", "retailer_id"),
        Index("idx_pos_mdr_pm", "payment_mode"),
        Index("idx_pos_mdr_active", "is_active", "is_deleted"),
        Index("idx_pos_mdr_dates", "effective_from", "effective_to"),
        Index("idx_pos_mdr_tenant_comp", "tenant_id", "company_id"),
        {"extend_existing": True}
    )

    # Scoping Identifiers
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True) # NULL represents Default MDR

    # Payment Mode & MDR Rules
    payment_mode: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # POS - Instant, POS+T1, POS+T2
    mdr: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False) # Rate value, e.g. 0.5000 or 50.00
    mdr_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE") # PERCENTAGE, FIXED
    gst_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.00) # GST percentage on MDR charge (default 0.00)

    # Effective Date Range
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Status & Audit
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
