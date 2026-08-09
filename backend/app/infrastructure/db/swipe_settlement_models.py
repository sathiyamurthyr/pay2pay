import uuid
import enum
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Boolean, Float, Integer, DateTime, Text, ForeignKey, UniqueConstraint, Enum
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base
from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin

class SwipeSettlementStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SETTLED = "SETTLED"
    FAILED = "FAILED"
    REVERSED = "REVERSED"
    HOLD = "HOLD"

class SwipeMachineSettlementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "swipe_machine_settlement"
    __table_args__ = {'extend_existing': True}

    settlement_number: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    transaction_number: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    order_id: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    
    terminal_id: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # TID e.g. TID-982415
    merchant_id: Mapped[str] = mapped_column(String(30), nullable=False, index=True)  # MID e.g. MID-441029
    
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False, default="HDFC Bank")
    card_type: Mapped[str] = mapped_column(String(30), nullable=False, default="Credit Card")  # Credit Card, Debit Card, Prepaid Card, Corporate Card
    card_network: Mapped[str] = mapped_column(String(30), nullable=False, default="Visa")  # Visa, MasterCard, RuPay, Amex, Diners
    masked_card_number: Mapped[str] = mapped_column(String(30), nullable=False, default="XXXX XXXX XXXX 4589")
    
    transaction_amount: Mapped[float] = mapped_column(Float, nullable=False)
    mdr_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tds_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    other_charges: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_settlement_amount: Mapped[float] = mapped_column(Float, nullable=False)
    
    settlement_bank_account: Mapped[str] = mapped_column(String(50), nullable=False, default="Axis Bank (XXXX 4589)")
    utr_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    status: Mapped[SwipeSettlementStatus] = mapped_column(
        Enum(SwipeSettlementStatus, name="swipe_settlement_status_enum", create_type=False),
        nullable=False,
        default=SwipeSettlementStatus.SETTLED,
        index=True
    )
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    settlement_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
