"""
Retailer Credit Card Management ORM Models & Audit Log.

Follows enterprise database conventions:
- `ref_id BIGINT AUTO_INCREMENT PRIMARY KEY` on every new table
- Concise column names (`card_name`, `mobile_no`, `card_type`, `bank_id`, `bill_gen_day`, `bill_due_day`)
- Strict multi-tenant ownership (`tenant_id`, `company_ref_id`, `retailer_ref_id`, `user_type_ref_id`, `user_ref_id`)
- PCI-safe storage (`card_fingerprint` HMAC-SHA256, `masked_card_no`, `card_last4`, `card_bin6` — never plaintext PAN or CVV)
- Database-level unique constraint on `(company_ref_id, retailer_ref_id, card_fingerprint)`
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RetailerCreditCardModel(Base):
    __tablename__ = "retailer_credit_cards"
    __table_args__ = (
        UniqueConstraint(
            "company_ref_id",
            "retailer_ref_id",
            "card_fingerprint",
            name="uq_retailer_credit_cards_scope_fingerprint",
        ),
        Index(
            "ix_retailer_credit_cards_scope",
            "company_ref_id",
            "retailer_ref_id",
            "is_deleted",
        ),
        {"extend_existing": True},
    )

    ref_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True,
    )

    # Mandatory tenant & retailer ownership (resolved strictly server-side)
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    company_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    retailer_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_type_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, default=2)
    user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)

    # Concise cardholder & masked card metadata (never store raw PAN or CVV)
    card_name: Mapped[str] = mapped_column(String(150), nullable=False)
    mobile_no: Mapped[str] = mapped_column(String(15), nullable=False)
    card_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    masked_card_no: Mapped[str] = mapped_column(String(32), nullable=False)
    card_last4: Mapped[str] = mapped_column(String(4), nullable=False)
    card_bin6: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)

    # Card Type ("Credit Card")
    card_type_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    card_type: Mapped[str] = mapped_column(String(100), nullable=False, default="Credit Card")

    # Bank reference (links to bank_master when selected)
    bank_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    bank_short_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Billing cycle days of month (1..31)
    bill_gen_day: Mapped[int] = mapped_column(Integer, nullable=False)
    bill_due_day: Mapped[int] = mapped_column(Integer, nullable=False)
    last_paid_cycle: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # e.g. "2026-11"

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class RetailerCardAuditLogModel(Base):
    __tablename__ = "retailer_card_audit_logs"
    __table_args__ = (
        Index("ix_retailer_card_audit_scope", "company_ref_id", "retailer_ref_id", "created_at"),
        {"extend_existing": True},
    )

    ref_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    card_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("retailer_credit_cards.ref_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    company_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    retailer_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_type_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, default=2)
    user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    action: Mapped[str] = mapped_column(String(30), nullable=False)  # CREATE, UPDATE, DELETE, MARK_PAID
    masked_card_no: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    details_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
