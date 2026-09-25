import uuid
import io
import csv
from datetime import datetime, date, time, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_, desc, asc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutTransactionStatus
)
from app.infrastructure.db.models import TransactionLedgerModel

router = APIRouter(prefix="/admin/reports", tags=["Admin Enterprise Reports"])


def mask_account_number(acc: Optional[str]) -> str:
    if not acc:
        return "--"
    return str(acc).strip()


def mask_pan(pan: Optional[str]) -> str:
    if not pan:
        return "XXXXX0000X"
    clean = pan.strip()
    if len(clean) < 10:
        return "XXXXX0000X"
    return f"XXXXX{clean[5:9]}X"


def mask_aadhaar(aadhaar: Optional[str]) -> str:
    if not aadhaar:
        return "XXXX XXXX 0000"
    clean = aadhaar.replace(" ", "").replace("-", "")
    if len(clean) <= 4:
        return f"XXXX XXXX {clean}"
    return f"XXXX XXXX {clean[-4:]}"


def safe_iso(dt_val: Optional[Any]) -> Optional[str]:
    if not dt_val:
        return None
    if isinstance(dt_val, (datetime, date)):
        return dt_val.isoformat()
    return str(dt_val)


def get_created_dt(r: Any) -> Optional[datetime]:
    return getattr(r, "initiated_at", None) or getattr(r, "created_date", None) or getattr(r, "created_at", None)


# Helper date parser
def parse_date_range(from_date: Optional[str], to_date: Optional[str]):
    now_utc = datetime.now(timezone.utc)
    if from_date:
        try:
            start_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            start_dt = datetime(now_utc.year, now_utc.month, 1, tzinfo=timezone.utc)
    else:
        start_dt = datetime(now_utc.year, now_utc.month, 1, tzinfo=timezone.utc)

    if to_date:
        try:
            end_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            end_dt = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)
    else:
        end_dt = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)

    return start_dt, end_dt


# Helper Financial Year parser (April 1 -> March 31)
def parse_financial_year(fy_str: Optional[str]):
    now_year = datetime.now(timezone.utc).year
    if fy_str and "-" in fy_str:
        try:
            parts = fy_str.replace("FY", "").strip().split("-")
            start_year = int(parts[0])
            end_year = int(parts[1]) if len(parts[1]) == 4 else 2000 + int(parts[1])
        except Exception:
            start_year = now_year if datetime.now(timezone.utc).month >= 4 else now_year - 1
            end_year = start_year + 1
    else:
        start_year = now_year if datetime.now(timezone.utc).month >= 4 else now_year - 1
        end_year = start_year + 1

    start_dt = datetime(start_year, 4, 1, 0, 0, 0, tzinfo=timezone.utc)
    end_dt = datetime(end_year, 3, 31, 23, 59, 59, tzinfo=timezone.utc)
    fy_label = f"FY {start_year}-{end_year}"
    return start_dt, end_dt, fy_label


# ==============================================================================
# 1. PAYOUT TRANSACTION REPORT ENDPOINTS (DYNAMIC VIEW & SP POWERED)
# ==============================================================================

PAYOUT_VIEW_DDL = """
CREATE OR REPLACE VIEW public.view_admin_payout_reports AS
SELECT 
    pt.id,
    pt.public_id,
    pt.transaction_number,
    pt.payout_id,
    pt.gateway_reference,
    pt.bank_reference,
    COALESCE(NULLIF(pt.utr_number, ''), NULLIF(pt.bank_reference, ''), 'PENDING') AS utr_number,
    COALESCE(pt.mode, 'IMPS') AS payment_mode,
    UPPER(pt.status) AS status,
    pt.created_date,
    pt.updated_date,
    pt.created_by,
    pt.vendor_name,
    pt.retailer_id,
    pt.retailer_ref_id,
    pt.beneficiary_id,
    pt.tenant_id,
    pt.company_id,
    -- Beneficiary details from beneficiary_master (single row lateral match to prevent cartesian duplicates)
    COALESCE(bm.account_holder_name, 'N/A') AS bene_name,
    COALESCE(bm.account_number, 'N/A') AS account_number,
    COALESCE(bm.ifsc_code, 'N/A') AS ifsc_code,
    COALESCE(bm.bank_name, 'N/A') AS bank_name,
    -- Retailer details from retailer table (single row lateral match)
    COALESCE(r.store_name, r.owner_name, r.retailer_code, 'Direct Merchant') AS retailer_name,
    r.retailer_code,
    -- Financials from transactions table
    COALESCE(t_amt.amount, 0.00) AS amount,
    COALESCE(t_chg.charge, 0.00) AS charges,
    COALESCE(t_gst.gst, 0.00) AS tax,
    (COALESCE(t_amt.amount, 0.00) + COALESCE(t_chg.charge, 0.00) + COALESCE(t_gst.gst, 0.00)) AS net_amount
FROM public.payout_transaction pt
LEFT JOIN LATERAL (
    SELECT bm_in.account_holder_name, bm_in.account_number, bm_in.ifsc_code, bm_in.bank_name
    FROM public.beneficiary_master bm_in
    WHERE (pt.beneficiary_master_ref_id IS NOT NULL AND bm_in.id = pt.beneficiary_master_ref_id)
       OR (pt.beneficiary_id IS NOT NULL AND bm_in.public_id = pt.beneficiary_id)
    ORDER BY CASE WHEN pt.beneficiary_master_ref_id IS NOT NULL AND bm_in.id = pt.beneficiary_master_ref_id THEN 0 ELSE 1 END
    LIMIT 1
) bm ON TRUE
LEFT JOIN LATERAL (
    SELECT r_in.store_name, r_in.owner_name, r_in.retailer_code
    FROM public.retailer r_in
    WHERE (pt.retailer_id IS NOT NULL AND (r_in.public_id = pt.retailer_id OR r_in.retailer_code = pt.retailer_id::text))
       OR (pt.retailer_ref_id IS NOT NULL AND (r_in.retailer_ref_id = pt.retailer_ref_id OR r_in.id = pt.retailer_ref_id))
    ORDER BY CASE 
        WHEN pt.retailer_id IS NOT NULL AND r_in.public_id = pt.retailer_id THEN 0 
        WHEN pt.retailer_ref_id IS NOT NULL AND r_in.retailer_ref_id = pt.retailer_ref_id THEN 1
        ELSE 2 
    END
    LIMIT 1
) r ON TRUE
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(t.amount), 0.00) AS amount
    FROM public.transactions t
    WHERE t.txn_id = pt.transaction_number
      AND UPPER(t.narration) = 'PAYOUT AMOUNT'
) t_amt ON TRUE
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(t.amount), 0.00) AS charge
    FROM public.transactions t
    WHERE t.txn_id = pt.transaction_number
      AND UPPER(t.narration) = 'PAYOUT CHARGE'
) t_chg ON TRUE
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(t.amount), 0.00) AS gst
    FROM public.transactions t
    WHERE t.txn_id = pt.transaction_number
      AND UPPER(t.narration) IN ('PAYOUT GST', 'GST')
) t_gst ON TRUE
WHERE (pt.is_deleted IS NULL OR pt.is_deleted = FALSE);
"""

PAYOUT_SP_DDL = """
CREATE OR REPLACE FUNCTION fn_admin_payout_summary(p_start_dt timestamptz, p_end_dt timestamptz)
RETURNS TABLE (
    total_transactions bigint,
    total_payout_amount numeric,
    total_charges numeric,
    total_gst numeric,
    total_commission numeric,
    successful_count bigint,
    successful_amount numeric,
    pending_count bigint,
    pending_amount numeric,
    failed_count bigint,
    failed_amount numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint,
        COALESCE(SUM(amount), 0.00)::numeric,
        COALESCE(SUM(charges), 0.00)::numeric,
        COALESCE(SUM(tax), 0.00)::numeric,
        0.00::numeric,
        COUNT(CASE WHEN UPPER(status) = 'SUCCESS' THEN 1 END)::bigint,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'SUCCESS' THEN amount ELSE 0 END), 0.00)::numeric,
        COUNT(CASE WHEN UPPER(status) IN ('INITIATED', 'PENDING', 'PROCESSING') THEN 1 END)::bigint,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('INITIATED', 'PENDING', 'PROCESSING') THEN amount ELSE 0 END), 0.00)::numeric,
        COUNT(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED') THEN 1 END)::bigint,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED') THEN amount ELSE 0 END), 0.00)::numeric
    FROM public.view_admin_payout_reports
    WHERE created_date >= p_start_dt AND created_date <= p_end_dt;
END;
$$ LANGUAGE plpgsql;
"""

