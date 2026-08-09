"""EPIC: Enterprise Aadhaar eKYC Verification Module — Database Models
Contains SQLAlchemy Async Mappings for all 11 required eKYC tables.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class CustomerVerificationModel(Base):
    __tablename__ = "customer_verification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True, nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    dob: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    alt_mobile: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    nationality: Mapped[str] = mapped_column(String(50), default="Indian")
    customer_type: Mapped[str] = mapped_column(String(50), default="INDIVIDUAL")
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    
    current_step: Mapped[str] = mapped_column(String(50), default="CUSTOMER_DETAILS")
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True) # PENDING, APPROVED, MANUAL_REVIEW, REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AadhaarVerificationModel(Base):
    __tablename__ = "aadhaar_verification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    public_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), default=uuid.uuid4, nullable=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    verification_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    masked_aadhaar: Mapped[str] = mapped_column(String(20), nullable=False)
    aadhaar_ref_token: Mapped[str] = mapped_column(String(255), nullable=False) # Tokenized reference (SHA-256 hashed)
    mode: Mapped[str] = mapped_column(String(50), default="MANUAL_OTP") # QR_SCAN, UPLOAD_IMAGE, CAMERA_CAPTURE, MANUAL_OTP
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    care_of: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    photo_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    encrypted_pii: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(50), default="VERIFIED")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AadhaarOcrResultModel(Base):
    __tablename__ = "aadhaar_ocr_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    extracted_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    extracted_dob: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    extracted_gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    extracted_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    masked_aadhaar: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    qr_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0) # e.g. 96.5%
    manual_review_required: Mapped[bool] = mapped_column(Boolean, default=False)
    provider_name: Mapped[str] = mapped_column(String(100), default="EnterpriseOcrProvider")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AadhaarQrResultModel(Base):
    __tablename__ = "aadhaar_qr_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    masked_aadhaar: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    photo_base64: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    digital_signature_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    verification_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class OtpTransactionModel(Base):
    __tablename__ = "otp_transaction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    otp_reference: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    masked_mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="SENT") # SENT, VERIFIED, EXPIRED, FAILED
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    provider_name: Mapped[str] = mapped_column(String(100), default="UIDAIeKYCProvider")


class FaceMatchModel(Base):
    __tablename__ = "face_match"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    selfie_url: Mapped[str] = mapped_column(String(500), nullable=False)
    document_photo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    match_score: Mapped[float] = mapped_column(Float, nullable=False) # e.g. 96.2%
    threshold: Mapped[float] = mapped_column(Float, default=90.0)
    is_match: Mapped[bool] = mapped_column(Boolean, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=1)
    provider_name: Mapped[str] = mapped_column(String(100), default="EnterpriseBiometricProvider")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class LivenessResultModel(Base):
    __tablename__ = "liveness_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    liveness_score: Mapped[float] = mapped_column(Float, nullable=False) # e.g. 98.4%
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    liveness_checks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # blink, head_turn, texture
    provider_name: Mapped[str] = mapped_column(String(100), default="PassiveLivenessEngine")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FraudCheckResultModel(Base):
    __tablename__ = "fraud_check_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    duplicate_aadhaar: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_pan: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_mobile: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_device: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_face: Mapped[bool] = mapped_column(Boolean, default=False)
    blacklist_match: Mapped[bool] = mapped_column(Boolean, default=False)
    watchlist_match: Mapped[bool] = mapped_column(Boolean, default=False)
    aml_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    sanction_match: Mapped[bool] = mapped_column(Boolean, default=False)
    velocity_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    geo_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    ip_reputation_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_risk_score: Mapped[float] = mapped_column(Float, default=12.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class VerificationDecisionModel(Base):
    __tablename__ = "verification_decision"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    decision: Mapped[str] = mapped_column(String(50), nullable=False) # APPROVED, MANUAL_REVIEW, REJECTED
    reasons: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class VerificationAuditModel(Base):
    __tablename__ = "verification_audit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_verification.verification_id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    store_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    retailer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    agent_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    session_id: Mapped[str] = mapped_column(String(100), nullable=False)
    
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    face_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    liveness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    otp_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    api_provider: Mapped[str] = mapped_column(String(100), default="EnterpriseMultiEngineAdapter")
    api_latency_ms: Mapped[int] = mapped_column(Integer, default=145)
    
    device_info: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    os: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False, default="127.0.0.1")
    geo_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="IN-KA-BLR")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class ApiTransactionLogModel(Base):
    __tablename__ = "api_transaction_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    provider_type: Mapped[str] = mapped_column(String(50), nullable=False) # OCR, QR, OTP, FACE, LIVENESS, RISK
    provider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    http_status: Mapped[int] = mapped_column(Integer, default=200)
    latency_ms: Mapped[int] = mapped_column(Integer, default=120)
    request_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    response_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
