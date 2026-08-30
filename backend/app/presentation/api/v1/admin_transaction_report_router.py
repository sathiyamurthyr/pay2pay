"""
Pay2Pay Centralized Admin Transaction Report REST API Router.
Authoritative, Single Source of Truth Reporting Engine for Enterprise Administrators.

Provides comprehensive visibility across all platform transactions, wallet movements,
companies, user types, services, vendors, topups, settlements, and reversals.

Endpoints:
- GET /api/v1/admin/reports/transactions (Main paginated grid)
- GET /api/v1/admin/reports/transactions/summary (Dynamic aggregated KPI cards)
- GET /api/v1/admin/reports/transactions/filters (Dynamic filter options from DB)
- GET /api/v1/admin/reports/transactions/users (Dynamic user search typeahead)
- GET /api/v1/admin/reports/transactions/{txn_id} (Comprehensive Drawer view & Audit Trail)
- GET /api/v1/admin/reports/transactions/export (Filtered CSV/Excel export)
"""

import io
import csv
import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/reports/transactions", tags=["Admin Transaction Report"])

IST = timezone(timedelta(hours=5, minutes=30))


def to_dec_2(val: Any) -> Decimal:
    if val is None:
        return Decimal("0.00")
    try:
        return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")


def format_currency_val(val: Any) -> float:
    if val is None:
        return 0.0
    try:
        return float(Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    except Exception:
        return 0.0


# ==============================================================================
# UNIFIED SQL BUILDER FOR ADMIN REPORT
# ==============================================================================

def build_admin_transactions_query(
    company_id: Optional[str] = None,
    user_type: Optional[str] = None,
    user_id: Optional[str] = None,
    vendor_name: Optional[str] = None,
    service_name: Optional[str] = None,
    transaction_source: Optional[str] = None,
    transaction_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: Optional[int] = None,
    offset: Optional[int] = None
) -> Tuple[str, str, Dict[str, Any]]:
    params: Dict[str, Any] = {}

    start_dt = None
    end_dt = None
    if from_date and str(from_date).strip():
        try:
            dt_local = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(hour=0, minute=0, second=0, tzinfo=IST)
            start_dt = dt_local.astimezone(timezone.utc)
        except ValueError:
            pass
    if to_date and str(to_date).strip():
        try:
            dt_local = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=IST)
            end_dt = dt_local.astimezone(timezone.utc)
        except ValueError:
            pass

    conditions = ["1=1"]

    if company_id and str(company_id).upper() != "ALL":
        conditions.append("(u.company_id::text = :company_id OR u.company_code = :company_id)")
        params["company_id"] = str(company_id)

    if user_type and str(user_type).upper() != "ALL":
        conditions.append("UPPER(u.user_type) = :user_type")
        params["user_type"] = str(user_type).upper()

    if user_id and str(user_id).upper() != "ALL":
        conditions.append("""(
            u.retailer_id::text = :user_id OR 
            u.user_id::text = :user_id OR 
            u.user_code = :user_id OR 
            u.user_mobile = :user_id OR
            u.dist_id::text = :user_id OR
            u.sd_id::text = :user_id
        )""")
        params["user_id"] = str(user_id)

    if vendor_name and str(vendor_name).upper() != "ALL":
        conditions.append("UPPER(u.vendor_name) = :vendor_name")
        params["vendor_name"] = str(vendor_name).upper()

    if service_name and str(service_name).upper() != "ALL":
        conditions.append("UPPER(u.service_name) = :service_name")
        params["service_name"] = str(service_name).upper()

    if transaction_source and str(transaction_source).upper() != "ALL":
        conditions.append("UPPER(u.transaction_source) = :transaction_source")
        params["transaction_source"] = str(transaction_source).upper()

    if transaction_type and str(transaction_type).upper() != "ALL":
        clean_tt = str(transaction_type).upper()
        if clean_tt in ("CR", "CREDIT"):
            conditions.append("UPPER(u.entry_type) = 'CREDIT'")
        elif clean_tt in ("DR", "DEBIT"):
            conditions.append("UPPER(u.entry_type) = 'DEBIT'")

    if status_filter and str(status_filter).upper() != "ALL":
        conditions.append("UPPER(u.status) = :status_filter")
        params["status_filter"] = str(status_filter).upper()

    if start_dt:
        conditions.append("u.created_at >= :start_dt")
        params["start_dt"] = start_dt

    if end_dt:
        conditions.append("u.created_at <= :end_dt")
        params["end_dt"] = end_dt

    if min_amount is not None:
        conditions.append("u.amount >= :min_amount")
        params["min_amount"] = min_amount

    if max_amount is not None:
        conditions.append("u.amount <= :max_amount")
        params["max_amount"] = max_amount

    if search and str(search).strip():
        clean_search = f"%{str(search).strip()}%"
        conditions.append("""(
            u.txn_id ILIKE :search OR
            u.ref_id ILIKE :search OR
            u.vendor_ref ILIKE :search OR
            u.service_ref ILIKE :search OR
            u.narration ILIKE :search OR
            u.user_name ILIKE :search OR
            u.user_code ILIKE :search OR
            u.company_name ILIKE :search
        )""")
        params["search"] = clean_search

    where_clause = " AND ".join(conditions)

    sort_col_map = {
        "date_time": "u.created_at",
        "created_at": "u.created_at",
        "txn_id": "u.txn_id",
        "amount": "u.amount",
        "status": "u.status",
        "service_name": "u.service_name",
        "user_name": "u.user_name",
        "company_name": "u.company_name",
        "entry_type": "u.entry_type",
    }
    sort_col = sort_col_map.get(sort_by.lower(), "u.created_at")
    sort_dir = "ASC" if str(sort_order).lower() == "asc" else "DESC"

    cte_sql = """
    WITH unified_txns AS (
        -- 1. Core transactions table (Single Source of Truth)
        SELECT
            t.public_id,
            t.txn_id,
            t.ref_id,
            t.service_name,
            t.wallet_type,
            COALESCE(t.user_type, 'RETAILER') AS user_type,
            t.entry_type,
            COALESCE(t.amount::float, 0.0) AS amount,
            COALESCE(t.balance_before::float, 0.0) AS balance_before,
            COALESCE(t.balance_after::float, 0.0) AS balance_after,
            CASE WHEN UPPER(t.entry_type) = 'CREDIT' THEN COALESCE(t.amount::float, 0.0) ELSE 0.0 END AS cr,
            CASE WHEN UPPER(t.entry_type) = 'DEBIT' THEN COALESCE(t.amount::float, 0.0) ELSE 0.0 END AS dr,
            t.status,
            COALESCE(t.narration, '') AS narration,
            t.tenant_id,
            t.company_id,
            COALESCE(c.company_name, 'Pay2Pay') AS company_name,
            COALESCE(c.company_code, 'P2P') AS company_code,
            t.retailer_id,
            t.dist_id,
            t.sd_id,
            t.rm_id,
            t.vendor_id,
            COALESCE(t.vendor_name, 'Commercial Bank') AS vendor_name,
            COALESCE(t.ref_id, t.txn_id) AS service_ref,
            COALESCE(t.ref_id, '—') AS vendor_ref,
            CASE
                WHEN t.service_name IN ('ADMIN_TOPUP', 'WALLET_TOPUP', 'General Wallet Allocation') OR t.narration ILIKE '%admin%' THEN 'ADMIN_TOPUP'
                WHEN t.service_name IN ('MANUAL_ADJUSTMENT', 'MANUAL_TOPUP') OR t.narration ILIKE '%manual%' THEN 'MANUAL_TOPUP'
                WHEN t.service_name IN ('BANK_TOPUP', 'TOPUP') OR t.narration ILIKE '%bank%' THEN 'BANK_TOPUP'
                WHEN t.service_name = 'REFUND' OR t.narration ILIKE '%refund%' THEN 'REFUND'
                WHEN t.status = 'REVERSED' OR t.service_name = 'REVERSAL' OR t.narration ILIKE '%revers%' THEN 'REVERSAL'
                WHEN t.service_name IN ('SETTLEMENT', 'SWIPE_SETTLEMENT', 'CARD_TO_CASH') THEN 'SETTLEMENT'
                WHEN t.service_name = 'COMMISSION' OR t.narration ILIKE '%commission%' THEN 'COMMISSION'
                WHEN t.service_name = 'ADJUSTMENT' THEN 'ADJUSTMENT'
                ELSE 'SERVICE'
            END AS transaction_source,
            COALESCE(t.retailer_name, r.store_name, r.owner_name, 'Retailer') AS user_name,
            COALESCE(r.retailer_code, r.public_id::text, '—') AS user_code,
            COALESCE(rv.mobile_number, '—') AS user_mobile,
            COALESCE(r.public_id::text, t.retailer_id::text) AS user_id,
            COALESCE(t.created_by::text, 'SYSTEM') AS created_by,
            COALESCE(t.updated_by::text, 'SYSTEM') AS updated_by,
            t.created_at,
            t.updated_at
        FROM transactions t
        LEFT JOIN company c ON t.company_id = c.public_id
        LEFT JOIN retailer r ON t.retailer_id = r.public_id
        LEFT JOIN retailer_verifications rv ON (r.retailer_code = rv.retailer_id OR r.public_id::text = rv.retailer_id)

        UNION ALL

        -- 2. Standalone Ledger entries (e.g. Direct Admin manual allocations not in transactions table)
        SELECT
            l.public_id,
            l.transaction_reference AS txn_id,
            l.transaction_reference AS ref_id,
            'MANUAL_ADJUSTMENT' AS service_name,
            'MAIN' AS wallet_type,
            'RETAILER' AS user_type,
            UPPER(l.entry_type) AS entry_type,
            COALESCE(l.amount::float, 0.0) AS amount,
            COALESCE(l.balance_before::float, 0.0) AS balance_before,
            COALESCE(l.balance_after::float, 0.0) AS balance_after,
            CASE WHEN UPPER(l.entry_type) = 'CREDIT' THEN COALESCE(l.amount::float, 0.0) ELSE 0.0 END AS cr,
            CASE WHEN UPPER(l.entry_type) = 'DEBIT' THEN COALESCE(l.amount::float, 0.0) ELSE 0.0 END AS dr,
            'SUCCESS' AS status,
            COALESCE(l.narration, 'Direct Ledger Top-up') AS narration,
            l.tenant_id,
            COALESCE(r2.company_id, '0bf4371b-4c74-4916-a817-61c203b353e8'::uuid) AS company_id,
            COALESCE(c2.company_name, 'Pay2Pay') AS company_name,
            COALESCE(c2.company_code, 'P2P') AS company_code,
            r2.public_id AS retailer_id,
            NULL::uuid AS dist_id,
            NULL::uuid AS sd_id,
            NULL::uuid AS rm_id,
            NULL::uuid AS vendor_id,
            'Admin Portal' AS vendor_name,
            l.transaction_reference AS service_ref,
            '—' AS vendor_ref,
            'ADMIN_TOPUP' AS transaction_source,
            COALESCE(r2.store_name, r2.owner_name, 'Retailer Wallet') AS user_name,
            COALESCE(r2.retailer_code, r2.public_id::text, l.account_number) AS user_code,
            COALESCE(rv2.mobile_number, '—') AS user_mobile,
            COALESCE(r2.public_id::text, l.account_number) AS user_id,
            'ADMIN' AS created_by,
            'ADMIN' AS updated_by,
            l.created_at,
            l.created_at AS updated_at
        FROM transaction_ledger_entries l
        LEFT JOIN retailer r2 ON (l.account_number = r2.public_id::text OR l.account_number = r2.retailer_code)
        LEFT JOIN retailer_verifications rv2 ON (r2.retailer_code = rv2.retailer_id OR r2.public_id::text = rv2.retailer_id)
        LEFT JOIN company c2 ON r2.company_id = c2.public_id
        WHERE l.account_type = 'RETAILER_WALLET'
          AND NOT EXISTS (
              SELECT 1 FROM transactions t2 WHERE t2.public_id = l.transaction_id OR t2.txn_id = l.transaction_reference
          )
    )
    """

    final_sql = f"""
    {cte_sql}
    SELECT * FROM unified_txns u
    WHERE {where_clause}
    ORDER BY {sort_col} {sort_dir}
    """

    if limit is not None:
        final_sql += f" LIMIT {limit}"
    if offset is not None:
        final_sql += f" OFFSET {offset}"

    count_sql = f"""
    {cte_sql}
    SELECT
        COUNT(*) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(cr), 0) AS total_cr,
        COALESCE(SUM(dr), 0) AS total_dr,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'SUCCESS' THEN 1 ELSE 0 END), 0) AS successful_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN 1 ELSE 0 END), 0) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED') THEN 1 ELSE 0 END), 0) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'REVERSED' THEN 1 ELSE 0 END), 0) AS reversed_count
    FROM unified_txns u
    WHERE {where_clause}
    """

    return final_sql, count_sql, params