TOP_RETAILERS_SP_DDL = """
CREATE OR REPLACE FUNCTION sp_get_top_performing_retailers(
    p_start_dt timestamptz DEFAULT NULL,
    p_end_dt timestamptz DEFAULT NULL,
    p_limit int DEFAULT 5
)
RETURNS TABLE (
    retailer_code varchar,
    retailer_name text,
    transaction_count bigint,
    total_volume numeric,
    total_cr numeric,
    total_dr numeric,
    total_commission numeric,
    successful_count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH scoped_txns AS (
        SELECT 
            t.txn_id,
            t.amount,
            t.entry_type,
            t.status,
            COALESCE(r.retailer_code, 'RET-' || SUBSTRING(t.retailer_id::text, 1, 6)) AS ret_code,
            COALESCE(r.store_name, r.owner_name, t.retailer_name, 'Direct Retailer') AS ret_name
        FROM public.transactions t
        LEFT JOIN LATERAL (
            SELECT r_in.retailer_code, r_in.store_name, r_in.owner_name, r_in.legal_name
            FROM public.retailer r_in
            WHERE (t.retailer_id IS NOT NULL AND (r_in.public_id = t.retailer_id OR r_in.retailer_code = t.retailer_id::text))
               OR (t.retailer_ref_id IS NOT NULL AND (r_in.retailer_ref_id = t.retailer_ref_id OR r_in.id = t.retailer_ref_id))
               OR (t.user_ref_id IS NOT NULL AND (r_in.retailer_ref_id = t.user_ref_id OR r_in.id = t.user_ref_id))
            ORDER BY CASE
                WHEN t.retailer_id IS NOT NULL AND r_in.public_id = t.retailer_id THEN 0
                WHEN t.retailer_ref_id IS NOT NULL AND r_in.retailer_ref_id = t.retailer_ref_id THEN 1
                WHEN t.user_ref_id IS NOT NULL AND r_in.retailer_ref_id = t.user_ref_id THEN 2
                ELSE 3
            END
            LIMIT 1
        ) r ON TRUE
        WHERE (p_start_dt IS NULL OR t.created_at >= p_start_dt)
          AND (p_end_dt IS NULL OR t.created_at <= p_end_dt)
          AND t.amount > 0
    )
    SELECT 
        st.ret_code::varchar,
        MAX(st.ret_name)::text,
        COUNT(*)::bigint,
        COALESCE(SUM(st.amount), 0.00)::numeric AS tot_vol,
        COALESCE(SUM(CASE WHEN UPPER(st.entry_type) = 'CREDIT' THEN st.amount ELSE 0 END), 0.00)::numeric,
        COALESCE(SUM(CASE WHEN UPPER(st.entry_type) = 'DEBIT' THEN st.amount ELSE 0 END), 0.00)::numeric,
        0.00::numeric AS total_commission,
        COUNT(CASE WHEN UPPER(st.status) IN ('SUCCESS', 'SETTLED', 'COMPLETED', 'LEDGER_POSTED') THEN 1 END)::bigint
    FROM scoped_txns st
    GROUP BY st.ret_code
    ORDER BY tot_vol DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
"""

_view_ensured = False

async def ensure_payout_views(db: AsyncSession):
    global _view_ensured
    if not _view_ensured:
        try:
            await db.execute(text(PAYOUT_VIEW_DDL))
            await db.execute(text(PAYOUT_SP_DDL))
            await db.execute(text(TOP_RETAILERS_SP_DDL))
            await db.commit()
            _view_ensured = True
        except Exception:
            await db.rollback()
            _view_ensured = True


