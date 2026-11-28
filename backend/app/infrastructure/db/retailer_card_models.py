"""
Retailer Credit Card Management ORM Model.

Stores saved credit cards per authenticated Retailer & Company/Tenant with:
- Strict multi-tenant isolation (`company_ref_id`, `retailer_ref_id`, `user_ref_id`)
- PCI-safe storage (HMAC-SHA256 `card_number_hash`, `masked_card_number`, `card_last4`, `card_bin6` — never plaintext PAN)
- Database-level uniqueness per `(company_ref_id, retailer_ref_id, card_number_hash)`
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Index,
    Integer,
    String,
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
            "card_number_hash",
            name="uq_retailer_credit_cards_company_retailer_hash",
        ),
        Index(
            "ix_retailer_credit_cards_scope",
            "company_ref_id",
            "retailer_ref_id",
            "is_deleted",
        ),
        {"extend_existing": True},
    )

    card_ref_id: Mapped[int] = mapped_column(
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

    # Mandatory tenant/retailer ownership references (resolved strictly server-side)
    company_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    retailer_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)

    # Cardholder & masked card metadata (never store raw PAN)
    cardholder_name: Mapped[str] = mapped_column(String(150), nullable=False)
    mobile_number: Mapped[str] = mapped_column(String(15), nullable=False)
    card_number_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    masked_card_number: Mapped[str] = mapped_column(String(32), nullable=False)
    card_last4: Mapped[str] = mapped_column(String(4), nullable=False)
    card_bin6: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)

    # Card Type (mirrors payin_card_types when available)
    card_type_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    card_type_code: Mapped[str] = mapped_column(String(50), nullable=False)
    card_type_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Bank Master reference (mirrors bank_master when available)
    bank_ifsc_ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    bank_short_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Billing cycle days of month (1..31)
    bill_generate_day: Mapped[int] = mapped_column(Integer, nullable=False)
    bill_due_day: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
