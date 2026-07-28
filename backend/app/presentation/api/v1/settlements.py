import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    TransactionIngestCreateRequest, TransactionResponse, SettlementBatchGenerateRequest,
    SettlementBatchResponse, BankPayoutProcessRequest, BankPayoutResponse,
    SettlementDashboardMetricsResponse, PaginatedResponse
)
from app.application.services import SettlementManagementService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/settlements", tags=["Settlement Engine, MDR Split & Payouts (EPIC-006)"])


@router.post("/transactions", response_model=TransactionResponse)
async def ingest_transaction(
    req: TransactionIngestCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    txn = await SettlementManagementService.ingest_transaction(db, tenant_id, req, current_user)
    fee_split = {
        "gross_amount": txn.fee_split.gross_amount,
        "mdr_fee": txn.fee_split.mdr_fee,
        "gst_amount": txn.fee_split.gst_amount,
        "net_retailer_payout": txn.fee_split.net_retailer_payout,
        "distributor_commission": txn.fee_split.distributor_commission,
        "sd_commission": txn.fee_split.sd_commission
    } if txn.fee_split else None

    return TransactionResponse(
        public_id=txn.public_id,
        tenant_id=txn.tenant_id,
        company_id=txn.company_id,
        transaction_id=txn.transaction_id,
        rrn=txn.rrn,
        auth_code=txn.auth_code,
        amount=txn.amount,
        payment_mode=txn.payment_mode,
        card_number_masked=txn.card_number_masked,
        status=txn.status,
        settlement_status=txn.settlement_status,
        mapped_tid=txn.mapped_tid,
        mapped_retailer_id=txn.mapped_retailer_id,
        created_date=txn.created_date,
        fee_split=fee_split
    )


@router.get("/transactions", response_model=PaginatedResponse)
async def list_transactions(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    txns, total = await SettlementManagementService.list_transactions(
        db, tenant_id, search=search, status=status, payment_mode=payment_mode, page=page, page_size=page_size
    )
    items = [
        {
            "public_id": str(t.public_id),
            "transaction_id": t.transaction_id,
            "rrn": t.rrn,
            "auth_code": t.auth_code,
            "amount": t.amount,
            "payment_mode": t.payment_mode,
            "status": t.status,
            "settlement_status": t.settlement_status,
            "mapped_tid": t.mapped_tid,
            "created_date": t.created_date,
            "fee_split": {
                "mdr_fee": t.fee_split.mdr_fee,
                "net_payout": t.fee_split.net_retailer_payout
            } if t.fee_split else None
        }
        for t in txns
    ]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/batches/generate", response_model=SettlementBatchResponse)
async def generate_settlement_batch(
    req: SettlementBatchGenerateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    b = await SettlementManagementService.generate_settlement_batch(db, tenant_id, req, current_user)
    return SettlementBatchResponse(
        public_id=b.public_id,
        tenant_id=b.tenant_id,
        company_id=b.company_id,
        batch_number=b.batch_number,
        batch_date=b.batch_date,
        gross_volume=b.gross_volume,
        total_mdr=b.total_mdr,
        total_gst=b.total_gst,
        net_payout_amount=b.net_payout_amount,
        transaction_count=b.transaction_count,
        status=b.status,
        created_date=b.created_date
    )


@router.get("/batches", response_model=PaginatedResponse)
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    batches, total = await SettlementManagementService.list_batches(db, tenant_id, page=page, page_size=page_size)
    items = [
        {
            "public_id": str(b.public_id),
            "batch_number": b.batch_number,
            "batch_date": b.batch_date,
            "gross_volume": b.gross_volume,
            "total_mdr": b.total_mdr,
            "total_gst": b.total_gst,
            "net_payout_amount": b.net_payout_amount,
            "transaction_count": b.transaction_count,
            "status": b.status,
            "created_date": b.created_date
        }
        for b in batches
    ]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/payouts/process", response_model=BankPayoutResponse)
async def process_bank_payout(
    req: BankPayoutProcessRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    p = await SettlementManagementService.process_bank_payout(db, tenant_id, req, current_user)
    return BankPayoutResponse(
        public_id=p.public_id,
        payout_reference=p.payout_reference,
        retailer_id=p.retailer_id,
        amount=p.amount,
        utr_number=p.utr_number,
        status=p.status,
        dispatched_at=p.dispatched_at
    )


@router.get("/dashboard/metrics", response_model=SettlementDashboardMetricsResponse)
async def get_settlement_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await SettlementManagementService.get_dashboard_metrics(db, tenant_id)