# ==============================================================================
# API ENDPOINTS
# ==============================================================================

@router.get("")
@router.get("/")
async def get_admin_transaction_report(
    company_id: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    vendor_name: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    transaction_source: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns server-side paginated, sorted, and filtered transaction records across all entities.
    """
    offset = (page - 1) * limit
    final_sql, count_sql, params = build_admin_transactions_query(
        company_id=company_id,
        user_type=user_type,
        user_id=user_id,
        vendor_name=vendor_name,
        service_name=service_name,
        transaction_source=transaction_source,
        transaction_type=transaction_type,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset
    )

    try:
        data_res = await db.execute(text(final_sql), params)
        data_rows = data_res.fetchall()

        count_res = await db.execute(text(count_sql), params)
        count_row = count_res.fetchone()

        total_records = count_row.total_count if count_row else 0
        total_pages = (total_records + limit - 1) // limit if limit > 0 else 1

        items = []
        for r in data_rows:
            d = dict(r._mapping)
            dt_val = d.get("created_at")
            if isinstance(dt_val, datetime):
                dt_ist = dt_val.astimezone(IST)
                date_str = dt_ist.strftime("%d-%b-%Y")
                time_str = dt_ist.strftime("%I:%M:%S %p")
                formatted_dt = dt_ist.strftime("%d-%b-%Y %I:%M %p")
                iso_dt = dt_ist.isoformat()
            else:
                date_str = str(dt_val or "")[:10]
                time_str = str(dt_val or "")[11:19]
                formatted_dt = str(dt_val or "")
                iso_dt = str(dt_val or "")

            cr_val = d.get("cr") or 0.0
            dr_val = d.get("dr") or 0.0

            items.append({
                "id": str(d.get("public_id") or d.get("txn_id")),
                "txn_id": d.get("txn_id"),
                "ref_id": d.get("ref_id") or "—",
                "date": date_str,
                "time": time_str,
                "date_time": formatted_dt,
                "created_at": iso_dt,
                "company_id": str(d.get("company_id") or ""),
                "company_name": d.get("company_name") or "Pay2Pay",
                "company_code": d.get("company_code") or "P2P",
                "user_id": d.get("user_id") or "—",
                "user_name": d.get("user_name") or "—",
                "user_code": d.get("user_code") or "—",
                "user_mobile": d.get("user_mobile") or "—",
                "user_type": (d.get("user_type") or "RETAILER").upper(),
                "vendor_name": d.get("vendor_name") or "—",
                "service_name": (d.get("service_name") or "SERVICE").upper(),
                "transaction_source": (d.get("transaction_source") or "SERVICE").upper(),
                "transaction_type": (d.get("entry_type") or "DEBIT").upper(),
                "entry_type": (d.get("entry_type") or "DEBIT").upper(),
                "cr": format_currency_val(cr_val),
                "dr": format_currency_val(dr_val),
                "amount": format_currency_val(d.get("amount")),
                "opening_balance": format_currency_val(d.get("balance_before")),
                "closing_balance": format_currency_val(d.get("balance_after")),
                "status": (d.get("status") or "SUCCESS").upper(),
                "service_reference": d.get("service_ref") or d.get("ref_id") or "—",
                "vendor_reference": d.get("vendor_ref") or "—",
                "narration": d.get("narration") or "—",
                "wallet_type": (d.get("wallet_type") or "MAIN").upper(),
                "created_by": d.get("created_by") or "SYSTEM",
            })

        return {
            "success": True,
            "data": {
                "items": items,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_records,
                    "total_pages": total_pages,
                }
            }
        }
    except Exception as e:
        logger.error(f"Error fetching admin transaction report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to retrieve transaction report: {str(e)}"}
        )


@router.get("/summary")
async def get_admin_transaction_summary(
    company_id: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    vendor_name: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    transaction_source: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns dynamically calculated financial summary metrics based on the active filters.
    """
    _, count_sql, params = build_admin_transactions_query(
        company_id=company_id,
        user_type=user_type,
        user_id=user_id,
        vendor_name=vendor_name,
        service_name=service_name,
        transaction_source=transaction_source,
        transaction_type=transaction_type,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search
    )

    try:
        count_res = await db.execute(text(count_sql), params)
        row = count_res.fetchone()

        total_cr = format_currency_val(row.total_cr if row else 0.0)
        total_dr = format_currency_val(row.total_dr if row else 0.0)
        net_movement = round(total_cr - total_dr, 2)

        return {
            "success": True,
            "data": {
                "total_credit": total_cr,
                "total_debit": total_dr,
                "net_movement": net_movement,
                "total_count": row.total_count if row else 0,
                "total_amount": format_currency_val(row.total_amount if row else 0.0),
                "successful_count": row.successful_count if row else 0,
                "pending_count": row.pending_count if row else 0,
                "failed_count": row.failed_count if row else 0,
                "reversed_count": row.reversed_count if row else 0,
            }
        }
    except Exception as e:
        logger.error(f"Error calculating admin transaction summary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to calculate summary: {str(e)}"}
        )


