import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel
from app.application.company_onboarding_service import CompanyOnboardingService, TOTAL_ONBOARDING_STEPS

router = APIRouter(prefix="/onboarding", tags=["Enterprise Onboarding Persistence (P0)"])


class OnboardingSaveRequest(BaseModel):
    step_number: int = Field(..., ge=1, le=10, example=3)
    step_data: Dict[str, Any] = Field(default_factory=dict)
    is_completed: bool = Field(default=True)
    is_final: bool = Field(default=False)


class OnboardingStatusResponse(BaseModel):
    completed: bool
    current_step: int
    progress_percentage: float
    completed_steps: List[int]
    status: str
    started_at: datetime
    last_saved_at: datetime
    version: int
    redirect_url: str
    draft_data: Dict[str, Any]


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    company_id = current_user.company_id if hasattr(current_user, "company_id") and current_user.company_id else tenant_id
    rec = await CompanyOnboardingService.get_or_create_status(db, tenant_id, company_id)

    is_completed = rec.status == "COMPLETED" or rec.current_step > TOTAL_ONBOARDING_STEPS
    redirect = "/dashboard" if is_completed else f"/register/step-{rec.current_step}"

    return OnboardingStatusResponse(
        completed=is_completed,
        current_step=rec.current_step,
        progress_percentage=rec.progress_percentage,
        completed_steps=rec.completed_steps or [],
        status=rec.status,
        started_at=rec.started_at,
        last_saved_at=rec.last_saved_at,
        version=rec.version,
        redirect_url=redirect,
        draft_data=rec.draft_data or {}
    )


@router.post("/save", response_model=OnboardingStatusResponse)
async def save_onboarding_step(
    req: OnboardingSaveRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    company_id = current_user.company_id if hasattr(current_user, "company_id") and current_user.company_id else tenant_id
    user_id = current_user.public_id if hasattr(current_user, "public_id") else None

    rec = await CompanyOnboardingService.save_step_progress(
        db=db,
        tenant_id=tenant_id,
        company_id=company_id,
        step_number=req.step_number,
        step_data=req.step_data,
        is_completed=req.is_completed,
        is_final=req.is_final,
        updated_by=user_id
    )

    is_completed = rec.status == "COMPLETED" or rec.current_step > TOTAL_ONBOARDING_STEPS
    redirect = "/dashboard" if is_completed else f"/register/step-{rec.current_step}"

    return OnboardingStatusResponse(
        completed=is_completed,
        current_step=rec.current_step,
        progress_percentage=rec.progress_percentage,
        completed_steps=rec.completed_steps or [],
        status=rec.status,
        started_at=rec.started_at,
        last_saved_at=rec.last_saved_at,
        version=rec.version,
        redirect_url=redirect,
        draft_data=rec.draft_data or {}
    )


@router.post("/reset", response_model=OnboardingStatusResponse)
async def admin_reset_onboarding(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    company_id = current_user.company_id if hasattr(current_user, "company_id") and current_user.company_id else tenant_id
    user_id = current_user.public_id if hasattr(current_user, "public_id") else None

    rec = await CompanyOnboardingService.admin_reset_onboarding(
        db=db, tenant_id=tenant_id, company_id=company_id, updated_by=user_id
    )

    return OnboardingStatusResponse(
        completed=False,
        current_step=1,
        progress_percentage=0.0,
        completed_steps=[],
        status=rec.status,
        started_at=rec.started_at,
        last_saved_at=rec.last_saved_at,
        version=rec.version,
        redirect_url="/register/step-1",
        draft_data={}
    )
