"""EPIC-025 — Aadhaar Enabled Payment System (AEPS) Platform — ORM Models"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float, JSON
)
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, UUID
JSONB = JSON().with_variant(PG_JSONB(), 'postgresql')
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class AepsTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_transaction"

    transaction_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    rrn: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    stan: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    device_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    masked_aadhaar: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_iin: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    service_type: Mapped[str] = mapped_column(String(40), nullable=False, default="CASH_WITHDRAWAL")
    transaction_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    available_balance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ledger_balance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    service_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    retailer_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_settlement_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    transaction_status: Mapped[str] = mapped_column(String(50), nullable=False, default="INITIATED", index=True)
    auth_response_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    auth_response_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    status_entries: Mapped[List["AepsTransactionStatusModel"]] = relationship("AepsTransactionStatusModel", back_populates="transaction", cascade="all, delete-orphan")
    biometric_captures: Mapped[List["AepsBiometricCaptureModel"]] = relationship("AepsBiometricCaptureModel", back_populates="transaction", cascade="all, delete-orphan")
    bank_requests: Mapped[List["AepsBankRequestModel"]] = relationship("AepsBankRequestModel", back_populates="transaction", cascade="all, delete-orphan")
    bank_responses: Mapped[List["AepsBankResponseModel"]] = relationship("AepsBankResponseModel", back_populates="transaction", cascade="all, delete-orphan")
    npci_logs: Mapped[List["AepsNpciLogModel"]] = relationship("AepsNpciLogModel", back_populates="transaction", cascade="all, delete-orphan")
    charge_detail: Mapped[Optional["AepsTransactionChargeModel"]] = relationship("AepsTransactionChargeModel", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    commission_detail: Mapped[Optional["AepsCommissionModel"]] = relationship("AepsCommissionModel", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    retries: Mapped[List["AepsRetryModel"]] = relationship("AepsRetryModel", back_populates="transaction", cascade="all, delete-orphan")
    reversals: Mapped[List["AepsReversalModel"]] = relationship("AepsReversalModel", back_populates="transaction", cascade="all, delete-orphan")
    disputes: Mapped[List["AepsDisputeModel"]] = relationship("AepsDisputeModel", back_populates="transaction", cascade="all, delete-orphan")
    settlements: Mapped[List["AepsSettlementModel"]] = relationship("AepsSettlementModel", back_populates="transaction", cascade="all, delete-orphan")
    status_histories: Mapped[List["AepsStatusHistoryModel"]] = relationship("AepsStatusHistoryModel", back_populates="transaction", cascade="all, delete-orphan")
    notifications: Mapped[List["AepsNotificationModel"]] = relationship("AepsNotificationModel", back_populates="transaction", cascade="all, delete-orphan")
    receipts: Mapped[List["AepsReceiptModel"]] = relationship("AepsReceiptModel", back_populates="transaction", cascade="all, delete-orphan")
    audits: Mapped[List["AepsAuditModel"]] = relationship("AepsAuditModel", back_populates="transaction", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "transaction_number", name="uq_aeps_txn_tenant_number"),
    )


class AepsTransactionStatusModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_transaction_status"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    current_status: Mapped[str] = mapped_column(String(50), nullable=False)
    status_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="status_entries")


class AepsBiometricCaptureModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_biometric_capture"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    biometric_type: Mapped[str] = mapped_column(String(30), nullable=False, default="FINGERPRINT")
    vendor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_serial_number: Mapped[str] = mapped_column(String(100), nullable=False)
    pid_block_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    quality_score: Mapped[int] = mapped_column(Integer, nullable=False, default=85)
    capture_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="biometric_captures")


class AepsDeviceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_device"

    device_serial_number: Mapped[str] = mapped_column(String(100), nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rd_service_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0.4")
    firmware_version: Mapped[str] = mapped_column(String(50), nullable=False, default="2.0.1")
    device_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    assigned_retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    health_entries: Mapped[List["AepsDeviceHealthModel"]] = relationship("AepsDeviceHealthModel", back_populates="device", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "device_serial_number", name="uq_aeps_device_tenant_serial"),
    )


class AepsDeviceHealthModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_device_health"

    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_device.public_id", ondelete="CASCADE"), nullable=False, index=True)
    last_ping_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    health_status: Mapped[str] = mapped_column(String(30), nullable=False, default="HEALTHY")
    battery_level_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=95)

    device: Mapped["AepsDeviceModel"] = relationship("AepsDeviceModel", back_populates="health_entries")


class AepsBankRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_bank_request"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    bank_iin: Mapped[str] = mapped_column(String(20), nullable=False)
    request_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="bank_requests")


class AepsBankResponseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_bank_response"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    response_code: Mapped[str] = mapped_column(String(20), nullable=False)
    response_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bank_rrn: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="bank_responses")


class AepsNpciLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_npci_log"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    npci_txn_id: Mapped[str] = mapped_column(String(100), nullable=False)
    npci_status: Mapped[str] = mapped_column(String(30), nullable=False, default="SUCCESS")
    npci_response_code: Mapped[str] = mapped_column(String(20), nullable=False, default="00")

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="npci_logs")


class AepsTransactionChargeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_transaction_charge"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    service_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    npci_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    bank_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="charge_detail")


class AepsCommissionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_commission"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    retailer_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    distributor_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    super_distributor_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rm_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    platform_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="commission_detail")


class AepsRetryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_retry"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    retry_attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    retry_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="retries")


class AepsReversalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_reversal"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    reversal_number: Mapped[str] = mapped_column(String(40), nullable=False)
    reversal_reason: Mapped[str] = mapped_column(Text, nullable=False)
    reversal_amount: Mapped[float] = mapped_column(Float, nullable=False)
    reversal_status: Mapped[str] = mapped_column(String(30), nullable=False, default="COMPLETED")
    reversed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="reversals")


class AepsDisputeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_dispute"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    dispute_number: Mapped[str] = mapped_column(String(40), nullable=False)
    dispute_type: Mapped[str] = mapped_column(String(50), nullable=False, default="CASH_NOT_DISPENSED")
    dispute_status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPEN")
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="disputes")


class AepsSettlementModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_settlement"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    settlement_status: Mapped[str] = mapped_column(String(30), nullable=False, default="SETTLED")
    settled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="settlements")


class AepsStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_status_history"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="status_histories")


class AepsNotificationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_notification"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    notification_type: Mapped[str] = mapped_column(String(30), nullable=False, default="SMS")
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_status: Mapped[str] = mapped_column(String(30), nullable=False, default="DELIVERED")

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="notifications")


class AepsReceiptModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_receipt"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    receipt_number: Mapped[str] = mapped_column(String(40), nullable=False)
    receipt_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="receipts")


class AepsAuditModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "aeps_audit"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aeps_transaction.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    transaction: Mapped["AepsTransactionModel"] = relationship("AepsTransactionModel", back_populates="audits")
