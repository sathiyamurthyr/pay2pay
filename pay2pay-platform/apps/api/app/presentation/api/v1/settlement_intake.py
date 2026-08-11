import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    SettlementFileUploadRequest, SettlementFileResponse,
    SettlementStagingResponse, SettlementRejectResponse,
    SettlementIntakeDashboardMetricsResponse
)
from app.application.services import SettlementIntakeService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/settlement-intake", tags=["Settlement File Intake & Validation Engine (EPIC-007)"])


@router.post("/upload", response_model=SettlementFileResponse)
async def upload_settlement_file(
    req: SettlementFileUploadRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    header = await SettlementIntakeService.upload_settlement_file(db, tenant_id, req, current_user)
    return SettlementFileResponse(
        public_id=header.public_id,
        file_number=header.file_number,
        bank_name=header.bank_name,
        settlement_date=header.settlement_date,
        original_file_name=header.original_file_name,
        file_hash=header.file_hash,
        checksum=header.checksum,
        file_size=header.file_size,
        status=header.status,
        uploaded_by=header.uploaded_by,
        created_date=header.created_date
    )


@router.get("/files", response_model=List[SettlementFileResponse])
async def list_settlement_files(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    files = await SettlementIntakeService.list_settlement_files(db, tenant_id)
    return [
        SettlementFileResponse(
            public_id=f.public_id,
            file_number=f.file_number,
            bank_name=f.bank_name,
            settlement_date=f.settlement_date,
            original_file_name=f.original_file_name,
            file_hash=f.file_hash,
            checksum=f.checksum,
            file_size=f.file_size,
            status=f.status,
            uploaded_by=f.uploaded_by,
            created_date=f.created_date
        )
        for f in files
    ]


@router.get("/staging", response_model=List[SettlementStagingResponse])
async def list_staging_records(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    records = await SettlementIntakeService.list_staging_records(db, tenant_id)
    return [
        SettlementStagingResponse(
            public_id=r.public_id,
            batch_number=r.batch_number,
            settlement_date=r.settlement_date,
            machine_id=r.machine_id,
            retailer_id=r.retailer_id,
            settlement_amount=r.settlement_amount,
            currency=r.currency,
            validation_status=r.validation_status
        )
        for r in records
    ]


@router.get("/rejects", response_model=List[SettlementRejectResponse])
async def list_reject_records(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rejects = await SettlementIntakeService.list_reject_records(db, tenant_id)
    return [
        SettlementRejectResponse(
            public_id=r.public_id,
            batch_number=r.batch_number,
            line_number=r.line_number,
            reject_code=r.reject_code,
            reject_message=r.reject_message,
            original_data=r.original_data,
            corrected_flag=r.corrected_flag
        )
        for r in rejects
    ]


@router.get("/dashboard/metrics", response_model=SettlementIntakeDashboardMetricsResponse)
async def get_settlement_intake_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SettlementIntakeService.get_dashboard_metrics(db, tenant_id)
