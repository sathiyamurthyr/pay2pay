import uuid
import enum
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Boolean, Float, Integer, DateTime, Text, ForeignKey, UniqueConstraint, Enum, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB as PG_JSONB
JSONB = JSON().with_variant(PG_JSONB(), 'postgresql')

from app.core.database import Base
from app.infrastructure.db.models import BaseEntity, EnterpriseBaseMixin

class PayoutTransactionStatus(str, enum.Enum):
    CREATED = "CREATED"
    MPIN_VERIFIED = "MPIN_VERIFIED"
    VALIDATING = "VALIDATING"
    VALIDATED = "VALIDATED"
    INITIATED = "INITIATED"
    WALLET_RESERVED = "WALLET_RESERVED"
    WALLET_DEBITED = "WALLET_DEBITED"
    LEDGER_POSTED = "LEDGER_POSTED"
    VENDOR_REQUEST_SENT = "VENDOR_REQUEST_SENT"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REVERSAL_INITIATED = "REVERSAL_INITIATED"
    REVERSED = "REVERSED"
    PARTIALLY_REVERSED = "PARTIALLY_REVERSED"
    HOLD = "HOLD"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    TIMEOUT = "TIMEOUT"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    DUPLICATE = "DUPLICATE"
    STATUS_CHECK_REQUIRED = "STATUS_CHECK_REQUIRED"
    SETTLEMENT_PENDING = "SETTLEMENT_PENDING"
    SETTLED = "SETTLED"

class EnterprisePayoutTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "enterprise_payout_transactions"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_payout_idempotency_key"),
        {'extend_existing': True}
    )

    transaction_number: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    charges: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_debit: Mapped[float] = mapped_column(Float, nullable=False)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tds_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vendor_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    company_revenue: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    wallet_before: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    wallet_after: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="IMPS")  # IMPS, NEFT, RTGS, UPI
    status: Mapped[PayoutTransactionStatus] = mapped_column(
        Enum(PayoutTransactionStatus, name="payout_transaction_status_enum", create_type=False),
        nullable=False,
        default=PayoutTransactionStatus.CREATED,
        index=True
    )
    status_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Vendor Data
    vendor_name: Mapped[str] = mapped_column(String(100), nullable=False, default="BulkPe")
    vendor_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    vendor_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rrn: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    utr_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    # Reversal Protection & Idempotency
    is_reversed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    reversal_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, unique=True)
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reversal_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Polling & Retries
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    last_polled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Audit timestamps
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ledger_entries: Mapped[List["PayoutDoubleEntryLedgerModel"]] = relationship(
        "PayoutDoubleEntryLedgerModel", back_populates="transaction", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["PayoutAuditLogModel"]] = relationship(
        "PayoutAuditLogModel", back_populates="transaction", cascade="all, delete-orphan"
    )

    # Domain Aliases & Properties
    @property
    def transaction_amount(self) -> float:
        return self.amount

    @property
    def beneficiary_credit_amount(self) -> float:
        return self.amount

    @property
    def wallet_debit_amount(self) -> float:
        return self.net_debit

    @property
    def vendor_amount(self) -> float:
        return self.amount

    @property
    def convenience_fee(self) -> float:
        return self.charges

    @property
    def company_commission(self) -> float:
        return self.company_revenue

    @property
    def retailer_commission(self) -> float:
        return self.commission

    @property
    def tds(self) -> float:
        return self.tds_amount

class PayoutDoubleEntryLedgerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_ledger_entry"
    __table_args__ = {'extend_existing': True}

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("enterprise_payout_transactions.public_id", ondelete="CASCADE"), nullable=False, index=True
    )
    entry_number: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)  # DEBIT or CREDIT
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # RETAILER_WALLET, VENDOR_PAYABLE, COMPANY_REVENUE, GST_PAYABLE, TDS_RECEIVABLE, COMMISSION_EXPENSE, VENDOR_CHARGE_EXPENSE
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    balance_after: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_reversal_entry: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    transaction: Mapped["EnterprisePayoutTransactionModel"] = relationship("EnterprisePayoutTransactionModel", back_populates="ledger_entries")

class PayoutAuditLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_audit_log"
    __table_args__ = {'extend_existing': True}

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("enterprise_payout_transactions.public_id", ondelete="CASCADE"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SYSTEM")  # SYSTEM, RETAILER, ADMIN
    actor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    transaction: Mapped["EnterprisePayoutTransactionModel"] = relationship("EnterprisePayoutTransactionModel", back_populates="audit_logs")

class PayoutNotificationLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_notification_log"
    __table_args__ = {'extend_existing': True}

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("enterprise_payout_transactions.public_id", ondelete="CASCADE"), nullable=False, index=True
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SUCCESS, PENDING, FAILED, REVERSED
    recipient: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False, default="IN_APP")  # IN_APP, SMS, EMAIL, WEBHOOK
    message: Mapped[Text] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SENT")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
