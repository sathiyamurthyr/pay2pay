"""
Utkal Digital Payout Gateway API Router
Provides endpoints to:
- Execute Payout via Utkal Digital
- Verify Payout Status
- Fetch Live Balance
"""

import uuid
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.utkaldigital_client import UtkalDigitalApiClient

logger = logging.getLogger("utkaldigital_payout_router")

router = APIRouter(prefix="/payouts/utkaldigital", tags=["Utkal Digital Payout Gateway"])


class UtkalPayoutRequest(BaseModel):
    account_number: str = Field(..., description="Beneficiary Bank Account Number")
    ifsc_code: str = Field(..., description="Beneficiary IFSC Code")
    beneficiary_name: str = Field(..., description="Beneficiary Name")
    amount: float = Field(..., description="Payout Amount in INR")
    merchant_ref: Optional[str] = Field(None, description="Custom Unique Merchant Reference")
    sender_mobile: Optional[str] = Field("7873314226", description="Sender Customer Mobile Number")
    sender_name: Optional[str] = Field("Customer", description="Sender Customer Name")
    bank_name: Optional[str] = Field("Bank", description="Beneficiary Bank Name")
    bank_code: Optional[str] = Field("MAGNI", description="Bank Code")
    service_id: Optional[str] = Field("27", description="Service ID (27 for IMPS)")
    aadhar_no: Optional[str] = Field("123456789205", description="Aadhaar Number")
    pan_no: Optional[str] = Field("CWMPS5725E", description="PAN Number")
    lat: Optional[str] = Field("16.53333", description="Latitude")
    long: Optional[str] = Field("23.55212", description="Longitude")
    authcode: Optional[str] = None
    mpin: Optional[str] = None


class UtkalVerifyRequest(BaseModel):
    request_id: str = Field(..., description="Transaction RequestID to verify")
    sender_name: Optional[str] = Field("Customer", description="Sender Name")
    sender_mobile: Optional[str] = Field("9876543210", description="Sender Mobile")
    bank_name: Optional[str] = Field("Bank", description="Bank Name")
    bank_code: Optional[str] = Field("UTIB", description="Bank Code")
    account_no: Optional[str] = Field("", description="Bank Account Number")
    ifsc: Optional[str] = Field("", description="Bank IFSC Code")
    service_id: Optional[str] = Field("26", description="Service ID")
    aadhar_no: Optional[str] = Field("123456789205", description="Aadhaar Number")
    pan_no: Optional[str] = Field("CWMPS5725E", description="PAN Number")
    lat: Optional[str] = Field("16.53333", description="Latitude")
    long: Optional[str] = Field("23.55212", description="Longitude")
    authcode: Optional[str] = None
    mpin: Optional[str] = None


class UtkalBalanceRequest(BaseModel):
    authcode: Optional[str] = None
    mpin: Optional[str] = None


@router.post("/transaction")
async def initiate_payout(req: UtkalPayoutRequest, db: AsyncSession = Depends(get_db)):
    """Initiates an instant payout transaction via Utkal Digital."""
    tx_ref = req.merchant_ref or f"UTK{uuid.uuid4().hex[:10].upper()}"
    res = await UtkalDigitalApiClient.initiate_payout(
        merchant_ref=tx_ref,
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        account_holder=req.beneficiary_name,
        amount=req.amount,
        sender_mobile=req.sender_mobile or "7873314226",
        sender_name=req.sender_name or "Customer",
        bank_name=req.bank_name or "Bank",
        bank_code=req.bank_code or "MAGNI",
        service_id=req.service_id or "27",
        aadhar_no=req.aadhar_no or "123456789205",
        pan_no=req.pan_no or "CWMPS5725E",
        lat=req.lat or "16.53333",
        long=req.long or "23.55212",
        authcode=req.authcode,
        mpin=req.mpin
    )
    return {
        "status": "SUCCESS" if res.get("success") else "FAILED",
        "data": res
    }


@router.post("/verify")
async def verify_payout(req: UtkalVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verifies transaction status with Utkal Digital."""
    res = await UtkalDigitalApiClient.check_payout_status(
        request_id=req.request_id,
        sender_name=req.sender_name or "Customer",
        sender_mobile=req.sender_mobile or "9876543210",
        bank_name=req.bank_name or "Bank",
        bank_code=req.bank_code or "UTIB",
        account_no=req.account_no or "",
        ifsc=req.ifsc or "",
        service_id=req.service_id or "26",
        aadhar_no=req.aadhar_no or "123456789205",
        pan_no=req.pan_no or "CWMPS5725E",
        lat=req.lat or "16.53333",
        long=req.long or "23.55212",
        authcode=req.authcode,
        mpin=req.mpin
    )
    return {
        "status": "SUCCESS" if res.get("success") else "FAILED",
        "data": res
    }


@router.post("/balance")
@router.get("/balance")
async def fetch_balance(req: Optional[UtkalBalanceRequest] = None, db: AsyncSession = Depends(get_db)):
    """Fetches real-time live balance from Utkal Digital API."""
    auth = req.authcode if req else None
    mp = req.mpin if req else None
    res = await UtkalDigitalApiClient.check_balance(authcode=auth, mpin=mp)
    return {
        "status": "SUCCESS",
        "data": res
    }
