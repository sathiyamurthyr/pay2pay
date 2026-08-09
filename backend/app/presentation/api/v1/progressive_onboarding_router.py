from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.progressive_onboarding_service import ProgressiveOnboardingService

router = APIRouter(prefix="/onboarding", tags=["Progressive Onboarding & KYC"])


class CheckMobilePayload(BaseModel):
    mobile_number: str = Field(..., example="9176669426")

class VerifyMobileOtpPayload(BaseModel):
    registration_id: str
    otp_code: str = Field(..., example="778899")

class CheckEmailPayload(BaseModel):
    registration_id: str
    email: str = Field(..., example="retailer@pay2pay.in")

class VerifyEmailOtpPayload(BaseModel):
    registration_id: str
    otp_code: str = Field(..., example="556677")

class CreateCredentialsPayload(BaseModel):
    registration_id: str
    password: str = Field(..., example="Retailer#2026")
    mpin: str = Field(..., example="1234")

class VerifyPanPayload(BaseModel):
    registration_id: str
    pan_number: str = Field(..., example="ABCDE1234F")

class VerifyGstPayload(BaseModel):
    registration_id: str
    gst_number: str = Field(..., example="33ABCDE1234F1Z5")

class SendAadhaarOtpPayload(BaseModel):
    registration_id: str
    aadhaar_number: str = Field(..., example="123456789012")

class VerifyAadhaarOtpPayload(BaseModel):
    registration_id: str
    ref_id: str
    otp_code: str = Field(..., example="778899")

class VerifyBankPayload(BaseModel):
    registration_id: str
    account_number: str = Field(..., example="50100012345678")
    ifsc: str = Field(..., example="HDFC0001234")
    name: str = Field(..., example="SATHIYA MURTHY")
    account_type: Optional[str] = "SAVINGS"

class ShopDetailsPayload(BaseModel):
    registration_id: str
    shop_name: str
    category: str
    subcategory: Optional[str] = None
    years_in_business: Optional[int] = 5
    employees: Optional[int] = 3
    monthly_estimate: Optional[str] = "₹5 Lakhs - ₹10 Lakhs"
    annual_turnover: Optional[str] = "₹50 Lakhs - ₹1 Crore"
    website: Optional[str] = None

class ShopAddressPayload(BaseModel):
    registration_id: str
    street: str
    area: Optional[str] = None
    landmark: Optional[str] = None
    city: str
    district: str
    state: str
    pincode: str
    country: Optional[str] = "India"
    latitude: Optional[float] = 12.9249
    longitude: Optional[float] = 80.1000
    shop_photo_url: Optional[str] = None

class DocumentUploadPayload(BaseModel):
    registration_id: str
    doc_type: str
    file_name: str
    file_url: str
    file_size_bytes: Optional[int] = 245000
    mime_type: Optional[str] = "image/jpeg"

class VideoUploadPayload(BaseModel):
    registration_id: str
    video_url: str
    duration_seconds: Optional[int] = 15
    script_text: Optional[str] = "I confirm that I am registering as a Pay2Pay Retailer."

class SubmitPayload(BaseModel):
    registration_id: str


@router.post("/check-mobile")
async def check_mobile(payload: CheckMobilePayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.check_mobile(db, payload.mobile_number)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-mobile-otp")
async def verify_mobile_otp(payload: VerifyMobileOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_mobile_otp(db, payload.registration_id, payload.otp_code)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/check-email")
async def check_email(payload: CheckEmailPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.check_email(db, payload.registration_id, payload.email)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-email-otp")
async def verify_email_otp(payload: VerifyEmailOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_email_otp(db, payload.registration_id, payload.otp_code)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/create-credentials")
async def create_credentials(payload: CreateCredentialsPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.create_credentials(db, payload.registration_id, payload.password, payload.mpin)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-pan")
async def verify_pan(payload: VerifyPanPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_pan(db, payload.registration_id, payload.pan_number)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-gst")
async def verify_gst(payload: VerifyGstPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_gst(db, payload.registration_id, payload.gst_number)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/send-aadhaar-otp")
async def send_aadhaar_otp(payload: SendAadhaarOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.send_aadhaar_otp(db, payload.registration_id, payload.aadhaar_number)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-aadhaar-otp")
async def verify_aadhaar_otp(payload: VerifyAadhaarOtpPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_aadhaar_otp(db, payload.registration_id, payload.ref_id, payload.otp_code)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/verify-bank")
async def verify_bank(payload: VerifyBankPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.verify_bank(db, payload.registration_id, payload.account_number, payload.ifsc, payload.name, payload.account_type or "SAVINGS")
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/shop-details")
async def save_shop_details(payload: ShopDetailsPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.save_shop_details(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/shop-address")
async def save_shop_address(payload: ShopAddressPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.save_shop_address(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/upload-document")
async def upload_document(payload: DocumentUploadPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.upload_document(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.post("/upload-video")
async def upload_video(payload: VideoUploadPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.upload_video(db, payload.registration_id, payload.model_dump())
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@router.get("/resume/{identifier}")
async def resume_draft(identifier: str, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.resume_draft(db, identifier)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=404, detail=res["message"])
    return res


@router.post("/submit")
async def submit_registration(payload: SubmitPayload, db: AsyncSession = Depends(get_db)):
    res = await ProgressiveOnboardingService.submit_registration(db, payload.registration_id)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res
