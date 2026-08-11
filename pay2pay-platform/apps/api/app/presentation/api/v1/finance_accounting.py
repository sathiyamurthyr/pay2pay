import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    AccountingPeriodResponse, TrialBalanceResponse, FinancialStatementResponse,
    BankReconciliationMatchRequest, BankReconciliationMatchResponse,
    ManualJournalCreateRequest, ManualJournalResponse, FinanceDashboardMetricsResponse
)
from app.application.services import EnterpriseFinanceService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/finance", tags=["Enterprise Finance, Accounting & Reconciliation Platform (EPIC-015)"])


@router.get("/dashboard/metrics", response_model=FinanceDashboardMetricsResponse)
async def get_finance_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseFinanceService.get_finance_dashboard_metrics(db, tenant_id)


@router.get("/periods", response_model=List[AccountingPeriodResponse])
async def list_accounting_periods(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    periods = await EnterpriseFinanceService.list_accounting_periods(db, tenant_id)
    return [
        AccountingPeriodResponse(
            public_id=p.public_id,
            period_code=p.period_code,
            period_name=p.period_name,
            start_date=p.start_date,
            end_date=p.end_date,
            status=p.status
        )
        for p in periods
    ]


@router.post("/periods/{id}/close", response_model=AccountingPeriodResponse)
async def close_accounting_period(
    id: uuid.UUID,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    p = await EnterpriseFinanceService.close_accounting_period(db, tenant_id, id, current_user)
    return AccountingPeriodResponse(
        public_id=p.public_id,
        period_code=p.period_code,
        period_name=p.period_name,
        start_date=p.start_date,
        end_date=p.end_date,
        status=p.status
    )


@router.get("/trial-balance", response_model=TrialBalanceResponse)
async def get_trial_balance(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseFinanceService.get_trial_balance(db, tenant_id)


@router.get("/statements/{statement_type}", response_model=FinancialStatementResponse)
async def get_financial_statement(
    statement_type: str,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseFinanceService.get_financial_statement(db, tenant_id, statement_type)


@router.post("/bank-reconciliation/match", response_model=BankReconciliationMatchResponse)
async def auto_match_bank_reconciliation(
    req: BankReconciliationMatchRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseFinanceService.auto_match_bank_reconciliation(db, tenant_id, req)


@router.post("/journals", response_model=ManualJournalResponse)
async def post_manual_journal(
    req: ManualJournalCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseFinanceService.post_manual_journal(db, tenant_id, req, current_user)
