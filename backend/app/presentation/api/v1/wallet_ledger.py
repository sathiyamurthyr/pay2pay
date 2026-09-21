import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
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
    return await WalletLedgerPlatformService.list_wallets(db, tenant_id)


@router.post("/wallets/{id}/freeze", response_model=EnterpriseWalletResponse)
async def toggle_wallet_freeze(
    id: uuid.UUID,
    req: WalletFreezeRequest,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await WalletLedgerPlatformService.toggle_freeze(db, tenant_id, id, req, current_user)


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
    from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO
    from datetime import datetime, timezone

    now_utc = datetime.now(timezone.utc)
    target_code = req.entity_code or req.entity_id or ""
    
    dto = WalletAdjustmentDTO(
        retailer_code=target_code,
        user_id=req.entity_id if req.entity_id and "-" in str(req.entity_id) else None,
        entry_type=req.txn_type.upper(),
        amount=req.amount,
        service_name=req.service_name or "MANUAL_ADJUSTMENT",
        wallet_type=req.wallet_type or "MAIN",
        user_type=req.entity_scope or "RETAILER",
        txn_id=req.transaction_id,
        narration=req.comments or f"Admin Manual {req.txn_type} Top-up ({req.service_name}) by {req.performed_by}",
        actor_name=req.performed_by or "Platform Admin"
    )

    result = await WalletBalanceAdjustmentService.execute_wallet_balance_update(db=db, dto=dto)

    if not result.success:
        raise HTTPException(
            status_code=400,
            detail=f"Manual Topup Failed [{result.error_code}]: {result.error_message}"
        )

    return {
        "success": True,
        "message": f"Manual {req.txn_type.lower()} allocation completed successfully via stored procedure",
        "transaction_id": result.txn_id,
        "amount": result.amount,
        "entity_code": result.user_code,
        "entity_name": result.user_name,
        "txn_type": result.entry_type,
        "opening_balance": result.balance_before,
        "balance_after": result.balance_after,
        "new_balance": result.balance_after,
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


# ==============================================================================
# WALLET LEDGER / TRANSACTIONS AUDIT REPORT API
# GET /api/v1/wallet-ledger/transactions
# ==============================================================================

@router.get("/entities", summary="Dynamic entities list for SD, Distributor, and Retailer filters")
async def get_wallet_ledger_entities(
    user_type: Optional[str] = Query(None, description="User type filter: SD, DISTRIBUTOR, RETAILER, ALL"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns dynamically resolved entity list for cascading filters.
    SDs, Distributors, Retailers from live database records.
    """
    from app.application.wallet_ledger_audit_service import WalletLedgerAuditService
    entities = await WalletLedgerAuditService.get_entities_by_user_type(db, user_type)
    return {
        "success": True,
        "total": len(entities),
        "items": entities
    }


@router.get("/transactions", summary="Wallet Ledger & Financial Reconciliation Audit Report")
async def get_wallet_ledger_audit_transactions(
    page: int = Query(1, description="Page number (1-indexed)"),
    limit: int = Query(25, description="Page size (1-100)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) in IST"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) in IST"),
    user_type: Optional[str] = Query(None, description="User type (SD, DISTRIBUTOR, RETAILER, ALL)"),
    user_ref_id: Optional[int] = Query(None, description="User Reference ID"),
    service: Optional[str] = Query(None, description="Service (PAYOUT, TOPUP, AEPS, DMT, RECHARGE, ALL)"),
    entry_type: Optional[str] = Query(None, description="Entry type (CREDIT, DEBIT, ALL)"),
    status: Optional[str] = Query(None, description="Status (SUCCESS, PENDING, FAILED, ALL)"),
    reconciliation: Optional[str] = Query(None, description="Reconciliation status (MATCHED, MISMATCH, PENDING, ALL)"),
    search: Optional[str] = Query(None, description="Search term for Txn ID, Ref ID, Retailer, Distributor, etc."),
    sort_by: Optional[str] = Query("created_at", description="Sort by field"),
    sort_order: Optional[str] = Query("DESC", description="Sort direction (ASC, DESC)"),
    company_ref_id: Optional[int] = Query(None, description="Optional company scoping"),
    db: AsyncSession = Depends(get_db)
):
    """
    Major Financial Tracking and Audit Report Endpoint.
    Combines transactions, wallet ledgers, and reconciliation results.
    Authoritative server-side calculations for CR/DR, Net Movement, and Mismatch Detection.
    """
    from app.application.wallet_ledger_audit_service import WalletLedgerAuditService

    result = await WalletLedgerAuditService.get_audit_report(
        db=db,
        page=page,
        limit=limit,
        from_date=from_date,
        to_date=to_date,
        user_type=user_type,
        user_ref_id=user_ref_id,
        service=service,
        entry_type=entry_type,
        status=status,
        reconciliation=reconciliation,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        company_ref_id=company_ref_id
    )
    return result




@router.get("/transactions/export", summary="Export Wallet Ledger Audit Report as CSV")
async def export_wallet_ledger_audit_csv(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None),
    user_ref_id: Optional[int] = Query(None),
    service: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    reconciliation: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    company_ref_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports filtered audit report as CSV stream respecting all applied filters.
    """
    import io
    import csv
    from fastapi.responses import StreamingResponse
    from app.application.wallet_ledger_audit_service import WalletLedgerAuditService

    # Fetch up to 10,000 matching records for export
    result = await WalletLedgerAuditService.get_audit_report(
        db=db,
        page=1,
        limit=10000,
        from_date=from_date,
        to_date=to_date,
        user_type=user_type,
        user_ref_id=user_ref_id,
        service=service,
        entry_type=entry_type,
        status=status,
        reconciliation=reconciliation,
        search=search,
        company_ref_id=company_ref_id
    )

    items = result.get("data", [])

    output = io.StringIO()
    writer = csv.writer(output)

    # 25 Column Headers
    headers = [
        "Date/Time", "Transaction ID", "Ledger ID", "Reference ID",
        "User Type", "User Name", "Company", "Super Distributor",
        "Distributor", "Retailer", "Service", "Transaction Type",
        "CR/DR", "Transaction Amount", "Ledger Amount",
        "MDR %", "MDR Amount", "Commission %", "Commission Amount",
        "Opening Balance", "Closing Balance", "Wallet",
        "Status", "Reconciliation", "Mismatch Reasons", "Created By"
    ]
    writer.writerow(headers)

    for it in items:
        reasons_str = "; ".join(it.get("mismatch_reasons") or [])
        writer.writerow([
            it.get("created_at"),
            it.get("txn_id"),
            it.get("ledger_id"),
            it.get("ref_id"),
            it.get("user_type"),
            it.get("user_name"),
            it.get("company"),
            it.get("super_distributor"),
            it.get("distributor"),
            it.get("retailer"),
            it.get("service"),
            it.get("transaction_type"),
            it.get("cr_dr"),
            it.get("amount"),
            it.get("ledger_amount"),
            it.get("mdr_percent"),
            it.get("mdr_amount"),
            it.get("commission_percent"),
            it.get("commission_amount"),
            it.get("opening_balance"),
            it.get("closing_balance"),
            it.get("wallet"),
            it.get("status"),
            it.get("reconciliation"),
            reasons_str,
            it.get("created_by")
        ])

    output.seek(0)
    filename = f"wallet_ledger_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/transactions/{txn_id}", summary="Get Detailed Transaction Audit Trace")
async def get_wallet_ledger_audit_transaction_detail(
    txn_id: str,
    primary_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Provides comprehensive deep audit trace for a specific transaction ID.
    Includes component rows, ledger entries, gateway reconciliation, and hierarchy.
    """
    from app.application.wallet_ledger_audit_service import WalletLedgerAuditService

    detail = await WalletLedgerAuditService.get_transaction_detail(db, txn_id, primary_id=primary_id)
    if not detail:
        raise HTTPException(
            status_code=404,
            detail={"success": False, "message": f"Transaction {txn_id} not found"}
        )
    return detail
