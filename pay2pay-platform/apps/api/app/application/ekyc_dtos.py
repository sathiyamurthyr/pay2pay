"""EPIC: Enterprise Aadhaar eKYC Verification Module — Data Transfer Objects (DTOs)
"""

import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CustomerSearchQuery(BaseModel):
    query: str = Field(..., description="Mobile Number, Customer ID, Aadhaar (Masked), PAN, or Name")


class CustomerSearchResponse(BaseModel):
    exists: bool
    customer_id: Optional[str] = None
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    aadhaar_masked: Optional[str] = None
    pan_masked: Optional[str] = None
    kyc_status: Optional[str] = None
    risk_level: Optional[str] = None
    created_at: Optional[str] = None


class CustomerBasicDetailsRequest(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    dob: str
    gender: str
    email: Optional[str] = None
    mobile: str
    alt_mobile: Optional[str] = None
    occupation: Optional[str] = None
    nationality: str = "Indian"
    customer_type: str = "INDIVIDUAL"
    address: str
    pincode: str


class AadhaarOcrRequest(BaseModel):
    verification_id: uuid.UUID
    front_image_url: str
    back_image_url: Optional[str] = None


class AadhaarQrRequest(BaseModel):
    verification_id: uuid.UUID
    qr_data: str


class GenerateAadhaarOtpRequest(BaseModel):
    verification_id: uuid.UUID
    aadhaar_number: str = Field(..., min_length=12, max_length=14)


class VerifyAadhaarOtpRequest(BaseModel):
    verification_id: uuid.UUID
    otp_reference: str
    otp_code: str = Field(..., min_length=6, max_length=6)


class FaceLivenessRequest(BaseModel):
    verification_id: uuid.UUID
    selfie_image_url: str
    doc_photo_url: Optional[str] = None
    threshold: float = 90.0


class RiskEvaluationRequest(BaseModel):
    verification_id: uuid.UUID
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = "127.0.0.1"


class FinalDecisionRequest(BaseModel):
    verification_id: uuid.UUID
    override_decision: Optional[str] = None # APPROVED, MANUAL_REVIEW, REJECTED
    override_reason: Optional[str] = None


class VerificationAuditResponse(BaseModel):
    verification_id: uuid.UUID
    customer_id: Optional[str]
    current_step: str
    status: str
    ocr_confidence: Optional[float] = None
    face_score: Optional[float] = None
    liveness_score: Optional[float] = None
    risk_score: Optional[float] = None
    decision: Optional[str] = None
    timeline: List[Dict[str, Any]]
    audit_log: Dict[str, Any]
