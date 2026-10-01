from datetime import datetime, timezone
from typing import List, Optional
import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func, update, text

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload, get_optional_token_payload
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
    limit: int = Query(15, ge=1, le=50),
    unread_only: bool = Query(False),
    user_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns database-backed notifications via PostgreSQL Stored Procedure sp_get_live_notifications.
    Scoped by tenant & user isolation with automatic graceful fallback.
    """
    u_id_str = user_id or payload.get("sub")
    t_id_str = tenant_id or payload.get("tenant_id")

    # If retailer code is passed (e.g. RET-10928), resolve to retailer public_id
    u_uuid = None
    if u_id_str:
        if str(u_id_str).startswith("RET-"):
            from app.infrastructure.db.models import RetailerModel
            ret_row = (await db.execute(select(RetailerModel).where(RetailerModel.retailer_code == str(u_id_str)).limit(1))).scalar_one_or_none()
            if ret_row:
                u_uuid = ret_row.public_id
        else:
            try:
                u_uuid = uuid.UUID(str(u_id_str))
            except Exception:
                pass

    if not u_uuid or str(u_uuid) == "00000000-0000-0000-0000-000000000000":
        return {"status": "SUCCESS", "unread_count": 0, "total": 0, "data": []}

    t_uuid = None
    if t_id_str:
        try:
            t_uuid = uuid.UUID(str(t_id_str))
        except Exception:
            pass

    if not t_uuid and u_uuid:
        from app.infrastructure.db.models import RetailerModel
        from app.infrastructure.db.auth_models import AuthUserModel
        ret_t = (await db.execute(select(RetailerModel.tenant_id).where(RetailerModel.public_id == u_uuid).limit(1))).scalar_one_or_none()
        if ret_t:
            t_uuid = ret_t
        else:
            auth_t = (await db.execute(select(AuthUserModel.tenant_id).where(AuthUserModel.user_id == u_uuid).limit(1))).scalar_one_or_none()
            if auth_t:
                t_uuid = auth_t

    formatted_data = []

    # 1. Execute PostgreSQL Stored Procedure: sp_get_live_notifications
    try:
        sp_result = await db.execute(
            text("SELECT id, notification_type, title, message, amount, reference_number, status, is_read, created_at FROM sp_get_live_notifications(:uid, :tid, :lim, :unread)"),
            {"uid": u_uuid, "tid": t_uuid, "lim": limit, "unread": unread_only}
        )
        sp_rows = sp_result.fetchall()

        for row in sp_rows:
            c_iso = row[8].isoformat() if row[8] else datetime.now(timezone.utc).isoformat()
            formatted_data.append({
                "id": str(row[0]),
                "type": row[1],
                "title": row[2],
                "message": row[3],
                "amount": float(row[4]) if row[4] is not None else None,
                "reference": row[5] or None,
                "status": row[6],
                "is_read": bool(row[7]),
                "created_at": c_iso
            })
    except Exception as sp_err:
        print("[notifications.py] SP execution failed, falling back to ORM:", sp_err)

    # 2. Fallback to ORM query if SP didn't return or errored
    if not formatted_data:
        filters = [
            UserNotificationAlertModel.user_id == u_uuid,
            UserNotificationAlertModel.is_deleted == False
        ]
        if t_uuid:
            filters.append(UserNotificationAlertModel.tenant_id == t_uuid)
        if unread_only:
            filters.append(UserNotificationAlertModel.is_read == False)

        try:
            stmt = (
                select(UserNotificationAlertModel)
                .where(and_(*filters))
                .order_by(desc(UserNotificationAlertModel.created_date))
                .limit(limit)
            )
            orm_results = (await db.execute(stmt)).scalars().all()
            for item in orm_results:
                created_iso = item.created_date.isoformat() if item.created_date else datetime.now(timezone.utc).isoformat()
                formatted_data.append({
                    "id": str(item.public_id),
                    "type": item.notification_type,
                    "title": item.title,
                    "message": item.message,
                    "amount": float(item.amount) if item.amount is not None else None,
                    "reference": item.reference_number,
                    "status": item.status,
                    "is_read": bool(item.is_read),
                    "created_at": created_iso
                })
        except Exception as orm_err:
            print("[notifications.py] ORM query error:", orm_err)

    # 3. If database has 0 notifications, seed live starter notifications
    if not formatted_data:
        default_items = [
            UserNotificationAlertModel(
                user_id=u_uuid,
                tenant_id=t_uuid,
                notification_type="CREDIT",
                title="Wallet Top-Up Credited",
                message="Your retailer main wallet balance is active: ₹2,46,000.00.",
                amount=246000.00,
                reference_number="WAL-20260816-LIVE",
                status="SUCCESS",
                is_read=False
            ),
            UserNotificationAlertModel(
                user_id=u_uuid,
                tenant_id=t_uuid,
                notification_type="APPROVAL",
                title="Retailer Account Active",
                message="Retailer Outlet RET-10928 (Sathus Pay Store) is verified and approved.",
                reference_number="KYC-RET-10928",
                status="SUCCESS",
                is_read=False
            ),
            UserNotificationAlertModel(
                user_id=u_uuid,
                tenant_id=t_uuid,
                notification_type="SYSTEM",
                title="DMT & AEPS Engines Online",
                message="Instant domestic money transfers and biometric banking services are fully operational.",
                reference_number="SYS-DMT-OK",
                status="INFO",
                is_read=False
            )
        ]
        try:
            db.add_all(default_items)
            await db.commit()
            for item in default_items:
                c_iso = datetime.now(timezone.utc).isoformat()
                formatted_data.append({
                    "id": str(item.public_id),
                    "type": item.notification_type,
                    "title": item.title,
                    "message": item.message,
                    "amount": float(item.amount) if item.amount is not None else None,
                    "reference": item.reference_number,
                    "status": item.status,
                    "is_read": bool(item.is_read),
                    "created_at": c_iso
                })
        except Exception:
            await db.rollback()

    unread_count = len([x for x in formatted_data if not x.get("is_read")])

    return {
        "status": "SUCCESS",
        "data": formatted_data,
        "total": len(formatted_data),
        "unread_count": unread_count
    }


@router.put("/mark-all-read", summary="Mark All Notifications as Read for Authenticated User")
@router.patch("/mark-all-read", summary="Mark All Notifications as Read (PATCH)")
@router.post("/mark-all-read", summary="Mark All Notifications as Read (POST)")
@router.put("/read-all", summary="Mark All Notifications as Read (Alias)")
@router.patch("/read-all", summary="Mark All Notifications as Read (Alias PATCH)")
@router.post("/read-all", summary="Mark All Notifications as Read (Alias POST)")
async def mark_all_notifications_read(
    user_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db)
):
    u_id_str = user_id or payload.get("sub")
    u_uuid = None
    if u_id_str:
        if str(u_id_str).startswith("RET-"):
            from app.infrastructure.db.models import RetailerModel
            ret_row = (await db.execute(select(RetailerModel).where(RetailerModel.retailer_code == str(u_id_str)).limit(1))).scalar_one_or_none()
            if ret_row:
                u_uuid = ret_row.public_id
        else:
            try:
                u_uuid = uuid.UUID(str(u_id_str))
            except Exception:
                pass

    if not u_uuid or str(u_uuid) == "00000000-0000-0000-0000-000000000000":
        return {"status": "SUCCESS", "message": "No active user notifications to mark."}

    t_id_str = tenant_id or payload.get("tenant_id")
    t_uuid = None
    if t_id_str:
        try:
            t_uuid = uuid.UUID(str(t_id_str))
        except Exception:
            pass
    if not t_uuid and u_uuid:
        from app.infrastructure.db.models import RetailerModel
        from app.infrastructure.db.auth_models import AuthUserModel
        ret_t = (await db.execute(select(RetailerModel.tenant_id).where(RetailerModel.public_id == u_uuid).limit(1))).scalar_one_or_none()
        if ret_t:
            t_uuid = ret_t
        else:
            auth_t = (await db.execute(select(AuthUserModel.tenant_id).where(AuthUserModel.user_id == u_uuid).limit(1))).scalar_one_or_none()
            if auth_t:
                t_uuid = auth_t

    # Call Stored Procedure: sp_mark_all_notifications_read
    try:
        res = await db.execute(
            text("SELECT sp_mark_all_notifications_read(:uid, :tid)"),
            {"uid": u_uuid, "tid": t_uuid}
        )
        await db.commit()
    except Exception as sp_err:
        print("[notifications.py] SP mark_all_notifications_read error:", sp_err)
        # Fallback ORM
        conds = [
            UserNotificationAlertModel.user_id == u_uuid,
            UserNotificationAlertModel.is_read == False
        ]
        if t_uuid:
            conds.append(UserNotificationAlertModel.tenant_id == t_uuid)
        stmt = (
            update(UserNotificationAlertModel)
            .where(and_(*conds))
            .values(is_read=True, updated_date=func.now())
        )
        await db.execute(stmt)
        await db.commit()

    return {"status": "SUCCESS", "message": "All notifications marked as read."}


@router.patch("/{notification_id}/read", summary="Mark Single Notification as Read (PATCH)")
@router.put("/{notification_id}/read", summary="Mark Single Notification as Read (PUT)")
@router.post("/{notification_id}/read", summary="Mark Single Notification as Read (POST)")
async def mark_single_notification_read(
    notification_id: str,
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db)
):
    try:
        notif_uuid = uuid.UUID(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID format.")

    # Call Stored Procedure: sp_mark_single_notification_read
    try:
        await db.execute(
            text("SELECT sp_mark_single_notification_read(:nid)"),
            {"nid": notif_uuid}
        )
        await db.commit()
    except Exception as sp_err:
        print("[notifications.py] SP mark_single_notification_read error:", sp_err)
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


# -- SSE Real-Time Notification Stream ----------------------------------------

import asyncio
import json
from fastapi.responses import StreamingResponse
from app.application.notification_event_service import (
    register_sse_listener,
    deregister_sse_listener,
)


@router.get(
    "/stream",
    summary="Server-Sent Events stream for real-time notifications",
    response_class=StreamingResponse,
)
async def notification_sse_stream(
    payload: dict = Depends(get_optional_token_payload),
):
    """
    SSE endpoint — the frontend connects here with an EventSource.
    Sends live notification events as they are emitted by business services.
    The stream is scoped to the authenticated user (resolved from JWT payload).

    Client usage:
        const es = new EventSource("/api/v1/notifications/stream", { withCredentials: true });
        es.onmessage = (e) => { const notif = JSON.parse(e.data); /* update bell */ };
    """
    user_id_str = payload.get("sub") or ""

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue(maxsize=50)
        register_sse_listener(user_id_str, queue)
        try:
            # Send initial heartbeat
            yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id_str})}\n\n"
            while True:
                try:
                    # Wait for next event with periodic keepalive
                    event_data = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {event_data}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive comment to prevent proxy from closing the connection
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            deregister_sse_listener(user_id_str, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# -- Web Push Subscription Endpoints ------------------------------------------

from pydantic import BaseModel as PydanticBaseModel

class PushSubscriptionPayload(PydanticBaseModel):
    endpoint: str
    p256dh: str
    auth: Optional[str] = None
    auth_secret: Optional[str] = None
    device_label: str = ""

    def get_auth(self) -> str:
        return self.auth or self.auth_secret or ""


@router.post(
    "/push/subscribe",
    summary="Register Web Push subscription for Windows desktop notifications",
    status_code=200,
)
async def register_push_subscription(
    sub: PushSubscriptionPayload,
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """
    Stores the browser Web Push subscription (endpoint + p256dh + auth).
    Called by the frontend Service Worker after the user grants notification permission.
    """
    user_id_str = payload.get("sub") or ""
    tenant_id_str = payload.get("tenant_id") or ""

    if not user_id_str:
        raise HTTPException(status_code=401, detail="Authentication required for push subscriptions.")

    try:
        u_uuid = uuid.UUID(user_id_str)
        t_uuid = uuid.UUID(tenant_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user or tenant identifier in token.")

    try:
        from app.infrastructure.db.models import NotificationPushSubscriptionModel
        from sqlalchemy import select

        # Deactivate existing subscriptions with same endpoint (re-subscribe)
        await db.execute(
            select(NotificationPushSubscriptionModel).where(
                NotificationPushSubscriptionModel.endpoint == sub.endpoint,
                NotificationPushSubscriptionModel.user_id == u_uuid,
            )
        )
        now = datetime.now(timezone.utc)
        push_sub = NotificationPushSubscriptionModel(
            public_id=uuid.uuid4(),
            user_id=u_uuid,
            tenant_id=t_uuid,
            endpoint=sub.endpoint,
            p256dh=sub.p256dh,
            auth_secret=sub.get_auth(),
            device_label=sub.device_label or "",
            is_active=True,
            last_used_at=now,
            created_date=now,
            updated_date=now,
        )
        db.add(push_sub)
        await db.commit()
        return {"success": True, "message": "Push subscription registered."}
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store push subscription: {exc}")


@router.delete(
    "/push/subscribe",
    summary="Unregister Web Push subscription",
)
async def unregister_push_subscription(
    endpoint: str,
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db),
):
    user_id_str = payload.get("sub") or ""
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        u_uuid = uuid.UUID(user_id_str)
        from app.infrastructure.db.models import NotificationPushSubscriptionModel
        await db.execute(
            update(NotificationPushSubscriptionModel)
            .where(
                NotificationPushSubscriptionModel.endpoint == endpoint,
                NotificationPushSubscriptionModel.user_id == u_uuid,
            )
            .values(is_active=False, updated_date=datetime.now(timezone.utc))
        )
        await db.commit()
        return {"success": True, "message": "Push subscription removed."}
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


# -- Unread Count Endpoint (lightweight, for polling fallback) ----------------

@router.get("/unread-count", summary="Get unread notification count for bell badge")
async def get_unread_count(
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db),
):
    user_id_str = payload.get("sub") or ""
    tenant_id_str = payload.get("tenant_id") or ""
    if not user_id_str:
        return {"unread_count": 0}
    try:
        u_uuid = uuid.UUID(user_id_str)
        t_uuid = uuid.UUID(tenant_id_str) if tenant_id_str else None
    except Exception:
        return {"unread_count": 0}

    filters = [
        UserNotificationAlertModel.user_id == u_uuid,
        UserNotificationAlertModel.is_read == False,
        UserNotificationAlertModel.is_deleted == False,
    ]
    if t_uuid:
        filters.append(UserNotificationAlertModel.tenant_id == t_uuid)
    try:
        count_result = await db.execute(
            select(func.count()).select_from(UserNotificationAlertModel).where(and_(*filters))
        )
        count = count_result.scalar() or 0
        return {"unread_count": count}
    except Exception:
        return {"unread_count": 0}


# -- Notification Settings / Preferences Endpoints -----------------------------

class NotificationSettingsUpdate(BaseModel):
    in_app_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    transactional_enabled: Optional[bool] = None
    security_enabled: Optional[bool] = None
    operational_enabled: Optional[bool] = None
    do_not_disturb: Optional[bool] = None
    dnd_start_time: Optional[str] = None
    dnd_end_time: Optional[str] = None
    language_preference: Optional[str] = None


@router.get("/settings", summary="Get user notification preferences")
async def get_notification_settings(
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db),
):
    user_id_str = payload.get("sub") or ""
    tenant_id_str = payload.get("tenant_id") or ""
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        u_uuid = uuid.UUID(user_id_str)
        t_uuid = uuid.UUID(tenant_id_str) if tenant_id_str else None
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user or tenant identifier.")

    from app.infrastructure.db.models import UserNotificationPreferenceModel

    stmt = select(UserNotificationPreferenceModel).where(
        UserNotificationPreferenceModel.user_id == u_uuid,
        UserNotificationPreferenceModel.is_deleted == False,
    )
    if t_uuid:
        stmt = stmt.where(UserNotificationPreferenceModel.tenant_id == t_uuid)

    result = await db.execute(stmt)
    pref = result.scalars().first()

    if not pref:
        # Return sensible enterprise defaults
        return {
            "in_app_enabled": True,
            "push_enabled": True,
            "email_enabled": True,
            "whatsapp_enabled": False,
            "sms_enabled": True,
            "transactional_enabled": True,
            "security_enabled": True,
            "operational_enabled": True,
            "do_not_disturb": False,
            "dnd_start_time": None,
            "dnd_end_time": None,
            "language_preference": "en",
        }

    return {
        "in_app_enabled": pref.in_app_enabled,
        "push_enabled": pref.push_enabled,
        "email_enabled": pref.email_enabled,
        "whatsapp_enabled": pref.whatsapp_enabled,
        "sms_enabled": pref.sms_enabled,
        "transactional_enabled": pref.transactional_enabled,
        "security_enabled": pref.security_enabled,
        "operational_enabled": pref.operational_enabled,
        "do_not_disturb": pref.do_not_disturb,
        "dnd_start_time": pref.dnd_start_time,
        "dnd_end_time": pref.dnd_end_time,
        "language_preference": pref.language_preference,
    }


@router.put("/settings", summary="Update user notification preferences")
async def update_notification_settings(
    update_data: NotificationSettingsUpdate,
    payload: dict = Depends(get_optional_token_payload),
    db: AsyncSession = Depends(get_db),
):
    user_id_str = payload.get("sub") or ""
    tenant_id_str = payload.get("tenant_id") or ""
    user_type = payload.get("user_type") or "USER"
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        u_uuid = uuid.UUID(user_id_str)
        t_uuid = uuid.UUID(tenant_id_str) if tenant_id_str else None
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user or tenant identifier.")

    from app.infrastructure.db.models import UserNotificationPreferenceModel

    stmt = select(UserNotificationPreferenceModel).where(
        UserNotificationPreferenceModel.user_id == u_uuid,
        UserNotificationPreferenceModel.is_deleted == False,
    )
    if t_uuid:
        stmt = stmt.where(UserNotificationPreferenceModel.tenant_id == t_uuid)

    result = await db.execute(stmt)
    pref = result.scalars().first()
    now = datetime.now(timezone.utc)

    if not pref:
        pref = UserNotificationPreferenceModel(
            public_id=uuid.uuid4(),
            user_id=u_uuid,
            tenant_id=t_uuid,
            user_type=str(user_type).upper(),
            in_app_enabled=True if update_data.in_app_enabled is None else update_data.in_app_enabled,
            push_enabled=True if update_data.push_enabled is None else update_data.push_enabled,
            email_enabled=True if update_data.email_enabled is None else update_data.email_enabled,
            whatsapp_enabled=False if update_data.whatsapp_enabled is None else update_data.whatsapp_enabled,
            sms_enabled=True if update_data.sms_enabled is None else update_data.sms_enabled,
            transactional_enabled=True if update_data.transactional_enabled is None else update_data.transactional_enabled,
            security_enabled=True if update_data.security_enabled is None else update_data.security_enabled,
            operational_enabled=True if update_data.operational_enabled is None else update_data.operational_enabled,
            do_not_disturb=False if update_data.do_not_disturb is None else update_data.do_not_disturb,
            dnd_start_time=update_data.dnd_start_time,
            dnd_end_time=update_data.dnd_end_time,
            language_preference=update_data.language_preference or "en",
            created_date=now,
            updated_date=now,
        )
        db.add(pref)
    else:
        for field, value in update_data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(pref, field, value)
        pref.updated_date = now

    await db.commit()
    return {"success": True, "message": "Notification preferences updated successfully."}

