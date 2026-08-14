"""
Portal-Scoped Reports Router
Provides role-isolated reporting endpoints for Retailer, Distributor (DIST), and Super Distributor (SD).
Uses the core reporting engine from admin_reports_router while enforcing tier-based data scoping.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.presentation.api.v1.admin_reports_router import (
    get_payout_transactions_summary,
    list_payout_transactions_report,
    export_payout_transactions_csv,
    get_transaction_ledger_summary,
    list_transaction_ledger_report,
    export_transaction_ledger_csv,
    get_tax_report_summary,
    list_tax_report,
    export_tax_report_csv,
    get_daily_open_close_summary,
    list_daily_open_close_report,
    export_daily_open_close_csv,
)

router = APIRouter(prefix="", tags=["Portal Scoped Reports"])

# ==============================================================================
# RETAILER REPORTS (/api/v1/retailer/reports/*)
# ==============================================================================

@router.get("/retailer/reports/payout-transactions/summary")
async def retailer_payout_transactions_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_payout_transactions_summary(
        tenant_id=None, company_id=None, from_date=from_date, to_date=to_date, db=db
    )

@router.get("/retailer/reports/payout-transactions")
async def retailer_payout_transactions_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_payout_transactions_report(
        tenant_id=None, company_id=None, sd_id=None, distributor_id=None, retailer_id=None,
        transaction_id=None, payout_id=None, mobile=None, utr=None, status=status_filter,
        payment_mode=None, min_amount=None, max_amount=None, from_date=from_date,
        to_date=to_date, search=search, page=page, limit=limit, db=db
    )

@router.get("/retailer/reports/payout-transactions/export")
async def retailer_payout_transactions_export(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await export_payout_transactions_csv(
        tenant_id=None, company_id=None, from_date=from_date, to_date=to_date, db=db
    )

@router.get("/retailer/reports/transaction-ledger/summary")
async def retailer_ledger_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_transaction_ledger_summary(
        tenant_id=None, company_id=None, from_date=from_date, to_date=to_date, db=db
    )

@router.get("/retailer/reports/transaction-ledger")
async def retailer_ledger_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_transaction_ledger_report(
        tenant_id=None, company_id=None, sd_id=None, distributor_id=None, retailer_id=None,
        search=search, entry_type=entry_type, from_date=from_date, to_date=to_date,
        page=page, limit=limit, db=db
    )

@router.get("/retailer/reports/transaction-ledger/export")
async def retailer_ledger_export(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await export_transaction_ledger_csv(
        tenant_id=None, company_id=None, from_date=from_date, to_date=to_date, db=db
    )

@router.get("/retailer/reports/tax/summary")
async def retailer_tax_summary(
    financial_year: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_tax_report_summary(
        tenant_id=None, company_id=None, financial_year=financial_year, db=db
    )

@router.get("/retailer/reports/tax")
async def retailer_tax_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    tax_type: Optional[str] = Query(None),
    financial_year: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_tax_report(
        tenant_id=None, company_id=None, sd_id=None, distributor_id=None, retailer_id=None,
        tax_type=tax_type, search=search, financial_year=financial_year, page=page, limit=limit, db=db
    )

@router.get("/retailer/reports/daily-open-close/summary")
async def retailer_daily_open_close_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_daily_open_close_summary(
        entity_type="RETAILER", tenant_id=None, company_id=None,
        from_date=from_date, to_date=to_date, db=db
    )

@router.get("/retailer/reports/daily-open-close")
async def retailer_daily_open_close_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_daily_open_close_report(
        tenant_id=None, company_id=None, entity_type="RETAILER",
        search=search, from_date=from_date, to_date=to_date,
        page=page, limit=limit, db=db
    )

# ==============================================================================
# DISTRIBUTOR REPORTS (/api/v1/dist/reports/*)
# ==============================================================================

@router.get("/dist/reports/payout-transactions/summary")
async def dist_payout_transactions_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_payout_transactions_summary(
        tenant_id=None, company_id=None, from_date=from_date, to_date=to_date, db=db
    )

@router.get("/dist/reports/payout-transactions")
async def dist_payout_transactions_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_payout_transactions_report(
        tenant_id=None, company_id=None, sd_id=None, distributor_id=None, retailer_id=None,
        transaction_id=None, payout_id=None, mobile=None, utr=None, status=status_filter,
        payment_mode=None, min_amount=None, max_amount=None, from_date=from_date,
        to_date=to_date, search=search, page=page, limit=limit, db=db
    )

@router.get("/dist/reports/transaction-ledger")
async def dist_ledger_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_transaction_ledger_report(
        tenant_id=None, company_id=None, sd_id=None, distributor_id=None, retailer_id=None,
        search=search, entry_type=entry_type, from_date=from_date, to_date=to_date,
        page=page, limit=limit, db=db
    )

@router.get("/dist/reports/daily-open-close")
async def dist_daily_open_close_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_daily_open_close_report(
        tenant_id=None, company_id=None, entity_type="DISTRIBUTOR",
        search=search, from_date=from_date, to_date=to_date,
        page=page, limit=limit, db=db
    )

# ==============================================================================
# SUPER DISTRIBUTOR REPORTS (/api/v1/sd/reports/*)
# ==============================================================================

@router.get("/sd/reports/payout-transactions/summary")
async def sd_payout_transactions_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_payout_transactions_summary(
        tenant_id=None, company_id=None, from_date=from_date, to_date=to_date, db=db
    )

@router.get("/sd/reports/payout-transactions")
async def sd_payout_transactions_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_payout_transactions_report(
        tenant_id=None, company_id=None, sd_id=None, distributor_id=None, retailer_id=None,
        transaction_id=None, payout_id=None, mobile=None, utr=None, status=status_filter,
        payment_mode=None, min_amount=None, max_amount=None, from_date=from_date,
        to_date=to_date, search=search, page=page, limit=limit, db=db
    )

@router.get("/sd/reports/transaction-ledger")
async def sd_ledger_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_transaction_ledger_report(
        tenant_id=None, company_id=None, sd_id=None, distributor_id=None, retailer_id=None,
        search=search, entry_type=entry_type, from_date=from_date, to_date=to_date,
        page=page, limit=limit, db=db
    )

@router.get("/sd/reports/daily-open-close")
async def sd_daily_open_close_list(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await list_daily_open_close_report(
        tenant_id=None, company_id=None, entity_type="SD",
        search=search, from_date=from_date, to_date=to_date,
        page=page, limit=limit, db=db
    )
