from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    APIResponse, LoginRequest, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)
from app.application.services import AuthService
from app.application.dependencies import get_current_user
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await AuthService.login(db, req, ip_address=ip_address, user_agent=user_agent)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    req: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.refresh(db, req.refresh_token)


@router.post("/logout")
async def logout(
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return APIResponse(message="Successfully logged out")
