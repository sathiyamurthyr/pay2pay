"""
API Endpoints for Enterprise Customer MPIN Management
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.mpin_service import CustomerMpinService

router = APIRouter(prefix="/customers", tags=["Customer MPIN Security"])


class CreateMpinRequest(BaseModel):
    customer_id: str
    mpin: str = Field(..., min_length=4, max_length=6, description="4 or 6-digit numeric MPIN")
    confirm_mpin: str = Field(..., min_length=4, max_length=6, description="Confirmation of MPIN")
    otp_code: Optional[str] = None


class VerifyMpinRequest(BaseModel):
    customer_id: str
    mpin: str = Field(..., min_length=4, max_length=6, description="4 or 6-digit numeric MPIN")


@router.post("/{customer_id}/mpin/create")
async def create_customer_mpin(
    customer_id: str,
    req: CreateMpinRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await CustomerMpinService.create_mpin(
        db=db,
        customer_id=customer_id,
        mpin=req.mpin,
        confirm_mpin=req.confirm_mpin,
        otp_code=req.otp_code
    )
    return res


@router.post("/{customer_id}/mpin/verify")
async def verify_customer_mpin(
    customer_id: str,
    req: VerifyMpinRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await CustomerMpinService.verify_mpin(
        db=db,
        customer_id=customer_id,
        mpin=req.mpin
    )
    return res


@router.get("/{customer_id}/mpin/status")
async def get_customer_mpin_status(
    customer_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await CustomerMpinService.get_mpin_status(
        db=db,
        customer_id=customer_id
    )
    return res
