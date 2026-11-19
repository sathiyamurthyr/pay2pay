from __future__ import annotations
import uuid
import io
import csv
import re
from datetime import datetime, date, time, timezone, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.company_resolver import resolve_request_company_ref

router = APIRouter(prefix="/reports", tags=["PayIn Report"])

IST = timezone(timedelta(hours=5, minutes=30))


def money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")


def parse_date_range(from_date: Optional[str], to_date: Optional[str]) -> Tuple[datetime, datetime]:
    now_ist = datetime.now(IST)
    if from_date and isinstance(from_date, str) and from_date.strip():
        try:
            start_dt = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(
                hour=0, minute=0, second=0, microsecond=0, tzinfo=IST
            ).astimezone(timezone.utc)
        except ValueError:
            start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)
    else:
        start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)

    if to_date and isinstance(to_date, str) and to_date.strip():
        try:
            end_dt = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, microsecond=999999, tzinfo=IST
            ).astimezone(timezone.utc)
        except ValueError:
            end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)
    else:
        end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)

    return start_dt, end_dt


def clean_str(val: Any) -> Optional[str]:
    if isinstance(val, str) and val.strip():
        return val.strip()
    return None


def clean_int(val: Any) -> Optional[int]:
    if isinstance(val, int):
        return val
    if isinstance(val, str) and val.strip().isdigit():
        return int(val.strip())
    return None


def map_gateway_label(vendor_ref: Optional[int], vendor_code: Optional[str] = None) -> str:
    """
    Enforces customer-facing labels G-1 / G-2 only.
    """
    if vendor_ref == 1 or (vendor_code and "BANKME" in vendor_code.upper()):
        return "G-1"
    if vendor_ref == 2 or (vendor_code and "EASEBUZZ" in vendor_code.upper()):
        return "G-2"
    if vendor_ref and vendor_ref > 2:
        return f"G-{vendor_ref}"
    return "G-1"


def resolve_payin_auth_context(request: Optional[Request]) -> Dict[str, Any]:
    """
    Extracts authenticated company, retailer and role context.
    Prevents cross-tenant / cross-company context leakage.
    """
    ctx: Dict[str, Any] = {
        "company_ref_id": None,
        "retailer_ref_id": None,
        "tenant_ref_id": None,
        "is_admin": False,
        "is_super_admin": False,
    }
    if not request:
        return ctx

    token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
    if not token:
        token = (
            request.cookies.get("p2p_access_token") or
            request.cookies.get("pay2pay_access_token") or
            request.cookies.get("p2p_admin_token") or
            request.cookies.get("p2p_retailer_token") or
            request.cookies.get("access_token")
        )

    if token:
        try:
            payload = decode_access_token(token) or {}
            roles = payload.get("roles") or []
            if isinstance(roles, str):
                roles = [roles]
            upper_roles = [str(r).upper() for r in roles]

            ctx["is_super_admin"] = any("SUPER_ADMIN" in r for r in upper_roles)
            ctx["is_admin"] = ctx["is_super_admin"] or any(r in ("ADMIN", "PLATFORM_ADMIN", "OPS_ADMIN", "FINANCE") for r in upper_roles)
            ctx["company_ref_id"] = payload.get("company_ref_id")
            ctx["retailer_ref_id"] = payload.get("retailer_ref_id")
            ctx["tenant_ref_id"] = payload.get("tenant_ref_id")
        except Exception:
            pass

    # Authoritative domain fallback if company not determined by token
    domain_comp_ref = resolve_request_company_ref(request)
    if domain_comp_ref is not None:
        if ctx["company_ref_id"] is None or not ctx["is_super_admin"]:
            ctx["company_ref_id"] = domain_comp_ref

    return ctx


