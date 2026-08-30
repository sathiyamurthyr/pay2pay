import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

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
    from app.infrastructure.db.transaction_engine_models import CentralTransactionModel, TransactionLedgerEntryModel
    from app.domain.date_keys import compute_transaction_date_and_partition_keys
    from datetime import datetime, timezone
    from decimal import Decimal

    target_code = req.entity_code or req.entity_id or ""
    delta = req.amount if req.txn_type.upper() == "CREDIT" else -req.amount
    now_utc = datetime.now(timezone.utc)
    
    # 1. Search for Retailer in DB by code or public_id
    r_uuid = None
    for cand in [req.entity_id, req.entity_code, target_code]:
        if cand:
            try:
                r_uuid = uuid.UUID(str(cand))
                break
            except Exception:
                pass

    where_conds = []
    if req.entity_code:
        where_conds.append(RetailerModel.retailer_code == req.entity_code)
    if target_code and target_code != req.entity_code:
        where_conds.append(RetailerModel.retailer_code == target_code)
    if req.entity_id and req.entity_id not in (req.entity_code, target_code):
        where_conds.append(RetailerModel.retailer_code == req.entity_id)
    if r_uuid:
        where_conds.append(RetailerModel.public_id == r_uuid)

    ret_stmt = select(RetailerModel).where(
        or_(*where_conds),
        RetailerModel.is_deleted == False
    )
    ret_res = await db.execute(ret_stmt)
    ret_obj = ret_res.scalars().first()

    if not ret_obj:
        raise HTTPException(
            status_code=404,
            detail=f"Target entity '{req.entity_code or req.entity_id}' could not be matched to an active retailer in the database."
        )

    now_date_str = now_utc.strftime("%Y%m%d")
    txn_ref = req.transaction_id or f"TOPUP-{now_date_str}-{uuid.uuid4().hex[:4].upper()}"
    txn_uuid = uuid.uuid4()

    # 2. Check / update RetailerWalletModel with row lock
    wal_stmt = select(RetailerWalletModel).where(
        RetailerWalletModel.retailer_id == ret_obj.public_id
    ).with_for_update()
    wal_res = await db.execute(wal_stmt)
    wal_obj = wal_res.scalars().first()

    opening_bal = float(wal_obj.wallet_balance) if wal_obj else 0.0
    if wal_obj:
        updated_bal = round(max(0.0, opening_bal + delta), 2)
        wal_obj.wallet_balance = updated_bal
        wal_obj.updated_date = now_utc
    else:
        updated_bal = round(max(0.0, req.amount if req.txn_type.upper() == "CREDIT" else 0.0), 2)
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
            created_date=now_utc,
            updated_date=now_utc,
        )
        db.add(wal_obj)

    # 3. Write to TransactionLedgerEntryModel
    ledger_entry = TransactionLedgerEntryModel(
        tenant_id=ret_obj.tenant_id,
        transaction_id=txn_uuid,
        transaction_reference=txn_ref,
        entry_type=req.txn_type.upper(),
        account_type="RETAILER_WALLET",
        account_number=str(ret_obj.public_id),
        amount=req.amount,
        balance_before=opening_bal,
        balance_after=updated_bal,
        currency="INR",
        narration=req.comments or f"Admin Manual {req.txn_type} Top-up ({req.service_name}) by {req.performed_by}",
        created_at=now_utc
    )
    db.add(ledger_entry)

    # 4. Write to Central Transactions table (transactions - Append-Only)
    wl_keys = compute_transaction_date_and_partition_keys(now_utc)
    central_txn = CentralTransactionModel(
        public_id=txn_uuid,
        tenant_id=ret_obj.tenant_id,
        company_id=ret_obj.company_id,
        retailer_id=ret_obj.public_id,
        txn_id=txn_ref,
        ref_id=req.transaction_id or txn_ref,
        table_ref_id=None,
        service_name=req.service_name or "WALLET_TOPUP",
        wallet_type="MAIN",
        user_type="RETAILER",
        user_type_ref_id=2,
        entry_type=req.txn_type.upper(),
        amount=Decimal(str(req.amount)),
        balance_before=Decimal(str(opening_bal)),
        balance_after=Decimal(str(updated_bal)),
        status="SUCCESS",
        narration=req.comments or f"Admin Manual {req.txn_type} ({req.service_name}) by {req.performed_by}",
        day_key=wl_keys["day_key"],
        week_key=wl_keys["week_key"],
        month_key=wl_keys["month_key"],
        quarter_key=wl_keys["quarter_key"],
        year_key=wl_keys["year_key"],
        financial_year_key=wl_keys["financial_year_key"],
        financial_quarter_key=wl_keys["financial_quarter_key"],
        financial_month_key=wl_keys["financial_month_key"],
        date_key=wl_keys["date_key"],
        time_key=wl_keys["time_key"],
        partition_year=wl_keys["partition_year"],
        partition_month=wl_keys["partition_month"],
        partition_day=wl_keys["partition_day"],
        is_active=True,
        is_deleted=False,
        created_at=now_utc,
        updated_at=now_utc,
    )
    db.add(central_txn)
    
    await db.commit()
    await db.refresh(wal_obj)

    return {
        "success": True,
        "message": "Manual topup recorded successfully",
        "transaction_id": txn_ref,
        "public_id": str(central_txn.public_id),
        "amount": req.amount,
        "entity_code": req.entity_code,
        "entity_name": req.entity_name or ret_obj.store_name,
        "txn_type": req.txn_type,
        "opening_balance": opening_bal,
        "balance_after": updated_bal,
        "new_balance": updated_bal,
        "status": "COMPLETED",
        "timestamp": now_utc.isoformat()
    }


