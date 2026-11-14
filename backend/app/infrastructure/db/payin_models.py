"""
Enterprise PayIn Management System - SQLAlchemy Database Models.

Strictly adheres to:
- Table-specific primary key reference ID convention: <table_name>_ref_id BIGINT PRIMARY KEY
- Standard short prefixes: txn_, cust_, pay_, svc_, mdr_, vendor_, company_, provider_
- Full auditability, idempotency protection, and multi-tenant isolation by company_ref_id.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint, Numeric, func, Identity
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PayinCompanyCfgModel(Base):
    """Company-wise PayIn activation and limit configuration."""
    __tablename__ = "payin_company_cfg"
    __table_args__ = (
        UniqueConstraint("company_ref_id", name="uq_payin_company_cfg_company"),
        {"extend_existing": True}
    )

    payin_company_cfg_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    company_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("company.company_ref_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payin_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_vendor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    min_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=10.00, nullable=False)
    max_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=500000.00, nullable=False)
    daily_txn_limit: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    daily_amt_limit: Mapped[float] = mapped_column(Numeric(14, 2), default=2000000.00, nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), default="SYSTEM", nullable=False)
    updated_by: Mapped[str] = mapped_column(String(100), default="SYSTEM", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinVendorModel(Base):
    """Payment vendor / provider gateway master."""
    __tablename__ = "payin_vendors"
    __table_args__ = (
        UniqueConstraint("vendor_code", name="uq_payin_vendors_code"),
        {"extend_existing": True}
    )

    payin_vendor_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    vendor_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vendor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_type: Mapped[str] = mapped_column(String(50), default="PAYMENT_GATEWAY", nullable=False)
    api_base_url: Mapped[str] = mapped_column(String(255), nullable=False)
    auth_type: Mapped[str] = mapped_column(String(50), default="API_KEY", nullable=False)
    cred_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    callback_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timeout_sec: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    retry_policy: Mapped[str] = mapped_column(String(100), default="EXPONENTIAL_BACKOFF", nullable=False)
    vendor_status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), default="SYSTEM", nullable=False)
    updated_by: Mapped[str] = mapped_column(String(100), default="SYSTEM", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinCompanyVendorModel(Base):
    """Many-to-many company to vendor mapping with priority and credentials isolation."""
    __tablename__ = "payin_company_vendors"
    __table_args__ = (
        UniqueConstraint("company_ref_id", "payin_vendor_ref_id", name="uq_payin_company_vendor"),
        {"extend_existing": True}
    )

    payin_company_vendor_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    company_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("company.company_ref_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payin_vendor_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("payin_vendors.payin_vendor_ref_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    merchant_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor_priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinServiceTypeModel(Base):
    """Service type catalog (Utility, Travel, Insurance, Education, Other)."""
    __tablename__ = "payin_service_types"
    __table_args__ = (
        UniqueConstraint("svc_code", name="uq_payin_service_types_code"),
        {"extend_existing": True}
    )

    payin_service_type_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    svc_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    svc_name: Mapped[str] = mapped_column(String(100), nullable=False)
    svc_desc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    svc_icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinPaymentModeModel(Base):
    """Payment mode catalog (Credit Card, Debit Card, UPI, Net Banking, Wallet, Other)."""
    __tablename__ = "payin_payment_modes"
    __table_args__ = (
        UniqueConstraint("pay_mode_code", name="uq_payin_payment_modes_code"),
        {"extend_existing": True}
    )

    payin_payment_mode_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    pay_mode_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    pay_mode_name: Mapped[str] = mapped_column(String(100), nullable=False)
    pay_mode_desc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pay_icon: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinCardTypeModel(Base):
    """Card classification and network catalog (Credit, Debit, Prepaid, Corporate; Visa, Mastercard, RuPay, etc.)."""
    __tablename__ = "payin_card_types"
    __table_args__ = (
        UniqueConstraint("card_type_code", name="uq_payin_card_types_code"),
        {"extend_existing": True}
    )

    payin_card_type_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    card_type_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    card_type_name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_network: Mapped[str] = mapped_column(String(50), nullable=False)
    card_desc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinMdrCfgModel(Base):
    """Dynamic MDR matrix with multi-dimensional overrides and treatment logic."""
    __tablename__ = "payin_mdr_cfg"
    __table_args__ = (
        Index("idx_payin_mdr_lookup", "company_ref_id", "payin_vendor_ref_id", "is_enabled"),
        {"extend_existing": True}
    )

    payin_mdr_cfg_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    company_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("company.company_ref_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payin_vendor_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("payin_vendors.payin_vendor_ref_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payin_service_type_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("payin_service_types.payin_service_type_ref_id", ondelete="RESTRICT"), nullable=True
    )
    payin_payment_mode_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("payin_payment_modes.payin_payment_mode_ref_id", ondelete="RESTRICT"), nullable=True
    )
    payin_card_type_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("payin_card_types.payin_card_type_ref_id", ondelete="RESTRICT"), nullable=True
    )
    card_network: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mdr_pct: Mapped[float] = mapped_column(Numeric(6, 4), default=0.0000, nullable=False)
    mdr_fixed: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    tax_pct: Mapped[float] = mapped_column(Numeric(6, 4), default=18.0000, nullable=False)
    min_mdr: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    max_mdr: Mapped[float] = mapped_column(Numeric(10, 2), default=5000.00, nullable=False)
    mdr_treatment: Mapped[str] = mapped_column(String(30), default="DEDUCT_FROM_TOPUP", nullable=False)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), default="SYSTEM", nullable=False)
    updated_by: Mapped[str] = mapped_column(String(100), default="SYSTEM", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinTransactionModel(Base):
    """Independent PayIn transaction entity tracking complete lifecycle and financial snapshots."""
    __tablename__ = "payin_transactions"
    __table_args__ = (
        UniqueConstraint("tid", name="uq_payin_txn_tid"),
        UniqueConstraint("idempotency_key", name="uq_payin_txn_idempotency"),
        Index("idx_payin_txns_company", "company_ref_id"),
        Index("idx_payin_txns_retailer", "retailer_ref_id"),
        Index("idx_payin_txns_vendor", "payin_vendor_ref_id"),
        Index("idx_payin_txns_status", "txn_status"),
        Index("idx_payin_txns_provider_ref", "provider_ref_id"),
        Index("idx_payin_txns_created_at", "created_at"),
        {"extend_existing": True}
    )

    payin_transactions_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    tid: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    company_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("company.company_ref_id", ondelete="RESTRICT"), nullable=False
    )
    user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    retailer_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("retailer.retailer_ref_id", ondelete="RESTRICT"), nullable=False
    )
    distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    super_distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    payin_vendor_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("payin_vendors.payin_vendor_ref_id", ondelete="RESTRICT"), nullable=False
    )
    merchant_ref_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    provider_ref_id: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    svc_type_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("payin_service_types.payin_service_type_ref_id", ondelete="RESTRICT"), nullable=False
    )
    pay_mode_ref_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("payin_payment_modes.payin_payment_mode_ref_id", ondelete="RESTRICT"), nullable=False
    )
    card_type_ref_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("payin_card_types.payin_card_type_ref_id", ondelete="RESTRICT"), nullable=True
    )
    card_network: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    cust_name: Mapped[str] = mapped_column(String(150), nullable=False)
    cust_mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    cust_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    
    txn_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    mdr_pct: Mapped[float] = mapped_column(Numeric(6, 4), default=0.0000, nullable=False)
    mdr_fixed: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    mdr_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    total_charges: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    customer_payable: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    retailer_credit: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    company_mdr_liability: Mapped[float] = mapped_column(Numeric(14, 2), default=0.00, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    mdr_treatment: Mapped[str] = mapped_column(String(30), default="DEDUCT_FROM_TOPUP", nullable=False)
    
    txn_status: Mapped[str] = mapped_column(String(30), default="INITIATED", nullable=False)
    provider_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider_resp_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider_resp_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    callback_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False)
    request_ref: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    response_ref: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ledger_txn_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)


class PayinCallbackLogModel(Base):
    """Audit log of incoming webhooks and callbacks from payment providers."""
    __tablename__ = "payin_callback_logs"
    __table_args__ = (
        {"extend_existing": True}
    )

    payin_callback_log_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    tid: Mapped[str] = mapped_column(
        String(60), ForeignKey("payin_transactions.tid", ondelete="CASCADE"), nullable=False, index=True
    )
    company_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    payin_vendor_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    provider_ref_id: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    callback_event_id: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    callback_status: Mapped[str] = mapped_column(String(50), nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    process_status: Mapped[str] = mapped_column(String(30), default="RECEIVED", nullable=False)
    error_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)


class PayinAuditLogModel(Base):
    """Audit log of administrative configuration changes and manual transaction overrides."""
    __tablename__ = "payin_audit_logs"
    __table_args__ = (
        {"extend_existing": True}
    )

    payin_audit_log_ref_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1, cycle=False), primary_key=True
    )
    company_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    actor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    old_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
