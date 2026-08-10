"""EPIC-023 — Customer & Beneficiary Policy, Limit & Configuration Engine — ORM Models"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float, JSON
)
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, UUID
JSONB = JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class PolicyMasterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "policy_master"

    policy_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    policy_name: Mapped[str] = mapped_column(String(200), nullable=False)
    policy_category: Mapped[str] = mapped_column(String(50), nullable=False)  # CUSTOMER, BENEFICIARY, SERVICE, LIMIT, RISK, APPROVAL, OTP, COOLING
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    policy_status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT", index=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    versions: Mapped[List["PolicyVersionModel"]] = relationship("PolicyVersionModel", back_populates="policy", cascade="all, delete-orphan")
    scopes: Mapped[List["PolicyScopeModel"]] = relationship("PolicyScopeModel", back_populates="policy", cascade="all, delete-orphan")
    assignments: Mapped[List["PolicyAssignmentModel"]] = relationship("PolicyAssignmentModel", back_populates="policy", cascade="all, delete-orphan")
    histories: Mapped[List["PolicyHistoryModel"]] = relationship("PolicyHistoryModel", back_populates="policy", cascade="all, delete-orphan")
    audits: Mapped[List["PolicyAuditModel"]] = relationship("PolicyAuditModel", back_populates="policy", cascade="all, delete-orphan")
    publish_logs: Mapped[List["PolicyPublishLogModel"]] = relationship("PolicyPublishLogModel", back_populates="policy", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "policy_code", name="uq_policy_master_tenant_code"),
    )


class PolicyVersionModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "policy_version"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    rules_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    version_status: Mapped[str] = mapped_column(String(30), nullable=False, default="DRAFT")  # DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED, DEPRECATED
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    policy: Mapped["PolicyMasterModel"] = relationship("PolicyMasterModel", back_populates="versions")


class PolicyScopeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "policy_scope"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    scope_level: Mapped[str] = mapped_column(String(50), nullable=False, default="PLATFORM")  # 11-tier: PLATFORM, COMPANY, REGION, RM, SD, DISTRIBUTOR, RETAILER, CUST_CAT, CUSTOMER, BEN_CAT, BENEFICIARY
    target_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    service_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    priority_rank: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    policy: Mapped["PolicyMasterModel"] = relationship("PolicyMasterModel", back_populates="scopes")


class PolicyAssignmentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "policy_assignment"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    assigned_entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    is_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    policy: Mapped["PolicyMasterModel"] = relationship("PolicyMasterModel", back_populates="assignments")


class CustomerPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "customer_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    min_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=18)
    max_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    otp_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    aadhaar_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    pan_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    video_kyc_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class BeneficiaryPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    max_beneficiaries_per_customer: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=10)
    penny_drop_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    name_match_score_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=80.0)
    cooling_period_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=24)


class ServicePolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "service_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    required_kyc_level: Mapped[str] = mapped_column(String(50), nullable=False, default="MINIMUM_KYC")


class LimitPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "limit_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    single_txn_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    daily_amount_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_amount_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    yearly_amount_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    daily_count_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)


class RiskPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "risk_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    max_risk_score_allowed: Mapped[int] = mapped_column(Integer, nullable=False, default=70)
    aml_screening_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    pep_screening_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sanction_check_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ApprovalPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "approval_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    approval_type: Mapped[str] = mapped_column(String(50), nullable=False, default="AUTO")
    amount_threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    required_approver_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)


class OtpPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "otp_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_condition: Mapped[str] = mapped_column(String(50), nullable=False, default="ALWAYS")
    threshold_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    expiry_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300)


class CoolingPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "cooling_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    target_event: Mapped[str] = mapped_column(String(50), nullable=False, default="NEW_BENEFICIARY")
    cooling_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=24)


class HolidayPolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "holiday_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)
    holiday_name: Mapped[str] = mapped_column(String(100), nullable=False)
    allow_transactions: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class OverridePolicyModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "override_policy"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    override_level: Mapped[str] = mapped_column(String(50), nullable=False)
    override_target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    override_rules: Mapped[dict] = mapped_column(JSONB, nullable=False)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    effective_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class PolicyHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "policy_history"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    old_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    new_version: Mapped[int] = mapped_column(Integer, nullable=False)
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    policy: Mapped["PolicyMasterModel"] = relationship("PolicyMasterModel", back_populates="histories")


class PolicyAuditModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "policy_audit"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action_name: Mapped[str] = mapped_column(String(100), nullable=False)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    policy: Mapped["PolicyMasterModel"] = relationship("PolicyMasterModel", back_populates="audits")


class PolicyPublishLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "policy_publish_log"

    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    published_version: Mapped[int] = mapped_column(Integer, nullable=False)
    published_by: Mapped[str] = mapped_column(String(100), nullable=False)
    publish_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    policy: Mapped["PolicyMasterModel"] = relationship("PolicyMasterModel", back_populates="publish_logs")