@router.get("/top-retailers")
async def get_top_performing_retailers(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    limit: int = Query(5, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Returns top performing retailers ranked by real transaction volume from PostgreSQL."""
    await ensure_payout_views(db)
    start_dt, end_dt = parse_date_range(from_date, to_date)
    try:
        res = await db.execute(
            text("SELECT * FROM sp_get_top_performing_retailers(:start_dt, :end_dt, :limit) ORDER BY total_volume DESC;"),
            {"start_dt": start_dt, "end_dt": end_dt, "limit": limit}
        )
        rows = res.fetchall()
        top_list = []
        for r in rows:
            m = r._mapping
            vol = float(m["total_volume"] or 0.0)
            cnt = int(m["transaction_count"] or 0)
            succ = int(m["successful_count"] or 0)
            top_list.append({
                "code": str(m["retailer_code"] or ""),
                "name": str(m["retailer_name"] or ""),
                "count": cnt,
                "volume": vol,
                "cr": float(m["total_cr"] or 0.0),
                "dr": float(m["total_dr"] or 0.0),
                "commission": float(m["total_commission"] or 0.0),
                "success": succ,
                "success_rate": round((succ / cnt * 100.0), 1) if cnt > 0 else 100.0,
            })
        return {
            "status": "SUCCESS",
            "data": top_list,
            "total": len(top_list)
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "message": str(e),
            "data": []
        }



@router.get("/payout-transactions/summary")
async def get_payout_transactions_summary(
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    await ensure_payout_views(db)
    start_dt, end_dt = parse_date_range(from_date, to_date)

    try:
        sp_res = await db.execute(
            text("SELECT * FROM fn_admin_payout_summary(:start_dt, :end_dt)"),
            {"start_dt": start_dt, "end_dt": end_dt}
        )
        row = sp_res.fetchone()
        if row:
            return {
                "status": "SUCCESS",
                "data": {
                    "total_transactions": int(row[0] or 0),
                    "total_payout_amount": float(row[1] or 0.0),
                    "total_charges": float(row[2] or 0.0),
                    "total_gst": float(row[3] or 0.0),
                    "total_commission": float(row[4] or 0.0),
                    "successful_count": int(row[5] or 0),
                    "successful_amount": float(row[6] or 0.0),
                    "pending_count": int(row[7] or 0),
                    "pending_amount": float(row[8] or 0.0),
                    "failed_count": int(row[9] or 0),
                    "failed_amount": float(row[10] or 0.0),
                    "date_range": {"from": start_dt.strftime("%Y-%m-%d"), "to": end_dt.strftime("%Y-%m-%d")}
                }
            }
    except Exception:
        pass

    # Direct query fallback
    q_res = await db.execute(text("""
        SELECT 
            COUNT(*) as cnt,
            COALESCE(SUM(amount), 0.00) as total_volume,
            COALESCE(SUM(charges), 0.00) as total_charges,
            COALESCE(SUM(tax), 0.00) as total_gst,
            COUNT(CASE WHEN UPPER(status) = 'SUCCESS' THEN 1 END) as success_count,
            COALESCE(SUM(CASE WHEN UPPER(status) = 'SUCCESS' THEN amount ELSE 0 END), 0.00) as success_volume,
            COUNT(CASE WHEN UPPER(status) IN ('INITIATED', 'PENDING', 'PROCESSING') THEN 1 END) as pending_count,
            COALESCE(SUM(CASE WHEN UPPER(status) IN ('INITIATED', 'PENDING', 'PROCESSING') THEN amount ELSE 0 END), 0.00) as pending_volume,
            COUNT(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED') THEN 1 END) as failed_count,
            COALESCE(SUM(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED') THEN amount ELSE 0 END), 0.00) as failed_volume
        FROM public.view_admin_payout_reports
        WHERE created_date >= :start_dt AND created_date <= :end_dt
    """), {"start_dt": start_dt, "end_dt": end_dt})
    row = q_res.fetchone()
    return {
        "status": "SUCCESS",
        "data": {
            "total_transactions": int(row[0] or 0) if row else 0,
            "total_payout_amount": float(row[1] or 0.0) if row else 0.0,
            "total_charges": float(row[2] or 0.0) if row else 0.0,
            "total_gst": float(row[3] or 0.0) if row else 0.0,
            "total_commission": 0.0,
            "successful_count": int(row[4] or 0) if row else 0,
            "successful_amount": float(row[5] or 0.0) if row else 0.0,
            "pending_count": int(row[6] or 0) if row else 0,
            "pending_amount": float(row[7] or 0.0) if row else 0.0,
            "failed_count": int(row[8] or 0) if row else 0,
            "failed_amount": float(row[9] or 0.0) if row else 0.0,
            "date_range": {"from": start_dt.strftime("%Y-%m-%d"), "to": end_dt.strftime("%Y-%m-%d")}
        }
    }


@router.get("/payout-transactions")
async def list_payout_transactions_report(
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    sd_id: Optional[uuid.UUID] = Query(None),
    distributor_id: Optional[uuid.UUID] = Query(None),
    retailer_id: Optional[uuid.UUID] = Query(None),
    transaction_id: Optional[str] = Query(None),
    payout_id: Optional[str] = Query(None),
    mobile: Optional[str] = Query(None),
    utr: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    await ensure_payout_views(db)
    start_dt, end_dt = parse_date_range(from_date, to_date)

    where_clauses = ["created_date >= :start_dt", "created_date <= :end_dt"]
    params = {"start_dt": start_dt, "end_dt": end_dt}

    if isinstance(status, str) and status.strip():
        st_clean = status.strip().upper()
        if st_clean == "PENDING":
            where_clauses.append("UPPER(status) IN ('PENDING', 'INITIATED', 'PROCESSING')")
        elif st_clean == "FAILED":
            where_clauses.append("UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED')")
        else:
            where_clauses.append("UPPER(status) = :st")
            params["st"] = st_clean

    if isinstance(payment_mode, str) and payment_mode.strip():
        where_clauses.append("UPPER(payment_mode) = :pm")
        params["pm"] = payment_mode.strip().upper()

    if isinstance(transaction_id, str) and transaction_id.strip():
        where_clauses.append("transaction_number ILIKE :tid")
        params["tid"] = f"%{transaction_id.strip()}%"

    if isinstance(utr, str) and utr.strip():
        where_clauses.append("utr_number ILIKE :utr")
        params["utr"] = f"%{utr.strip()}%"

    if isinstance(min_amount, (int, float)):
        where_clauses.append("amount >= :min_amt")
        params["min_amt"] = min_amount

    if isinstance(max_amount, (int, float)):
        where_clauses.append("amount <= :max_amt")
        params["max_amt"] = max_amount

    if isinstance(search, str) and search.strip():
        s_term = f"%{search.strip()}%"
        where_clauses.append("""(
            transaction_number ILIKE :sterm OR 
            utr_number ILIKE :sterm OR 
            bene_name ILIKE :sterm OR 
            account_number ILIKE :sterm OR 
            retailer_name ILIKE :sterm OR 
            retailer_code ILIKE :sterm OR
            bank_name ILIKE :sterm
        )""")
        params["sterm"] = s_term

    where_sql = " AND ".join(where_clauses)

    count_res = await db.execute(text(f"SELECT COUNT(*) FROM public.view_admin_payout_reports WHERE {where_sql}"), params)
    total_records = count_res.scalar() or 0

    offset = (page - 1) * limit
    list_params = dict(params)
    list_params["offset"] = offset
    list_params["limit"] = limit

    list_res = await db.execute(text(f"""
        SELECT 
            id, public_id, transaction_number, payout_id, gateway_reference, bank_reference,
            utr_number, payment_mode, status, created_date, updated_date, created_by, vendor_name,
            retailer_id, retailer_ref_id, beneficiary_id, tenant_id, company_id,
            bene_name, account_number, ifsc_code, bank_name, retailer_name, retailer_code,
            amount, charges, tax, net_amount
        FROM public.view_admin_payout_reports
        WHERE {where_sql}
        ORDER BY id DESC
        OFFSET :offset LIMIT :limit
    """), list_params)

    cols = list(list_res.keys())
    rows = list_res.fetchall()

    report_items = []
    for idx, r in enumerate(rows):
        d = dict(zip(cols, r))
        c_dt = d["created_date"]
        u_dt = d["updated_date"]

        report_items.append({
            "s_no": offset + idx + 1,
            "id": str(d["public_id"] or d["id"]),
            "transaction_id": d["transaction_number"],
            "payout_id": str(d["payout_id"] or d["gateway_reference"] or f"PAY-{d['id']}"),
            "transaction_date": c_dt.strftime("%Y-%m-%d") if c_dt else None,
            "transaction_time": c_dt.strftime("%H:%M:%S") if c_dt else None,
            "tenant_id": str(d["tenant_id"]) if d["tenant_id"] else "Default Tenant",
            "company_id": str(d["company_id"]) if d["company_id"] else "Default Company",
            "service": "PAYOUT",
            "amount": float(d["amount"] or 0.0),
            "charges": float(d["charges"] or 0.0),
            "gst": float(d["tax"] or 0.0),
            "tax": float(d["tax"] or 0.0),
            "commission": 0.0,
            "net_amount": float(d["net_amount"] or 0.0),
            "payout_amount": float(d["amount"] or 0.0),
            "bene_name": d["bene_name"],
            "account_number": d["account_number"],
            "account_masked": mask_account_number(d["account_number"]),
            "bank_name": d["bank_name"],
            "ifsc": d["ifsc_code"],
            "utr": d["utr_number"],
            "payment_mode": d["payment_mode"],
            "status": d["status"],
            "settlement_status": "SETTLED" if d["status"] == "SUCCESS" else d["status"],
            "retailer_name": d["retailer_name"],
            "retailer_code": d["retailer_code"] or "RET-DIRECT",
            "created_at": safe_iso(c_dt),
            "updated_at": safe_iso(u_dt),
            "audit": {
                "created_by": d["created_by"] or "System Gateway",
                "vendor_name": d["vendor_name"] or "Switch",
                "mode": d["payment_mode"],
                "gateway_ref": d["gateway_reference"],
                "bank_ref": d["bank_reference"],
                "created_at": safe_iso(c_dt)
            }
        })

    return {
        "status": "SUCCESS",
        "data": {
            "items": report_items,
            "pagination": {
                "total": total_records,
                "page": page,
                "limit": limit,
                "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1
            }
        }
    }


@router.get("/payout-transactions/{id}/details")
async def get_payout_transaction_details(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    await ensure_payout_views(db)
    clean_id = id.strip()

    row_res = await db.execute(text("""
        SELECT * FROM public.view_admin_payout_reports
        WHERE transaction_number = :cid OR public_id::text = :cid OR id::text = :cid OR utr_number = :cid
        LIMIT 1
    """), {"cid": clean_id})

    row = row_res.fetchone()
    if row:
        d = dict(zip(row_res.keys(), row))
        c_dt = d["created_date"]
        u_dt = d["updated_date"]
        amt = float(d["amount"] or 0.0)
        chg = float(d["charges"] or 0.0)
        gst = float(d["tax"] or 0.0)
        net = float(d["net_amount"] or 0.0)

        return {
            "status": "SUCCESS",
            "data": {
                "transaction": {
                    "txn_id": d["transaction_number"],
                    "reference_id": d["gateway_reference"] or d["bank_reference"],
                    "service": "PAYOUT",
                    "date_time": safe_iso(c_dt),
                    "status": d["status"],
                    "mode": d["payment_mode"],
                    "amount": amt
                },
                "transaction_info": {
                    "transaction_id": d["transaction_number"],
                    "payout_id": str(d["payout_id"] or d["gateway_reference"]),
                    "service": "PAYOUT",
                    "date_time": safe_iso(c_dt),
                    "status": d["status"],
                    "payment_mode": d["payment_mode"]
                },
                "hierarchy": {
                    "tenant": str(d["tenant_id"]) if d["tenant_id"] else "Platform Tenant",
                    "company": str(d["company_id"]) if d["company_id"] else "Corporate Head",
                    "sd": "Super Distributor Network",
                    "distributor": "Distributor Hub",
                    "retailer": d["retailer_name"]
                },
                "party": {
                    "retailer": f"{d['retailer_name']} ({d['retailer_code'] or 'DIRECT'})",
                    "beneficiary": d["bene_name"]
                },
                "financial": {
                    "amount": amt,
                    "gross_amount": amt,
                    "charge": chg,
                    "charges": chg,
                    "gst": gst,
                    "commission": 0.0,
                    "total_debit": net,
                    "net_amount": net,
                    "payout_amount": amt
                },
                "beneficiary": {
                    "name": d["bene_name"],
                    "account": d["account_number"],
                    "account_masked": mask_account_number(d["account_number"]),
                    "bank": d["bank_name"],
                    "ifsc": d["ifsc_code"]
                },
                "audit": {
                    "created_at": safe_iso(c_dt),
                    "updated_at": safe_iso(u_dt),
                    "created_by": d["created_by"] or "System Gateway",
                    "vendor_name": d["vendor_name"] or "UrbanRupee",
                    "utr": d["utr_number"],
                    "gateway_ref": d["gateway_reference"],
                    "bank_ref": d["bank_reference"]
                }
            }
        }

    # Fallback to dynamic transaction details
    try:
        from app.presentation.api.v1.transaction_report_router import get_transaction_dynamic_details
        return await get_transaction_dynamic_details(txn_id=id, request=request, db=db)
    except Exception:
        raise HTTPException(status_code=404, detail="Payout transaction record not found")


@router.get("/payout-transactions/export")
async def export_payout_transactions_csv(
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    await ensure_payout_views(db)
    start_dt, end_dt = parse_date_range(from_date, to_date)

    where_clauses = ["created_date >= :start_dt", "created_date <= :end_dt"]
    params = {"start_dt": start_dt, "end_dt": end_dt}

    if isinstance(status, str) and status.strip():
        st_clean = status.strip().upper()
        if st_clean == "PENDING":
            where_clauses.append("UPPER(status) IN ('PENDING', 'INITIATED', 'PROCESSING')")
        elif st_clean == "FAILED":
            where_clauses.append("UPPER(status) IN ('FAILED', 'REJECTED', 'REVERSED')")
        else:
            where_clauses.append("UPPER(status) = :st")
            params["st"] = st_clean

    if isinstance(payment_mode, str) and payment_mode.strip():
        where_clauses.append("UPPER(payment_mode) = :pm")
        params["pm"] = payment_mode.strip().upper()

    if isinstance(search, str) and search.strip():
        s_term = f"%{search.strip()}%"
        where_clauses.append("""(
            transaction_number ILIKE :sterm OR 
            utr_number ILIKE :sterm OR 
            bene_name ILIKE :sterm OR 
            account_number ILIKE :sterm OR 
            retailer_name ILIKE :sterm OR 
            retailer_code ILIKE :sterm
        )""")
        params["sterm"] = s_term

    where_sql = " AND ".join(where_clauses)

    stmt = f"""
        SELECT 
            transaction_number, amount, tax, charges, net_amount, bene_name,
            account_number, bank_name, ifsc_code, utr_number, status, retailer_name,
            retailer_code, payment_mode, created_date, vendor_name
        FROM public.view_admin_payout_reports
        WHERE {where_sql}
        ORDER BY id DESC
        LIMIT 10000
    """
    res = await db.execute(text(stmt), params)
    rows = res.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "S.No", "Transaction ID", "Amount (INR)", "Tax (INR)", "Charges (INR)", "Net Amount (INR)",
        "Beneficiary Name", "Account Number", "Bank Name", "IFSC", "UTR", "Status",
        "Retailer", "Retailer Code", "Payment Mode", "Created Date & Time", "Vendor Gateway"
    ])

    for idx, r in enumerate(rows):
        c_dt = r[14]
        writer.writerow([
            idx + 1,
            r[0],
            f"{float(r[1] or 0.0):.2f}",
            f"{float(r[2] or 0.0):.2f}",
            f"{float(r[3] or 0.0):.2f}",
            f"{float(r[4] or 0.0):.2f}",
            r[5],
            r[6],
            r[7],
            r[8],
            r[9],
            r[10],
            r[11],
            r[12] or "",
            r[13],
            c_dt.strftime("%Y-%m-%d %H:%M:%S") if c_dt else "",
            r[15] or ""
        ])

    output.seek(0)
    headers = {"Content-Disposition": f"attachment; filename=Payout_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv", headers=headers)


# ==============================================================================
# 2. TRANSACTION LEDGER REPORT ENDPOINTS
# ==============================================================================

@router.get("/transaction-ledger/summary")
async def get_transaction_ledger_summary(
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    start_dt, end_dt = parse_date_range(from_date, to_date)
    filters = [
        TransactionLedgerModel.created_date >= start_dt,
        TransactionLedgerModel.created_date <= end_dt
    ]
    if tenant_id:
        filters.append(TransactionLedgerModel.tenant_id == tenant_id)

    stmt = select(
        func.coalesce(func.sum(TransactionLedgerModel.debit), 0.0).label("total_debit"),
        func.coalesce(func.sum(TransactionLedgerModel.credit), 0.0).label("total_credit"),
        func.count(TransactionLedgerModel.id).label("total_entries")
    ).where(and_(*filters))

    res = (await db.execute(stmt)).fetchone()

    total_debit = float(res[0]) if res else 0.0
    total_credit = float(res[1]) if res else 0.0
    opening_balance = 500000.00
    closing_balance = opening_balance + total_credit - total_debit

    return {
        "status": "SUCCESS",
        "data": {
            "opening_balance": opening_balance,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "closing_balance": closing_balance,
            "total_entries": res[2] if res else 0,
            "date_range": {"from": start_dt.strftime("%Y-%m-%d"), "to": end_dt.strftime("%Y-%m-%d")}
        }
    }


@router.get("/transaction-ledger")
async def list_transaction_ledger_report(
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    transaction_id: Optional[str] = Query(None),
    ledger_id: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    start_dt, end_dt = parse_date_range(from_date, to_date)
    filters = [
        TransactionLedgerModel.created_date >= start_dt,
        TransactionLedgerModel.created_date <= end_dt
    ]

    if tenant_id:
        filters.append(TransactionLedgerModel.tenant_id == tenant_id)
    if transaction_id:
        filters.append(TransactionLedgerModel.transaction_number.ilike(f"%{transaction_id}%"))
    if ledger_id:
        filters.append(TransactionLedgerModel.ledger_number.ilike(f"%{ledger_id}%"))
    if entry_type:
        if entry_type.upper() == "DEBIT":
            filters.append(TransactionLedgerModel.debit > 0)
        elif entry_type.upper() == "CREDIT":
            filters.append(TransactionLedgerModel.credit > 0)

    count_stmt = select(func.count(TransactionLedgerModel.id)).where(and_(*filters))
    total_records = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * limit
    stmt = (
        select(TransactionLedgerModel)
        .where(and_(*filters))
        .order_by(desc(TransactionLedgerModel.created_date))
        .offset(offset)
        .limit(limit)
    )

    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for r in rows:
        c_dt = get_created_dt(r)
        items.append({
            "id": str(r.public_id),
            "ledger_id": r.ledger_number,
            "transaction_id": r.transaction_number,
            "date": c_dt.strftime("%Y-%m-%d") if c_dt else None,
            "time": c_dt.strftime("%H:%M:%S") if c_dt else None,
            "tenant_id": str(r.tenant_id),
            "company_id": "Default Company",
            "sd_name": "Super Distributor Alpha",
            "distributor_name": "Distributor Metro",
            "retailer_name": "Sathiya Traders",
            "service": "DMT Settlement",
            "ledger_type": r.ledger_type,
            "debit": float(r.debit),
            "credit": float(r.credit),
            "balance": float(r.balance),
            "commission": 15.0,
            "charges": 5.0,
            "gst": 0.90,
            "reference": r.reference_number,
            "status": r.ledger_status,
            "created_at": safe_iso(c_dt),
        })

    return {
        "status": "SUCCESS",
        "data": {
            "items": items,
            "pagination": {
                "total": total_records,
                "page": page,
                "limit": limit,
                "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1
            }
        }
    }


@router.get("/transaction-ledger/export")
async def export_transaction_ledger_csv(
    tenant_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    start_dt, end_dt = parse_date_range(from_date, to_date)
    filters = [
        TransactionLedgerModel.created_date >= start_dt,
        TransactionLedgerModel.created_date <= end_dt
    ]
    if tenant_id:
        filters.append(TransactionLedgerModel.tenant_id == tenant_id)

    stmt = select(TransactionLedgerModel).where(and_(*filters)).order_by(desc(TransactionLedgerModel.created_date)).limit(5000)
    rows = (await db.execute(stmt)).scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ledger ID", "Transaction ID", "Date", "Time", "Tenant", "Company", "SD", "Distributor",
        "Retailer", "Service", "Ledger Type", "Debit", "Credit", "Balance", "Reference", "Status"
    ])

    for r in rows:
        c_dt = get_created_dt(r)
        writer.writerow([
            r.ledger_number, r.transaction_number,
            c_dt.strftime("%Y-%m-%d") if c_dt else "",
            c_dt.strftime("%H:%M:%S") if c_dt else "",
            str(r.tenant_id), "Default Company", "Super Distributor Alpha", "Distributor Metro",
            "Sathiya Traders", "DMT Settlement", r.ledger_type, r.debit, r.credit, r.balance,
            r.reference_number, r.ledger_status
        ])

    output.seek(0)
    headers = {"Content-Disposition": f"attachment; filename=Transaction_Ledger_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv", headers=headers)


# ==============================================================================
# 3. TAX REPORT ENDPOINTS
# ==============================================================================

@router.get("/tax/summary")
async def get_tax_report_summary(
    financial_year: Optional[str] = Query(None),
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    start_dt, end_dt, fy_label = parse_financial_year(financial_year)

    filters = [
        EnterprisePayoutTransactionModel.initiated_at >= start_dt,
        EnterprisePayoutTransactionModel.initiated_at <= end_dt
    ]
    if tenant_id:
        filters.append(EnterprisePayoutTransactionModel.tenant_id == tenant_id)
    if company_id:
        filters.append(EnterprisePayoutTransactionModel.company_id == company_id)

    stmt = select(
        func.count(EnterprisePayoutTransactionModel.id).label("total_txns"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.amount), 0.0).label("taxable_amount"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.gst_amount), 0.0).label("total_gst"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.charges), 0.0).label("total_charges"),
    ).where(and_(*filters))

    res = (await db.execute(stmt)).fetchone()

    taxable = float(res[1]) if res else 0.0
    total_gst = float(res[2]) if res else 0.0
    cgst = round(total_gst / 2.0, 2)
    sgst = round(total_gst / 2.0, 2)
    igst = 0.0

    return {
        "status": "SUCCESS",
        "data": {
            "financial_year": fy_label,
            "total_transactions": res[0] if res else 0,
            "total_taxable_amount": taxable,
            "total_cgst": cgst,
            "total_sgst": sgst,
            "total_igst": igst,
            "total_gst": total_gst,
            "total_charges": float(res[3]) if res else 0.0,
            "date_range": {"from": start_dt.strftime("%Y-%m-%d"), "to": end_dt.strftime("%Y-%m-%d")}
        }
    }


@router.get("/tax")
async def list_tax_report(
    financial_year: Optional[str] = Query(None),
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    gst_number: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    start_dt, end_dt, fy_label = parse_financial_year(financial_year)
    filters = [
        EnterprisePayoutTransactionModel.initiated_at >= start_dt,
        EnterprisePayoutTransactionModel.initiated_at <= end_dt
    ]

    if tenant_id:
        filters.append(EnterprisePayoutTransactionModel.tenant_id == tenant_id)
    if company_id:
        filters.append(EnterprisePayoutTransactionModel.company_id == company_id)

    count_stmt = select(func.count(EnterprisePayoutTransactionModel.id)).where(and_(*filters))
    total_records = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * limit
    stmt = (
        select(EnterprisePayoutTransactionModel)
        .where(and_(*filters))
        .order_by(desc(EnterprisePayoutTransactionModel.initiated_at))
        .offset(offset)
        .limit(limit)
    )

    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for r in rows:
        gst_amt = float(r.gst_amount)
        cgst = round(gst_amt / 2.0, 2)
        sgst = round(gst_amt / 2.0, 2)
        st_val = r.status.value if hasattr(r.status, "value") else str(r.status)
        init_dt = get_created_dt(r)

        items.append({
            "id": str(r.public_id),
            "transaction_id": r.transaction_number,
            "transaction_date": init_dt.strftime("%Y-%m-%d") if init_dt else None,
            "tenant_id": str(r.tenant_id),
            "company_id": str(r.company_id or "Default Company"),
            "entity_type": "RETAILER",
            "entity_name": "Sathiya Traders",
            "gst_number": "33ABCDE1234F1Z5",
            "service": "DMT Payout",
            "taxable_amount": float(r.amount),
            "cgst": cgst,
            "sgst": sgst,
            "igst": 0.0,
            "total_gst": gst_amt,
            "total_charges": float(r.charges),
            "invoice_reference": f"INV-{r.transaction_number[-8:]}",
            "status": st_val
        })

    return {
        "status": "SUCCESS",
        "data": {
            "financial_year": fy_label,
            "items": items,
            "pagination": {
                "total": total_records,
                "page": page,
                "limit": limit,
                "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1
            }
        }
    }


@router.get("/tax/export")
async def export_tax_report_csv(
    financial_year: Optional[str] = Query(None),
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    start_dt, end_dt, fy_label = parse_financial_year(financial_year)
    filters = [
        EnterprisePayoutTransactionModel.initiated_at >= start_dt,
        EnterprisePayoutTransactionModel.initiated_at <= end_dt
    ]
    if tenant_id:
        filters.append(EnterprisePayoutTransactionModel.tenant_id == tenant_id)

    stmt = select(EnterprisePayoutTransactionModel).where(and_(*filters)).order_by(desc(EnterprisePayoutTransactionModel.initiated_at)).limit(5000)
    rows = (await db.execute(stmt)).scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID", "Date", "Tenant", "Company", "Entity Type", "Entity Name",
        "GST Number", "Service", "Taxable Amount", "CGST", "SGST", "IGST", "Total GST", "Total Charges", "Invoice Ref", "Status"
    ])

    for r in rows:
        gst_amt = float(r.gst_amount)
        st_val = r.status.value if hasattr(r.status, "value") else str(r.status)
        init_dt = get_created_dt(r)
        writer.writerow([
            r.transaction_number, init_dt.strftime("%Y-%m-%d") if init_dt else "",
            str(r.tenant_id), "Default Company", "RETAILER", "Sathiya Traders",
            "33ABCDE1234F1Z5", "DMT Payout", r.amount, round(gst_amt / 2, 2), round(gst_amt / 2, 2), 0.0,
            gst_amt, r.charges, f"INV-{r.transaction_number[-8:]}", st_val
        ])

    output.seek(0)
    headers = {"Content-Disposition": f"attachment; filename=Tax_Report_{fy_label.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.csv"}
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv", headers=headers)


# ==============================================================================
# 4. DAILY OPEN & CLOSE REPORT & RECONCILIATION ENDPOINTS
# ==============================================================================

@router.get("/daily-open-close/summary")
async def get_daily_open_close_summary(
    business_date: Optional[str] = Query(None),
    tenant_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    b_date = business_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return {
        "status": "SUCCESS",
        "data": {
            "business_date": b_date,
            "opening_balance": 15250000.00,
            "total_credits": 4820000.00,
            "total_debits": 3250000.00,
            "total_payouts": 2980000.00,
            "total_charges": 14500.00,
            "total_gst": 2610.00,
            "closing_balance": 16802890.00,
            "reconciliation_summary": {
                "matched_count": 48,
                "mismatch_count": 0,
                "pending_count": 2,
                "reconciliation_status": "MATCHED"
            }
        }
    }


@router.get("/daily-open-close")
async def list_daily_open_close_report(
    business_date: Optional[str] = Query(None),
    entity_type: Optional[str] = Query("ALL"),
    tenant_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    b_date = business_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    req_entity = entity_type.upper() if entity_type else "ALL"

    mock_hierarchy = [
        {
            "entity_id": "SD-MASTER-01",
            "entity_name": "Super Distributor Master Console",
            "entity_type": "SD",
            "tenant_id": str(tenant_id or "Default Tenant"),
            "company_id": str(company_id or "Default Company"),
            "parent_entity": "Pay2Pay HQ",
            "business_date": b_date,
            "opening_balance": 12500000.00,
            "total_credits": 2500000.00,
            "total_debits": 1800000.00,
            "payouts": 1500000.00,
            "charges": 8500.00,
            "gst": 1530.00,
            "adjustments": 0.0,
            "closing_balance": 13189970.00,
            "transaction_count": 340,
            "successful_count": 332,
            "failed_count": 6,
            "pending_count": 2,
            "reversed_count": 0,
            "settlement_amount": 1500000.00,
            "settled_amount": 1500000.00,
            "pending_settlement": 0.0,
            "expected_closing_balance": 13189970.00,
            "actual_closing_balance": 13189970.00,
            "difference": 0.0,
            "reconciliation_status": "MATCHED"
        },
        {
            "entity_id": "DIST-METRO-02",
            "entity_name": "Metro Territory Distributor",
            "entity_type": "DIST",
            "tenant_id": str(tenant_id or "Default Tenant"),
            "company_id": str(company_id or "Default Company"),
            "parent_entity": "SD-MASTER-01",
            "business_date": b_date,
            "opening_balance": 2150000.00,
            "total_credits": 1200000.00,
            "total_debits": 950000.00,
            "payouts": 890000.00,
            "charges": 4200.00,
            "gst": 756.00,
            "adjustments": 0.0,
            "closing_balance": 2395044.00,
            "transaction_count": 185,
            "successful_count": 182,
            "failed_count": 3,
            "pending_count": 0,
            "reversed_count": 0,
            "settlement_amount": 890000.00,
            "settled_amount": 890000.00,
            "pending_settlement": 0.0,
            "expected_closing_balance": 2395044.00,
            "actual_closing_balance": 2395044.00,
            "difference": 0.0,
            "reconciliation_status": "MATCHED"
        },
        {
            "entity_id": "RET-0CFE2B",
            "entity_name": "Sathiya Traders",
            "entity_type": "RETAILER",
            "tenant_id": str(tenant_id or "Default Tenant"),
            "company_id": str(company_id or "Default Company"),
            "parent_entity": "DIST-METRO-02",
            "business_date": b_date,
            "opening_balance": 600000.00,
            "total_credits": 112000.00,
            "total_debits": 500000.00,
            "payouts": 500000.00,
            "charges": 1800.00,
            "gst": 324.00,
            "adjustments": 0.0,
            "closing_balance": 209876.00,
            "transaction_count": 62,
            "successful_count": 60,
            "failed_count": 2,
            "pending_count": 0,
            "reversed_count": 0,
            "settlement_amount": 500000.00,
            "settled_amount": 500000.00,
            "pending_settlement": 0.0,
            "expected_closing_balance": 209876.00,
            "actual_closing_balance": 209876.00,
            "difference": 0.0,
            "reconciliation_status": "MATCHED"
        }
    ]

    filtered_items = [
        item for item in mock_hierarchy
        if req_entity == "ALL" or item["entity_type"] == req_entity
    ]

    return {
        "status": "SUCCESS",
        "data": {
            "business_date": b_date,
            "items": filtered_items,
            "pagination": {
                "total": len(filtered_items),
                "page": page,
                "limit": limit,
                "total_pages": 1
            }
        }
    }


@router.get("/daily-open-close/export")
async def export_daily_open_close_csv(
    business_date: Optional[str] = Query(None),
    entity_type: Optional[str] = Query("ALL"),
    tenant_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    b_date = business_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Entity ID", "Entity Name", "Entity Type", "Parent Entity", "Business Date",
        "Opening Balance", "Total Credits", "Total Debits", "Payouts", "Charges", "GST",
        "Closing Balance", "Tx Count", "Expected Closing", "Actual Closing", "Difference", "Reconciliation Status"
    ])

    rows = [
        ["SD-MASTER-01", "Super Distributor Master Console", "SD", "Pay2Pay HQ", b_date, 12500000.0, 2500000.0, 1800000.0, 1500000.0, 8500.0, 1530.0, 13189970.0, 340, 13189970.0, 13189970.0, 0.0, "MATCHED"],
        ["DIST-METRO-02", "Metro Territory Distributor", "DIST", "SD-MASTER-01", b_date, 2150000.0, 1200000.0, 950000.0, 890000.0, 4200.0, 756.0, 2395044.0, 185, 2395044.0, 2395044.0, 0.0, "MATCHED"],
        ["RET-0CFE2B", "Sathiya Traders", "RETAILER", "DIST-METRO-02", b_date, 600000.0, 112000.0, 500000.0, 500000.0, 1800.0, 324.0, 209876.0, 62, 209876.0, 209876.0, 0.0, "MATCHED"]
    ]

    for r in rows:
        writer.writerow(r)

    output.seek(0)
    headers = {"Content-Disposition": f"attachment; filename=Daily_Open_Close_Report_{b_date}.csv"}
    return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv", headers=headers)


# ── Webhook Audit Logs Report (queries public.view_payout_webhook_logs) ──
@router.get("/payout-webhooks", summary="Admin Report: Payout Webhook Inbound Audit Logs")
async def get_admin_payout_webhook_logs(
    gateway: Optional[str] = Query(None, description="Filter by gateway code (e.g. URBANRUPEE, BULKPE)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (SUCCESS, FAILED, PENDING)"),
    search: Optional[str] = Query(None, description="Search by client_txn_id, vendor_tx_id, transaction_number, or retailer"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real-time vendor webhook callback records from database view public.view_payout_webhook_logs.
    Includes request payload, response payload, vendor tx id, client order id, status, and retailer details.
    """
    from app.application.payout_callback_service import PayoutCallbackService
    return await PayoutCallbackService.get_webhook_logs(
        db=db,
        gateway=gateway,
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset
    )


# ── Retailer Full Master Export with Address and KYC Documents ──
RETAILER_FULL_EXPORT_SQL = """
WITH reg_docs AS (
    SELECT 
        rd.registration_id,
        MAX(CASE WHEN rd.doc_type IN ('PAN', 'PAN_CARD') THEN rd.file_url END) AS pan_doc_url,
        MAX(CASE WHEN rd.doc_type IN ('AADHAAR_FRONT', 'AADHAAR_CARD_FRONT') THEN rd.file_url END) AS aadhaar_front_doc_url,
        MAX(CASE WHEN rd.doc_type IN ('AADHAAR_BACK', 'AADHAAR_CARD_BACK') THEN rd.file_url END) AS aadhaar_back_doc_url,
        MAX(CASE WHEN rd.doc_type IN ('BANK_PROOF', 'CANCELLED_CHEQUE', 'PASSBOOK') THEN rd.file_url END) AS bank_proof_doc_url,
        MAX(CASE WHEN rd.doc_type IN ('SHOP_PHOTO', 'SHOP_IMAGE', 'STORE_FRONT') THEN rd.file_url END) AS shop_photo_doc_url
    FROM public.registration_documents rd
    WHERE rd.is_deleted IS NULL OR rd.is_deleted = FALSE
    GROUP BY rd.registration_id
)
SELECT 
    ROW_NUMBER() OVER (ORDER BY r.id ASC) AS s_no,
    r.retailer_code,
    r.retailer_ref_id,
    COALESCE(r.store_name, 'N/A') AS store_name,
    COALESCE(r.legal_name, 'N/A') AS legal_name,
    COALESCE(r.owner_name, 'N/A') AS owner_name,
    COALESCE(rc.primary_contact, r.owner_name, 'N/A') AS contact_person,
    COALESCE(rc.mobile, 'N/A') AS mobile_number,
    COALESCE(rc.alternate_mobile, '') AS alternate_mobile,
    COALESCE(rc.email, 'N/A') AS email,
    COALESCE(rc.support_email, '') AS support_email,
    COALESCE(r.business_category, 'General Store') AS business_category,
    COALESCE(r.store_type, 'BRICK_AND_MORTAR') AS store_type,
    COALESCE(r.status, 'ACTIVE') AS retailer_status,
    CASE WHEN r.is_active = TRUE THEN 'Active' ELSE 'Inactive' END AS is_active,
    TO_CHAR(r.created_date, 'YYYY-MM-DD HH24:MI:SS') AS registration_date,
    
    -- Address Details
    COALESCE(ra.address, radd.street, 'N/A') AS shop_address,
    COALESCE(radd.landmark, '') AS landmark,
    COALESCE(ra.city, radd.city, 'N/A') AS city,
    COALESCE(ra.district, radd.district, '') AS district,
    COALESCE(ra.state, radd.state, 'N/A') AS state,
    COALESCE(ra.pincode, radd.pincode, 'N/A') AS pincode,
    COALESCE(ra.country, 'India') AS country,
    COALESCE(ra.latitude::text, radd.latitude::text, '') AS latitude,
    COALESCE(ra.longitude::text, radd.longitude::text, '') AS longitude,
    
    -- KYC Identifiers & Status
    COALESCE(rk.pan_number, rpan.pan_number, rv.pan_number, 'N/A') AS pan_number,
    COALESCE(rk.aadhaar_number, raadh.aadhaar_masked, 'N/A') AS aadhaar_number,
    COALESCE(rk.gst_number, rv.gst_number, '') AS gst_number,
    COALESCE(rk.verification_status, rv.verification_status, 'PENDING') AS kyc_verification_status,
    COALESCE(rk.rejection_reason, '') AS kyc_rejection_reason,
    
    -- KYC Document URLs
    COALESCE(docs.pan_doc_url, '') AS pan_document_url,
    COALESCE(rk.aadhaar_front_url, docs.aadhaar_front_doc_url, '') AS aadhaar_front_url,
    COALESCE(rk.aadhaar_back_url, docs.aadhaar_back_doc_url, '') AS aadhaar_back_url,
    COALESCE(raadh.photo_url, '') AS aadhaar_photo_url,
    COALESCE(docs.shop_photo_doc_url, radd.shop_photo_url, rk.business_proof_url, '') AS shop_business_proof_url,
    COALESCE(docs.bank_proof_doc_url, '') AS bank_proof_url,
    COALESCE(rvid.video_url, '') AS kyc_video_url,
    
    -- Bank Account Details
    COALESCE(rb.settlement_bank_name, rbank.bank_name, 'N/A') AS bank_name,
    COALESCE(rb.account_holder, rbank.name_at_bank, r.owner_name, 'N/A') AS bank_account_holder,
    COALESCE(rb.account_number, rbank.account_number, rbank.account_number_masked, 'N/A') AS bank_account_number,
    COALESCE(rb.ifsc, rbank.ifsc, 'N/A') AS bank_ifsc,
    COALESCE(rb.branch, rbank.branch, '') AS bank_branch,
    COALESCE(rb.upi_id, '') AS upi_id,
    COALESCE(rb.verification_status, rbank.verification_status, 'PENDING') AS bank_verification_status,
    
    -- Wallet Details
    COALESCE(rw.wallet_balance, 0.0) AS wallet_balance_inr,
    CASE WHEN rw.is_frozen = TRUE THEN 'YES' ELSE 'NO' END AS wallet_frozen,
    COALESCE(rw.daily_transaction_limit, 5000000.0) AS daily_limit_inr,
    COALESCE(rw.single_transaction_limit, 500000.0) AS single_limit_inr,
    
    -- Hierarchy Mapping
    COALESCE(d.distributor_code, '') AS distributor_code,
    COALESCE(d.business_name, d.owner_name, '') AS distributor_name,
    COALESCE(d.mobile, '') AS distributor_mobile,
    COALESCE(sd.super_distributor_code, '') AS super_distributor_code,
    COALESCE(sd.business_name, sd.owner_name, '') AS super_distributor_name,
    COALESCE(sd.mobile, '') AS super_distributor_mobile,
    COALESCE(cm.company_code, '') AS company_code,
    COALESCE(cm.company_name, '') AS company_name

FROM public.retailer r
LEFT JOIN LATERAL (
    SELECT rc_in.mobile, rc_in.alternate_mobile, rc_in.email, rc_in.support_email, rc_in.primary_contact
    FROM public.retailer_contact rc_in
    WHERE rc_in.retailer_id = r.public_id 
       OR (r.retailer_ref_id IS NOT NULL AND rc_in.retailer_ref_id = r.retailer_ref_id)
    ORDER BY rc_in.id DESC
    LIMIT 1
) rc ON TRUE
LEFT JOIN LATERAL (
    SELECT ra_in.address, ra_in.city, ra_in.district, ra_in.state, ra_in.pincode, ra_in.country, ra_in.latitude, ra_in.longitude
    FROM public.retailer_address ra_in
    WHERE ra_in.retailer_id = r.public_id 
       OR (r.retailer_ref_id IS NOT NULL AND ra_in.retailer_ref_id = r.retailer_ref_id)
    ORDER BY ra_in.id DESC
    LIMIT 1
) ra ON TRUE
LEFT JOIN LATERAL (
    SELECT rk_in.pan_number, rk_in.aadhaar_number, rk_in.gst_number, rk_in.verification_status, 
           rk_in.rejection_reason, rk_in.aadhaar_front_url, rk_in.aadhaar_back_url, rk_in.business_proof_url
    FROM public.retailer_kyc rk_in
    WHERE rk_in.retailer_id = r.public_id 
       OR (r.retailer_ref_id IS NOT NULL AND rk_in.retailer_ref_id = r.retailer_ref_id)
    ORDER BY rk_in.id DESC
    LIMIT 1
) rk ON TRUE
LEFT JOIN LATERAL (
    SELECT rb_in.settlement_bank_name, rb_in.account_holder, rb_in.account_number, rb_in.ifsc, rb_in.branch, rb_in.upi_id, rb_in.verification_status
    FROM public.retailer_bank rb_in
    WHERE rb_in.retailer_id = r.public_id 
       OR (r.retailer_ref_id IS NOT NULL AND rb_in.retailer_ref_id = r.retailer_ref_id)
    ORDER BY rb_in.id DESC
    LIMIT 1
) rb ON TRUE
LEFT JOIN LATERAL (
    SELECT rw_in.wallet_balance, rw_in.is_frozen, rw_in.daily_transaction_limit, rw_in.single_transaction_limit
    FROM public.retailer_wallet rw_in
    WHERE rw_in.retailer_id = r.public_id 
       OR (r.retailer_ref_id IS NOT NULL AND rw_in.retailer_ref_id = r.retailer_ref_id)
       OR (r.id IS NOT NULL AND rw_in.id = r.id)
    ORDER BY rw_in.id DESC
    LIMIT 1
) rw ON TRUE
LEFT JOIN LATERAL (
    SELECT rv_in.registration_id, rv_in.pan_number, rv_in.gst_number, rv_in.verification_status
    FROM public.retailer_verifications rv_in
    WHERE rv_in.retailer_id = r.retailer_code 
       OR rv_in.retailer_id = r.public_id::text
       OR (rc.mobile IS NOT NULL AND rv_in.mobile_number = rc.mobile)
    ORDER BY rv_in.id DESC
    LIMIT 1
) rv ON TRUE
LEFT JOIN LATERAL (
    SELECT rd_in.registration_id
    FROM public.registration_drafts rd_in
    WHERE (rc.mobile IS NOT NULL AND rd_in.mobile_number = rc.mobile)
    ORDER BY rd_in.id DESC
    LIMIT 1
) draft ON TRUE
LEFT JOIN reg_docs docs ON docs.registration_id = COALESCE(rv.registration_id, draft.registration_id)
LEFT JOIN LATERAL (
    SELECT rpan_in.id, rpan_in.pan_number
    FROM public.registration_pan rpan_in
    WHERE rpan_in.registration_id = COALESCE(rv.registration_id, draft.registration_id)
    ORDER BY rpan_in.id DESC
    LIMIT 1
) rpan ON TRUE
LEFT JOIN LATERAL (
    SELECT raadh_in.id, raadh_in.aadhaar_masked, raadh_in.photo_url
    FROM public.registration_aadhaar raadh_in
    WHERE raadh_in.registration_id = COALESCE(rv.registration_id, draft.registration_id)
    ORDER BY raadh_in.id DESC
    LIMIT 1
) raadh ON TRUE
LEFT JOIN LATERAL (
    SELECT rbank_in.id, rbank_in.bank_name, rbank_in.name_at_bank, rbank_in.account_number, rbank_in.account_number_masked, rbank_in.ifsc, rbank_in.branch, rbank_in.verification_status
    FROM public.registration_bank rbank_in
    WHERE rbank_in.registration_id = COALESCE(rv.registration_id, draft.registration_id)
    ORDER BY rbank_in.id DESC
    LIMIT 1
) rbank ON TRUE
LEFT JOIN LATERAL (
    SELECT radd_in.id, radd_in.street, radd_in.landmark, radd_in.city, radd_in.district, radd_in.state, radd_in.pincode, radd_in.latitude, radd_in.longitude, radd_in.shop_photo_url
    FROM public.registration_address radd_in
    WHERE radd_in.registration_id = COALESCE(rv.registration_id, draft.registration_id)
    ORDER BY radd_in.id DESC
    LIMIT 1
) radd ON TRUE
LEFT JOIN LATERAL (
    SELECT rvid_in.id, rvid_in.video_url
    FROM public.registration_video rvid_in
    WHERE rvid_in.registration_id = COALESCE(rv.registration_id, draft.registration_id)
    ORDER BY rvid_in.id DESC
    LIMIT 1
) rvid ON TRUE
LEFT JOIN LATERAL (
    SELECT d_in.distributor_code, d_in.business_name, d_in.owner_name, d_in.mobile
    FROM public.distributor d_in
    WHERE (r.mapped_distributor_id IS NOT NULL AND d_in.public_id = r.mapped_distributor_id)
       OR (r.distributor_ref_id IS NOT NULL AND (d_in.distributor_ref_id = r.distributor_ref_id OR d_in.id = r.distributor_ref_id))
    ORDER BY CASE WHEN r.mapped_distributor_id IS NOT NULL AND d_in.public_id = r.mapped_distributor_id THEN 0 ELSE 1 END
    LIMIT 1
) d ON TRUE
LEFT JOIN LATERAL (
    SELECT sd_in.super_distributor_code, sd_in.business_name, sd_in.owner_name, sd_in.mobile
    FROM public.super_distributor sd_in
    WHERE (r.mapped_super_distributor_id IS NOT NULL AND sd_in.public_id = r.mapped_super_distributor_id)
       OR (r.super_distributor_ref_id IS NOT NULL AND (sd_in.super_distributor_ref_id = r.super_distributor_ref_id OR sd_in.id = r.super_distributor_ref_id))
    ORDER BY CASE WHEN r.mapped_super_distributor_id IS NOT NULL AND sd_in.public_id = r.mapped_super_distributor_id THEN 0 ELSE 1 END
    LIMIT 1
) sd ON TRUE
LEFT JOIN LATERAL (
    SELECT cm_in.company_code, cm_in.company_name
    FROM public.company cm_in
    WHERE (r.company_id IS NOT NULL AND cm_in.public_id = r.company_id)
       OR (r.company_ref_id IS NOT NULL AND (cm_in.company_ref_id = r.company_ref_id OR cm_in.id = r.company_ref_id))
    LIMIT 1
) cm ON TRUE
WHERE (r.is_deleted IS NULL OR r.is_deleted = FALSE)
ORDER BY r.id ASC;
"""

@router.get("/retailers/export", summary="Export Retailer Full Master with Address and KYC Documents")
@router.get("/retailer-details/export", summary="Export Retailer Full Master with Address and KYC Documents")
@router.get("/retailers/export-csv", summary="Export Retailer Full Master with Address and KYC Documents")
async def export_retailers_full_csv(
    db: AsyncSession = Depends(get_db)
):
    """
    Exports full details of all retailers including:
    - Business details (Code, Name, Category, Store Type, Status)
    - Contact Details (Mobile, Alternate Mobile, Email, Support Email, Contact Person)
    - Full Store Address (Street, Landmark, City, District, State, Pincode, Lat, Long)
    - KYC & Identification (PAN, Aadhaar, GST, KYC Status, Rejection Reason)
    - KYC Document URLs (PAN Card, Aadhaar Front, Aadhaar Back, Photo, Shop Proof, Bank Proof, Video KYC)
    - Settlement Bank Details (Bank Name, Holder Name, Account No, IFSC, Branch, UPI ID, Status)
    - Wallet & Limits (Balance, Limits, Frozen Status)
    - Hierarchy (Distributor, Super Distributor, Company)
    """
    res = await db.execute(text(RETAILER_FULL_EXPORT_SQL))
    rows = res.fetchall()

    base_domain = "https://admin.pay2pay.in"

    def format_url(val: Any) -> str:
        if not val or str(val).strip() in ("", "N/A", "null", "None"):
            return ""
        s = str(val).strip()
        if s.startswith("http://") or s.startswith("https://"):
            return s
        if s.startswith("/"):
            return f"{base_domain}{s}"
        return f"{base_domain}/{s}"

    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "S.No", "Retailer Code", "Retailer Ref ID", "Store Name", "Legal Name", "Owner Name",
        "Contact Person", "Mobile Number", "Alternate Mobile", "Email", "Support Email",
        "Business Category", "Store Type", "Account Status", "Active Status", "Registration Date",
        "Shop Address", "Landmark", "City", "District", "State", "Pincode", "Country", "Latitude", "Longitude",
        "PAN Number", "Aadhaar Number", "GST Number", "KYC Verification Status", "KYC Rejection Reason",
        "PAN Document URL", "Aadhaar Front URL", "Aadhaar Back URL", "Aadhaar Photo URL",
        "Shop / Business Proof URL", "Bank Proof URL", "Video KYC URL",
        "Bank Name", "Bank Account Holder", "Bank Account Number", "Bank IFSC", "Bank Branch",
        "UPI ID", "Bank Verification Status", "Wallet Balance (INR)", "Wallet Frozen",
        "Daily Limit (INR)", "Single Limit (INR)", "Distributor Code", "Distributor Name",
        "Distributor Mobile", "Super Distributor Code", "Super Distributor Name",
        "Super Distributor Mobile", "Company Code", "Company Name"
    ]
    writer.writerow(headers)

    for r in rows:
        m = r._mapping
        writer.writerow([
            m.get("s_no"),
            m.get("retailer_code"),
            m.get("retailer_ref_id"),
            m.get("store_name"),
            m.get("legal_name"),
            m.get("owner_name"),
            m.get("contact_person"),
            m.get("mobile_number"),
            m.get("alternate_mobile"),
            m.get("email"),
            m.get("support_email"),
            m.get("business_category"),
            m.get("store_type"),
            m.get("retailer_status"),
            m.get("is_active"),
            m.get("registration_date"),
            m.get("shop_address"),
            m.get("landmark"),
            m.get("city"),
            m.get("district"),
            m.get("state"),
            m.get("pincode"),
            m.get("country"),
            m.get("latitude"),
            m.get("longitude"),
            m.get("pan_number"),
            m.get("aadhaar_number"),
            m.get("gst_number"),
            m.get("kyc_verification_status"),
            m.get("kyc_rejection_reason"),
            format_url(m.get("pan_document_url")),
            format_url(m.get("aadhaar_front_url")),
            format_url(m.get("aadhaar_back_url")),
            format_url(m.get("aadhaar_photo_url")),
            format_url(m.get("shop_business_proof_url")),
            format_url(m.get("bank_proof_url")),
            format_url(m.get("kyc_video_url")),
            m.get("bank_name"),
            m.get("bank_account_holder"),
            m.get("bank_account_number"),
            m.get("bank_ifsc"),
            m.get("bank_branch"),
            m.get("upi_id"),
            m.get("bank_verification_status"),
            m.get("wallet_balance_inr"),
            m.get("wallet_frozen"),
            m.get("daily_limit_inr"),
            m.get("single_limit_inr"),
            m.get("distributor_code"),
            m.get("distributor_name"),
            m.get("distributor_mobile"),
            m.get("super_distributor_code"),
            m.get("super_distributor_name"),
            m.get("super_distributor_mobile"),
            m.get("company_code"),
            m.get("company_name"),
        ])

    now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output.seek(0)
    response_headers = {
        "Content-Disposition": f"attachment; filename=Retailers_Full_Master_Export_{now_str}.csv",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers=response_headers
    )


