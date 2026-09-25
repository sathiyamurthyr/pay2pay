"""
POS Payment Modes & Dynamic MDR Configuration Models.

Supports:
- Dynamic payment mode registry (POS - Instant, POS+T1, POS+T2)
- Retailer-specific and Default MDR configurations
- FIXED and PERCENTAGE MDR calculations
- Dynamic GST rate on MDR
- Effective date intervals and active status tracking
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


class PosPaymentModeConfigModel(BaseEntity, EnterpriseBaseMixin):
    """
    Registry of allowed POS Payment Modes.
    Active allowed modes: POS - Instant, POS+T1, POS+T2.
    """
    __tablename__ = "pos_payment_mode_config"
    __table_args__ = (
        Index("idx_pos_pm_code", "code"),
        Index("idx_pos_pm_order", "display_order"),
        Index("idx_pos_pm_active", "is_active", "is_deleted"),
        {"extend_existing": True}
    )

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    settlement_type: Mapped[str] = mapped_column(String(50), nullable=False, default="INSTANT") # INSTANT, T1, T2
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PosMdrConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    """
    Enterprise Dynamic MDR Configuration Table.
    Priority Resolution:
    1. Retailer-Specific MDR (retailer_id == specific_retailer_uuid)
    2. Default MDR (retailer_id IS NULL)
    3. If neither exists -> Configuration error.
    """
    __tablename__ = "pos_mdr_configuration"
    __table_args__ = (
        Index("idx_pos_mdr_retailer", "retailer_id"),
        Index("idx_pos_mdr_pm", "payment_mode"),
        Index("idx_pos_mdr_active", "is_active", "is_deleted"),
        Index("idx_pos_mdr_dates", "effective_from", "effective_to"),
        Index("idx_pos_mdr_tenant_comp", "tenant_id", "company_id"),
        {"extend_existing": True}
    )

    # Scoping Identifiers
    tenant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True) # NULL represents Default MDR

    # Payment Mode & MDR Rules
    payment_mode: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # POS - Instant, POS+T1, POS+T2
    mdr: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False) # Rate value, e.g. 0.5000 or 50.00
    mdr_type: Mapped[str] = mapped_column(String(20), nullable=False, default="PERCENTAGE") # PERCENTAGE, FIXED
    gst_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.00) # GST percentage on MDR charge (default 0.00)

    # Effective Date Range
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Status & Audit
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)


class PosCardTypeModel(Base):
    """
    Master registry of dynamic POS Card Types (e.g. VISA, MASTER, RUPAY, AMEX / DINERS).
    """
    __tablename__ = "pos_card_types"
    __table_args__ = (
        Index("idx_pos_card_type_code", "code"),
        {"extend_existing": True}
    )

    card_type_ref_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PosMdrCommissionConfigModel(Base):
    """
    Company-level default POS MDR and Hierarchy Commission Configuration.
    Defaults:
    - default_distributor_mdr = 0.0000%
    - default_sd_mdr = 0.0000%
    - distributor_commission = 0.0000%
    - sd_commission = 0.0000%
    """
    __tablename__ = "pos_mdr_commission_config"
    __table_args__ = (
        Index("idx_pos_mdr_comm_comp", "company_id", "company_ref_id"),
        Index("idx_pos_mdr_comm_mode", "payment_mode"),
        {"extend_existing": True}
    )

    pos_mdr_commission_config_ref_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    company_ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    card_type_ref_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    payment_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    distributor_commission: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0.0000)
    sd_commission: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0.0000)
    default_distributor_mdr: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0.0000)
    default_sd_mdr: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0.0000)
    retailer_mdr_override: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PosMdrChangeRequestModel(Base):
    """
    Enterprise POS MDR Change Request Model.
    Tracks requests created by Super Distributors, Distributors, Retailers, or ASMs.
    Automatically resolves Hierarchy, Tenant/Company, POS Terminal, and Assigned ASM.
    Governs state transitions: DRAFT -> SUBMITTED/ASM_PENDING -> ASM_APPROVED/REJECTED/HOLD -> ADMIN_PENDING -> ADMIN_UPDATED -> COMPLETED.
    """
    __tablename__ = "pos_mdr_change_request"
    __table_args__ = (
        Index("idx_pmcr_tenant_comp", "tenant_id", "company_id"),
        Index("idx_pmcr_status", "status"),
        Index("idx_pmcr_asm_id", "asm_user_id", "status"),
        Index("idx_pmcr_requester", "requester_public_id", "status"),
        Index("idx_pmcr_retailer", "retailer_id"),
        Index("idx_pmcr_pos_tid", "pos_tid"),
        Index("idx_pmcr_commitment", "commitment_year", "commitment_month"),
        Index("idx_pmcr_created_at", "created_at"),
        {"extend_existing": True}
    )

    mdr_request_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)

    # Scoping Identifiers
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    tenant_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    company_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)

    # Requester Details (Auto-derived from Auth)
    requester_user_type_ref_id: Mapped[int] = mapped_column(Integer, nullable=False) # 2: Retailer, 3: Distributor, 4: SD, 5: ASM
    requester_user_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    requester_public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    requester_name: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    requester_role: Mapped[str] = mapped_column(String(50), nullable=False, default="RETAILER")

    # Hierarchy Snapshot (Auto-resolved)
    super_distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    super_distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    super_distributor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    distributor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    distributor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    distributor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    retailer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    retailer_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    retailer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    pos_machine_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    pos_serial_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pos_tid: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    # Assigned Sales Officer / ASM (Auto-resolved from Hierarchy Mapping)
    asm_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    asm_user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    asm_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    asm_employee_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    asm_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Commitment & Commercial Parameters
    commitment_month: Mapped[int] = mapped_column(Integer, nullable=False) # 1 to 12
    commitment_year: Mapped[int] = mapped_column(Integer, nullable=False) # e.g. 2026
    expected_monthly_volume: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0.00)

    # Rates Snapshots (JSON format: {visa: float, mastercard: float, rupay: float, amex_diners: float})
    current_mdr: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    requested_mdr: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    final_mdr: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_documents: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, nullable=True, default=list)

    # Workflow Status & Decision
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ASM_PENDING", index=True)
    asm_decision: Mapped[Optional[str]] = mapped_column(String(30), nullable=True) # APPROVED, REJECTED, HOLD
    asm_decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    asm_decision_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    admin_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    admin_user_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    admin_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    admin_decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Audit & Temporal Keys
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    daykey: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    monthkey: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    yearkey: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    financialyearkey: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class PosMdrChangeRequestAuditModel(Base):
    """
    Audit Trail Model for POS MDR Change Request Workflow Transitions.
    Records creation, ASM actions (Approve/Reject/Hold), Resubmissions, and Admin MDR updates.
    """
    __tablename__ = "pos_mdr_change_request_audit"
    __table_args__ = (
        Index("idx_pmcra_request_ref", "request_ref_id"),
        Index("idx_pmcra_tenant_id", "tenant_id"),
        Index("idx_pmcra_action", "action"),
        Index("idx_pmcra_created_at", "created_at"),
        {"extend_existing": True}
    )

    audit_ref_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    request_ref_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    request_public_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    actor_type: Mapped[str] = mapped_column(String(50), nullable=False) # REQUESTER, ASM, ADMIN, SYSTEM
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_ref_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    actor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    action: Mapped[str] = mapped_column(String(50), nullable=False) # CREATED, SUBMITTED, VIEWED, ASM_APPROVED, ASM_REJECTED, ASM_HELD, RESUBMITTED, ADMIN_VIEWED, MDR_UPDATED, COMPLETED
    action_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    previous_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    metadata_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


