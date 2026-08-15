from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.application.cashfree_service import CashfreeVerificationService

router = APIRouter(prefix="/verification", tags=["Cashfree Verification Suite v2"])


class PanVerifyRequest(BaseModel):
    pan: str = Field(..., description="10-character PAN number", example="ABCDE1234F")
    name: Optional[str] = Field(None, description="Owner / Merchant Full Name", example="Merchant Name")


class AadhaarVerifyRequest(BaseModel):
    aadhaar_number: str = Field(..., description="12-digit Aadhaar number", example="123456789012")


@router.post("/pan")
async def verify_pan(req: PanVerifyRequest):
    """
    Real-time PAN Card Verification via Cashfree Verification Suite v2 API.
    """
    return CashfreeVerificationService.verify_pan(pan_number=req.pan, name=req.name)


@router.post("/aadhaar")
async def verify_aadhaar(req: AadhaarVerifyRequest):
    """
    Real-time Aadhaar Card Verification via Cashfree Verification Suite v2 API.
    """
    return CashfreeVerificationService.verify_aadhaar(aadhaar_number=req.aadhaar_number)
