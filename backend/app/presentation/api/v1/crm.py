import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    SupportTicketCreateRequest, SupportTicketAssignRequest,
    SupportTicketResolveRequest, SupportTicketResponse,
    Retailer360ViewResponse, KnowledgeArticleResponse,
    AnnouncementResponse, CrmDashboardMetricsResponse
)
from app.application.services import EnterpriseCrmService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/crm", tags=["Enterprise CRM & Support Platform (EPIC-013)"])


@router.post("/tickets", response_model=SupportTicketResponse)
async def create_ticket(
    req: SupportTicketCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t = await EnterpriseCrmService.create_ticket(db, tenant_id, req, current_user)
    return SupportTicketResponse(
        public_id=t.public_id,
        ticket_number=t.ticket_number,
        retailer_id=t.retailer_id,
        subject=t.subject,
        category=t.category,
        priority=t.priority,
        status=t.status,
        assigned_agent=t.assigned_agent,
        sla_due_date=t.sla_due_date,
        created_date=t.created_date
    )


@router.get("/tickets", response_model=List[SupportTicketResponse])
async def list_tickets(
    status: Optional[str] = Query(None),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tickets = await EnterpriseCrmService.list_tickets(db, tenant_id, status)
    return [
        SupportTicketResponse(
            public_id=t.public_id,
            ticket_number=t.ticket_number,
            retailer_id=t.retailer_id,
            subject=t.subject,
            category=t.category,
            priority=t.priority,
            status=t.status,
            assigned_agent=t.assigned_agent,
            sla_due_date=t.sla_due_date,
            created_date=t.created_date
        )
        for t in tickets
    ]


@router.post("/tickets/{id}/assign", response_model=SupportTicketResponse)
async def assign_ticket(
    id: uuid.UUID,
    req: SupportTicketAssignRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t = await EnterpriseCrmService.assign_ticket(db, tenant_id, id, req, current_user)
    return SupportTicketResponse(
        public_id=t.public_id,
        ticket_number=t.ticket_number,
        retailer_id=t.retailer_id,
        subject=t.subject,
        category=t.category,
        priority=t.priority,
        status=t.status,
        assigned_agent=t.assigned_agent,
        sla_due_date=t.sla_due_date,
        created_date=t.created_date
    )


@router.post("/tickets/{id}/resolve", response_model=SupportTicketResponse)
async def resolve_ticket(
    id: uuid.UUID,
    req: SupportTicketResolveRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t = await EnterpriseCrmService.resolve_ticket(db, tenant_id, id, req, current_user)
    return SupportTicketResponse(
        public_id=t.public_id,
        ticket_number=t.ticket_number,
        retailer_id=t.retailer_id,
        subject=t.subject,
        category=t.category,
        priority=t.priority,
        status=t.status,
        assigned_agent=t.assigned_agent,
        sla_due_date=t.sla_due_date,
        created_date=t.created_date
    )


@router.get("/retailer-360/{retailer_id}", response_model=Retailer360ViewResponse)
async def get_retailer_360_view(
    retailer_id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseCrmService.get_retailer_360_view(db, tenant_id, retailer_id)


@router.get("/knowledge-base", response_model=List[KnowledgeArticleResponse])
async def list_knowledge_articles(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    articles = await EnterpriseCrmService.list_knowledge_articles(db, tenant_id)
    return [
        KnowledgeArticleResponse(
            public_id=a.public_id,
            article_code=a.article_code,
            title=a.title,
            category=a.category,
            content=a.content,
            view_count=a.view_count
        )
        for a in articles
    ]


@router.get("/announcements", response_model=List[AnnouncementResponse])
async def list_announcements(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    announcements = await EnterpriseCrmService.list_announcements(db, tenant_id)
    return [
        AnnouncementResponse(
            public_id=a.public_id,
            announcement_code=a.announcement_code,
            title=a.title,
            content=a.content,
            audience=a.audience,
            created_date=a.created_date
        )
        for a in announcements
    ]


@router.get("/dashboard/metrics", response_model=CrmDashboardMetricsResponse)
async def get_crm_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseCrmService.get_crm_dashboard_metrics(db, tenant_id)