@router.get("/filters")
async def get_admin_transaction_filter_options(db: AsyncSession = Depends(get_db)):
    """
    Dynamically loads available companies, user types, services, vendors, sources, and statuses from database.
    """
    try:
        # Companies
        comp_res = await db.execute(text("SELECT public_id, company_name, company_code FROM company ORDER BY company_name"))
        companies = [{"id": str(r[0]), "name": r[1], "code": r[2]} for r in comp_res.fetchall()]

        # User Types
        ut_res = await db.execute(text("SELECT code, name FROM user_type ORDER BY id"))
        user_types = [{"code": r[0], "name": r[1]} for r in ut_res.fetchall()]
        if not any(u["code"] == "ADMIN" for u in user_types):
            user_types.insert(0, {"code": "ADMIN", "name": "Admin"})

        # Services from transactions
        svc_res = await db.execute(text("SELECT DISTINCT service_name FROM transactions WHERE service_name IS NOT NULL ORDER BY service_name"))
        services = [r[0] for r in svc_res.fetchall() if r[0]]

        # Vendors from transactions
        ven_res = await db.execute(text("SELECT DISTINCT vendor_name FROM transactions WHERE vendor_name IS NOT NULL AND vendor_name != '' ORDER BY vendor_name"))
        vendors = [r[0] for r in ven_res.fetchall() if r[0]]

        # Transaction Sources
        sources = [
            {"code": "SERVICE", "name": "Service"},
            {"code": "ADMIN_TOPUP", "name": "Admin Top-up"},
            {"code": "MANUAL_TOPUP", "name": "Manual Top-up"},
            {"code": "BANK_TOPUP", "name": "Bank Top-up"},
            {"code": "REFUND", "name": "Refund"},
            {"code": "REVERSAL", "name": "Reversal"},
            {"code": "SETTLEMENT", "name": "Settlement"},
            {"code": "COMMISSION", "name": "Commission"},
            {"code": "ADJUSTMENT", "name": "Adjustment"},
            {"code": "OTHER", "name": "Other"}
        ]

        # Statuses
        status_res = await db.execute(text("SELECT DISTINCT status FROM transactions WHERE status IS NOT NULL ORDER BY status"))
        db_statuses = [r[0] for r in status_res.fetchall() if r[0]]
        all_statuses = list(dict.fromkeys(db_statuses + ["SUCCESS", "PENDING", "FAILED", "REVERSED", "SETTLED", "CANCELLED"]))

        return {
            "success": True,
            "data": {
                "companies": companies,
                "user_types": user_types,
                "services": services,
                "vendors": vendors,
                "sources": sources,
                "statuses": all_statuses
            }
        }
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to load filter options: {str(e)}"}
        )


