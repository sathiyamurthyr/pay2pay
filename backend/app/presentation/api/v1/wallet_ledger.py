import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
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


class ManualTopupRequest(BaseModel):
    transaction_id: str
    entity_scope: str = "RETAILER"
    entity_id: str
    entity_name: str
    entity_code: str
    service_name: str = "General Allocation"
    wallet_type: str = "MAIN"
    txn_type: str = "CREDIT"
    amount: float
    opening_balance: float = 0.0
    balance_after: float = 0.0
    comments: str = "Manual wallet allocation"
    created_date: Optional[str] = None
    status: str = "COMPLETED"
    performed_by: str = "Platform Admin"


@router.post("/wallets/manual-topup", summary="Create Manual Topup Transaction")
async def create_manual_topup(
    req: ManualTopupRequest,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from app.infrastructure.db.transaction_engine_models import CentralTransactionModel
    from app.infrastructure.db.models import RetailerModel
    import uuid as uuid_mod

    retailer_id = None
    try:
        if req.entity_scope == "RETAILER":
            try:
                r_uuid = uuid_mod.UUID(req.entity_id)
                stmt = select(RetailerModel).where(RetailerModel.public_id == r_uuid)
                res = await db.execute(stmt)
                retailer = res.scalar_one_or_none()
                if retailer:
                    retailer_id = retailer.public_id
            except Exception:
                pass
    except Exception:
        pass

    try:
        existing_stmt = select(CentralTransactionModel).where(
            CentralTransactionModel.transaction_reference == req.transaction_id
        )
        existing_res = await db.execute(existing_stmt)
        existing = existing_res.scalar_one_or_none()
        if existing:
            return {
                "success": True,
                "message": "Transaction already recorded (idempotent)",
                "transaction_id": req.transaction_id,
                "public_id": str(existing.public_id),
            }
    except Exception:
        pass

    DEFAULT_TENANT_ID = uuid_mod.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")

    metadata = {
        "entity_scope": req.entity_scope,
        "entity_name": req.entity_name,
        "entity_code": req.entity_code,
        "service_name": req.service_name,
        "wallet_type": req.wallet_type,
        "txn_type": req.txn_type,
        "previous_balance": req.opening_balance,
        "current_balance": req.balance_after,
        "comments": req.comments,
        "performed_by": req.performed_by,
    }

    txn = CentralTransactionModel(
        tenant_id=DEFAULT_TENANT_ID,
        transaction_reference=req.transaction_id,
        transaction_type="WALLET_TOPUP",
        service_type="WALLET_TOPUP",
        retailer_id=retailer_id,
        amount=req.amount,
        net_amount=req.amount,
        status=req.status,
        response_message=req.comments,
        metadata_json=metadata,
        created_by=req.performed_by,
        updated_by=req.performed_by,
        vendor_code="PLATFORM_ADMIN",
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    return {
        "success": True,
        "message": "Manual topup recorded successfully",
        "transaction_id": req.transaction_id,
        "public_id": str(txn.public_id),
        "amount": req.amount,
        "entity_code": req.entity_code,
        "balance_after": req.balance_after,
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
    from datetime import datetime, timezone

    target_code = req.entity_code or req.entity_id or ""
    delta = req.amount if req.txn_type.upper() == "CREDIT" else -req.amount
    now_utc = datetime.now(timezone.utc)
    
    # 1. Search for Retailer in DB by code or public_id
    r_uuid = None
    try:
        r_uuid = uuid.UUID(str(target_code))
    except (ValueError, AttributeError):
        pass

    where_conds = [
        RetailerModel.retailer_code == target_code,
        RetailerModel.retailer_code == (req.entity_id or "")
    ]
    if r_uuid:
        where_conds.append(RetailerModel.public_id == r_uuid)

    ret_stmt = select(RetailerModel).where(
        or_(*where_conds),
        RetailerModel.is_deleted == False
    )
    ret_res = await db.execute(ret_stmt)
    ret_obj = ret_res.scalars().first()

    updated_bal = req.balance_after or 0.0
    now_date_str = now_utc.strftime("%Y%m%d")
    txn_ref = req.transaction_id or f"TOP-{now_date_str}-{uuid.uuid4().hex[:6].upper()}"
    txn_uuid = uuid.uuid4()

    if ret_obj:
        # Check / update RetailerWalletModel with row lock
        wal_stmt = select(RetailerWalletModel).where(
            RetailerWalletModel.retailer_id == ret_obj.public_id
        ).with_for_update()
        wal_res = await db.execute(wal_stmt)
        wal_obj = wal_res.scalars().first()

        opening_bal = float(wal_obj.wallet_balance) if wal_obj else 0.0
        if wal_obj:
            updated_bal = max(0.0, opening_bal + delta)
            wal_obj.wallet_balance = updated_bal
            wal_obj.updated_date = now_utc
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
                created_date=now_utc,
                updated_date=now_utc,
            )
            db.add(wal_obj)

        # 2. Write to TransactionLedgerEntryModel
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

        # 3. Write to Central Transactions table (transactions)
        central_txn = CentralTransactionModel(
            public_id=txn_uuid,
            tenant_id=ret_obj.tenant_id,
            company_id=ret_obj.company_id,
            vendor_code="ADMIN_MANUAL",
            transaction_reference=txn_ref,
            transaction_type="MANUAL_TOPUP" if req.txn_type.upper() == "CREDIT" else "MANUAL_DEBIT",
            service_type="TOPUP",
            retailer_id=ret_obj.public_id,
            amount=req.amount,
            currency="INR",
            charges=0.0,
            commission=0.0,
            gst_amount=0.0,
            tds_amount=0.0,
            net_amount=req.amount,
            status="SUCCESS",
            status_description=req.comments or f"Admin Manual {req.txn_type} Top-up ({req.service_name}) by {req.performed_by}",
            request_id=req.transaction_id or txn_ref,
            utr=req.transaction_id or txn_ref,
            created_at=now_utc,
            updated_at=now_utc,
            created_by=req.performed_by or "Platform Admin",
            updated_by=req.performed_by or "Platform Admin",
            metadata_json={
                "service_name": req.service_name,
                "wallet_type": req.wallet_type,
                "txn_type": req.txn_type,
                "entity_code": req.entity_code,
                "entity_name": req.entity_name,
                "retailer_code": ret_obj.retailer_code,
                "retailer_name": ret_obj.store_name,
                "previous_balance": opening_bal,
                "current_balance": updated_bal,
                "performed_by": req.performed_by or "Platform Admin",
                "comments": req.comments
            }
        )
        db.add(central_txn)
        
        await db.commit()
    
    return {
        "success": True,
        "transaction_id": txn_ref,
        "entity_code": req.entity_code,
        "entity_name": req.entity_name,
        "txn_type": req.txn_type,
        "amount": req.amount,
        "new_balance": updated_bal,
        "status": "COMPLETED",
        "timestamp": now_utc.isoformat(),
        "message": f"Successfully {req.txn_type.lower()}ed ₹{req.amount:,.2f} for {req.entity_code}."
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


