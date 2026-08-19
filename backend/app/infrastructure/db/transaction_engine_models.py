"""
Enterprise Central Transaction & Dynamic Reference Engine Database Models.
Implements:
- transaction_configuration: Dynamic prefix, date format, and timezone rules.
- transactions: Central immutable & authoritative financial transaction entity.
- transaction_audit_logs: Auditable state machine transitions.
- transaction_ledger_entries: Double-entry financial accounting ledger.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String, Boolean, Numeric, Integer, DateTime, Text, ForeignKey, Index, JSON, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class TransactionConfigurationModel(Base):
    """
    Configuration rules for dynamic transaction reference generation per tenant/company/vendor.
    """
    __tablename__ = "transaction_configuration"
    __table_args__ = (
        UniqueConstraint("tenant_id", "vendor_code", name="uq_txn_cfg_tenant_vendor"),
        Index("idx_txn_cfg_tenant", "tenant_id"),
        Index("idx_txn_cfg_vendor", "vendor_code"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False, default="DEFAULT")
    prefix_source: Mapped[str] = mapped_column(String(50), nullable=False, default="VENDOR_FIRST_CHAR")  # VENDOR_FIRST_CHAR, CUSTOM_PREFIX, SERVICE_CODE
    custom_prefix: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    
    date_format: Mapped[str] = mapped_column(String(50), nullable=False, default="%d%m%y%H%M")
    include_year: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    include_hour: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    include_minute: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    random_length: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    transaction_format: Mapped[str] = mapped_column(String(100), nullable=False, default="<VENDOR_FIRST_CHAR><DD><MM><YY><HH><MI><5_DIGIT_UNIQUE_NUMBER>")
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Kolkata")
    
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="SYSTEM")
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False, default="SYSTEM")


class CentralTransactionModel(Base):
    """
    Central Authoritative Financial Transaction Entity.
    """
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("transaction_reference", name="uq_transactions_reference"),
        Index("idx_transactions_ref", "transaction_reference"),
        Index("idx_transactions_tenant", "tenant_id"),
        Index("idx_transactions_company", "company_id"),
        Index("idx_transactions_vendor_id", "vendor_id"),
        Index("idx_transactions_retailer", "retailer_id"),
        Index("idx_transactions_customer", "customer_id"),
        Index("idx_transactions_type", "transaction_type"),
        Index("idx_transactions_service", "service_type"),
        Index("idx_transactions_status", "status"),
        Index("idx_transactions_created", "created_at"),
        Index("idx_transactions_idem", "idempotency_key"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False, default="WOWPE", index=True)
    
    transaction_reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # PAYOUT, DMT, AEPS, SWIPE, WALLET_TOPUP, REVERSAL
    service_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)      # MOVE_TO_BANK, PENNY_DROP, ACCOUNT_VALIDATE, CASH_WITHDRAWAL
    
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    beneficiary_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    
    charges: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    commission: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    gst_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    tds_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    net_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="INITIATED", index=True)
    status_description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    
    utr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    vendor_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    response_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="SYSTEM")
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False, default="SYSTEM")


class TransactionAuditLogModel(Base):
    """
    Immutable audit trail for all transaction status transitions.
    """
    __tablename__ = "transaction_audit_logs"
    __table_args__ = (
        Index("idx_txn_audit_ref", "transaction_reference"),
        Index("idx_txn_audit_status", "new_status"),
        Index("idx_txn_audit_created", "created_at"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    transaction_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SYSTEM")  # SYSTEM, RETAILER, ADMIN, WEBHOOK, BACKGROUND_JOB
    actor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class TransactionLedgerEntryModel(Base):
    """
    Double-Entry Ledger Accounting for transactions.
    """
    __tablename__ = "transaction_ledger_entries"
    __table_args__ = (
        Index("idx_txn_ledger_ref", "transaction_reference"),
        Index("idx_txn_ledger_account", "account_number"),
        Index("idx_txn_ledger_created", "created_at"),
        {"extend_existing": True}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    transaction_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)  # DEBIT, CREDIT
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)  # RETAILER_WALLET, ESCROW_ACCOUNT, VENDOR_PAYOUT_NODE, COMMISSION_REVENUE, GST_PAYABLE
    account_number: Mapped[str] = mapped_column(String(100), nullable=False)
    
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    balance_before: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    balance_after: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    
    narration: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
