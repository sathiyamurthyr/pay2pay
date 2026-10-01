import uuid
import asyncio
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.verification_service import VerificationService
from app.application.dependencies import get_current_user
from app.infrastructure.db.models import AdminUserModel
from fastapi import status

logger = logging.getLogger(__name__)


async def require_admin_user(
    current_user: AdminUserModel = Depends(get_current_user)
) -> AdminUserModel:
    user_type = (getattr(current_user, "user_type", "") or "").upper()
    is_admin = user_type in ("PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN")
    if not is_admin:
        has_admin_role = any(
            (ur.role and ur.role.code in ("PLATFORM_ADMIN", "SUPER_ADMIN", "ADMIN"))
            for ur in (getattr(current_user, "user_roles", []) or [])
        )
        if not has_admin_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Administrative privileges required."
            )
    return current_user


router = APIRouter(
    prefix="/admin/verification",
    tags=["Admin Retailer Verification"],
    dependencies=[Depends(require_admin_user)]
)


async def _emit_verification_notification(verification_id: str, action: str, remarks: str):
    """Safely emits a KYC verification status notification."""
    try:
        from app.application.notification_event_service import notification_event_service, kyc_notification_event
        from app.core.database import AsyncSessionLocal
        from app.infrastructure.db.verification_models import RetailerVerificationModel
        from app.infrastructure.db.models import RetailerModel
        from sqlalchemy import select, or_

        async with AsyncSessionLocal() as ndb:
            v_res = await ndb.execute(
                select(RetailerVerificationModel).where(
                    or_(
                        RetailerVerificationModel.registration_id == verification_id,
                        RetailerVerificationModel.retailer_id == verification_id,
                    )
                )
            )
            verif = v_res.scalars().first()
            if not verif:
                return

            act_clean = action.upper()
            event_status = "VERIFIED" if act_clean in ("APPROVE", "APPROVED") else ("REJECTED" if act_clean in ("REJECT", "REJECTED") else "UNDER_REVIEW")
            user_target_id = verif.public_id

            r_stmt = select(RetailerModel).where(
                or_(
                    RetailerModel.retailer_code == verif.retailer_id,
                    RetailerModel.public_id == user_target_id
                )
            )
            ret_obj = (await ndb.execute(r_stmt)).scalars().first()
            u_id = ret_obj.public_id if ret_obj else user_target_id
            t_id = (ret_obj.tenant_id if ret_obj else verif.tenant_id) or uuid.UUID("00000000-0000-0000-0000-000000000001")

            event = kyc_notification_event(
                user_id=u_id,
                tenant_id=t_id,
                company_id=getattr(ret_obj, "company_id", None) if ret_obj else None,
                kyc_ref=verif.registration_id or verif.retailer_id or str(verification_id),
                event_status=event_status,
                kyc_type="KYC & Onboarding Verification",
                usertype_ref_id=getattr(ret_obj, "user_type_ref_id", 2) if ret_obj else 2,
                user_ref_id=str(getattr(ret_obj, "retailer_ref_id", verif.retailer_id or "")),
                tenant_ref_id=getattr(ret_obj, "tenant_ref_id", None) if ret_obj else None,
                company_ref_id=getattr(ret_obj, "company_ref_id", None) if ret_obj else None,
                reason=remarks,
            )
            await notification_event_service.emit(ndb, event)
    except Exception as err:
        logger.warning(f"[_emit_verification_notification] Non-blocking KYC notification skipped: {err}")


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
async def perform_action(
    verification_id: str,
    payload: ActionPayload,
    request: Request,
    current_admin: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else "127.0.0.1"
    browser = request.headers.get("user-agent", "Admin Portal Chrome 122")

    authenticated_admin_id = getattr(current_admin, "username", None) or getattr(current_admin, "email", None) or payload.admin_id
    authenticated_admin_role = getattr(current_admin, "user_type", None) or "COMPLIANCE_OFFICER"

    res = await VerificationService.perform_verification_action(
        db,
        verification_id=verification_id,
        action=payload.action,
        admin_id=authenticated_admin_id,
        remarks=payload.remarks,
        admin_role=authenticated_admin_role,
        ip_address=ip,
        browser=browser
    )
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=res["message"])

    asyncio.create_task(_emit_verification_notification(verification_id, payload.action, payload.remarks))

    return res
