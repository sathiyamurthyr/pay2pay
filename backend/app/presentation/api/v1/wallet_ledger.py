import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import (
    EnterpriseWalletCreateRequest, EnterpriseWalletResponse,
    WalletFreezeRequest, WalletAdjustmentCreateRequest,
    ChartOfAccountsResponse, ReconciliationBatchResponse,
    WalletLedgerDashboardMetricsResponse
)
from app.application.services import WalletLedgerPlatformService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/wallet-ledger", tags=["Enterprise Wallet & Ledger Platform (EPIC-009)"])


@router.post("/wallets", response_model=EnterpriseWalletResponse)
async def create_enterprise_wallet(
    req: EnterpriseWalletCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wallet = await WalletLedgerPlatformService.create_wallet(db, tenant_id, req, current_user)
    return EnterpriseWalletResponse(
        public_id=wallet.public_id,
        wallet_number=wallet.wallet_number,
        wallet_type=wallet.wallet_type,
        owner_type=wallet.owner_type,
        owner_id=wallet.owner_id,
        status=wallet.status,
        currency=wallet.currency,
        current_balance=wallet.balance.closing_balance if wallet.balance else 0.0,
        available_balance=wallet.balance.available_balance if wallet.balance else 0.0,
        hold_balance=wallet.balance.hold_balance if wallet.balance else 0.0,
        created_date=wallet.created_date
    )


@router.get("/wallets", response_model=List[EnterpriseWalletResponse])
async def list_enterprise_wallets(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wallets = await WalletLedgerPlatformService.list_wallets(db, tenant_id)
    return [
        EnterpriseWalletResponse(
            public_id=w.public_id,
            wallet_number=w.wallet_number,
            wallet_type=w.wallet_type,
            owner_type=w.owner_type,
            owner_id=w.owner_id,
            status=w.status,
            currency=w.currency,
            current_balance=w.balance.closing_balance if w.balance else 0.0,
            available_balance=w.balance.available_balance if w.balance else 0.0,
            hold_balance=w.balance.hold_balance if w.balance else 0.0,
            created_date=w.created_date
        )
        for w in wallets
    ]


@router.post("/wallets/{id}/freeze", response_model=EnterpriseWalletResponse)
async def toggle_wallet_freeze(
    id: uuid.UUID,
    req: WalletFreezeRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    w = await WalletLedgerPlatformService.toggle_freeze(db, tenant_id, id, req, current_user)
    return EnterpriseWalletResponse(
        public_id=w.public_id,
        wallet_number=w.wallet_number,
        wallet_type=w.wallet_type,
        owner_type=w.owner_type,
        owner_id=w.owner_id,
        status=w.status,
        currency=w.currency,
        current_balance=w.balance.closing_balance if w.balance else 0.0,
        available_balance=w.balance.available_balance if w.balance else 0.0,
        hold_balance=w.balance.hold_balance if w.balance else 0.0,
        created_date=w.created_date
    )


@router.post("/wallets/{id}/adjust")
async def adjust_wallet_balance(
    id: uuid.UUID,
    req: WalletAdjustmentCreateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    adj = await WalletLedgerPlatformService.adjust_balance(db, tenant_id, id, req, current_user)
    return {"message": "Wallet balance adjustment successful", "adjustment_number": adj.adjustment_number, "status": adj.status}


@router.get("/chart-of-accounts", response_model=List[ChartOfAccountsResponse])
async def list_chart_of_accounts(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    accounts = await WalletLedgerPlatformService.list_chart_of_accounts(db, tenant_id)
    return [
        ChartOfAccountsResponse(
            account_code=a.account_code,
            account_name=a.account_name,
            account_type=a.account_type,
            nature=a.nature,
            posting_allowed=a.posting_allowed,
            status=a.status
        )
        for a in accounts
    ]


from pydantic import BaseModel

class AccountStatusUpdateRequest(BaseModel):
    status: str


@router.patch("/chart-of-accounts/{account_code}/status", response_model=ChartOfAccountsResponse)
async def update_account_status(
    account_code: str,
    req: AccountStatusUpdateRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    acc = await WalletLedgerPlatformService.update_chart_of_account_status(db, tenant_id, account_code, req.status, current_user)
    return ChartOfAccountsResponse(
        account_code=acc.account_code,
        account_name=acc.account_name,
        account_type=acc.account_type,
        nature=acc.nature,
        posting_allowed=acc.posting_allowed,
        status=acc.status
    )


@router.post("/reconcile", response_model=ReconciliationBatchResponse)
async def trigger_reconciliation(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    rec = await WalletLedgerPlatformService.trigger_reconciliation(db, tenant_id, current_user)
    return ReconciliationBatchResponse(
        public_id=rec.public_id,
        reconciliation_number=rec.reconciliation_number,
        source_module=rec.source_module,
        target_module=rec.target_module,
        difference_amount=rec.difference_amount,
        status=rec.status,
        completed_by=rec.completed_by,
        completed_date=rec.completed_date
    )


@router.get("/dashboard/metrics", response_model=WalletLedgerDashboardMetricsResponse)
async def get_wallet_ledger_dashboard_metrics(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await WalletLedgerPlatformService.get_dashboard_metrics(db, tenant_id)


class ManualTopupRequest(BaseModel):
    transaction_id: Optional[str] = None
    entity_scope: str = "RETAILER"
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    entity_code: str
    service_name: Optional[str] = "General Wallet Allocation"
    wallet_type: str = "MAIN"
    txn_type: str = "CREDIT"
    amount: float
    opening_balance: Optional[float] = None
    balance_after: Optional[float] = None
    comments: Optional[str] = None
    created_date: Optional[str] = None
    status: Optional[str] = "COMPLETED"
    performed_by: Optional[str] = "Platform Admin"


@router.post("/wallets/manual-topup", summary="Manual Wallet Top-up / Debit Allocation")
@router.post("/manual-topup", summary="Manual Wallet Top-up Alias")
async def execute_manual_topup(
    req: ManualTopupRequest,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select, update, or_
    from app.infrastructure.db.models import RetailerModel, RetailerWalletModel
    import datetime

    target_code = req.entity_code or req.entity_id or ""
    delta = req.amount if req.txn_type.upper() == "CREDIT" else -req.amount
    
    # 1. Search for Retailer in DB
    ret_stmt = select(RetailerModel).where(
        or_(
            RetailerModel.retailer_code == target_code,
            RetailerModel.retailer_code == (req.entity_id or "")
        )
    )
    ret_res = await db.execute(ret_stmt)
    ret_obj = ret_res.scalars().first()

    updated_bal = req.balance_after or 0.0

    if ret_obj:
        # Check / update RetailerWalletModel
        wal_stmt = select(RetailerWalletModel).where(RetailerWalletModel.retailer_id == ret_obj.public_id)
        wal_res = await db.execute(wal_stmt)
        wal_obj = wal_res.scalars().first()

        if wal_obj:
            curr = float(wal_obj.wallet_balance)
            updated_bal = max(0.0, curr + delta)
            wal_obj.wallet_balance = updated_bal
            wal_obj.updated_date = datetime.datetime.now(datetime.timezone.utc)
        else:
            updated_bal = max(0.0, req.amount if req.txn_type.upper() == "CREDIT" else 0.0)
            wal_obj = RetailerWalletModel(
                public_id=uuid.uuid4(),
                tenant_id=ret_obj.tenant_id,
                company_id=ret_obj.company_id,
                retailer_id=ret_obj.public_id,
                wallet_balance=updated_bal,
                daily_transaction_limit=500000.0,
                single_transaction_limit=100000.0,
                is_frozen=False,
                is_active=True,
                record_status="ACTIVE",
                is_deleted=False,
                version_no=1,
                created_date=datetime.datetime.now(datetime.timezone.utc),
                updated_date=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(wal_obj)
        
        await db.commit()
    
    return {
        "success": True,
        "transaction_id": req.transaction_id or f"TOPUP-{uuid.uuid4().hex[:8].upper()}",
        "entity_code": req.entity_code,
        "entity_name": req.entity_name,
        "txn_type": req.txn_type,
        "amount": req.amount,
        "new_balance": updated_bal,
        "status": "COMPLETED",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "message": f"Successfully {req.txn_type.lower()}ed ₹{req.amount:,.2f} for {req.entity_code}."
    }