@router.get("/summary", summary="Get Retailer/Admin PayIn Summary KPIs")
async def get_payin_report_summary(
    request: Request,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    company_ref_id: Optional[int] = Query(None),
    retailer_ref_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes real-time KPI metrics strictly from public.payin_transactions.
    Never touches Payout tables or applies debit/charges calculations.
    """
    auth_ctx = resolve_payin_auth_context(request)
    company_ref_val = clean_int(company_ref_id)
    retailer_ref_val = clean_int(retailer_ref_id)
    status_str = clean_str(status)
    gateway_str = clean_str(gateway)
    payment_mode_str = clean_str(payment_mode)
    search_str = clean_str(search)

    effective_comp = auth_ctx["company_ref_id"]
    if auth_ctx["is_super_admin"] and company_ref_val is not None:
        effective_comp = company_ref_val

    effective_retailer = auth_ctx["retailer_ref_id"]
    if auth_ctx["is_admin"] and retailer_ref_val is not None:
        effective_retailer = retailer_ref_val

    start_dt, end_dt = parse_date_range(from_date, to_date)

    sql = """
    SELECT
        COUNT(t.payin_transactions_ref_id) AS total_transactions,
        COALESCE(SUM(t.txn_amount), 0.0) AS total_volume,
        COALESCE(SUM(t.customer_payable), 0.0) AS total_customer_payable,
        COALESCE(SUM(t.retailer_credit), 0.0) AS total_retailer_credit,
        COALESCE(SUM(t.total_charges), 0.0) AS total_charges,
        COALESCE(SUM(t.mdr_amount), 0.0) AS total_mdr,
        COALESCE(SUM(t.tax_amount), 0.0) AS total_gst,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN 1 END) AS successful_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.txn_amount ELSE 0.0 END), 0.0) AS successful_amount,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.retailer_credit ELSE 0.0 END), 0.0) AS successful_credit,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING') THEN 1 END) AS pending_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING') THEN t.txn_amount ELSE 0.0 END), 0.0) AS pending_amount,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT') THEN 1 END) AS failed_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT') THEN t.txn_amount ELSE 0.0 END), 0.0) AS failed_amount,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED') THEN 1 END) AS reversed_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED') THEN t.txn_amount ELSE 0.0 END), 0.0) AS reversed_amount
    FROM public.payin_transactions t
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    WHERE t.created_at >= :start_dt AND t.created_at <= :end_dt
    """
    params: Dict[str, Any] = {"start_dt": start_dt, "end_dt": end_dt}

    if effective_comp is not None:
        sql += " AND t.company_ref_id = :comp_ref"
        params["comp_ref"] = effective_comp

    if effective_retailer is not None:
        sql += " AND t.retailer_ref_id = :ret_ref"
        params["ret_ref"] = effective_retailer

    if status_str and status_str.upper() != "ALL":
        st = status_str.upper()
        if st == "SUCCESS":
            sql += " AND UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED')"
        elif st == "PENDING":
            sql += " AND UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING')"
        elif st == "FAILED":
            sql += " AND UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT')"
        elif st == "REVERSED":
            sql += " AND UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED')"
        else:
            sql += " AND UPPER(t.txn_status) = :st"
            params["st"] = st

    if gateway_str and gateway_str.upper() != "ALL":
        gw = gateway_str.upper()
        if gw == "G-1":
            sql += " AND t.payin_vendor_ref_id = 1"
        elif gw == "G-2":
            sql += " AND t.payin_vendor_ref_id = 2"
        else:
            sql += " AND (v.vendor_code ILIKE :gw OR v.vendor_name ILIKE :gw)"
            params["gw"] = f"%{gw}%"

    if payment_mode_str and payment_mode_str.upper() != "ALL":
        pm = payment_mode_str.upper()
        sql += " AND (p.pay_mode_code ILIKE :pm OR p.pay_mode_name ILIKE :pm)"
        params["pm"] = f"%{pm}%"

    if search_str:
        s = f"%{search_str}%"
        sql += """ AND (
            t.tid ILIKE :s OR
            t.merchant_ref_id ILIKE :s OR
            t.provider_ref_id ILIKE :s OR
            t.cust_mobile ILIKE :s OR
            t.cust_name ILIKE :s
        )"""
        params["s"] = s

    res = await db.execute(text(sql), params)
    row = res.fetchone()
    rd = dict(row._mapping) if row else {}

    tot_txns = int(rd.get("total_transactions") or 0)
    succ_txns = int(rd.get("successful_transactions") or 0)
    succ_rate = round((succ_txns / tot_txns * 100), 1) if tot_txns > 0 else 0.0

    return {
        "success": True,
        "status": "SUCCESS",
        "data": {
            "total_transactions": tot_txns,
            "total_volume": float(rd.get("total_volume") or 0.0),
            "total_customer_payable": float(rd.get("total_customer_payable") or 0.0),
            "total_retailer_credit": float(rd.get("total_retailer_credit") or 0.0),
            "total_charges": float(rd.get("total_charges") or 0.0),
            "total_mdr": float(rd.get("total_mdr") or 0.0),
            "total_gst": float(rd.get("total_gst") or 0.0),
            "successful_transactions": succ_txns,
            "successful_amount": float(rd.get("successful_amount") or 0.0),
            "successful_credit": float(rd.get("successful_credit") or 0.0),
            "pending_transactions": int(rd.get("pending_transactions") or 0),
            "pending_amount": float(rd.get("pending_amount") or 0.0),
            "failed_transactions": int(rd.get("failed_transactions") or 0),
            "failed_amount": float(rd.get("failed_amount") or 0.0),
            "reversed_transactions": int(rd.get("reversed_transactions") or 0),
            "reversed_amount": float(rd.get("reversed_amount") or 0.0),
            "success_rate": succ_rate,
            "date_range": {
                "from": start_dt.strftime("%Y-%m-%d"),
                "to": end_dt.strftime("%Y-%m-%d")
            }
        }
    }


@router.get("/grid", summary="Get Filtered Paginated PayIn Report Grid")
@router.get("/list", summary="Get Filtered Paginated PayIn Report List")
async def get_payin_report_grid(
    request: Request,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    company_ref_id: Optional[int] = Query(None),
    retailer_ref_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=200),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db)
):
    """
    Paginated PayIn transactions report.
    Returns formatted items, source data mapping, pagination metadata, and footer totals.
    """
    auth_ctx = resolve_payin_auth_context(request)
    company_ref_val = clean_int(company_ref_id)
    retailer_ref_val = clean_int(retailer_ref_id)
    status_str = clean_str(status)
    gateway_str = clean_str(gateway)
    payment_mode_str = clean_str(payment_mode)
    search_str = clean_str(search)

    effective_comp = auth_ctx["company_ref_id"]
    if auth_ctx["is_super_admin"] and company_ref_val is not None:
        effective_comp = company_ref_val

    effective_retailer = auth_ctx["retailer_ref_id"]
    if auth_ctx["is_admin"] and retailer_ref_val is not None:
        effective_retailer = retailer_ref_val

    start_dt, end_dt = parse_date_range(from_date, to_date)
    offset = (page - 1) * limit

    base_where = "WHERE t.created_at >= :start_dt AND t.created_at <= :end_dt"
    params: Dict[str, Any] = {"start_dt": start_dt, "end_dt": end_dt}

    if effective_comp is not None:
        base_where += " AND t.company_ref_id = :comp_ref"
        params["comp_ref"] = effective_comp

    if effective_retailer is not None:
        base_where += " AND t.retailer_ref_id = :ret_ref"
        params["ret_ref"] = effective_retailer

    if status_str and status_str.upper() != "ALL":
        st = status_str.upper()
        if st == "SUCCESS":
            base_where += " AND UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED')"
        elif st == "PENDING":
            base_where += " AND UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING')"
        elif st == "FAILED":
            base_where += " AND UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT')"
        elif st == "REVERSED":
            base_where += " AND UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED')"
        else:
            base_where += " AND UPPER(t.txn_status) = :st"
            params["st"] = st

    if gateway_str and gateway_str.upper() != "ALL":
        gw = gateway_str.upper()
        if gw == "G-1":
            base_where += " AND t.payin_vendor_ref_id = 1"
        elif gw == "G-2":
            base_where += " AND t.payin_vendor_ref_id = 2"
        else:
            base_where += " AND (v.vendor_code ILIKE :gw OR v.vendor_name ILIKE :gw)"
            params["gw"] = f"%{gw}%"

    if payment_mode_str and payment_mode_str.upper() != "ALL":
        pm = payment_mode_str.upper()
        base_where += " AND (p.pay_mode_code ILIKE :pm OR p.pay_mode_name ILIKE :pm)"
        params["pm"] = f"%{pm}%"

    if search_str:
        s = f"%{search_str}%"
        base_where += """ AND (
            t.tid ILIKE :s OR
            t.merchant_ref_id ILIKE :s OR
            t.provider_ref_id ILIKE :s OR
            t.cust_mobile ILIKE :s OR
            t.cust_name ILIKE :s
        )"""
        params["s"] = s

    # 1. Total records & footer totals count
    count_sql = f"""
    SELECT
        COUNT(t.payin_transactions_ref_id) AS total_count,
        COALESCE(SUM(t.txn_amount), 0.0) AS total_amount,
        COALESCE(SUM(t.total_charges), 0.0) AS total_charges,
        COALESCE(SUM(t.tax_amount), 0.0) AS total_gst,
        COALESCE(SUM(t.customer_payable), 0.0) AS total_customer_payable,
        COALESCE(SUM(t.retailer_credit), 0.0) AS total_retailer_credit
    FROM public.payin_transactions t
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    {base_where}
    """
    count_res = await db.execute(text(count_sql), params)
    count_row = count_res.fetchone()
    total_records = int(count_row[0] or 0) if count_row else 0
    total_amount = float(count_row[1] or 0.0) if count_row else 0.0
    total_charges = float(count_row[2] or 0.0) if count_row else 0.0
    total_gst = float(count_row[3] or 0.0) if count_row else 0.0
    total_cust_payable = float(count_row[4] or 0.0) if count_row else 0.0
    total_ret_credit = float(count_row[5] or 0.0) if count_row else 0.0

    # 2. Sorting validation
    allowed_sort_fields = {
        "created_at": "t.created_at",
        "initiated_at": "t.initiated_at",
        "completed_at": "t.completed_at",
        "tid": "t.tid",
        "txn_amount": "t.txn_amount",
        "customer_payable": "t.customer_payable",
        "retailer_credit": "t.retailer_credit",
        "txn_status": "t.txn_status",
    }
    sort_column = allowed_sort_fields.get(sort_by, "t.created_at")
    sort_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    # 3. Query records with source joins
    data_sql = f"""
    SELECT
        t.payin_transactions_ref_id,
        t.tid,
        t.merchant_ref_id,
        t.provider_ref_id,
        t.company_ref_id,
        c.company_name,
        c.company_code,
        t.retailer_ref_id,
        r.retailer_code,
        COALESCE(r.outlet_name, r.agent_name, t.cust_name) AS retailer_name,
        t.payin_vendor_ref_id,
        v.vendor_code,
        v.vendor_name,
        t.pay_mode_ref_id,
        COALESCE(p.pay_mode_code, 'UPI') AS payment_mode,
        COALESCE(p.pay_mode_name, 'UPI') AS payment_mode_name,
        t.card_network,
        t.cust_name,
        t.cust_mobile,
        t.cust_email,
        t.txn_amount,
        t.mdr_pct,
        t.mdr_fixed,
        t.mdr_amount,
        t.tax_amount,
        t.total_charges,
        t.customer_payable,
        t.retailer_credit,
        t.company_mdr_liability,
        t.currency,
        t.mdr_treatment,
        t.txn_status,
        t.provider_status,
        t.provider_resp_code,
        t.provider_resp_msg,
        t.failure_reason,
        t.ledger_txn_id,
        t.initiated_at,
        t.completed_at,
        t.created_at,
        t.updated_at
    FROM public.payin_transactions t
    JOIN public.company c ON t.company_ref_id = c.company_ref_id
    LEFT JOIN public.retailer r ON t.retailer_ref_id = r.retailer_ref_id
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    {base_where}
    ORDER BY {sort_column} {sort_direction}
    LIMIT :limit OFFSET :offset
    """
    params["limit"] = limit
    params["offset"] = offset

    data_res = await db.execute(text(data_sql), params)
    raw_rows = data_res.fetchall()

    items = []
    for idx, r in enumerate(raw_rows):
        d = dict(r._mapping)
        s_no = offset + idx + 1
        gw_label = map_gateway_label(d.get("payin_vendor_ref_id"), d.get("vendor_code"))

        created_dt = d.get("created_at") or d.get("initiated_at")
        date_str = created_dt.astimezone(IST).strftime("%d %b %Y") if created_dt else "--"
        time_str = created_dt.astimezone(IST).strftime("%I:%M %p") if created_dt else "--"
        iso_str = created_dt.isoformat() if created_dt else None

        updated_dt = d.get("completed_at") or d.get("updated_at")
        updated_iso = updated_dt.isoformat() if updated_dt else None

        items.append({
            "s_no": s_no,
            "id": str(d.get("payin_transactions_ref_id")),
            "tid": d.get("tid"),
            "transaction_id": d.get("tid"),
            "reference_id": d.get("merchant_ref_id") or d.get("provider_ref_id") or d.get("tid"),
            "merchant_ref_id": d.get("merchant_ref_id"),
            "provider_ref_id": d.get("provider_ref_id"),
            "retailer_id": d.get("retailer_code") or str(d.get("retailer_ref_id")),
            "retailer_name": d.get("retailer_name") or "Retailer Partner",
            "company_id": str(d.get("company_ref_id")),
            "company_name": d.get("company_name") or "SMSPAY",
            "company_code": d.get("company_code") or "SMSPAY",
            "gateway": gw_label,
            "vendor_name": gw_label,  # Customer-facing labels G-1 / G-2 only
            "payment_mode": d.get("payment_mode") or "UPI",
            "payment_mode_name": d.get("payment_mode_name") or "UPI",
            "card_network": d.get("card_network"),
            "customer_name": d.get("cust_name"),
            "customer_mobile": d.get("cust_mobile"),
            "amount": float(d.get("txn_amount") or 0.0),
            "txn_amount": float(d.get("txn_amount") or 0.0),
            "mdr_amount": float(d.get("mdr_amount") or 0.0),
            "gst": float(d.get("tax_amount") or 0.0),
            "tax_amount": float(d.get("tax_amount") or 0.0),
            "total_charges": float(d.get("total_charges") or 0.0),
            "total_amount": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "customer_payable": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "retailer_credit": float(d.get("retailer_credit") or d.get("txn_amount") or 0.0),
            "status": (d.get("txn_status") or "SUCCESS").upper(),
            "provider_status": d.get("provider_status"),
            "ledger_txn_id": d.get("ledger_txn_id"),
            "failure_reason": d.get("failure_reason"),
            "date": date_str,
            "time": time_str,
            "date_time": f"{date_str} {time_str}",
            "created_at": iso_str,
            "initiated_at": iso_str,
            "updated_at": updated_iso,
            "completed_at": updated_iso,
        })

    total_pages = max(1, (total_records + limit - 1) // limit)

    return {
        "success": True,
        "items": items,
        "data": {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_records": total_records,
                "total_pages": total_pages
            }
        },
        "pagination": {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages
        },
        "footer_totals": {
            "total_transactions": total_records,
            "total_amount": round(total_amount, 2),
            "total_charges": round(total_charges, 2),
            "total_gst": round(total_gst, 2),
            "total_customer_payable": round(total_cust_payable, 2),
            "total_retailer_credit": round(total_ret_credit, 2)
        }
    }


@router.get("/{tid}/details", summary="Get Sanitized PayIn Transaction Details for Drawer")
async def get_payin_transaction_details(
    tid: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full sanitized PayIn transaction breakdown for the slide-out detail drawer.
    Enforces strict company & retailer ownership validation.
    """
    auth_ctx = resolve_payin_auth_context(request)
    effective_comp = auth_ctx["company_ref_id"]
    effective_retailer = auth_ctx["retailer_ref_id"]

    stmt = text("""
    SELECT
        t.payin_transactions_ref_id,
        t.tid,
        t.merchant_ref_id,
        t.provider_ref_id,
        t.company_ref_id,
        c.company_name,
        c.company_code,
        t.retailer_ref_id,
        r.retailer_code,
        COALESCE(r.outlet_name, r.agent_name, t.cust_name) AS retailer_name,
        t.payin_vendor_ref_id,
        v.vendor_code,
        v.vendor_name,
        t.pay_mode_ref_id,
        COALESCE(p.pay_mode_code, 'UPI') AS payment_mode,
        COALESCE(p.pay_mode_name, 'UPI') AS payment_mode_name,
        t.card_network,
        t.cust_name,
        t.cust_mobile,
        t.cust_email,
        t.txn_amount,
        t.mdr_pct,
        t.mdr_fixed,
        t.mdr_amount,
        t.tax_amount,
        t.total_charges,
        t.customer_payable,
        t.retailer_credit,
        t.company_mdr_liability,
        t.currency,
        t.mdr_treatment,
        t.customer_payable_policy,
        t.txn_status,
        t.provider_status,
        t.provider_resp_code,
        t.provider_resp_msg,
        t.callback_status,
        t.idempotency_key,
        t.failure_reason,
        t.ledger_txn_id,
        t.initiated_at,
        t.completed_at,
        t.created_at,
        t.updated_at
    FROM public.payin_transactions t
    JOIN public.company c ON t.company_ref_id = c.company_ref_id
    LEFT JOIN public.retailer r ON t.retailer_ref_id = r.retailer_ref_id
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    WHERE (t.tid = :tid OR t.merchant_ref_id = :tid OR t.provider_ref_id = :tid)
    LIMIT 1;
    """)

    res = await db.execute(stmt, {"tid": tid.strip()})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"PayIn transaction '{tid}' not found.")

    d = dict(row._mapping)

    # Ownership check
    if not auth_ctx["is_super_admin"] and effective_comp is not None:
        if d.get("company_ref_id") != effective_comp:
            raise HTTPException(status_code=403, detail="Cross-company access is prohibited.")

    if not auth_ctx["is_admin"] and effective_retailer is not None:
        if d.get("retailer_ref_id") != effective_retailer:
            raise HTTPException(status_code=403, detail="Access denied for this transaction.")

    gw_label = map_gateway_label(d.get("payin_vendor_ref_id"), d.get("vendor_code"))
    created_dt = d.get("created_at") or d.get("initiated_at")
    completed_dt = d.get("completed_at") or d.get("updated_at")

    return {
        "success": True,
        "data": {
            "id": str(d.get("payin_transactions_ref_id")),
            "tid": d.get("tid"),
            "transaction_id": d.get("tid"),
            "reference_id": d.get("merchant_ref_id") or d.get("provider_ref_id") or d.get("tid"),
            "merchant_ref_id": d.get("merchant_ref_id"),
            "provider_ref_id": d.get("provider_ref_id"),
            "company_name": d.get("company_name"),
            "company_code": d.get("company_code"),
            "retailer_code": d.get("retailer_code") or str(d.get("retailer_ref_id")),
            "retailer_name": d.get("retailer_name"),
            "customer_name": d.get("cust_name"),
            "customer_mobile": d.get("cust_mobile"),
            "customer_email": d.get("cust_email"),
            "gateway": gw_label,
            "vendor_name": gw_label,  # Customer-facing labels G-1 / G-2 only
            "payment_mode": d.get("payment_mode") or "UPI",
            "payment_mode_name": d.get("payment_mode_name") or "UPI",
            "card_network": d.get("card_network"),
            "amount": float(d.get("txn_amount") or 0.0),
            "txn_amount": float(d.get("txn_amount") or 0.0),
            "mdr_pct": float(d.get("mdr_pct") or 0.0),
            "mdr_fixed": float(d.get("mdr_fixed") or 0.0),
            "mdr_amount": float(d.get("mdr_amount") or 0.0),
            "gst": float(d.get("tax_amount") or 0.0),
            "tax_amount": float(d.get("tax_amount") or 0.0),
            "total_charges": float(d.get("total_charges") or 0.0),
            "total_amount": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "customer_payable": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "retailer_credit": float(d.get("retailer_credit") or d.get("txn_amount") or 0.0),
            "status": (d.get("txn_status") or "SUCCESS").upper(),
            "provider_status": d.get("provider_status"),
            "provider_resp_code": d.get("provider_resp_code"),
            "provider_resp_msg": d.get("provider_resp_msg"),
            "failure_reason": d.get("failure_reason"),
            "ledger_txn_id": d.get("ledger_txn_id"),
            "idempotency_key": d.get("idempotency_key"),
            "currency": d.get("currency") or "INR",
            "mdr_treatment": d.get("mdr_treatment"),
            "customer_payable_policy": d.get("customer_payable_policy"),
            "created_at": created_dt.isoformat() if created_dt else None,
            "initiated_at": created_dt.isoformat() if created_dt else None,
            "completed_at": completed_dt.isoformat() if completed_dt else None,
            "updated_at": completed_dt.isoformat() if completed_dt else None,
        }
    }


