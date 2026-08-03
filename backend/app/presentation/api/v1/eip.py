import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    PartnerCreateRequest, PartnerResponse, ConnectorResponse,
    WebhookDeliveryResponse, WebhookReplayResponse, EventDefinitionResponse,
    DeveloperAppResponse, EipDashboardMetricsResponse
)
from app.application.services import EnterpriseEipService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/eip", tags=["Enterprise Integration Platform (EIP), API Gateway & Partner Ecosystem (EPIC-018)"])


@router.get("/dashboard/metrics", response_model=EipDashboardMetricsResponse)
async def get_eip_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseEipService.get_eip_dashboard_metrics(db, tenant_id)


@router.get("/partners", response_model=List[PartnerResponse])
async def list_partners(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    partners = await EnterpriseEipService.list_partners(db, tenant_id)
    return [
        PartnerResponse(
            public_id=p.public_id,
            partner_code=p.partner_code,
            partner_name=p.partner_name,
            category=p.category,
            status=p.status
        )
        for p in partners
    ]


@router.post("/partners", response_model=PartnerResponse)
async def create_partner(
    req: PartnerCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    p = await EnterpriseEipService.create_partner(db, tenant_id, req, current_user)
    return PartnerResponse(
        public_id=p.public_id,
        partner_code=p.partner_code,
        partner_name=p.partner_name,
        category=p.category,
        status=p.status
    )


@router.get("/connectors", response_model=List[ConnectorResponse])
async def list_connectors(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    conns = await EnterpriseEipService.list_connectors(db, tenant_id)
    return [
        ConnectorResponse(
            public_id=c.public_id,
            connector_code=c.connector_code,
            name=c.name,
            connector_type=c.connector_type,
            status=c.status
        )
        for c in conns
    ]


@router.get("/webhooks/deliveries", response_model=List[WebhookDeliveryResponse])
async def list_webhook_deliveries(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    deliveries = await EnterpriseEipService.list_webhook_deliveries(db, tenant_id)
    return [
        WebhookDeliveryResponse(
            public_id=d.public_id,
            delivery_code=d.delivery_code,
            event_code=d.event_code,
            target_url=d.target_url,
            http_status=d.http_status,
            latency_ms=d.latency_ms,
            status=d.status
        )
        for d in deliveries
    ]


@router.post("/webhooks/replay/{id}", response_model=WebhookReplayResponse)
async def replay_webhook_delivery(
    id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseEipService.replay_webhook_delivery(db, tenant_id, id, current_user)


@router.get("/events", response_model=List[EventDefinitionResponse])
async def list_events(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    events = await EnterpriseEipService.list_events(db, tenant_id)
    return [
        EventDefinitionResponse(
            public_id=e.public_id,
            event_code=e.event_code,
            event_name=e.event_name,
            topic=e.topic
        )
        for e in events
    ]


@router.get("/developer/apps", response_model=List[DeveloperAppResponse])
async def list_developer_apps(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    apps = await EnterpriseEipService.list_developer_apps(db, tenant_id)
    return [
        DeveloperAppResponse(
            public_id=a.public_id,
            app_code=a.app_code,
            name=a.name,
            api_key=a.api_key,
            status=a.status
        )
        for a in apps
    ]
