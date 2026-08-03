import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    WorkflowCreateRequest, WorkflowResponse, TaskResponse,
    ApprovalActionRequest, ApprovalResponse, QueueResponse,
    BpmDashboardMetricsResponse
)
from app.application.services import EnterpriseBpmService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/bpm", tags=["Enterprise Operations, Workflow & BPM Platform (EPIC-016)"])


@router.get("/dashboard/metrics", response_model=BpmDashboardMetricsResponse)
async def get_bpm_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseBpmService.get_bpm_dashboard_metrics(db, tenant_id)


@router.get("/workflows", response_model=List[WorkflowResponse])
async def list_workflows(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wfs = await EnterpriseBpmService.list_workflows(db, tenant_id)
    return [
        WorkflowResponse(
            public_id=w.public_id,
            workflow_code=w.workflow_code,
            workflow_name=w.workflow_name,
            entity_type=w.entity_type,
            status=w.status
        )
        for w in wfs
    ]


@router.post("/workflows", response_model=WorkflowResponse)
async def create_workflow_definition(
    req: WorkflowCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wf = await EnterpriseBpmService.create_workflow_definition(db, tenant_id, req, current_user)
    return WorkflowResponse(
        public_id=wf.public_id,
        workflow_code=wf.workflow_code,
        workflow_name=wf.workflow_name,
        entity_type=wf.entity_type,
        status=wf.status
    )


@router.get("/tasks", response_model=List[TaskResponse])
async def list_tasks(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tasks = await EnterpriseBpmService.list_tasks(db, tenant_id)
    return [
        TaskResponse(
            public_id=t.public_id,
            task_number=t.task_number,
            title=t.title,
            priority=t.priority,
            status=t.status,
            assigned_to=t.assigned_to,
            created_date=t.created_date
        )
        for t in tasks
    ]


@router.post("/tasks/{id}/complete", response_model=TaskResponse)
async def complete_task(
    id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t = await EnterpriseBpmService.complete_task(db, tenant_id, id, current_user)
    return TaskResponse(
        public_id=t.public_id,
        task_number=t.task_number,
        title=t.title,
        priority=t.priority,
        status=t.status,
        assigned_to=t.assigned_to,
        created_date=t.created_date
    )


@router.get("/approvals", response_model=List[ApprovalResponse])
async def list_approval_requests(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    reqs = await EnterpriseBpmService.list_approval_requests(db, tenant_id)
    return [
        ApprovalResponse(
            public_id=a.public_id,
            request_code=a.request_code,
            requested_by=a.requested_by,
            status=a.status,
            required_level=a.required_level
        )
        for a in reqs
    ]


@router.post("/approvals/{id}/action", response_model=ApprovalResponse)
async def process_approval_action(
    id: uuid.UUID,
    req: ApprovalActionRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ap = await EnterpriseBpmService.process_approval_action(db, tenant_id, id, req, current_user)
    return ApprovalResponse(
        public_id=ap.public_id,
        request_code=ap.request_code,
        requested_by=ap.requested_by,
        status=ap.status,
        required_level=ap.required_level
    )


@router.get("/queues", response_model=List[QueueResponse])
async def list_operational_queues(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    queues = await EnterpriseBpmService.list_operational_queues(db, tenant_id)
    return [
        QueueResponse(
            public_id=q.public_id,
            queue_code=q.queue_code,
            queue_name=q.queue_name,
            queue_type=q.queue_type,
            status=q.status
        )
        for q in queues
    ]
