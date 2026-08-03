"""
EPIC — Enterprise Move To Bank (Payout Workflow) REST API Router
"""
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel
from app.application.payout_workflow_service import PayoutWorkflowService

router = APIRouter(prefix="/payout-workflow", tags=["Enterprise Move To Bank Payout Workflow"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CustomerSearchReq(BaseModel):
    query: str = Field(..., min_length=1, description="Mobile number, Customer ID, or Name")

class CustomerRegisterReq(BaseModel):
    first_name: str
    last_name: str
    mobile_number: str
    email: Optional[str] = None
    gender: Optional[str] = "MALE"

class MobileOtpGenReq(BaseModel):
    mobile_number: str
    channel: Optional[str] = "SMS"  # SMS, WHATSAPP, ANDROID_AUTO

class MobileOtpVerifyReq(BaseModel):
    mobile_number: str
    otp_code: str

class AadhaarOtpGenReq(BaseModel):
    aadhaar_number: str

class AadhaarOtpVerifyReq(BaseModel):
    customer_id: uuid.UUID
    ref_number: str
    otp_code: str
    masked_aadhaar: str

class AddBeneficiaryReq(BaseModel):
    customer_id: uuid.UUID
    account_holder: str
    account_number: str
    confirm_account_number: str
    ifsc: str
    bank_name: str
    nickname: Optional[str] = None

class PrecheckReq(BaseModel):
    customer_id: uuid.UUID
    amount: float
    wallet_balance: float = 50000.0

class PinVerifyReq(BaseModel):
    customer_id: uuid.UUID
    pin: str

class PayoutExecuteReq(BaseModel):
    customer_id: uuid.UUID
    beneficiary_id: uuid.UUID
    amount: float
    mode: Optional[str] = "IMPS"
    wallet_balance: float = 50000.0


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/customers/search")
async def search_customers(
    req: CustomerSearchReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    results = await PayoutWorkflowService.search_customer(db, tenant_id, req.query)
    return {"status": "SUCCESS", "data": results}


@router.post("/customers/register")
async def register_customer(
    req: CustomerRegisterReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.register_customer(db, tenant_id, None, req.model_dump())
    return {"status": "SUCCESS", "data": res}


@router.post("/mobile-otp/generate")
async def generate_mobile_otp(
    req: MobileOtpGenReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.generate_mobile_otp(db, tenant_id, req.mobile_number, req.channel or "SMS")
    return {"status": "SUCCESS", "data": res}


@router.post("/mobile-otp/verify")
async def verify_mobile_otp(
    req: MobileOtpVerifyReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.verify_mobile_otp(db, tenant_id, req.mobile_number, req.otp_code)
    return {"status": "SUCCESS", "data": res}


@router.post("/aadhaar-otp/generate")
async def generate_aadhaar_otp(
    req: AadhaarOtpGenReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.generate_aadhaar_otp(db, tenant_id, req.aadhaar_number)
    return {"status": "SUCCESS", "data": res}


@router.post("/aadhaar-otp/verify")
async def verify_aadhaar_otp(
    req: AadhaarOtpVerifyReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.verify_aadhaar_otp(
        db, tenant_id, req.customer_id, req.ref_number, req.otp_code, req.masked_aadhaar
    )
    return {"status": "SUCCESS", "data": res}


@router.get("/beneficiaries/{customer_id}")
async def list_beneficiaries(
    customer_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.list_beneficiaries(db, tenant_id, customer_id)
    return {"status": "SUCCESS", "data": res}


@router.post("/beneficiaries/add")
async def add_beneficiary(
    req: AddBeneficiaryReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.add_beneficiary(db, tenant_id, req.customer_id, req.model_dump())
    return {"status": "SUCCESS", "data": res}


@router.post("/precheck")
async def payout_precheck(
    req: PrecheckReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.validate_payout_precheck(
        db, tenant_id, req.customer_id, req.amount, req.wallet_balance
    )
    return {"status": "SUCCESS", "data": res}


@router.post("/pin/verify")
async def verify_pin(
    req: PinVerifyReq,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.verify_transaction_pin(db, tenant_id, req.customer_id, req.pin)
    return {"status": "SUCCESS", "data": res}


@router.get("/bank-health/{ifsc_code}")
async def check_bank_health(
    ifsc_code: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.get_bank_health(db, ifsc_code)
    return {"status": "SUCCESS", "data": res}


@router.get("/banks/master")
async def get_bank_master_list(
    query: Optional[str] = Query(None),
    is_credit_card: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.get_bank_list(db, query=query, is_credit_card=is_credit_card)
    return {"status": "SUCCESS", "data": res}


@router.post("/execute")
async def execute_payout(
    req: PayoutExecuteReq,
    request: Request,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await PayoutWorkflowService.execute_payout(
        db,
        tenant_id=tenant_id,
        retailer_id=current_user.public_id,
        customer_id=req.customer_id,
        beneficiary_id=req.beneficiary_id,
        amount=req.amount,
        mode=req.mode or "IMPS",
        wallet_balance=req.wallet_balance,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return {"status": "SUCCESS", "data": res}
