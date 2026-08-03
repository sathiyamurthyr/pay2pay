"""EPIC-022 — Beneficiary Management & Verification Platform — ORM Models"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class BeneficiaryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary"

    beneficiary_number: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(300), nullable=False)
    nickname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    relationship: Mapped[str] = mapped_column(String(50), nullable=False)
    mobile_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    beneficiary_category: Mapped[str] = mapped_column(String(50), nullable=False, default="REGULAR")
    beneficiary_type: Mapped[str] = mapped_column(String(50), nullable=False, default="INDIVIDUAL")
    preferred_language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    risk_category: Mapped[str] = mapped_column(String(30), nullable=False, default="LOW")
    beneficiary_status: Mapped[str] = mapped_column(String(50), nullable=False, default="DRAFT", index=True)
    cooling_period_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_favourite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    registration_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    activation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    ben_profile: Mapped[Optional["BeneficiaryProfileModel"]] = orm_relationship("BeneficiaryProfileModel", back_populates="beneficiary", uselist=False, cascade="all, delete-orphan")
    ben_bank_accounts: Mapped[List["BeneficiaryBankAccountModel"]] = orm_relationship("BeneficiaryBankAccountModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_upis: Mapped[List["BeneficiaryUpiModel"]] = orm_relationship("BeneficiaryUpiModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_verifications: Mapped[List["BeneficiaryVerificationModel"]] = orm_relationship("BeneficiaryVerificationModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_documents: Mapped[List["BeneficiaryDocumentModel"]] = orm_relationship("BeneficiaryDocumentModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_services: Mapped[List["BeneficiaryServiceModel"]] = orm_relationship("BeneficiaryServiceModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_limit_overrides: Mapped[List["BeneficiaryLimitOverrideModel"]] = orm_relationship("BeneficiaryLimitOverrideModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_risk_profile: Mapped[Optional["BeneficiaryRiskProfileModel"]] = orm_relationship("BeneficiaryRiskProfileModel", back_populates="beneficiary", uselist=False, cascade="all, delete-orphan")
    ben_status_history: Mapped[List["BeneficiaryStatusHistoryModel"]] = orm_relationship("BeneficiaryStatusHistoryModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_relationships: Mapped[List["BeneficiaryRelationshipModel"]] = orm_relationship("BeneficiaryRelationshipModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_timeline: Mapped[List["BeneficiaryTimelineModel"]] = orm_relationship("BeneficiaryTimelineModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_preference: Mapped[Optional["BeneficiaryPreferenceModel"]] = orm_relationship("BeneficiaryPreferenceModel", back_populates="beneficiary", uselist=False, cascade="all, delete-orphan")
    ben_whitelists: Mapped[List["BeneficiaryWhitelistModel"]] = orm_relationship("BeneficiaryWhitelistModel", back_populates="beneficiary", cascade="all, delete-orphan")
    ben_audits: Mapped[List["BeneficiaryAuditModel"]] = orm_relationship("BeneficiaryAuditModel", back_populates="beneficiary", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "beneficiary_number", name="uq_beneficiary_tenant_number"),
    )


class BeneficiaryProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_profile"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    address_line1: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pin_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="INDIA")
    business_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pan_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    profile_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_profile")


class BeneficiaryBankAccountModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_bank_account"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    account_holder_name: Mapped[str] = mapped_column(String(300), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    account_number_masked: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    branch_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    account_type: Mapped[str] = mapped_column(String(30), nullable=False, default="SAVINGS")
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="UNVERIFIED")
    verification_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verification_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    penny_drop_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    name_match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    registered_name_in_bank: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_bank_accounts")


class BeneficiaryUpiModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_upi"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    upi_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    upi_handle: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider_app: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    registered_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="UNVERIFIED")
    verification_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_upis")


class BeneficiaryVerificationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_verification"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    verification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False)
    penny_drop_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bank_response_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    name_returned_by_bank: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    name_match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_name_matched: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_verifications")


class BeneficiaryDocumentModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_document"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    document_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_documents")


class BeneficiaryServiceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_service"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    eligibility_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ELIGIBLE")
    eligibility_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cooling_period_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_services")

    __table_args__ = (
        UniqueConstraint("beneficiary_id", "service_code", name="uq_beneficiary_service"),
    )


class BeneficiaryServiceConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_service_configuration"

    service_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    verification_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    cooling_period_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=24)
    max_transfer_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_monthly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    approval_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    otp_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    risk_validation_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "service_code", name="uq_ben_service_config_tenant_code"),
    )


class BeneficiaryLimitConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_limit_configuration"

    service_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    hierarchy_level: Mapped[str] = mapped_column(String(50), nullable=False, default="BENEFICIARY")
    beneficiary_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    single_txn_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    daily_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    daily_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weekly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    monthly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    yearly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_failed_attempts: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=3)
    cooling_period_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    override_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    limit_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")


class BeneficiaryLimitOverrideModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_limit_override"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    single_txn_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    daily_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monthly_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approval_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    override_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_limit_overrides")


class BeneficiaryTransactionCounterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_transaction_counter"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    counter_date: Mapped[date] = mapped_column(Date, nullable=False)
    txn_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("beneficiary_id", "service_code", "counter_date", name="uq_ben_daily_counter"),
    )


class BeneficiaryMonthlyCounterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_monthly_counter"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    counter_year: Mapped[int] = mapped_column(Integer, nullable=False)
    counter_month: Mapped[int] = mapped_column(Integer, nullable=False)
    txn_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("beneficiary_id", "service_code", "counter_year", "counter_month", name="uq_ben_monthly_counter"),
    )


class BeneficiaryYearlyCounterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_yearly_counter"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[str] = mapped_column(String(50), nullable=False)
    counter_year: Mapped[int] = mapped_column(Integer, nullable=False)
    txn_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("beneficiary_id", "service_code", "counter_year", name="uq_ben_yearly_counter"),
    )


class BeneficiaryRiskProfileModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_risk_profile"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_category: Mapped[str] = mapped_column(String(30), nullable=False, default="LOW")
    aml_screening: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="CLEAR")
    pep_screening: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sanction_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    watch_list_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    bank_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    velocity_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_risk_profile")


class BeneficiaryStatusHistoryModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_status_history"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    effective_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_status_history")


class BeneficiaryRelationshipModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_relationship"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active_rel: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_relationships")


class BeneficiaryTimelineModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_timeline"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    event_title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    performed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    event_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_timeline")


class BeneficiaryPreferenceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_preference"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, unique=True)
    notification_sms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notification_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_preference")


class BeneficiaryBlacklistModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_blacklist"

    account_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    upi_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mobile_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    blacklist_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_permanent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    blacklist_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")


class BeneficiaryWhitelistModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_whitelist"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    service_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    whitelist_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_whitelists")


class BeneficiaryAuditModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "beneficiary_audit"

    beneficiary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("beneficiary.public_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    performed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    audit_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    audit_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    beneficiary: Mapped["BeneficiaryModel"] = orm_relationship("BeneficiaryModel", back_populates="ben_audits")
