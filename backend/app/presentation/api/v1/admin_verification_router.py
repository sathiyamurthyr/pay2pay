from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.verification_service import VerificationService

router = APIRouter(prefix="/admin/verification", tags=["Admin Retailer Verification"])


class ActionPayload(BaseModel):
    action: str = Field(..., example="APPROVE")  # APPROVE, REJECT, ON_HOLD, NEED_INFO, UNDER_REVIEW
    admin_id: str = Field(..., example="ADM-1002")
    remarks: str = Field(..., example="All documents verified against NSDL and UIDAI.")
    admin_role: Optional[str] = "COMPLIANCE_OFFICER"


@router.get("/requests")
async def list_requests(
    status_tab: Optional[str] = Query("PENDING", example="PENDING"),
    search: Optional[str] = Query(None, example="pay2pay"),
    state: Optional[str] = Query(None, example="Tamil Nadu"),
    is_business: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    return await VerificationService.list_verification_requests(
        db, status_tab=status_tab, search=search, state=state, is_business=is_business, page=page, page_size=page_size
    )


@router.get("/requests/{verification_id}")
async def get_request_detail(verification_id: str, db: AsyncSession = Depends(get_db)):
    res = await VerificationService.get_verification_detail(db, verification_id)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=404, detail=res["message"])
    return res


@router.post("/requests/{verification_id}/action")
async def perform_action(verification_id: str, payload: ActionPayload, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "127.0.0.1"
    browser = request.headers.get("user-agent", "Admin Portal Chrome 122")
    
    res = await VerificationService.perform_verification_action(
        db,
        verification_id=verification_id,
        action=payload.action,
        admin_id=payload.admin_id,
        remarks=payload.remarks,
        admin_role=payload.admin_role or "COMPLIANCE_OFFICER",
        ip_address=ip,
        browser=browser
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])
    return res
