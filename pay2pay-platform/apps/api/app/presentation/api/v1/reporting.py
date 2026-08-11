import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    ExecutiveMISMetricsResponse, FinancialMISMetricsResponse,
    ReportDefinitionResponse, ReportExecutionCreateRequest,
    ReportExecutionResponse, ReportScheduleCreateRequest,
    ReportScheduleResponse, DailySummaryResponse
)
from app.application.services import EnterpriseReportingService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/reporting", tags=["Enterprise Reporting & MIS Platform (EPIC-011)"])


@router.get("/executive-summary", response_model=ExecutiveMISMetricsResponse)
async def get_executive_mis_summary(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseReportingService.get_executive_mis_summary(db, tenant_id)


@router.get("/financial-summary", response_model=FinancialMISMetricsResponse)
async def get_financial_mis_summary(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await EnterpriseReportingService.get_financial_mis_summary(db, tenant_id)


@router.get("/definitions", response_model=List[ReportDefinitionResponse])
async def list_report_definitions(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    reports = await EnterpriseReportingService.list_report_definitions(db, tenant_id)
    return [
        ReportDefinitionResponse(
            public_id=r.public_id,
            report_code=r.report_code,
            report_name=r.report_name,
            description=r.description,
            category=r.category,
            status=r.status
        )
        for r in reports
    ]


@router.post("/execute", response_model=ReportExecutionResponse)
async def execute_report(
    req: ReportExecutionCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ex = await EnterpriseReportingService.execute_report(db, tenant_id, req, current_user)
    return ReportExecutionResponse(
        public_id=ex.public_id,
        execution_number=ex.execution_number,
        report_id=ex.report_id,
        execution_status=ex.execution_status,
        record_count=ex.record_count,
        file_path=ex.file_path,
        executed_by=ex.executed_by,
        created_date=ex.created_date
    )


@router.get("/executions", response_model=List[ReportExecutionResponse])
async def list_report_executions(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    executions = await EnterpriseReportingService.list_report_executions(db, tenant_id)
    return [
        ReportExecutionResponse(
            public_id=e.public_id,
            execution_number=e.execution_number,
            report_id=e.report_id,
            execution_status=e.execution_status,
            record_count=e.record_count,
            file_path=e.file_path,
            executed_by=e.executed_by,
            created_date=e.created_date
        )
        for e in executions
    ]


@router.post("/schedules", response_model=ReportScheduleResponse)
async def create_report_schedule(
    req: ReportScheduleCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    s = await EnterpriseReportingService.create_schedule(db, tenant_id, req, current_user)
    return ReportScheduleResponse(
        public_id=s.public_id,
        schedule_code=s.schedule_code,
        report_id=s.report_id,
        frequency=s.frequency,
        recipient_email=s.recipient_email,
        format=s.format,
        status=s.status,
        last_executed=s.last_executed
    )


@router.get("/schedules", response_model=List[ReportScheduleResponse])
async def list_report_schedules(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    schedules = await EnterpriseReportingService.list_schedules(db, tenant_id)
    return [
        ReportScheduleResponse(
            public_id=s.public_id,
            schedule_code=s.schedule_code,
            report_id=s.report_id,
            frequency=s.frequency,
            recipient_email=s.recipient_email,
            format=s.format,
            status=s.status,
            last_executed=s.last_executed
        )
        for s in schedules
    ]


@router.get("/daily-summaries", response_model=List[DailySummaryResponse])
async def list_daily_summaries(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    summaries = await EnterpriseReportingService.list_daily_summaries(db, tenant_id)
    return [
        DailySummaryResponse(
            summary_date=ds.summary_date,
            total_transactions=ds.total_transactions,
            gross_amount=ds.gross_amount,
            mdr_revenue=ds.mdr_revenue,
            gst_collected=ds.gst_collected,
            tds_deducted=ds.tds_deducted,
            net_wallet_credit=ds.net_wallet_credit,
            outbound_payout_volume=ds.outbound_payout_volume
        )
        for ds in summaries
    ]
