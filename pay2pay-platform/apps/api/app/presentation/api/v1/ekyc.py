"""EPIC: Enterprise Aadhaar eKYC Verification Module — API Router
Exposes production endpoints for Customer Search, Basic Details, OCR, QR, OTP, Face Liveness, Risk Engine, Decision Engine, and Audit Records.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import get_db, get_current_tenant_id, get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.application.ekyc_dtos import (
    CustomerSearchResponse, CustomerBasicDetailsRequest, AadhaarOcrRequest,
    AadhaarQrRequest, GenerateAadhaarOtpRequest, VerifyAadhaarOtpRequest,
    FaceLivenessRequest, RiskEvaluationRequest, FinalDecisionRequest
)
from app.application.ekyc_service import EkycVerificationService

router = APIRouter(prefix="/ekyc", tags=["Enterprise Aadhaar eKYC"])


@router.get("/search", response_model=APIResponse)
async def search_existing_customer(
    query: str = Query(..., description="Search customer by Mobile, ID, Aadhaar, PAN, or Name"),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id)
):
    """Step 1: Search existing customer before initiating eKYC."""
    res = await EkycVerificationService.search_customer(db, tenant_id, query)
    return APIResponse(data=res.model_dump())


@router.post("/initiate", response_model=APIResponse, status_code=201)
async def initiate_ekyc_verification(
    req: CustomerBasicDetailsRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 2: Capture Customer Basic Details and initiate eKYC workflow."""
    res = await EkycVerificationService.initiate_verification(db, tenant_id, req)
    return APIResponse(message="eKYC Verification Initiated", data=res)


@router.post("/ocr", response_model=APIResponse)
async def process_aadhaar_ocr(
    req: AadhaarOcrRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 4: Process Aadhaar OCR (Front/Back/Camera) and extract fields + confidence score."""
    try:
        res = await EkycVerificationService.process_ocr(db, req)
        return APIResponse(message="OCR Extracted Successfully", data=res)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/qr-verify", response_model=APIResponse)
async def verify_aadhaar_secure_qr(
    req: AadhaarQrRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 5: Verify Secure Aadhaar QR Code & UIDAI Digital Signature."""
    try:
        res = await EkycVerificationService.process_qr(db, req)
        return APIResponse(message="Secure QR Signature Verified", data=res)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/otp/generate", response_model=APIResponse)
async def generate_aadhaar_otp(
    req: GenerateAadhaarOtpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 6: Request Aadhaar eKYC OTP to registered mobile."""
    try:
        res = await EkycVerificationService.generate_otp(db, req)
        return APIResponse(message=res["message"], data=res)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/otp/verify", response_model=APIResponse)
async def verify_aadhaar_otp(
    req: VerifyAadhaarOtpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 6: Validate 6-digit Aadhaar OTP and retrieve verified eKYC profile."""
    try:
        res = await EkycVerificationService.verify_otp(db, req)
        return APIResponse(message="Aadhaar OTP Verified Successfully", data=res)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/face-liveness", response_model=APIResponse)
async def verify_face_match_liveness(
    req: FaceLivenessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 8: Run Live Selfie Liveness Detection and Face Match vs Aadhaar Photo."""
    try:
        res = await EkycVerificationService.process_face_liveness(db, req)
        return APIResponse(message="Face Match & Liveness Check Completed", data=res)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/risk-check", response_model=APIResponse)
async def evaluate_fraud_risk(
    req: RiskEvaluationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 9: Run Risk Engine & Fraud Validations (Duplicates, AML, Geo, Velocity)."""
    try:
        res = await EkycVerificationService.evaluate_risk_engine(db, req)
        return APIResponse(message="Risk Evaluation Completed", data=res)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/decision", response_model=APIResponse)
async def execute_final_decision(
    req: FinalDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Step 10 & 11: Execute Final Decision Engine (APPROVED, MANUAL_REVIEW, REJECTED)."""
    try:
        res = await EkycVerificationService.execute_decision_engine(db, req)
        return APIResponse(message=f"Verification Status: {res['decision']}", data=res)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
