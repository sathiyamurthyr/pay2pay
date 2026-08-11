from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
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