@router.get("/export", summary="Export PayIn Report as CSV")
async def export_payin_report(
    request: Request,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    company_ref_id: Optional[int] = Query(None),
    retailer_ref_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Streams filtered PayIn report CSV adhering to strict column specifications.
    """
    auth_ctx = resolve_payin_auth_context(request)
    company_ref_val = clean_int(company_ref_id)
    retailer_ref_val = clean_int(retailer_ref_id)
    status_str = clean_str(status)
    gateway_str = clean_str(gateway)
    payment_mode_str = clean_str(payment_mode)
    search_str = clean_str(search)

    effective_comp = auth_ctx["company_ref_id"]
    if auth_ctx["is_super_admin"] and company_ref_val is not None:
        effective_comp = company_ref_val

    effective_retailer = auth_ctx["retailer_ref_id"]
    if auth_ctx["is_admin"] and retailer_ref_val is not None:
        effective_retailer = retailer_ref_val

    start_dt, end_dt = parse_date_range(from_date, to_date)

    base_where = "WHERE t.created_at >= :start_dt AND t.created_at <= :end_dt"
    params: Dict[str, Any] = {"start_dt": start_dt, "end_dt": end_dt}

    if effective_comp is not None:
        base_where += " AND t.company_ref_id = :comp_ref"
        params["comp_ref"] = effective_comp

    if effective_retailer is not None:
        base_where += " AND t.retailer_ref_id = :ret_ref"
        params["ret_ref"] = effective_retailer

    if status_str and status_str.upper() != "ALL":
        st = status_str.upper()
        if st == "SUCCESS":
            base_where += " AND UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED')"
        elif st == "PENDING":
            base_where += " AND UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING')"
        elif st == "FAILED":
            base_where += " AND UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT')"
        elif st == "REVERSED":
            base_where += " AND UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED')"
        else:
            base_where += " AND UPPER(t.txn_status) = :st"
            params["st"] = st

    if gateway_str and gateway_str.upper() != "ALL":
        gw = gateway_str.upper()
        if gw == "G-1":
            base_where += " AND t.payin_vendor_ref_id = 1"
        elif gw == "G-2":
            base_where += " AND t.payin_vendor_ref_id = 2"
        else:
            base_where += " AND (v.vendor_code ILIKE :gw OR v.vendor_name ILIKE :gw)"
            params["gw"] = f"%{gw}%"

    if payment_mode_str and payment_mode_str.upper() != "ALL":
        pm = payment_mode_str.upper()
        base_where += " AND (p.pay_mode_code ILIKE :pm OR p.pay_mode_name ILIKE :pm)"
        params["pm"] = f"%{pm}%"

    if search_str:
        s = f"%{search_str}%"
        base_where += """ AND (
            t.tid ILIKE :s OR
            t.merchant_ref_id ILIKE :s OR
            t.provider_ref_id ILIKE :s OR
            t.cust_mobile ILIKE :s OR
            t.cust_name ILIKE :s
        )"""
        params["s"] = s

    sql = f"""
    SELECT
        t.payin_transactions_ref_id,
        t.tid,
        t.merchant_ref_id,
        t.provider_ref_id,
        c.company_name,
        r.retailer_code,
        COALESCE(r.outlet_name, r.agent_name, t.cust_name) AS retailer_name,
        t.payin_vendor_ref_id,
        v.vendor_code,
        COALESCE(p.pay_mode_code, 'UPI') AS payment_mode,
        t.txn_amount,
        t.mdr_amount,
        t.tax_amount,
        t.total_charges,
        t.customer_payable,
        t.retailer_credit,
        t.txn_status,
        t.created_at,
        t.completed_at
    FROM public.payin_transactions t
    JOIN public.company c ON t.company_ref_id = c.company_ref_id
    LEFT JOIN public.retailer r ON t.retailer_ref_id = r.retailer_ref_id
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    {base_where}
    ORDER BY t.created_at DESC
    LIMIT 5000;
    """

    res = await db.execute(text(sql), params)
    rows = res.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "S.No",
        "Transaction ID",
        "Reference / Order ID",
        "Retailer ID / Outlet",
        "Company",
        "Gateway",
        "Payment Method",
        "Transaction Amount (INR)",
        "Charges (INR)",
        "GST (INR)",
        "Total Amount (INR)",
        "Wallet Credit (INR)",
        "Status",
        "Date & Time"
    ])

    for idx, r in enumerate(rows):
        d = dict(r._mapping)
        gw_label = map_gateway_label(d.get("payin_vendor_ref_id"), d.get("vendor_code"))
        created_dt = d.get("created_at")
        dt_str = created_dt.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S") if created_dt else "--"
        ref_id = d.get("merchant_ref_id") or d.get("provider_ref_id") or d.get("tid")

        writer.writerow([
            idx + 1,
            d.get("tid") or "--",
            ref_id or "--",
            d.get("retailer_name") or d.get("retailer_code") or "--",
            d.get("company_name") or "SMSPAY",
            gw_label,
            d.get("payment_mode") or "UPI",
            f"{money(d.get('txn_amount')):.2f}",
            f"{money(d.get('total_charges')):.2f}",
            f"{money(d.get('tax_amount')):.2f}",
            f"{money(d.get('customer_payable')):.2f}",
            f"{money(d.get('retailer_credit')):.2f}",
            (d.get("txn_status") or "SUCCESS").upper(),
            dt_str
        ])

    csv_data = output.getvalue()
    today_str = datetime.now(IST).strftime("%Y%m%d_%H%M%S")
    filename = f"PayIn_Transaction_Report_{today_str}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )
