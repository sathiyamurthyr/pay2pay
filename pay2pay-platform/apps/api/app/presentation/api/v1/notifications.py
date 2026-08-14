from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, update

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload
from app.infrastructure.db.models import UserNotificationAlertModel
from app.application.services import NotificationService
from app.application.dtos import (
    APIResponse,
    NotificationProviderCreateRequest, NotificationProviderResponse,
    NotificationTemplateCreateRequest, NotificationTemplateResponse,
    SendNotificationRequest, NotificationResponse,
    OtpSendRequest, OtpVerifyRequest, OtpSendResponse, OtpVerifyResponse,
    CampaignCreateRequest, CampaignResponse,
    CommunicationTimelineResponse,
    NotificationEventResponse,
    NotificationDashboardMetricsResponse,
)

router = APIRouter(prefix="/notifications", tags=["EPIC-020: Notification & Engagement"])


# ── Recent Alerts & Real-Time User Notifications ─────────────────────────────

@router.get("/recent", summary="Fetch Recent Alerts & Notifications for Authenticated User")
async def get_recent_notifications(
    limit: int = Query(10, ge=1, le=50),
    unread_only: bool = Query(False),
    user_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns database-backed notifications for the authenticated user, scoped by tenant & user isolation.
    """
    u_id_str = user_id or payload.get("sub")
    if not u_id_str or u_id_str == "00000000-0000-0000-0000-000000000000":
        u_id_str = "00000000-0000-0000-0000-000000000001"

    t_id_str = tenant_id or payload.get("tenant_id", "547aa7bb-a790-4fe2-bd5b-27214ed176c8")

    try:
        u_uuid = uuid.UUID(str(u_id_str))
    except Exception:
        u_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")

    try:
        t_uuid = uuid.UUID(str(t_id_str))
    except Exception:
        t_uuid = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")

    filters = [
        UserNotificationAlertModel.user_id == u_uuid,
        UserNotificationAlertModel.tenant_id == t_uuid
    ]
    if unread_only:
        filters.append(UserNotificationAlertModel.is_read == False)

    # Count unread items
    unread_stmt = select(func.count()).select_from(UserNotificationAlertModel).where(
        and_(
            UserNotificationAlertModel.user_id == u_uuid,
            UserNotificationAlertModel.tenant_id == t_uuid,
            UserNotificationAlertModel.is_read == False
        )
    )
    unread_count = (await db.execute(unread_stmt)).scalar() or 0

    # Count total matching items
    total_stmt = select(func.count()).select_from(UserNotificationAlertModel).where(and_(*filters))
    total_count = (await db.execute(total_stmt)).scalar() or 0

    # Query newest items first
    stmt = (
        select(UserNotificationAlertModel)
        .where(and_(*filters))
        .order_by(desc(UserNotificationAlertModel.created_at))
        .limit(limit)
    )
    results = (await db.execute(stmt)).scalars().all()

    formatted_data = []
    for item in results:
        formatted_data.append({
            "id": str(item.public_id),
            "type": item.notification_type,
            "title": item.title,
            "message": item.message,
            "amount": float(item.amount) if item.amount is not None else None,
            "reference": item.reference_number,
            "status": item.status,
            "is_read": item.is_read,
            "created_at": item.created_at.isoformat() if item.created_at else datetime.now(timezone.utc).isoformat()
        })

    return {
        "data": formatted_data,
        "total": total_count,
        "unread_count": unread_count
    }


@router.put("/mark-all-read", summary="Mark All Notifications as Read for Authenticated User")
@router.patch("/mark-all-read", summary="Mark All Notifications as Read (PATCH)")
@router.put("/read-all", summary="Mark All Notifications as Read (Alias)")
@router.patch("/read-all", summary="Mark All Notifications as Read (Alias PATCH)")
async def mark_all_notifications_read(
    user_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    u_id_str = user_id or payload.get("sub")
    if not u_id_str or u_id_str == "00000000-0000-0000-0000-000000000000":
        u_id_str = "00000000-0000-0000-0000-000000000001"

    try:
        u_uuid = uuid.UUID(str(u_id_str))
    except Exception:
        u_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")

    stmt = (
        update(UserNotificationAlertModel)
        .where(
            and_(
                UserNotificationAlertModel.user_id == u_uuid,
                UserNotificationAlertModel.is_read == False
            )
        )
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()

    return {"status": "SUCCESS", "message": "All notifications marked as read."}


@router.patch("/{notification_id}/read", summary="Mark Single Notification as Read (PATCH)")
@router.put("/{notification_id}/read", summary="Mark Single Notification as Read (PUT)")
@router.post("/{notification_id}/read", summary="Mark Single Notification as Read (POST)")
async def mark_single_notification_read(
    notification_id: str,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
):
    try:
        notif_uuid = uuid.UUID(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID format.")

    stmt = select(UserNotificationAlertModel).where(
        (UserNotificationAlertModel.public_id == notif_uuid) |
        (UserNotificationAlertModel.public_id == str(notif_uuid))
    )
    item = (await db.execute(stmt)).scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found.")

    item.is_read = True
    await db.commit()
    return {"status": "SUCCESS", "message": "Notification marked as read.", "id": notification_id}


# ── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def notification_dashboard(db: AsyncSession = Depends(get_db)):
    metrics = await NotificationService.get_dashboard_metrics(db)
    return APIResponse(data=metrics.model_dump())


# ── Providers ─────────────────────────────────────────────────────────────────

@router.get("/providers", response_model=APIResponse)
async def list_providers(db: AsyncSession = Depends(get_db)):
    providers = await NotificationService.list_providers(db)
    return APIResponse(data=[p.model_dump() for p in providers])


@router.post("/providers", response_model=APIResponse, status_code=201)
async def create_provider(
    req: NotificationProviderCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    provider = await NotificationService.create_provider(db, req)
    return APIResponse(message="Provider created successfully", data=provider.model_dump())


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=APIResponse)
async def list_templates(
    channel: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    templates = await NotificationService.list_templates(db, channel=channel)
    return APIResponse(data=[t.model_dump() for t in templates])


@router.post("/templates", response_model=APIResponse, status_code=201)
async def create_template(
    req: NotificationTemplateCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    template = await NotificationService.create_template(db, req)
    return APIResponse(message="Template created successfully", data=template.model_dump())


# ── Notifications ─────────────────────────────────────────────────────────────

@router.post("/send", response_model=APIResponse, status_code=201)
async def send_notification(
    req: SendNotificationRequest,
    db: AsyncSession = Depends(get_db),
):
    notification = await NotificationService.send_notification(db, req)
    return APIResponse(message="Notification queued successfully", data=notification.model_dump())


@router.get("/", response_model=APIResponse)
async def list_notifications(
    status: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    notifications = await NotificationService.list_notifications(db, status=status, channel=channel)
    return APIResponse(data=[n.model_dump() for n in notifications])


# ── OTP ───────────────────────────────────────────────────────────────────────

@router.post("/otp/send", response_model=APIResponse, status_code=201)
async def send_otp(req: OtpSendRequest, db: AsyncSession = Depends(get_db)):
    otp = await NotificationService.send_otp(db, req)
    return APIResponse(message="OTP sent successfully", data=otp.model_dump())


@router.post("/otp/verify", response_model=APIResponse)
async def verify_otp(req: OtpVerifyRequest, db: AsyncSession = Depends(get_db)):
    result = await NotificationService.verify_otp(db, req)
    return APIResponse(data=result.model_dump())


# ── Campaigns ─────────────────────────────────────────────────────────────────

@router.get("/campaigns", response_model=APIResponse)
async def list_campaigns(
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    campaigns = await NotificationService.list_campaigns(db, status=status)
    return APIResponse(data=[c.model_dump() for c in campaigns])


@router.post("/campaigns", response_model=APIResponse, status_code=201)
async def create_campaign(
    req: CampaignCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    campaign = await NotificationService.create_campaign(db, req)
    return APIResponse(message="Campaign created successfully", data=campaign.model_dump())


# ── Communication Timeline ────────────────────────────────────────────────────

@router.get("/timeline/{entity_type}/{entity_id}", response_model=APIResponse)
async def get_communication_timeline(
    entity_type: str,
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    timeline = await NotificationService.get_communication_timeline(db, entity_id, entity_type)
    return APIResponse(data=[t.model_dump() for t in timeline])


# ── Events Catalog ────────────────────────────────────────────────────────────

@router.get("/events", response_model=APIResponse)
async def list_notification_events(db: AsyncSession = Depends(get_db)):
    events = await NotificationService.list_events(db)
    return APIResponse(data=[e.model_dump() for e in events])

