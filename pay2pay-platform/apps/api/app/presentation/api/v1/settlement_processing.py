import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    SettlementBatchProcessRequest, SettlementTransactionResponse,
    AccountingJournalResponse, JournalEntryResponse,
    SettlementProcessingDashboardMetricsResponse
)
from app.application.services import SettlementProcessingService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/settlement-processing", tags=["Settlement Processing Engine (EPIC-008)"])


@router.post("/process-batch", response_model=List[SettlementTransactionResponse])
async def process_settlement_batch(
    req: SettlementBatchProcessRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    txns = await SettlementProcessingService.process_batch(db, tenant_id, req, current_user)
    return [
        SettlementTransactionResponse(
            public_id=t.public_id,
            settlement_number=t.settlement_number,
            batch_number=t.batch_number,
            machine_id=t.machine_id,
            retailer_id=t.retailer_id,
            settlement_date=t.settlement_date,
            gross_amount=t.gross_amount,
            net_amount=t.net_amount,
            status=t.status,
            reference_number=t.reference_number,
            created_date=t.created_date
        )
        for t in txns
    ]


@router.get("/transactions", response_model=List[SettlementTransactionResponse])
async def list_settlement_transactions(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    txns = await SettlementProcessingService.list_transactions(db, tenant_id)
    return [
        SettlementTransactionResponse(
            public_id=t.public_id,
            settlement_number=t.settlement_number,
            batch_number=t.batch_number,
            machine_id=t.machine_id,
            retailer_id=t.retailer_id,
            settlement_date=t.settlement_date,
            gross_amount=t.gross_amount,
            net_amount=t.net_amount,
            status=t.status,
            reference_number=t.reference_number,
            created_date=t.created_date
        )
        for t in txns
    ]


@router.get("/journals", response_model=List[AccountingJournalResponse])
async def list_accounting_journals(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    journals = await SettlementProcessingService.list_journals(db, tenant_id)
    return [
        AccountingJournalResponse(
            public_id=j.public_id,
            journal_number=j.journal_number,
            journal_date=j.journal_date,
            posting_status=j.posting_status,
            posting_reference=j.posting_reference,
            source_module=j.source_module,
            entries=[
                JournalEntryResponse(
                    account_code=e.account_code,
                    debit=e.debit,
                    credit=e.credit,
                    cost_centre=e.cost_centre,
                    narration=e.narration
                )
                for e in j.entries
            ]
        )
        for j in journals
    ]


@router.get("/dashboard/metrics", response_model=SettlementProcessingDashboardMetricsResponse)
async def get_settlement_processing_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SettlementProcessingService.get_dashboard_metrics(db, tenant_id)
