"""
Beneficiary API Endpoints.
"""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.application.dtos import APIResponse
from app.application.beneficiary_dtos import (
    BeneficiaryRegisterRequest as BeneficiaryCreateRequest,
    BeneficiarySearchRequest
)
from app.application.beneficiary_service import BeneficiaryService
from app.application.dependencies import get_current_user
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/beneficiaries", tags=["Beneficiary Management"])

class AddAndVerifyBeneficiaryReq(BaseModel):
    customer_id: str
    account_number: str = Field(..., min_length=9, max_length=18)
    confirm_account_number: str = Field(..., min_length=9, max_length=18)
    ifsc_code: str = Field(..., min_length=11, max_length=11)
    bank_name: str
    account_holder_name: Optional[str] = None
    nickname: Optional[str] = None
    current_wallet_balance: Optional[float] = 5000.0


# ── EPIC-014 / EPIC-015 STATIC ROUTES ──

@router.get("/epic014/bank-master/search")
async def search_epic014_bank_master(
    query: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    sample_banks = [
        {"bank_name": "HDFC Bank", "ifsc_prefix": "HDFC", "ifsc_code": "HDFC0000123", "rbi_code": "HDFC001", "branch": "Anna Nagar Branch", "city": "Chennai", "state": "Tamil Nadu", "micr": "600240002", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/hdfcbank.com", "is_top": True},
        {"bank_name": "State Bank of India", "ifsc_prefix": "SBIN", "ifsc_code": "SBIN0000300", "rbi_code": "SBIN002", "branch": "Mount Road Main Branch", "city": "Chennai", "state": "Tamil Nadu", "micr": "600002001", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/sbi.co.in", "is_top": True},
        {"bank_name": "ICICI Bank", "ifsc_prefix": "ICIC", "ifsc_code": "ICIC0000001", "rbi_code": "ICIC003", "branch": "T. Nagar Branch", "city": "Chennai", "state": "Tamil Nadu", "micr": "600229001", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/icicibank.com", "is_top": True},
        {"bank_name": "Axis Bank", "ifsc_prefix": "UTIB", "ifsc_code": "UTIB0000005", "rbi_code": "UTIB004", "branch": "Adyar Branch", "city": "Chennai", "state": "Tamil Nadu", "micr": "600211002", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/axisbank.com", "is_top": True},
        {"bank_name": "Kotak Mahindra Bank", "ifsc_prefix": "KKBK", "ifsc_code": "KKBK0000958", "rbi_code": "KKBK005", "branch": "Velachery Branch", "city": "Chennai", "state": "Tamil Nadu", "micr": "600485003", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/kotak.com", "is_top": True},
        {"bank_name": "Punjab National Bank", "ifsc_prefix": "PUNB", "ifsc_code": "PUNB0000100", "rbi_code": "PUNB006", "branch": "Royapettah Branch", "city": "Chennai", "state": "Tamil Nadu", "micr": "600024005", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/pnbindia.in", "is_top": True},
        {"bank_name": "Bank of Baroda", "ifsc_prefix": "BARB", "ifsc_code": "BARB0CHENNA", "rbi_code": "BARB007", "branch": "Mylapore Branch", "city": "Chennai", "state": "Tamil Nadu", "micr": "600012004", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/bankofbaroda.in", "is_top": False},
        {"bank_name": "Canara Bank", "ifsc_prefix": "CNRB", "ifsc_code": "CNRB0000001", "rbi_code": "CNRB008", "branch": "MG Road Branch", "city": "Bengaluru", "state": "Karnataka", "micr": "560015002", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/canarabank.com", "is_top": False},
        {"bank_name": "IndusInd Bank", "ifsc_prefix": "INDB", "ifsc_code": "INDB0000001", "rbi_code": "INDB010", "branch": "Cyber City Branch", "city": "Gurugram", "state": "Haryana", "micr": "110234001", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/indusind.com", "is_top": False},
        {"bank_name": "Union Bank of India", "ifsc_prefix": "UBIN", "ifsc_code": "UBIN0530001", "rbi_code": "UBIN009", "branch": "Fort Branch", "city": "Mumbai", "state": "Maharashtra", "micr": "400026001", "neft": True, "imps": True, "upi": True, "rtgs": True, "logo": "https://logo.clearbit.com/unionbankofindia.co.in", "is_top": False},
    ]
    if query and query.strip():
        q_clean = query.strip().upper()
        sample_banks = [
            b for b in sample_banks
            if q_clean in b["bank_name"].upper()
            or q_clean in b["ifsc_prefix"].upper()
            or q_clean in b["ifsc_code"].upper()
            or q_clean in b["branch"].upper()
            or q_clean in b["city"].upper()
        ]
    return {"status": "SUCCESS", "data": sample_banks}


@router.post("/epic014/add-and-verify")
async def add_and_verify_epic014_beneficiary(
    req: AddAndVerifyBeneficiaryReq,
    db: AsyncSession = Depends(get_db)
):
    from app.application.epic014_beneficiary_service import Epic014BeneficiaryService
    try:
        cust_uuid = uuid.UUID(req.customer_id) if isinstance(req.customer_id, str) and "-" in req.customer_id else uuid.uuid4()
    except Exception:
        cust_uuid = uuid.uuid4()

    res = await Epic014BeneficiaryService.register_and_verify_beneficiary(
        db=db,
        tenant_id=uuid.uuid4(),
        company_id=None,
        customer_id=cust_uuid,
        account_number=req.account_number,
        confirm_account_number=req.confirm_account_number,
        ifsc_code=req.ifsc_code,
        bank_name=req.bank_name,
        account_holder_name=req.account_holder_name,
        nickname=req.nickname,
        retailer_id=None,
        current_wallet_balance=req.current_wallet_balance or 5000.0,
    )
    return res


# ── STANDARD PARAMETERIZED ROUTES ──

@router.get("/dashboard", response_model=APIResponse)
async def get_beneficiary_dashboard(
    customer_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get high-level dashboard metrics for beneficiaries."""
    stats = await BeneficiaryService.get_dashboard_stats(db, customer_id=customer_id)
    return APIResponse(data=stats)


@router.get("", response_model=APIResponse)
@router.get("/", response_model=APIResponse)
async def list_beneficiaries(
    query: Optional[str] = Query(None),
    customer_id: Optional[uuid.UUID] = Query(None),
    beneficiary_status: Optional[str] = Query(None),
    beneficiary_category: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Search & filter beneficiary records."""
    search_req = BeneficiarySearchRequest(
        query=query, customer_id=customer_id, beneficiary_status=beneficiary_status,
        beneficiary_category=beneficiary_category, verification_status=verification_status,
        risk_category=risk_category, page=page, page_size=page_size
    )
    beneficiaries = await BeneficiaryService.list_beneficiaries(db, search_req)
    return APIResponse(data=[b.model_dump(mode="json") for b in beneficiaries])


@router.get("/{beneficiary_id}", response_model=APIResponse)
async def get_beneficiary(
    beneficiary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get a specific beneficiary record."""
    beneficiary = await BeneficiaryService.get_beneficiary(db, beneficiary_id)
    if not beneficiary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiary {beneficiary_id} not found"
        )
    return APIResponse(data=beneficiary.model_dump(mode="json"))
