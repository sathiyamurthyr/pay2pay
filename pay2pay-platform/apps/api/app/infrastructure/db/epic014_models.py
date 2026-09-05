"""EPIC-014 — Enterprise Beneficiary Registration & Cashfree V2 Penny Drop Workflow Models"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Float, JSON
)
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, UUID
JSONB = JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class BeneficiaryMasterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_master"
    __table_args__ = (
        UniqueConstraint("account_number", "ifsc_code", name="uq_bene_master_acc_ifsc"),
        {"extend_existing": True},
    )

    account_holder_name: Mapped[str] = mapped_column(String(300), nullable=False)
    account_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    account_number_masked: Mapped[str] = mapped_column(String(50), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    branch_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    account_type: Mapped[str] = mapped_column(String(30), nullable=False, default="SAVINGS")
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="UNVERIFIED", index=True)
    verification_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verification_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    penny_drop_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    registered_name_in_bank: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    utr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="ACTIVE", index=True)
    beneficiary_master_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    company_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    is_favourite: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=False)


class BeneficiaryCustomerMappingModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_customer_mapping"
    __table_args__ = (
        UniqueConstraint("customer_id", "beneficiary_id", name="uq_bene_cust_map"),
        {"extend_existing": True},
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    relationship: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="FAMILY")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class BeneficiaryVerificationRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_verification_record"
    __table_args__ = {"extend_existing": True}

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    verification_type: Mapped[str] = mapped_column(String(50), nullable=False, default="CASHFREE_V2_PENNY_DROP")
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False)
    cashfree_reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_response_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    name_returned_by_bank: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    name_match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_name_matched: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    charge_amount: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class WalletTransactionRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_transaction_record"
    __table_args__ = {"extend_existing": True}

    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    wallet_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    opening_balance: Mapped[float] = mapped_column(Float, nullable=False)
    closing_balance: Mapped[float] = mapped_column(Float, nullable=False)
    reference_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class WalletLedgerRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "wallet_ledger_record"
    __table_args__ = {"extend_existing": True}

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wallet_transaction_record.public_id", ondelete="CASCADE"), nullable=False, index=True)
    account_code: Mapped[str] = mapped_column(String(100), nullable=False)
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    running_balance: Mapped[float] = mapped_column(Float, nullable=False)


class FinancialTransactionRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "financial_transaction_record"
    __table_args__ = {"extend_existing": True}

    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    reference_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False, default="BENEFICIARY_VERIFICATION")
    service_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Cashfree V2 Penny Drop")
    wallet_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    beneficiary_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    store_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)
    gst_pct: Mapped[float] = mapped_column(Float, nullable=False, default=18.0)
    gst_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.54)
    cgst: Mapped[float] = mapped_column(Float, nullable=False, default=0.27)
    sgst: Mapped[float] = mapped_column(Float, nullable=False, default=0.27)
    igst: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tds_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tds_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    commission: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, nullable=False, default=3.54)
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False, default="DEBIT")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="SUCCESS")
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class FinancialLedgerRecordModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "financial_ledger_record"
    __table_args__ = {"extend_existing": True}

    financial_transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("financial_transaction_record.public_id", ondelete="CASCADE"), nullable=False, index=True)
    account_code: Mapped[str] = mapped_column(String(100), nullable=False)
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)


class ApiTransactionLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "api_transaction_log_epic014"
    __table_args__ = {"extend_existing": True}

    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="CASHFREE")
    service_code: Mapped[str] = mapped_column(String(50), nullable=False, default="PENNY_DROP_V2")
    reference_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    request_payload_masked: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_payload_masked: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    http_status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="SUCCESS")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class CashfreeApiLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "cashfree_api_log"
    __table_args__ = {"extend_existing": True}

    cashfree_ref_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    verification_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    bank_account_masked: Mapped[str] = mapped_column(String(50), nullable=False)
    ifsc: Mapped[str] = mapped_column(String(20), nullable=False)
    request_json: Mapped[Text] = mapped_column(Text, nullable=False)
    response_json: Mapped[Text] = mapped_column(Text, nullable=False)
    utr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    name_at_bank: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    account_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