@router.get("/users")
async def search_admin_report_users(
    q: str = Query("", min_length=1),
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamic user search across retailers, distributors, super distributors, and companies.
    """
    clean_q = f"%{q.strip()}%"
    results = []

    try:
        # Search retailers
        ret_res = await db.execute(text("""
            SELECT public_id, retailer_code, store_name, owner_name 
            FROM retailer 
            WHERE store_name ILIKE :q OR owner_name ILIKE :q OR retailer_code ILIKE :q
            LIMIT 10
        """), {"q": clean_q})
        for r in ret_res.fetchall():
            results.append({
                "id": str(r[0]),
                "code": r[1],
                "name": r[2] or r[3],
                "mobile": "—",
                "user_type": "RETAILER",
                "display_label": f"{r[2] or r[3]} ({r[1]}) - Retailer"
            })

        # Search companies
        comp_res = await db.execute(text("""
            SELECT public_id, company_code, company_name 
            FROM company 
            WHERE company_name ILIKE :q OR company_code ILIKE :q
            LIMIT 5
        """), {"q": clean_q})
        for r in comp_res.fetchall():
            results.append({
                "id": str(r[0]),
                "code": r[1],
                "name": r[2],
                "mobile": "—",
                "user_type": "COMPANY",
                "display_label": f"{r[2]} ({r[1]}) - Company"
            })

        return {
            "success": True,
            "data": results
        }
    except Exception as e:
        logger.error(f"Error searching users: {e}")
        return {"success": True, "data": []}


@router.get("/export")
async def export_admin_transactions_csv(
    company_id: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    vendor_name: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    transaction_source: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: AsyncSession = Depends(get_db)
):
    """
    Streams CSV containing only matching transactions based on active filters.
    """
    final_sql, _, params = build_admin_transactions_query(
        company_id=company_id,
        user_type=user_type,
        user_id=user_id,
        vendor_name=vendor_name,
        service_name=service_name,
        transaction_source=transaction_source,
        transaction_type=transaction_type,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
        min_amount=min_amount,
        max_amount=max_amount,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=50000,
        offset=0
    )

    try:
        data_res = await db.execute(text(final_sql), params)
        rows = data_res.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Date / Time",
            "Transaction ID",
            "Company",
            "User Name",
            "User Code",
            "User Mobile",
            "User Type",
            "Vendor",
            "Transaction Source",
            "Service",
            "Transaction Type",
            "Credit (INR)",
            "Debit (INR)",
            "Opening Balance (INR)",
            "Closing Balance (INR)",
            "Status",
            "Service Reference",
            "Vendor Reference",
            "Description / Narration",
            "Created By"
        ])

        for r in rows:
            d = dict(r._mapping)
            dt_val = d.get("created_at")
            if isinstance(dt_val, datetime):
                formatted_dt = dt_val.astimezone(IST).strftime("%d-%b-%Y %I:%M:%S %p")
            else:
                formatted_dt = str(dt_val or "")

            cr_val = d.get("cr") or 0.0
            dr_val = d.get("dr") or 0.0

            writer.writerow([
                formatted_dt,
                d.get("txn_id") or "",
                d.get("company_name") or "",
                d.get("user_name") or "",
                d.get("user_code") or "",
                d.get("user_mobile") or "",
                d.get("user_type") or "",
                d.get("vendor_name") or "—",
                d.get("transaction_source") or "",
                d.get("service_name") or "",
                d.get("entry_type") or "",
                f"{cr_val:.2f}" if cr_val > 0 else "0.00",
                f"{dr_val:.2f}" if dr_val > 0 else "0.00",
                f"{d.get('balance_before', 0.0):.2f}",
                f"{d.get('balance_after', 0.0):.2f}",
                d.get("status") or "",
                d.get("service_ref") or "",
                d.get("vendor_ref") or "—",
                d.get("narration") or "",
                d.get("created_by") or "SYSTEM"
            ])

        output.seek(0)
        filename = f"Admin_Transaction_Report_{datetime.now(IST).strftime('%Y%m%d_%H%M%S')}.csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Error exporting admin transactions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to export CSV: {str(e)}"}
        )


@router.get("/{txn_id}")
async def get_admin_transaction_detail(
    txn_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns complete transaction details and lifecycle audit trail for the drawer view.
    """
    try:
        # Fetch from transactions table
        txn_res = await db.execute(text("""
            SELECT 
                t.*,
                c.company_name,
                c.company_code,
                r.store_name,
                r.owner_name,
                r.retailer_code
            FROM transactions t
            LEFT JOIN company c ON t.company_id = c.public_id
            LEFT JOIN retailer r ON t.retailer_id = r.public_id
            WHERE t.txn_id = :txn_id OR t.public_id::text = :txn_id
            ORDER BY t.created_at DESC
            LIMIT 1
        """), {"txn_id": txn_id})
        
        row = txn_res.fetchone()
        if not row:
            # Fallback to transaction_ledger_entries
            ledg_res = await db.execute(text("""
                SELECT 
                    l.*,
                    r.store_name,
                    r.owner_name,
                    r.retailer_code,
                    c.company_name,
                    c.company_code
                FROM transaction_ledger_entries l
                LEFT JOIN retailer r ON (l.account_number = r.public_id::text OR l.account_number = r.retailer_code)
                LEFT JOIN company c ON r.company_id = c.public_id
                WHERE l.transaction_reference = :txn_id OR l.public_id::text = :txn_id
                LIMIT 1
            """), {"txn_id": txn_id})
            ledg_row = ledg_res.fetchone()
            if not ledg_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"success": False, "message": f"Transaction '{txn_id}' not found in records."}
                )
            
            d = dict(ledg_row._mapping)
            dt_val = d.get("created_at")
            formatted_dt = dt_val.astimezone(IST).strftime("%d-%b-%Y %I:%M:%S %p") if isinstance(dt_val, datetime) else str(dt_val or "")
            
            return {
                "success": True,
                "data": {
                    "txn_id": d.get("transaction_reference"),
                    "ref_id": d.get("transaction_reference"),
                    "service_name": "MANUAL_ADJUSTMENT",
                    "transaction_source": "ADMIN_TOPUP",
                    "entry_type": (d.get("entry_type") or "CREDIT").upper(),
                    "amount": format_currency_val(d.get("amount")),
                    "balance_before": format_currency_val(d.get("balance_before")),
                    "balance_after": format_currency_val(d.get("balance_after")),
                    "status": "SUCCESS",
                    "narration": d.get("narration") or "Admin Direct Allocation",
                    "date_time": formatted_dt,
                    "created_at": formatted_dt,
                    "created_by": "ADMIN",
                    "company_name": d.get("company_name") or "Pay2Pay",
                    "company_code": d.get("company_code") or "P2P",
                    "user_name": d.get("store_name") or d.get("owner_name") or "Retailer Wallet",
                    "user_code": d.get("retailer_code") or d.get("account_number") or "—",
                    "user_mobile": "—",
                    "user_type": "RETAILER",
                    "vendor_name": "Admin Portal",
                    "vendor_reference": "—",
                    "service_reference": d.get("transaction_reference"),
                    "audit_trail": [
                        {
                            "step": 1,
                            "action": "TRANSACTION_CREATED",
                            "status": "INITIATED",
                            "description": "Transaction initiated via Admin Ledger",
                            "timestamp": formatted_dt,
                            "actor": "ADMIN"
                        },
                        {
                            "step": 2,
                            "action": "WALLET_CREDITED",
                            "status": "SUCCESS",
                            "description": f"Wallet credited with ₹{format_currency_val(d.get('amount'))}",
                            "timestamp": formatted_dt,
                            "actor": "SYSTEM"
                        }
                    ]
                }
            }

        d = dict(row._mapping)
        dt_val = d.get("created_at")
        formatted_dt = dt_val.astimezone(IST).strftime("%d-%b-%Y %I:%M:%S %p") if isinstance(dt_val, datetime) else str(dt_val or "")

        # Fetch audit logs from transaction_audit_logs if present
        audit_res = await db.execute(text("""
            SELECT action, previous_status, new_status, actor_type, actor_id, details, created_at
            FROM transaction_audit_logs
            WHERE transaction_reference = :txn_id OR transaction_reference = :ref_id
            ORDER BY created_at ASC
        """), {"txn_id": d.get("txn_id"), "ref_id": d.get("ref_id") or d.get("txn_id")})
        audit_rows = audit_res.fetchall()

        audit_trail = []
        if audit_rows:
            for idx, a in enumerate(audit_rows, start=1):
                ad = dict(a._mapping)
                a_dt = ad.get("created_at")
                a_dt_str = a_dt.astimezone(IST).strftime("%d-%b-%Y %I:%M:%S %p") if isinstance(a_dt, datetime) else str(a_dt or "")
                audit_trail.append({
                    "step": idx,
                    "action": ad.get("action") or "STATUS_CHANGE",
                    "status": ad.get("new_status") or "SUCCESS",
                    "description": f"Transitioned from {ad.get('previous_status') or 'START'} to {ad.get('new_status')}",
                    "timestamp": a_dt_str,
                    "actor": f"{ad.get('actor_type', 'SYSTEM')} ({ad.get('actor_id') or 'AUTO'})"
                })
        else:
            # Construct standard lifecycle from authoritative fields
            final_st = (d.get("status") or "SUCCESS").upper()
            amt_formatted = format_currency_val(d.get("amount"))
            entry_type = (d.get("entry_type") or "DEBIT").upper()
            
            audit_trail.append({
                "step": 1,
                "action": "TRANSACTION_CREATED",
                "status": "INITIATED",
                "description": f"Transaction {d.get('txn_id')} created for {d.get('service_name', 'SERVICE')}",
                "timestamp": formatted_dt,
                "actor": str(d.get("created_by") or "SYSTEM")
            })
            if entry_type == "DEBIT":
                audit_trail.append({
                    "step": 2,
                    "action": "WALLET_DEBITED",
                    "status": "PROCESSING",
                    "description": f"Wallet debited ₹{amt_formatted}. Balance: ₹{format_currency_val(d.get('balance_after'))}",
                    "timestamp": formatted_dt,
                    "actor": "TRANSACTION_ENGINE"
                })
            else:
                audit_trail.append({
                    "step": 2,
                    "action": "WALLET_CREDITED",
                    "status": "PROCESSING",
                    "description": f"Wallet credited ₹{amt_formatted}. Balance: ₹{format_currency_val(d.get('balance_after'))}",
                    "timestamp": formatted_dt,
                    "actor": "TRANSACTION_ENGINE"
                })
            
            if final_st == "SUCCESS":
                audit_trail.append({
                    "step": 3,
                    "action": "SERVICE_COMPLETED",
                    "status": "SUCCESS",
                    "description": f"Service executed successfully via {d.get('vendor_name', 'Provider')}",
                    "timestamp": formatted_dt,
                    "actor": "VENDOR_GATEWAY"
                })
            elif final_st == "REVERSED":
                audit_trail.append({
                    "step": 3,
                    "action": "SERVICE_FAILED",
                    "status": "FAILED",
                    "description": "Provider response failed",
                    "timestamp": formatted_dt,
                    "actor": "VENDOR_GATEWAY"
                })
                audit_trail.append({
                    "step": 4,
                    "action": "WALLET_REVERSED",
                    "status": "REVERSED",
                    "description": f"Automatic reversal completed for ₹{amt_formatted}",
                    "timestamp": formatted_dt,
                    "actor": "AUTO_REFUND_ENGINE"
                })

        return {
            "success": True,
            "data": {
                "txn_id": d.get("txn_id"),
                "ref_id": d.get("ref_id") or "—",
                "service_name": (d.get("service_name") or "SERVICE").upper(),
                "transaction_source": d.get("service_name") or "SERVICE",
                "entry_type": (d.get("entry_type") or "DEBIT").upper(),
                "amount": format_currency_val(d.get("amount")),
                "balance_before": format_currency_val(d.get("balance_before")),
                "balance_after": format_currency_val(d.get("balance_after")),
                "status": (d.get("status") or "SUCCESS").upper(),
                "narration": d.get("narration") or "—",
                "date_time": formatted_dt,
                "created_at": formatted_dt,
                "created_by": str(d.get("created_by") or "SYSTEM"),
                "company_name": d.get("company_name") or "Pay2Pay",
                "company_code": d.get("company_code") or "P2P",
                "user_name": d.get("retailer_name") or d.get("store_name") or d.get("owner_name") or "Retailer",
                "user_code": d.get("retailer_code") or "—",
                "user_mobile": "—",
                "user_type": (d.get("user_type") or "RETAILER").upper(),
                "vendor_name": d.get("vendor_name") or "Commercial Bank",
                "vendor_reference": d.get("ref_id") or "—",
                "service_reference": d.get("ref_id") or d.get("txn_id") or "—",
                "wallet_type": (d.get("wallet_type") or "MAIN").upper(),
                "audit_trail": audit_trail
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading transaction details for {txn_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": f"Failed to load transaction details: {str(e)}"}
        )
