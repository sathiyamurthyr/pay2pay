from sqlalchemy import BigInteger, DateTime, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Any, Optional

from app.domain.entities.base import Base


class DemoRecordModel(Base):
    """Single unified table (`demo`) for the INSPEL Vendor Product Sales & Payment Demo Portal.

    All demo entities (VENDOR, ORDER, PAYMENT, WEBHOOK, RECEIPT, AUDIT_LOG, CONTACT_ENQUIRY)
    are persisted in this single table without creating or mutating any other database tables.
    """

    __tablename__ = "demo"

    ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    record_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    record_code: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    vendor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    order_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    bankme_order_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="ACTIVE", index=True)
    amount: Mapped[Optional[float]] = mapped_column(Numeric(14, 2), nullable=True)
    data: Mapped[dict[str, Any]] = mapped_column(PG_JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_demo_type_vendor", "record_type", "vendor_ref_id"),
        Index("ix_demo_type_code", "record_type", "record_code"),
        Index("ix_demo_type_reference", "record_type", "reference_id"),
    )
