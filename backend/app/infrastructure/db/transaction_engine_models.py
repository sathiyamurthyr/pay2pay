"""
Enterprise Central Transaction & Dynamic Reference Engine Database Models.
Implements:
- transaction_configuration: Dynamic prefix, date format, and timezone rules.
- transactions: Append-only immutable & authoritative financial transaction entity.
- transaction_audit_logs: Auditable state machine transitions.
- transaction_ledger_entries: Double-entry financial accounting ledger.
"""

import uuid
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String, Boolean, Numeric, Integer, SmallInteger, BigInteger, DateTime, Text, Index, CheckConstraint, UniqueConstraint, ForeignKey
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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False, default="DEFAULT")
    prefix_source: Mapped[str] = mapped_column(String(50), nullable=False, default="VENDOR_FIRST_CHAR")
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
    Authoritative Append-Only Retailer & Enterprise Wallet Transaction Table.
    
    PostgreSQL / Supabase append-only design:
    - Same txn_id is allowed for DEBIT + CREDIT reversal.
    - Protected by trg_transactions_no_update trigger preventing UPDATE & DELETE.
    """
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("public_id", name="uq_transactions_public_id"),
        CheckConstraint("entry_type IN ('DEBIT', 'CREDIT')", name="chk_transactions_entry_type"),
        CheckConstraint("amount > 0", name="chk_transactions_amount"),
        CheckConstraint("balance_before >= 0", name="chk_transactions_balance_before"),
        CheckConstraint("balance_after >= 0", name="chk_transactions_balance_after"),
        CheckConstraint("partition_month BETWEEN 1 AND 12", name="chk_transactions_partition_month"),
        CheckConstraint("partition_day BETWEEN 1 AND 31", name="chk_transactions_partition_day"),
        Index("idx_rt_tenant_company_retailer", "tenant_id", "company_id", "retailer_id"),
        Index("idx_rt_txn_id", "txn_id"),
        Index("idx_rt_ref_id", "ref_id"),
        Index("idx_rt_table_ref_id", "table_ref_id"),
        Index("idx_rt_service_name", "service_name"),
        Index("idx_rt_entry_type", "entry_type"),
        Index("idx_rt_status", "status"),
        Index("idx_rt_created_at", "created_at"),
        Index("idx_rt_retailer_created_at", "retailer_id", "created_at"),
        Index("idx_rt_retailer_txn", "retailer_id", "txn_id"),
        Index("idx_rt_retailer_service_date", "retailer_id", "service_name", "created_at"),
        Index("idx_rt_wallet_type", "wallet_type"),
        Index("idx_rt_retailer_wallet_type", "retailer_id", "wallet_type"),
        Index("idx_transactions_dist_id", "dist_id"),
        Index("idx_transactions_sd_id", "sd_id"),
        Index("idx_transactions_rm_id", "rm_id"),
        Index("idx_transactions_vendor_id", "vendor_id"),
        Index("idx_transactions_vendor_name", "vendor_name"),
        {"extend_existing": True}
    )

    # Primary / Public IDs
    id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    transactions_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # Enterprise Scope & Generic User Ownership
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    company_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    retailer_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    super_distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    regional_manager_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    user_type_ref_id: Mapped[Optional[int]] = mapped_column("user_type_ref_id", BigInteger, nullable=True, index=True)

    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    retailer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    dist_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    dist_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    sd_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    sd_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    rm_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    rm_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    vendor_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Business Transaction References
    txn_id: Mapped[str] = mapped_column(String(64), nullable=False)
    ref_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    table_ref_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Transaction Information
    service_name: Mapped[str] = mapped_column(String(50), nullable=False)
    wallet_type: Mapped[str] = mapped_column(String(50), nullable=False, default="MAIN")
    user_type: Mapped[Optional[str]] = mapped_column("user_type", String(50), nullable=True)
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    # Wallet Balance Snapshot
    balance_before: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    # Transaction Status
    status: Mapped[str] = mapped_column(String(30), nullable=False)

    # Description
    narration: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Enterprise Date Keys
    day_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    week_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    month_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    quarter_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    year_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    financial_year_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    financial_quarter_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    financial_month_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    date_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    time_key: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Partition Keys
    partition_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    partition_month: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    partition_day: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # Audit / Lifecycle
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    transaction_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SYSTEM")
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

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    transaction_reference: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)  # DEBIT, CREDIT
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    account_number: Mapped[str] = mapped_column(String(100), nullable=False)
    
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    balance_before: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    balance_after: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    
    narration: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