@router.get("/wallets/manual-topup", summary="Get Recent Manual Topup Ledger Transactions")
@router.get("/manual-topup", summary="Get Recent Manual Topup Ledger Transactions Alias")
async def get_manual_topup_ledger(
    page_size: int = 50,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select, desc
    from app.infrastructure.db.transaction_engine_models import CentralTransactionModel
    from datetime import datetime, timezone
    
    stmt = select(CentralTransactionModel).where(
        CentralTransactionModel.service_type == "WALLET_TOPUP"
    ).order_by(desc(CentralTransactionModel.created_at)).limit(page_size)
    
    res = await db.execute(stmt)
    txns = res.scalars().all()
    
    items = []
    for t in txns:
        meta = t.metadata_json or {}
        created_iso = t.created_at.isoformat() if t.created_at else datetime.now(timezone.utc).isoformat()
        items.append({
            "public_id": str(t.public_id),
            "transaction_id": t.transaction_reference,
            "entity_scope": meta.get("entity_scope", "RETAILER"),
            "entity_id": str(t.retailer_id or t.customer_id or ""),
            "entity_name": meta.get("entity_name") or meta.get("retailer_name") or "Retailer Store",
            "entity_code": meta.get("entity_code") or meta.get("retailer_code") or "RET-UNKNOWN",
            "service_name": meta.get("service_name", "General Allocation"),
            "wallet_type": meta.get("wallet_type", "MAIN"),
            "txn_type": meta.get("txn_type", "CREDIT"),
            "amount": float(t.amount or 0.0),
            "opening_balance": float(meta.get("previous_balance", 0.0)),
            "balance_after": float(meta.get("current_balance", t.amount or 0.0)),
            "comments": meta.get("comments") or t.response_message or "Manual wallet allocation",
            "created_date": created_iso,
            "status": t.status or "COMPLETED",
            "performed_by": meta.get("performed_by", "Platform Admin"),
        })
    
    return {
        "success": True,
        "items": items,
        "total": len(items)
    }


@router.get("/user-wallet")
async def get_user_wallet_endpoint(
    user_ref_id: Optional[int] = Query(None, description="User / Retailer Reference ID"),
    retailer_ref_id: Optional[int] = Query(None, description="Alternative: Retailer Reference ID"),
    retailer_id: Optional[str] = Query(None, description="Alternative: Retailer Code (e.g. RET-10928) or UUID"),
    user_type_ref_id: Optional[int] = Query(2, description="User Type Reference ID from user_type master (2 for RETAILER)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calls public.get_user_wallet(p_user_ref_id, p_user_type_ref_id)
    Returns wallet information, balance, and status.
    """
    effective_ref_id = user_ref_id or retailer_ref_id

    if effective_ref_id is None and retailer_id:
        # Resolve retailer_ref_id from retailer_code or public_id
        q = await db.execute(text("""
            SELECT r.retailer_ref_id FROM public.retailer r
            WHERE r.retailer_code = :r_id OR r.public_id::text = :r_id
            LIMIT 1;
        """), {"r_id": str(retailer_id).strip()})
        row_id = q.fetchone()
        if row_id:
            effective_ref_id = row_id[0]

    if effective_ref_id is None:
        effective_ref_id = 4  # Default fallback if unauthenticated / not passed

    res = await db.execute(
        text("SELECT * FROM public.get_user_wallet(:user_ref_id, :user_type_ref_id);"),
        {"user_ref_id": effective_ref_id, "user_type_ref_id": user_type_ref_id or 2}
    )
    row = res.fetchone()
    if not row:
        return {
            "success": False,
            "message": f"Wallet not found for user_ref_id={effective_ref_id} and user_type_ref_id={user_type_ref_id}",
            "data": None
        }
    
    d = dict(row._mapping)
    return {
        "success": True,
        "data": d,
        "wallet_balance": float(d.get("wallet_balance") or 0.0),
        "available_balance": float(d.get("wallet_balance") or 0.0),
        "balance": float(d.get("wallet_balance") or 0.0),
        "wallet_status": d.get("wallet_status", "ACTIVE"),
        "is_active": d.get("is_active", True),
        "is_frozen": d.get("is_frozen", False),
        "user_ref_id": d.get("user_ref_id"),
        "wallet_ref_id": d.get("wallet_ref_id")
    }




