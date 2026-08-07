"""
EPIC — Production-Ready Enterprise Beneficiary Verification Database Models
Tables:
- beneficiary_verification_request
- beneficiary_verification_response
- beneficiary_verification
- verification_history
- wallet_balance_history
- financial_journal
- account_ledger
- beneficiary_reconciliation
"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float, Numeric
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class BeneficiaryVerificationRequestModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_verification_request"
    __table_args__ = (
        UniqueConstraint("tenant_id", "idempotency_key", name="uq_ben_verify_req_idempotency"),
        {'extend_existing': True}
    )

    verification_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    trace_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    beneficiary_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    encrypted_account_number: Mapped[str] = mapped_column(Text, nullable=False)
    masked_account_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    account_number_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    account_holder_name: Mapped[str] = mapped_column(String(300), nullable=False)

    encrypted_mobile: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    masked_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    mobile_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False, default="CASHFREE")
    request_headers: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    request_body: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    debit_amount: Mapped[float] = mapped_column(Float, nullable=False)
    verification_charge: Mapped[float] = mapped_column(Float, nullable=False)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="INITIATED", index=True)
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class BeneficiaryVerificationResponseModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_verification_response"
    __table_args__ = {'extend_existing': True}

    verification_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary_verification_request.public_id", ondelete="CASCADE"), nullable=False, index=True)
    verification_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False)
    vendor_reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    http_status: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    response_body: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    bank_account_exists: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    name_at_bank: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    name_match_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    name_match_status: Mapped[str] = mapped_column(String(30), nullable=False, default="MISMATCH")
    utr: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    digital_signature: Mapped[str] = mapped_column(String(128), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class BeneficiaryVerificationRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_verification"
    __table_args__ = {'extend_existing': True}

    verification_number: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    masked_account_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)

    input_name: Mapped[str] = mapped_column(String(300), nullable=False)
    registered_bank_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    name_match_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING", index=True)  # SUCCESS, FAILED, REVERSED
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    total_debit: Mapped[float] = mapped_column(Float, nullable=False)
    verification_charge: Mapped[float] = mapped_column(Float, nullable=False)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False)
    retailer_commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    utr_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    vendor_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    digital_signature: Mapped[str] = mapped_column(String(128), nullable=False)

    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class BeneficiaryVerificationHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "verification_history"
    __table_args__ = {'extend_existing': True}

    verification_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    from_status: Mapped[str] = mapped_column(String(30), nullable=False)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    action_by: Mapped[str] = mapped_column(String(100), nullable=False, default="SYSTEM")
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class WalletBalanceHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_balance_history"
    __table_args__ = {'extend_existing': True}

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    transaction_ref: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)  # DEBIT_BENEFICIARY_VERIFY, REVERSAL_BENEFICIARY_VERIFY
    opening_balance: Mapped[float] = mapped_column(Float, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    closing_balance: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class FinancialJournalModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "financial_journal"
    __table_args__ = {'extend_existing': True}

    journal_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    transaction_ref: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entry_type: Mapped[str] = mapped_column(String(50), nullable=False)  # BENEFICIARY_VERIFICATION_DEBIT, BENEFICIARY_VERIFICATION_REVERSAL
    debit_account: Mapped[str] = mapped_column(String(100), nullable=False)
    credit_account: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    narration: Mapped[str] = mapped_column(Text, nullable=False)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AccountLedgerModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "account_ledger"
    __table_args__ = {'extend_existing': True}

    account_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    transaction_ref: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    debit: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    credit: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    running_balance: Mapped[float] = mapped_column(Float, nullable=False)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class BeneficiaryReconciliationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_reconciliation"
    __table_args__ = {'extend_existing': True}

    reconciliation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False, default="CASHFREE")
    total_verifications: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vendor_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wallet_debit_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    ledger_debit_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    discrepancy_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reconciliation_status: Mapped[str] = mapped_column(String(30), nullable=False, default="MATCHED")  # MATCHED, DISCREPANCY
    exception_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
