"""
Recharge Database Models.

Enterprise data models for Pay2Pay Mobile Recharge Module:
- RechargeOperatorModel
- RechargePlanModel
- RechargeCommissionConfigModel
- RechargeTaxConfigModel
- RechargeTransactionModel
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    String, Text, Boolean, Integer, BigInteger, Numeric, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin, Base


class RechargeOperatorModel(BaseEntity, EnterpriseBaseMixin):
    """
    Telecom Operators Master Table.
    """
    __tablename__ = "recharge_operators"
    __table_args__ = (
        Index("idx_recharge_op_code", "operator_code"),
        {"extend_existing": True}
    )

    operator_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    operator_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(30), default="PREPAID")
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vendor_operator_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    supported_circles: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=10)


class RechargePlanModel(BaseEntity, EnterpriseBaseMixin):
    """
    Telecom Operator Plans Catalog.
    """
    __tablename__ = "recharge_plans"
    __table_args__ = (
        Index("idx_recharge_plans_op", "operator_code"),
        Index("idx_recharge_plans_type", "plan_type"),
        {"extend_existing": True}
    )

    operator_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    circle: Mapped[str] = mapped_column(String(50), default="ALL")
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    validity: Mapped[str] = mapped_column(String(50), nullable=False)
    data_quota: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    voice_benefit: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sms_benefit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    plan_type: Mapped[str] = mapped_column(String(50), default="RECOMMENDED")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    is_best_seller: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=10)


class RechargeCommissionConfigModel(BaseEntity, EnterpriseBaseMixin):
    """
    Recharge Commission Rules Configuration.
    """
    __tablename__ = "recharge_commission_configs"
    __table_args__ = (
        Index("idx_recharge_comm_service", "service_code", "role"),
        {"extend_existing": True}
    )

    service_code: Mapped[str] = mapped_column(String(50), default="MOBILE_RECHARGE")
    operator_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="RETAILER")
    commission_type: Mapped[str] = mapped_column(String(20), default="FIXED")
    commission_value: Mapped[float] = mapped_column(Numeric(10, 2), default=1.00)
    min_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=1.00)
    max_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=100000.00)


class RechargeTaxConfigModel(BaseEntity, EnterpriseBaseMixin):
    """
    Recharge Tax / GST Rules Configuration.
    """
    __tablename__ = "recharge_tax_configs"
    __table_args__ = (
        Index("idx_recharge_tax_service", "service_code"),
        {"extend_existing": True}
    )

    service_code: Mapped[str] = mapped_column(String(50), default="MOBILE_RECHARGE")
    tax_name: Mapped[str] = mapped_column(String(50), default="GST")
    tax_rate: Mapped[float] = mapped_column(Numeric(6, 4), default=0.0000)
    calculation_mode: Mapped[str] = mapped_column(String(30), default="INCLUSIVE")


class RechargeTransactionModel(BaseEntity, EnterpriseBaseMixin):
    """
    Recharge Transactions Table with Audit Ledger & Partition Keys.
    """
    __tablename__ = "recharge_transactions"
    __table_args__ = (
        Index("idx_recharge_txn_id", "transaction_id"),
        Index("idx_recharge_ref_id", "reference_id"),
        Index("idx_recharge_idemp", "idempotency_key"),
        Index("idx_recharge_retailer", "retailer_id"),
        Index("idx_recharge_mobile", "mobile_number"),
        Index("idx_recharge_status", "status"),
        Index("idx_recharge_created_at", "created_at"),
        {"extend_existing": True}
    )

    transaction_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    reference_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(150), unique=True, nullable=True)

    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    retailer_code: Mapped[str] = mapped_column(String(50), nullable=False)
    retailer_name: Mapped[str] = mapped_column(String(150), nullable=False)

    mobile_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    operator_code: Mapped[str] = mapped_column(String(50), nullable=False)
    operator_name: Mapped[str] = mapped_column(String(100), nullable=False)
    circle: Mapped[str] = mapped_column(String(50), default="All India")

    plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    plan_type: Mapped[str] = mapped_column(String(50), default="CUSTOM")
    plan_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recharge_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    commission_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=1.00)
    tax_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    net_wallet_debit: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)

    opening_balance: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)
    closing_balance: Mapped[float] = mapped_column(Numeric(18, 2), default=0.00)

    wallet_debit_txn_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    wallet_comm_txn_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    wallet_tax_txn_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    vendor_name: Mapped[Optional[str]] = mapped_column(String(50), default="UTKALDIGITAL")
    vendor_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vendor_transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    operator_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="INITIATED", index=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    reversal_txn_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reversal_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
