import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    FraudRuleCreateRequest, FraudRuleResponse,
    FraudCaseDecisionRequest, FraudCaseResponse,
    BlacklistCreateRequest, BlacklistResponse,
    FraudScreeningRequest, FraudScreeningResponse,
    FraudDashboardMetricsResponse
)
from app.application.services import EnterpriseFraudService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/fraud", tags=["Enterprise Fraud, Risk & Compliance Platform (EPIC-014)"])


@router.get("/dashboard/metrics", response_model=FraudDashboardMetricsResponse)
async def get_fraud_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseFraudService.get_fraud_dashboard_metrics(db, tenant_id)


@router.get("/rules", response_model=List[FraudRuleResponse])
async def list_fraud_rules(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rules = await EnterpriseFraudService.list_fraud_rules(db, tenant_id)
    return [
        FraudRuleResponse(
            public_id=r.public_id,
            rule_code=r.rule_code,
            rule_name=r.rule_name,
            entity_type=r.entity_type,
            category=r.category,
            threshold_value=r.threshold_value,
            action=r.action,
            status=r.status
        )
        for r in rules
    ]


@router.post("/rules", response_model=FraudRuleResponse)
async def create_fraud_rule(
    req: FraudRuleCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    r = await EnterpriseFraudService.create_fraud_rule(db, tenant_id, req, current_user)
    return FraudRuleResponse(
        public_id=r.public_id,
        rule_code=r.rule_code,
        rule_name=r.rule_name,
        entity_type=r.entity_type,
        category=r.category,
        threshold_value=r.threshold_value,
        action=r.action,
        status=r.status
    )


@router.patch("/rules/{id}/status", response_model=FraudRuleResponse)
async def update_fraud_rule_status(
    id: uuid.UUID,
    status: str = Query(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    r = await EnterpriseFraudService.update_fraud_rule_status(db, tenant_id, id, status, current_user)
    return FraudRuleResponse(
        public_id=r.public_id,
        rule_code=r.rule_code,
        rule_name=r.rule_name,
        entity_type=r.entity_type,
        category=r.category,
        threshold_value=r.threshold_value,
        action=r.action,
        status=r.status
    )


@router.delete("/rules/{id}")
async def delete_fraud_rule(
    id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await EnterpriseFraudService.delete_fraud_rule(db, tenant_id, id, current_user)
    return {"success": success, "message": "Fraud rule deleted successfully"}


@router.post("/rules/{id}/toggle", response_model=FraudRuleResponse)
async def toggle_fraud_rule(
    id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    r = await EnterpriseFraudService.toggle_fraud_rule(db, tenant_id, id, current_user)
    return FraudRuleResponse(
        public_id=r.public_id,
        rule_code=r.rule_code,
        rule_name=r.rule_name,
        entity_type=r.entity_type,
        category=r.category,
        threshold_value=r.threshold_value,
        action=r.action,
        status=r.status
    )


@router.get("/cases", response_model=List[FraudCaseResponse])
async def list_fraud_cases(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cases = await EnterpriseFraudService.list_fraud_cases(db, tenant_id)
    return [
        FraudCaseResponse(
            public_id=c.public_id,
            case_number=c.case_number,
            subject=c.subject,
            status=c.status,
            assigned_investigator=c.assigned_investigator,
            created_date=c.created_date
        )
        for c in cases
    ]


@router.post("/cases/{id}/decision", response_model=FraudCaseResponse)
async def apply_case_decision(
    id: uuid.UUID,
    req: FraudCaseDecisionRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    c = await EnterpriseFraudService.apply_case_decision(db, tenant_id, id, req, current_user)
    return FraudCaseResponse(
        public_id=c.public_id,
        case_number=c.case_number,
        subject=c.subject,
        status=c.status,
        assigned_investigator=c.assigned_investigator,
        created_date=c.created_date
    )


@router.get("/blacklist", response_model=List[BlacklistResponse])
async def list_blacklist(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    entries = await EnterpriseFraudService.list_blacklist(db, tenant_id)
    return [
        BlacklistResponse(
            public_id=b.public_id,
            entry_code=b.entry_code,
            item_type=b.item_type,
            item_value=b.item_value,
            reason=b.reason,
            status=b.status
        )
        for b in entries
    ]


@router.post("/blacklist", response_model=BlacklistResponse)
async def create_blacklist_entry(
    req: BlacklistCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    b = await EnterpriseFraudService.create_blacklist_entry(db, tenant_id, req, current_user)
    return BlacklistResponse(
        public_id=b.public_id,
        entry_code=b.entry_code,
        item_type=b.item_type,
        item_value=b.item_value,
        reason=b.reason,
        status=b.status
    )


@router.post("/evaluate", response_model=FraudScreeningResponse)
async def evaluate_fraud_screening(
    req: FraudScreeningRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseFraudService.evaluate_fraud_screening(db, tenant_id, req)
