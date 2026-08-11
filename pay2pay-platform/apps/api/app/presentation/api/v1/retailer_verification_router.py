from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.verification_service import VerificationService

router = APIRouter(prefix="/retailer/verification", tags=["Retailer Verification Status"])


@router.get("/status")
async def get_verification_status(
    x_retailer_id: Optional[str] = Header(None, description="Retailer ID, Mobile, or Reg ID"),
    identifier: Optional[str] = Query(None, description="Mobile, Reg ID, or Retailer ID"),
    db: AsyncSession = Depends(get_db)
):
    target = identifier or x_retailer_id or "9972334411"
    return await VerificationService.get_retailer_status(db, target)
