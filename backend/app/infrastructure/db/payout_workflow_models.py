"""
EPIC — Enterprise Move To Bank (Payout Workflow) Database Models
Tables:
- customer_otp
- customer_pin
- customer_monthly_limit
- beneficiary_bank
- bank_health
- payout_transaction
- payout_audit
- transaction_pin_attempt
"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class CustomerOtpModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_otp"
    __table_args__ = {'extend_existing': True}

    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    otp_code: Mapped[str] = mapped_column(String(10), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False, default="SMS")  # SMS, WHATSAPP, ANDROID_AUTO
    purpose: Mapped[str] = mapped_column(String(50), nullable=False, default="CUSTOMER_AUTH")
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CustomerPinModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_pin"
    __table_args__ = {'extend_existing': True}

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    hashed_pin: Mapped[str] = mapped_column(String(255), nullable=False)
    pin_length: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CustomerMonthlyLimitModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_monthly_limit"
    __table_args__ = (
        UniqueConstraint("customer_id", "month_year", name="uq_customer_monthly_limit_cust_month"),
        {'extend_existing': True}
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    monthly_limit: Mapped[float] = mapped_column(Float, nullable=False, default=200000.0)
    used_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    remaining_amount: Mapped[float] = mapped_column(Float, nullable=False, default=200000.0)
    month_year: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # YYYY-MM


class BeneficiaryBankModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_bank"
    __table_args__ = {'extend_existing': True}

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    account_holder: Mapped[str] = mapped_column(String(300), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    penny_drop_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    bank_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")


class BankHealthModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "bank_health"
    __table_args__ = {'extend_existing': True}

    bank_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    ifsc_prefix: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="AVAILABLE")  # AVAILABLE, SLOW, DOWN
    success_rate_pct: Mapped[float] = mapped_column(Float, nullable=False, default=99.5)
    estimated_delay_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PayoutWorkflowTransactionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_workflow_transactions"
    __table_args__ = {'extend_existing': True}

    transaction_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    reference_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    utr_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    charges: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_debit: Mapped[float] = mapped_column(Float, nullable=False)
    wallet_before: Mapped[float] = mapped_column(Float, nullable=False)
    wallet_after: Mapped[float] = mapped_column(Float, nullable=False)
    
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="IMPS")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING", index=True)  # PENDING, PROCESSING, SUCCESS, FAILED, TIMEOUT
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_retryable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    cashfree_transfer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PayoutAuditModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "payout_audit"
    __table_args__ = {'extend_existing': True}

    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    beneficiary_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    wallet_before: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wallet_after: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    limit_state: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    otp_verification_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pin_verification_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    device_fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    geo_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    api_request_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    api_response_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class TransactionPinAttemptModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "transaction_pin_attempt"
    __table_args__ = {'extend_existing': True}

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    attempt_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
