"""EPIC-024 — Domestic Money Transfer (DMT) Transaction Engine — ORM Models"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class DmtTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_transaction"

    transaction_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    rrn: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    utr: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    service_type: Mapped[str] = mapped_column(String(30), nullable=False, default="DMT")
    transaction_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="IMPS")
    transfer_amount: Mapped[float] = mapped_column(Float, nullable=False)
    service_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_debit_amount: Mapped[float] = mapped_column(Float, nullable=False)
    net_beneficiary_credit: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    bank_account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    bank_ifsc: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    beneficiary_name: Mapped[str] = mapped_column(String(300), nullable=False)
    transaction_status: Mapped[str] = mapped_column(String(50), nullable=False, default="INITIATED", index=True)
    purpose: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    status_entries: Mapped[List["DmtTransactionStatusModel"]] = relationship("DmtTransactionStatusModel", back_populates="transaction", cascade="all, delete-orphan")
    charge_detail: Mapped[Optional["DmtTransactionChargeModel"]] = relationship("DmtTransactionChargeModel", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    commission_detail: Mapped[Optional["DmtTransactionCommissionModel"]] = relationship("DmtTransactionCommissionModel", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    bank_requests: Mapped[List["DmtBankRequestModel"]] = relationship("DmtBankRequestModel", back_populates="transaction", cascade="all, delete-orphan")
    bank_responses: Mapped[List["DmtBankResponseModel"]] = relationship("DmtBankResponseModel", back_populates="transaction", cascade="all, delete-orphan")
    switch_logs: Mapped[List["DmtSwitchLogModel"]] = relationship("DmtSwitchLogModel", back_populates="transaction", cascade="all, delete-orphan")
    retries: Mapped[List["DmtRetryModel"]] = relationship("DmtRetryModel", back_populates="transaction", cascade="all, delete-orphan")
    reversals: Mapped[List["DmtReversalModel"]] = relationship("DmtReversalModel", back_populates="transaction", cascade="all, delete-orphan")
    refunds: Mapped[List["DmtRefundModel"]] = relationship("DmtRefundModel", back_populates="transaction", cascade="all, delete-orphan")
    disputes: Mapped[List["DmtDisputeModel"]] = relationship("DmtDisputeModel", back_populates="transaction", cascade="all, delete-orphan")
    status_histories: Mapped[List["DmtStatusHistoryModel"]] = relationship("DmtStatusHistoryModel", back_populates="transaction", cascade="all, delete-orphan")
    audits: Mapped[List["DmtAuditModel"]] = relationship("DmtAuditModel", back_populates="transaction", cascade="all, delete-orphan")
    notifications: Mapped[List["DmtNotificationModel"]] = relationship("DmtNotificationModel", back_populates="transaction", cascade="all, delete-orphan")
    settlements: Mapped[List["DmtSettlementModel"]] = relationship("DmtSettlementModel", back_populates="transaction", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "transaction_number", name="uq_dmt_txn_tenant_number"),
    )


class DmtTransactionStatusModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_transaction_status"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    current_status: Mapped[str] = mapped_column(String(50), nullable=False)
    sub_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="status_entries")


class DmtTransactionChargeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_transaction_charge"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    service_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    bank_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    switch_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gst_rate_pct: Mapped[float] = mapped_column(Float, nullable=False, default=18.0)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="charge_detail")


class DmtTransactionCommissionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_transaction_commission"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    retailer_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    distributor_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    super_distributor_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rm_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    platform_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="commission_detail")


class DmtBankRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_bank_request"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    bank_code: Mapped[str] = mapped_column(String(50), nullable=False)
    api_endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    request_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="bank_requests")


class DmtBankResponseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_bank_response"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    response_code: Mapped[str] = mapped_column(String(50), nullable=False)
    response_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bank_rrn: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bank_utr: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    response_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="bank_responses")


class DmtSwitchLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_switch_log"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    switch_name: Mapped[str] = mapped_column(String(50), nullable=False, default="PRIMARY_SWITCH")
    switch_status: Mapped[str] = mapped_column(String(50), nullable=False)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="switch_logs")


class DmtRetryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_retry"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    retry_attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    retry_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="retries")


class DmtReversalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_reversal"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    reversal_number: Mapped[str] = mapped_column(String(40), nullable=False)
    reversal_reason: Mapped[str] = mapped_column(Text, nullable=False)
    reversal_amount: Mapped[float] = mapped_column(Float, nullable=False)
    reversal_status: Mapped[str] = mapped_column(String(30), nullable=False, default="COMPLETED")
    reversed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="reversals")


class DmtRefundModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_refund"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    refund_number: Mapped[str] = mapped_column(String(40), nullable=False)
    refund_amount: Mapped[float] = mapped_column(Float, nullable=False)
    refund_status: Mapped[str] = mapped_column(String(30), nullable=False, default="SUCCESS")
    refunded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="refunds")


class DmtDisputeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_dispute"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    dispute_number: Mapped[str] = mapped_column(String(40), nullable=False)
    dispute_reason: Mapped[str] = mapped_column(Text, nullable=False)
    dispute_status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPEN")
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="disputes")


class DmtStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_status_history"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="status_histories")


class DmtAuditModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_audit"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="audits")


class DmtNotificationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_notification"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(30), nullable=False, default="SMS")
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_status: Mapped[str] = mapped_column(String(30), nullable=False, default="DELIVERED")

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="notifications")


class DmtSettlementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "dmt_settlement"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dmt_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_batch_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    settlement_status: Mapped[str] = mapped_column(String(30), nullable=False, default="SETTLED")
    settled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["DmtTransactionModel"] = relationship("DmtTransactionModel", back_populates="settlements")
