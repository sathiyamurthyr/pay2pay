import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    ApiKeyCreateRequest, ApiKeyResponse, WebhookSubscriptionCreateRequest,
    WebhookSubscriptionResponse, ChargebackCaseCreateRequest, ChargebackCaseResponse,
    DeveloperDashboardMetricsResponse
)
from app.application.services import DeveloperManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/developer", tags=["Developer API Gateway, Webhooks & Fraud Control (EPIC-007)"])


@router.post("/keys", response_model=ApiKeyResponse)
async def create_api_key(
    req: ApiKeyCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    key, raw_secret = await DeveloperManagementService.create_api_key(db, tenant_id, req, current_user)
    return ApiKeyResponse(
        public_id=key.public_id,
        key_name=key.key_name,
        client_id=key.client_id,
        secret_key_raw=raw_secret,
        scopes=key.scopes,
        status=key.status,
        created_date=key.created_date
    )


@router.get("/keys", response_model=List[ApiKeyResponse])
async def list_api_keys(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    keys = await DeveloperManagementService.list_api_keys(db, tenant_id)
    return [
        ApiKeyResponse(
            public_id=k.public_id,
            key_name=k.key_name,
            client_id=k.client_id,
            secret_key_raw=None,
            scopes=k.scopes,
            status=k.status,
            created_date=k.created_date
        )
        for k in keys
    ]


@router.post("/webhooks", response_model=WebhookSubscriptionResponse)
async def create_webhook_subscription(
    req: WebhookSubscriptionCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sub = await DeveloperManagementService.create_webhook_subscription(db, tenant_id, req, current_user)
    return WebhookSubscriptionResponse(
        public_id=sub.public_id,
        target_url=sub.target_url,
        secret_key=sub.secret_key,
        events=sub.events,
        status=sub.status,
        created_date=sub.created_date
    )


@router.get("/webhooks", response_model=List[WebhookSubscriptionResponse])
async def list_webhook_subscriptions(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    subs = await DeveloperManagementService.list_webhook_subscriptions(db, tenant_id)
    return [
        WebhookSubscriptionResponse(
            public_id=s.public_id,
            target_url=s.target_url,
            secret_key=s.secret_key,
            events=s.events,
            status=s.status,
            created_date=s.created_date
        )
        for s in subs
    ]


@router.post("/disputes", response_model=ChargebackCaseResponse)
async def file_chargeback_case(
    req: ChargebackCaseCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cb = await DeveloperManagementService.file_chargeback_case(db, tenant_id, req, current_user)
    return ChargebackCaseResponse(
        public_id=cb.public_id,
        case_reference=cb.case_reference,
        transaction_id=cb.transaction_id,
        retailer_id=cb.retailer_id,
        dispute_amount=cb.dispute_amount,
        reason_code=cb.reason_code,
        status=cb.status,
        due_date=cb.due_date,
        created_date=cb.created_date
    )


@router.get("/disputes", response_model=List[ChargebackCaseResponse])
async def list_chargebacks(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cbs = await DeveloperManagementService.list_chargebacks(db, tenant_id)
    return [
        ChargebackCaseResponse(
            public_id=c.public_id,
            case_reference=c.case_reference,
            transaction_id=c.transaction_id,
            retailer_id=c.retailer_id,
            dispute_amount=c.dispute_amount,
            reason_code=c.reason_code,
            status=c.status,
            due_date=c.due_date,
            created_date=c.created_date
        )
        for c in cbs
    ]


@router.get("/dashboard/metrics", response_model=DeveloperDashboardMetricsResponse)
async def get_developer_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await DeveloperManagementService.get_dashboard_metrics(db, tenant_id)
