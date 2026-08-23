from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select

from app.core.database import get_db
from app.core.security import decode_access_token
from app.application.dtos import (
    APIResponse, LoginRequest, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)
from app.application.services import AuthService
from app.application.dependencies import get_current_user, get_current_token_payload
from app.infrastructure.db.models import AdminUserModel, UserSessionModel

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    token_resp = await AuthService.login(db, req, ip_address=ip_address, user_agent=user_agent)
    
    # Set HttpOnly session cookies
    if token_resp.access_token:
        response.set_cookie(
            key="p2p_access_token",
            value=token_resp.access_token,
            httponly=True,
            samesite="lax",
            path="/",
            max_age=token_resp.expires_in
        )
        response.set_cookie(
            key="pay2pay_access_token",
            value=token_resp.access_token,
            httponly=True,
            samesite="lax",
            path="/",
            max_age=token_resp.expires_in
        )
    return token_resp


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    req: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    return await AuthService.refresh(db, req.refresh_token)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    # Extract token
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1].strip()
    if not token:
        token = (
            request.cookies.get("p2p_access_token")
            or request.cookies.get("pay2pay_access_token")
            or request.cookies.get("pay2pay_auth_token")
            or request.cookies.get("access_token")
        )

    if token:
        payload = decode_access_token(token)
        if payload:
            jti = payload.get("jti")
            sub = payload.get("sub")
            if jti:
                from app.application.dependencies import blacklist_jti
                blacklist_jti(str(jti))
                stmt = select(UserSessionModel).where(UserSessionModel.token_jti == str(jti))
                sess = (await db.execute(stmt)).scalars().first()
                if sess:
                    sess.is_revoked = True
                else:
                    import datetime
                    db.add(UserSessionModel(
                        public_id=uuid.uuid4(),
                        tenant_id=uuid.UUID(payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8")),
                        token_jti=str(jti),
                        is_revoked=True,
                        expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
                    ))
            if sub:
                try:
                    import uuid
                    user_uuid = uuid.UUID(sub)
                    await db.execute(
                        update(UserSessionModel)
                        .where(UserSessionModel.public_id == user_uuid)
                        .values(is_revoked=True)
                    )
                except Exception:
                    pass
            await db.commit()

    # Clear authentication cookies
    cookie_names = [
        "p2p_access_token", "pay2pay_access_token", "pay2pay_auth_token",
        "p2p_user_role", "pay2pay_user_role", "p2p_session_locked",
        "p2p_session_id", "p2p_destination", "access_token", "token"
    ]
    for c_name in cookie_names:
        response.delete_cookie(key=c_name, path="/")
        response.delete_cookie(key=c_name, path="/", domain="pay2pay.in")
        response.delete_cookie(key=c_name, path="/", domain=".pay2pay.in")

    return APIResponse(message="Successfully logged out and session revoked")
