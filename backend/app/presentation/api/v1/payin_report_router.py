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
from app.core.security import decode_access_token, GlobalReceiptSecurity
from app.core.company_resolver import resolve_request_company_ref, resolve_receipt_base_url
from app.application.payment_method_normalizer import PaymentMethodNormalizer
from app.application.user_type_service import UserTypeService

router = APIRouter(prefix="/reports", tags=["PayIn Report"])

IST = timezone(timedelta(hours=5, minutes=30))


def money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")


MONTH_MAP = {
    "1": 1, "01": 1, "jan": 1, "january": 1,
    "2": 2, "02": 2, "feb": 2, "february": 2,
    "3": 3, "03": 3, "mar": 3, "march": 3,
    "4": 4, "04": 4, "apr": 4, "april": 4,
    "5": 5, "05": 5, "may": 5,
    "6": 6, "06": 6, "jun": 6, "june": 6,
    "7": 7, "07": 7, "jul": 7, "july": 7,
    "8": 8, "08": 8, "aug": 8, "august": 8,
    "9": 9, "09": 9, "sep": 9, "september": 9,
    "10": 10, "oct": 10, "october": 10,
    "11": 11, "nov": 11, "november": 11,
    "12": 12, "dec": 12, "december": 12,
}


def get_days_in_month(year: int, month: int) -> int:
    if month in (1, 3, 5, 7, 8, 10, 12):
        return 31
    if month in (4, 6, 9, 11):
        return 30
    is_leap = (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0))
    return 29 if is_leap else 28


def parse_date_range(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    month: Optional[str] = None,
    year: Optional[int] = None
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Robust Indian Standard Time (IST) date range parser converting accurately to UTC.
    Supports YYYY-MM-DD, YYYY-MM, DD-MM-YYYY, ISO strings, and month names (e.g. September).
    Never defaults a September query to the current month.
    """
    from_date = clean_str(from_date)
    to_date = clean_str(to_date)
    month = clean_str(month)

    now_ist = datetime.now(IST)
    default_year = year or now_ist.year

    if month and str(month).strip():
        m_str = str(month).strip().lower()
        if m_str in MONTH_MAP:
            m_num = MONTH_MAP[m_str]
            target_year = default_year
            last_day = get_days_in_month(target_year, m_num)
            start_ist = datetime(target_year, m_num, 1, 0, 0, 0, tzinfo=IST)
            end_ist = datetime(target_year, m_num, last_day, 23, 59, 59, 999999, tzinfo=IST)
            return start_ist.astimezone(timezone.utc), end_ist.astimezone(timezone.utc)

    if from_date and len(from_date.strip()) == 7 and from_date.strip().count("-") == 1:
        try:
            parts = from_date.strip().split("-")
            y = int(parts[0])
            m = int(parts[1])
            last_day = get_days_in_month(y, m)
            start_ist = datetime(y, m, 1, 0, 0, 0, tzinfo=IST)
            end_ist = datetime(y, m, last_day, 23, 59, 59, 999999, tzinfo=IST)
            return start_ist.astimezone(timezone.utc), end_ist.astimezone(timezone.utc)
        except Exception:
            pass

    def parse_single_dt(d_str: str, is_end: bool) -> Optional[datetime]:
        d_clean = d_str.strip()
        if "T" in d_clean:
            d_clean = d_clean.split("T")[0]
        for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"]:
            try:
                dt = datetime.strptime(d_clean, fmt)
                if is_end:
                    return dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=IST)
                else:
                    return dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=IST)
            except ValueError:
                continue
        low = d_clean.lower()
        for m_name, m_val in MONTH_MAP.items():
            if m_name.isalpha() and m_name in low:
                y = default_year
                for token in low.split():
                    if token.isdigit() and len(token) == 4:
                        y = int(token)
                last_day = get_days_in_month(y, m_val)
                if is_end:
                    return datetime(y, m_val, last_day, 23, 59, 59, 999999, tzinfo=IST)
                else:
                    return datetime(y, m_val, 1, 0, 0, 0, tzinfo=IST)
        return None

    start_dt = parse_single_dt(from_date, is_end=False) if from_date else None
    end_dt = parse_single_dt(to_date, is_end=True) if to_date else None

    if start_dt and not end_dt:
        if start_dt.month != now_ist.month or start_dt.year != now_ist.year:
            last_day = get_days_in_month(start_dt.year, start_dt.month)
            end_dt = datetime(start_dt.year, start_dt.month, last_day, 23, 59, 59, 999999, tzinfo=IST)

    if end_dt and not start_dt:
        start_dt = datetime(end_dt.year, end_dt.month, 1, 0, 0, 0, tzinfo=IST)

    return (
        start_dt.astimezone(timezone.utc) if start_dt else None,
        end_dt.astimezone(timezone.utc) if end_dt else None
    )


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


async def resolve_payin_auth_context(request: Optional[Request], db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Extracts authenticated company, user type, and user identity context.
    Standardises transaction ownership to:
    1. company_ref_id (BIGINT)
    2. user_type_ref_id (BIGINT)
    3. user_ref_id (BIGINT)
    Prevents cross-tenant / cross-company context leakage.
    Authoritatively resolves user type dynamically from public.user_type master.
    """
    ctx: Dict[str, Any] = {
        "company_ref_id": None,
        "user_type_ref_id": None,
        "user_ref_id": None,
        "user_type_code": "RETAILER",
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

    payload = {}
    sub_str = ""
    if token:
        try:
            payload = decode_access_token(token) or {}
            sub_str = str(payload.get("sub") or "")
            roles = payload.get("roles") or []
            if isinstance(roles, str):
                roles = [roles]
            upper_roles = [str(r).upper() for r in roles]

            ctx["is_super_admin"] = any("SUPER_ADMIN" in r for r in upper_roles)
            ctx["is_admin"] = ctx["is_super_admin"] or any(r in ("ADMIN", "PLATFORM_ADMIN", "OPS_ADMIN", "FINANCE") for r in upper_roles)
            
            raw_comp = payload.get("company_ref_id")
            if raw_comp is not None and str(raw_comp).isdigit():
                ctx["company_ref_id"] = int(raw_comp)

            # Determine user type code and user reference ID
            target_code = "RETAILER"
            user_ref = None
            if ctx["is_admin"]:
                target_code = "ADMIN"
                user_ref = payload.get("admin_user_ref_id") or payload.get("user_ref_id")
            elif any(r in ("SUPER_DISTRIBUTOR", "SD", "MASTER_DISTRIBUTOR") for r in upper_roles):
                target_code = "SD"
                user_ref = payload.get("super_distributor_ref_id") or payload.get("user_ref_id")
            elif any(r in ("DISTRIBUTOR", "DIST") for r in upper_roles):
                target_code = "DISTRIBUTOR"
                user_ref = payload.get("distributor_ref_id") or payload.get("user_ref_id")
            else:
                target_code = "RETAILER"
                user_ref = payload.get("retailer_ref_id") or payload.get("user_ref_id")

            ctx["user_type_code"] = target_code
            if user_ref is not None and str(user_ref).isdigit():
                ctx["user_ref_id"] = int(user_ref)

            raw_ret = payload.get("retailer_ref_id") or payload.get("user_ref_id")
            if raw_ret is not None and str(raw_ret).isdigit():
                ctx["retailer_ref_id"] = int(raw_ret)

            raw_ten = payload.get("tenant_ref_id")
            if raw_ten is not None and str(raw_ten).isdigit():
                ctx["tenant_ref_id"] = int(raw_ten)
        except Exception:
            pass

    # Authoritative domain fallback if company not determined by token
    domain_comp_ref = resolve_request_company_ref(request)
    if domain_comp_ref is not None:
        if ctx["company_ref_id"] is None or not ctx["is_super_admin"]:
            ctx["company_ref_id"] = domain_comp_ref

    # Dynamically resolve user_type_ref_id from public.user_type
    if db:
        try:
            ctx["user_type_ref_id"] = await UserTypeService.get_user_type_ref_id(db, ctx["user_type_code"])
        except Exception:
            pass

    # Authoritative DB Resolution for Retailer if user_ref_id not yet resolved
    if db and not ctx["is_admin"] and ctx["user_ref_id"] is None:
        ret_code_claim = payload.get("retailer_code") or request.headers.get("x-retailer-code") or request.cookies.get("p2p_retailer_code")
        ret_id_claim = payload.get("retailer_id") or request.headers.get("x-retailer-id") or request.cookies.get("p2p_active_retailer_id") or sub_str
        mobile_claim = payload.get("mobile") or request.headers.get("x-mobile") or request.cookies.get("p2p_mobile")

        try:
            ret_q = await db.execute(text("""
                SELECT r.retailer_ref_id, r.public_id, r.tenant_ref_id, r.company_ref_id
                FROM public.retailer r
                LEFT JOIN public.retailer_contact rc ON rc.retailer_id = r.public_id
                LEFT JOIN public.auth_users au ON (au.user_id = r.public_id OR au.mobile_number = rc.mobile)
                LEFT JOIN public.registration_drafts rd ON (rd.mobile_number = rc.mobile OR rd.mobile_number = au.mobile_number)
                WHERE r.public_id::text = CAST(:sub AS VARCHAR) 
                   OR r.retailer_code = CAST(:sub AS VARCHAR)
                   OR au.public_id::text = CAST(:sub AS VARCHAR)
                   OR au.user_id::text = CAST(:sub AS VARCHAR)
                   OR rd.registration_id = CAST(:sub AS VARCHAR)
                   OR (CAST(:ret_code AS VARCHAR) IS NOT NULL AND r.retailer_code = CAST(:ret_code AS VARCHAR))
                   OR (CAST(:ret_id AS VARCHAR) IS NOT NULL AND (r.public_id::text = CAST(:ret_id AS VARCHAR) OR rd.registration_id = CAST(:ret_id AS VARCHAR)))
                   OR (CAST(:mobile AS VARCHAR) IS NOT NULL AND (rc.mobile = CAST(:mobile AS VARCHAR) OR rc.mobile = '91' || CAST(:mobile AS VARCHAR) OR rc.mobile = '+91' || CAST(:mobile AS VARCHAR)))
                ORDER BY (CASE WHEN r.status = 'ACTIVE' THEN 1 ELSE 2 END), r.is_active DESC
                LIMIT 1;
            """), {
                "sub": str(sub_str) if sub_str else "",
                "ret_code": str(ret_code_claim) if ret_code_claim else None,
                "ret_id": str(ret_id_claim) if ret_id_claim else None,
                "mobile": str(mobile_claim) if mobile_claim else None
            })
            ret_row = ret_q.fetchone()

            if not ret_row and ctx.get("company_ref_id"):
                # Single active retailer on domain company
                comp_q = await db.execute(text("""
                    SELECT retailer_ref_id, public_id, tenant_ref_id, company_ref_id
                    FROM public.retailer
                    WHERE company_ref_id = :comp_id AND is_active = TRUE AND status = 'ACTIVE'
                    ORDER BY retailer_ref_id ASC
                """), {"comp_id": int(ctx["company_ref_id"])})
                comp_rows = comp_q.fetchall()
                if len(comp_rows) == 1:
                    ret_row = comp_rows[0]

            if ret_row:
                ctx["retailer_ref_id"] = int(ret_row[0])
                ctx["user_ref_id"] = int(ret_row[0])
                if not ctx.get("tenant_ref_id") and ret_row[2]:
                    ctx["tenant_ref_id"] = int(ret_row[2])
                if not ctx.get("company_ref_id") and ret_row[3]:
                    ctx["company_ref_id"] = int(ret_row[3])
        except Exception as e_ret:
            pass

    return ctx


@router.get("/summary", summary="Get Retailer/Admin PayIn Summary KPIs")
async def get_payin_report_summary(
    request: Request,
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    company_ref_id: Optional[int] = Query(None),
    retailer_ref_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    tid: Optional[str] = Query(None),
    mobile: Optional[str] = Query(None),
    mobile_number: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    portal: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes real-time KPI metrics strictly from public.payin_transactions.
    Never touches Payout tables or applies debit/charges calculations.
    """
    auth_ctx = await resolve_payin_auth_context(request, db)
    company_ref_val = clean_int(company_ref_id)
    retailer_ref_val = clean_int(retailer_ref_id)
    status_str = clean_str(status)
    gateway_str = clean_str(gateway)
    payment_mode_str = clean_str(payment_mode)
    tid_str = clean_str(tid)
    mobile_str = clean_str(mobile) or clean_str(mobile_number)
    search_str = clean_str(search)

    effective_comp = auth_ctx["company_ref_id"]
    if auth_ctx["is_super_admin"] and company_ref_val is not None:
        effective_comp = company_ref_val

    effective_retailer = auth_ctx["retailer_ref_id"]
    if auth_ctx["is_admin"] and retailer_ref_val is not None:
        effective_retailer = retailer_ref_val

    start_dt, end_dt = parse_date_range(from_date, to_date, month=month)

    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}

    if start_dt is not None:
        where_clauses.append("t.created_at >= :start_dt")
        params["start_dt"] = start_dt

    if end_dt is not None:
        where_clauses.append("t.created_at <= :end_dt")
        params["end_dt"] = end_dt

    if effective_comp is not None:
        where_clauses.append("t.company_ref_id = :comp_ref")
        params["comp_ref"] = effective_comp

    if not auth_ctx["is_admin"]:
        eff_user = auth_ctx.get("user_ref_id") or auth_ctx.get("retailer_ref_id")
        eff_user_type = auth_ctx.get("user_type_ref_id")
        if eff_user is not None:
            if eff_user_type is not None:
                where_clauses.append("((t.user_ref_id = :eff_user_ref AND t.user_type_ref_id = :eff_user_type_ref) OR (t.retailer_ref_id = :eff_user_ref))")
                params["eff_user_ref"] = eff_user
                params["eff_user_type_ref"] = eff_user_type
            else:
                where_clauses.append("(t.user_ref_id = :eff_user_ref OR t.retailer_ref_id = :eff_user_ref)")
                params["eff_user_ref"] = eff_user
    else:
        if effective_retailer is not None:
            where_clauses.append("(t.user_ref_id = :ret_ref OR t.retailer_ref_id = :ret_ref)")
            params["ret_ref"] = effective_retailer

    if tid_str:
        where_clauses.append("t.tid ILIKE :tid_val")
        params["tid_val"] = f"%{tid_str}%"

    if mobile_str:
        mob_clean = mobile_str[-10:] if len(mobile_str) >= 10 else mobile_str
        where_clauses.append("t.cust_mobile ILIKE :mob_val")
        params["mob_val"] = f"%{mob_clean}%"

    if status_str and status_str.upper() != "ALL":
        st = status_str.upper()
        if st in ("SUCCESS", "COMPLETED", "SETTLED"):
            where_clauses.append("UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED')")
        elif st in ("PENDING", "INITIATED", "PROCESSING"):
            where_clauses.append("UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING')")
        elif st in ("FAILED", "REJECTED", "TIMEOUT", "FAILURE"):
            where_clauses.append("UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'FAILURE')")
        elif st in ("REVERSED", "REFUNDED"):
            where_clauses.append("UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED')")
        else:
            where_clauses.append("UPPER(t.txn_status) = :st")
            params["st"] = st

    if gateway_str and gateway_str.upper() != "ALL":
        gw = gateway_str.upper()
        if gw == "G-1":
            where_clauses.append("(t.payin_vendor_ref_id = 1 OR v.vendor_code ILIKE '%BANKME%')")
        elif gw == "G-2":
            where_clauses.append("(t.payin_vendor_ref_id = 2 OR v.vendor_code ILIKE '%EASEBUZZ%')")
        else:
            where_clauses.append("(v.vendor_code ILIKE :gw OR v.vendor_name ILIKE :gw)")
            params["gw"] = f"%{gw}%"

    if payment_mode_str and payment_mode_str.upper() != "ALL":
        pm = payment_mode_str.upper()
        if pm in ("UPI", "QR"):
            where_clauses.append("(t.card_network = 'UPI' OR p.pay_mode_code IN ('UPI', 'UPI_INTENT', 'QR'))")
        elif pm in ("CARD", "CREDIT_CARD", "DEBIT_CARD"):
            where_clauses.append("(t.card_network IN ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'CORP') OR p.pay_mode_code IN ('CREDIT_CARD', 'DEBIT_CARD'))")
        elif pm in ("VISA", "MASTERCARD", "RUPAY", "AMEX", "CORP"):
            where_clauses.append("t.card_network = :pm")
            params["pm"] = pm
        elif pm in ("NETBANKING", "NET_BANKING", "NB"):
            where_clauses.append("p.pay_mode_code IN ('NET_BANKING', 'NETBANKING')")
        elif pm == "WALLET":
            where_clauses.append("p.pay_mode_code = 'WALLET'")
        else:
            where_clauses.append("(t.card_network ILIKE :pm OR p.pay_mode_code ILIKE :pm OR p.pay_mode_name ILIKE :pm)")
            params["pm"] = f"%{pm}%"

    if search_str:
        s = f"%{search_str}%"
        where_clauses.append("""(
            t.tid ILIKE :s OR
            t.merchant_ref_id ILIKE :s OR
            t.provider_ref_id ILIKE :s OR
            t.cust_mobile ILIKE :s OR
            t.cust_name ILIKE :s
        )""")
        params["s"] = s

    base_where = "WHERE " + " AND ".join(where_clauses)

    sql = f"""
    SELECT
        COUNT(t.payin_transactions_ref_id) AS total_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.txn_amount ELSE 0.0 END), 0.0) AS total_volume,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.customer_payable ELSE 0.0 END), 0.0) AS total_customer_payable,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.retailer_credit ELSE 0.0 END), 0.0) AS total_retailer_credit,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.total_charges ELSE 0.0 END), 0.0) AS total_charges,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.mdr_amount ELSE 0.0 END), 0.0) AS total_mdr,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.tax_amount ELSE 0.0 END), 0.0) AS total_gst,
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
    {base_where}
    """

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
    month: Optional[str] = Query(None),
    company_ref_id: Optional[int] = Query(None),
    retailer_ref_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    tid: Optional[str] = Query(None),
    mobile: Optional[str] = Query(None),
    mobile_number: Optional[str] = Query(None),
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
    auth_ctx = await resolve_payin_auth_context(request, db)
    company_ref_val = clean_int(company_ref_id)
    retailer_ref_val = clean_int(retailer_ref_id)
    status_str = clean_str(status)
    gateway_str = clean_str(gateway)
    payment_mode_str = clean_str(payment_mode)
    tid_str = clean_str(tid)
    mobile_str = clean_str(mobile) or clean_str(mobile_number)
    search_str = clean_str(search)

    effective_comp = auth_ctx["company_ref_id"]
    if auth_ctx["is_super_admin"] and company_ref_val is not None:
        effective_comp = company_ref_val

    effective_retailer = auth_ctx["retailer_ref_id"]
    if auth_ctx["is_admin"] and retailer_ref_val is not None:
        effective_retailer = retailer_ref_val

    start_dt, end_dt = parse_date_range(from_date, to_date, month=month)
    p_num = clean_int(page) or 1
    l_num = clean_int(limit) or 10
    offset = (p_num - 1) * l_num

    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}

    if start_dt is not None:
        where_clauses.append("t.created_at >= :start_dt")
        params["start_dt"] = start_dt

    if end_dt is not None:
        where_clauses.append("t.created_at <= :end_dt")
        params["end_dt"] = end_dt

    if effective_comp is not None:
        where_clauses.append("t.company_ref_id = :comp_ref")
        params["comp_ref"] = effective_comp

    if not auth_ctx["is_admin"]:
        eff_user = auth_ctx.get("user_ref_id") or auth_ctx.get("retailer_ref_id")
        eff_user_type = auth_ctx.get("user_type_ref_id")
        if eff_user is not None:
            if eff_user_type is not None:
                where_clauses.append("((t.user_ref_id = :eff_user_ref AND t.user_type_ref_id = :eff_user_type_ref) OR (t.retailer_ref_id = :eff_user_ref))")
                params["eff_user_ref"] = eff_user
                params["eff_user_type_ref"] = eff_user_type
            else:
                where_clauses.append("(t.user_ref_id = :eff_user_ref OR t.retailer_ref_id = :eff_user_ref)")
                params["eff_user_ref"] = eff_user
    else:
        if effective_retailer is not None:
            where_clauses.append("(t.user_ref_id = :ret_ref OR t.retailer_ref_id = :ret_ref)")
            params["ret_ref"] = effective_retailer

    if tid_str:
        where_clauses.append("t.tid ILIKE :tid_val")
        params["tid_val"] = f"%{tid_str}%"

    if mobile_str:
        mob_clean = mobile_str[-10:] if len(mobile_str) >= 10 else mobile_str
        where_clauses.append("t.cust_mobile ILIKE :mob_val")
        params["mob_val"] = f"%{mob_clean}%"

    if status_str and status_str.upper() != "ALL":
        st = status_str.upper()
        if st in ("SUCCESS", "COMPLETED", "SETTLED"):
            where_clauses.append("UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED')")
        elif st in ("PENDING", "INITIATED", "PROCESSING"):
            where_clauses.append("UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING')")
        elif st in ("FAILED", "REJECTED", "TIMEOUT", "FAILURE"):
            where_clauses.append("UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'FAILURE')")
        elif st in ("REVERSED", "REFUNDED"):
            where_clauses.append("UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED')")
        else:
            where_clauses.append("UPPER(t.txn_status) = :st")
            params["st"] = st

    if gateway_str and gateway_str.upper() != "ALL":
        gw = gateway_str.upper()
        if gw == "G-1":
            where_clauses.append("(t.payin_vendor_ref_id = 1 OR v.vendor_code ILIKE '%BANKME%')")
        elif gw == "G-2":
            where_clauses.append("(t.payin_vendor_ref_id = 2 OR v.vendor_code ILIKE '%EASEBUZZ%')")
        else:
            where_clauses.append("(v.vendor_code ILIKE :gw OR v.vendor_name ILIKE :gw)")
            params["gw"] = f"%{gw}%"

    if payment_mode_str and payment_mode_str.upper() != "ALL":
        pm = payment_mode_str.upper()
        if pm in ("UPI", "QR"):
            where_clauses.append("(t.card_network = 'UPI' OR p.pay_mode_code IN ('UPI', 'UPI_INTENT', 'QR'))")
        elif pm in ("CARD", "CREDIT_CARD", "DEBIT_CARD"):
            where_clauses.append("(t.card_network IN ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'CORP') OR p.pay_mode_code IN ('CREDIT_CARD', 'DEBIT_CARD'))")
        elif pm in ("VISA", "MASTERCARD", "RUPAY", "AMEX", "CORP"):
            where_clauses.append("t.card_network = :pm")
            params["pm"] = pm
        elif pm in ("NETBANKING", "NET_BANKING", "NB"):
            where_clauses.append("p.pay_mode_code IN ('NET_BANKING', 'NETBANKING')")
        elif pm == "WALLET":
            where_clauses.append("p.pay_mode_code = 'WALLET'")
        else:
            where_clauses.append("(t.card_network ILIKE :pm OR p.pay_mode_code ILIKE :pm OR p.pay_mode_name ILIKE :pm)")
            params["pm"] = f"%{pm}%"

    if search_str:
        s = f"%{search_str}%"
        where_clauses.append("""(
            t.tid ILIKE :s OR
            t.merchant_ref_id ILIKE :s OR
            t.provider_ref_id ILIKE :s OR
            t.cust_mobile ILIKE :s OR
            t.cust_name ILIKE :s
        )""")
        params["s"] = s

    base_where = "WHERE " + " AND ".join(where_clauses)

    # 1. Total records, summary KPIs & footer totals count
    count_sql = f"""
    SELECT
        COUNT(t.payin_transactions_ref_id) AS total_count,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.txn_amount ELSE 0.0 END), 0.0) AS total_amount,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.total_charges ELSE 0.0 END), 0.0) AS total_charges,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.tax_amount ELSE 0.0 END), 0.0) AS total_gst,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.customer_payable ELSE 0.0 END), 0.0) AS total_customer_payable,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.retailer_credit ELSE 0.0 END), 0.0) AS total_retailer_credit,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN 1 END) AS successful_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.txn_amount ELSE 0.0 END), 0.0) AS successful_amount,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.retailer_credit ELSE 0.0 END), 0.0) AS successful_credit,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING') THEN 1 END) AS pending_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING') THEN t.txn_amount ELSE 0.0 END), 0.0) AS pending_amount,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT') THEN 1 END) AS failed_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT') THEN t.txn_amount ELSE 0.0 END), 0.0) AS failed_amount,
        COUNT(CASE WHEN UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED') THEN 1 END) AS reversed_transactions,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED') THEN t.txn_amount ELSE 0.0 END), 0.0) AS reversed_amount,
        COALESCE(SUM(CASE WHEN UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED') THEN t.mdr_amount ELSE 0.0 END), 0.0) AS total_mdr
    FROM public.payin_transactions t
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    {base_where}
    """
    count_res = await db.execute(text(count_sql), params)
    count_row = count_res.fetchone()

    rd = dict(count_row._mapping) if hasattr(count_row, "_mapping") else {}
    if rd:
        total_records = int(rd.get("total_count") or 0)
        total_amount = float(rd.get("total_amount") or 0.0)
        total_charges = float(rd.get("total_charges") or 0.0)
        total_gst = float(rd.get("total_gst") or 0.0)
        total_cust_payable = float(rd.get("total_customer_payable") or 0.0)
        total_ret_credit = float(rd.get("total_retailer_credit") or 0.0)
        succ_txns = int(rd.get("successful_transactions") or 0)
        succ_rate = round((succ_txns / total_records * 100), 1) if total_records > 0 else 0.0
    elif count_row:
        total_records = int(count_row[0] or 0)
        total_amount = float(count_row[1] or 0.0)
        total_charges = float(count_row[2] or 0.0)
        total_gst = float(count_row[3] or 0.0)
        total_cust_payable = float(count_row[4] or 0.0)
        total_ret_credit = float(count_row[5] or 0.0)
        succ_txns = int(count_row[6]) if len(count_row) > 6 else (total_records if total_records > 0 else 0)
        succ_rate = 100.0 if total_records > 0 else 0.0
    else:
        total_records = total_amount = total_charges = total_gst = total_cust_payable = total_ret_credit = 0.0
        succ_txns = 0
        succ_rate = 0.0

    summary_data = {
        "total_transactions": total_records,
        "total_volume": total_amount,
        "total_customer_payable": total_cust_payable,
        "total_retailer_credit": total_ret_credit,
        "total_charges": total_charges,
        "total_mdr": float(rd.get("total_mdr") or 0.0),
        "total_gst": total_gst,
        "successful_transactions": succ_txns,
        "successful_amount": float(rd.get("successful_amount") or (total_amount if succ_txns > 0 else 0.0)),
        "successful_credit": float(rd.get("successful_credit") or (total_ret_credit if succ_txns > 0 else 0.0)),
        "pending_transactions": int(rd.get("pending_transactions") or 0),
        "pending_amount": float(rd.get("pending_amount") or 0.0),
        "failed_transactions": int(rd.get("failed_transactions") or 0),
        "failed_amount": float(rd.get("failed_amount") or 0.0),
        "reversed_transactions": int(rd.get("reversed_transactions") or 0),
        "reversed_amount": float(rd.get("reversed_amount") or 0.0),
        "success_rate": succ_rate,
        "date_range": {
            "from": from_date or "--",
            "to": to_date or "--"
        }
    }

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
    sort_col_key = clean_str(sort_by) or "created_at"
    sort_dir_key = clean_str(sort_dir) or "desc"
    sort_column = allowed_sort_fields.get(sort_col_key, "t.created_at")
    sort_direction = "ASC" if sort_dir_key.lower() == "asc" else "DESC"

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
        t.user_type_ref_id,
        t.user_ref_id,
        ut.user_type_name,
        ut.user_type_code,
        t.retailer_ref_id,
        r.retailer_code,
        COALESCE(r.store_name, r.legal_name, r.owner_name, t.cust_name, 'Retailer') AS retailer_name,
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
        t.receipt_short_code,
        t.initiated_at,
        t.completed_at,
        t.created_at,
        t.updated_at
    FROM public.payin_transactions t
    JOIN public.company c ON t.company_ref_id = c.company_ref_id
    LEFT JOIN public.user_type ut ON t.user_type_ref_id = ut.user_type_ref_id
    LEFT JOIN public.retailer r ON t.retailer_ref_id = r.retailer_ref_id
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    {base_where}
    ORDER BY {sort_column} {sort_direction}
    LIMIT :limit OFFSET :offset
    """
    params["limit"] = l_num
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

        short_code = d.get("receipt_short_code")
        receipt_base = resolve_receipt_base_url(d.get("company_ref_id"), request)
        if short_code:
            receipt_subdomain_url = f"{receipt_base}/r/{short_code}"
            receipt_tok = short_code
        else:
            receipt_tok = GlobalReceiptSecurity.encrypt_receipt_token({
                "tid": d.get("tid"),
                "company_ref_id": d.get("company_ref_id"),
                "status": (d.get("txn_status") or "SUCCESS").upper(),
                "orderId": d.get("merchant_ref_id") or d.get("tid"),
                "utr": d.get("provider_ref_id"),
                "ts": int(datetime.now(timezone.utc).timestamp())
            })
            receipt_subdomain_url = f"{receipt_base}/r/{receipt_tok}"

        clean_method = PaymentMethodNormalizer.get_clean_method_display(
            card_network=d.get("card_network"),
            pay_mode_code=d.get("payment_mode")
        )

        items.append({
            "s_no": s_no,
            "id": str(d.get("payin_transactions_ref_id")),
            "tid": d.get("tid"),
            "transaction_id": d.get("tid"),
            "reference_id": d.get("merchant_ref_id") or d.get("provider_ref_id") or d.get("tid"),
            "merchant_ref_id": d.get("merchant_ref_id"),
            "provider_ref_id": d.get("provider_ref_id"),
            "company_ref_id": d.get("company_ref_id"),
            "user_type_ref_id": d.get("user_type_ref_id"),
            "user_ref_id": d.get("user_ref_id") or d.get("retailer_ref_id"),
            "user_type_name": d.get("user_type_name") or "Retailer",
            "user_type_code": d.get("user_type_code") or "RETAILER",
            "retailer_ref_id": d.get("retailer_ref_id"),
            "retailer_id": d.get("retailer_code") or str(d.get("retailer_ref_id") or d.get("user_ref_id")),
            "retailer_name": d.get("retailer_name") or "Retailer Partner",
            "company_id": str(d.get("company_ref_id")),
            "company_name": d.get("company_name") or "SMSPAY",
            "company_code": d.get("company_code") or "SMSPAY",
            "gateway": gw_label,
            "vendor_name": gw_label,  # Customer-facing labels G-1 / G-2 only
            "payment_mode": clean_method,
            "payment_mode_name": clean_method,
            "card_network": d.get("card_network"),
            "customer_name": d.get("cust_name"),
            "customer_mobile": d.get("cust_mobile"),
            "mobile_no": d.get("cust_mobile"),
            "amount": float(d.get("txn_amount") or 0.0),
            "txn_amount": float(d.get("txn_amount") or 0.0),
            "charges": float(d.get("total_charges") or 0.0),
            "mdr_amount": float(d.get("mdr_amount") or 0.0),
            "gst": float(d.get("tax_amount") or 0.0),
            "tax_amount": float(d.get("tax_amount") or 0.0),
            "total_charges": float(d.get("total_charges") or 0.0),
            "total_amount": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "customer_payable": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "wallet_credit": float(d.get("retailer_credit") or d.get("txn_amount") or 0.0),
            "retailer_credit": float(d.get("retailer_credit") or d.get("txn_amount") or 0.0),
            "method": clean_method,
            "status": (d.get("txn_status") or "SUCCESS").upper(),
            "provider_status": d.get("provider_status"),
            "ledger_txn_id": d.get("ledger_txn_id"),
            "failure_reason": d.get("failure_reason"),
            "date": date_str,
            "time": time_str,
            "date_time": f"{date_str} {time_str}",
            "short_code": short_code or receipt_tok,
            "short_url": receipt_subdomain_url,
            "receipt_token": receipt_tok,
            "receipt_url": receipt_subdomain_url,
            "created_at": iso_str,
            "initiated_at": iso_str,
            "updated_at": updated_iso,
            "completed_at": updated_iso,
        })

    total_pages = max(1, (total_records + l_num - 1) // l_num)

    return {
        "success": True,
        "items": items,
        "data": {
            "items": items,
            "pagination": {
                "page": p_num,
                "limit": l_num,
                "total_records": total_records,
                "total_pages": total_pages
            },
            "summary": summary_data
        },
        "summary": summary_data,
        "pagination": {
            "page": p_num,
            "limit": l_num,
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
    auth_ctx = await resolve_payin_auth_context(request, db)
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
        t.user_type_ref_id,
        t.user_ref_id,
        ut.user_type_name,
        ut.user_type_code,
        t.retailer_ref_id,
        r.retailer_code,
        COALESCE(r.store_name, r.legal_name, r.owner_name, t.cust_name, 'Retailer') AS retailer_name,
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
        t.receipt_short_code,
        t.initiated_at,
        t.completed_at,
        t.created_at,
        t.updated_at
    FROM public.payin_transactions t
    JOIN public.company c ON t.company_ref_id = c.company_ref_id
    LEFT JOIN public.user_type ut ON t.user_type_ref_id = ut.user_type_ref_id
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

    if not auth_ctx["is_admin"]:
        eff_user = auth_ctx.get("user_ref_id") or auth_ctx.get("retailer_ref_id")
        eff_user_type = auth_ctx.get("user_type_ref_id")
        if eff_user is not None:
            user_matches = (
                (d.get("user_ref_id") == eff_user and (eff_user_type is None or d.get("user_type_ref_id") == eff_user_type))
                or (d.get("retailer_ref_id") == eff_user)
            )
            if not user_matches:
                raise HTTPException(status_code=403, detail="Access denied for this transaction.")

    gw_label = map_gateway_label(d.get("payin_vendor_ref_id"), d.get("vendor_code"))
    created_dt = d.get("created_at") or d.get("initiated_at")
    completed_dt = d.get("completed_at") or d.get("updated_at")

    short_code = d.get("receipt_short_code")
    detail_receipt_base = resolve_receipt_base_url(d.get("company_ref_id"), request)
    if short_code:
        detail_receipt_url = f"{detail_receipt_base}/r/{short_code}"
        detail_receipt_tok = short_code
    else:
        detail_receipt_tok = GlobalReceiptSecurity.encrypt_receipt_token({
            "tid": d.get("tid"),
            "company_ref_id": d.get("company_ref_id"),
            "status": (d.get("txn_status") or "SUCCESS").upper(),
            "orderId": d.get("merchant_ref_id") or d.get("tid"),
            "utr": d.get("provider_ref_id"),
            "ts": int(datetime.now(timezone.utc).timestamp())
        })
        detail_receipt_url = f"{detail_receipt_base}/r/{detail_receipt_tok}"

    return {
        "success": True,
        "data": {
            "id": str(d.get("payin_transactions_ref_id")),
            "tid": d.get("tid"),
            "transaction_id": d.get("tid"),
            "company_ref_id": d.get("company_ref_id"),
            "user_type_ref_id": d.get("user_type_ref_id"),
            "user_ref_id": d.get("user_ref_id") or d.get("retailer_ref_id"),
            "user_type_name": d.get("user_type_name") or "Retailer",
            "user_type_code": d.get("user_type_code") or "RETAILER",
            "reference_id": d.get("merchant_ref_id") or d.get("provider_ref_id") or d.get("tid"),
            "merchant_ref_id": d.get("merchant_ref_id"),
            "provider_ref_id": d.get("provider_ref_id"),
            "company_name": d.get("company_name"),
            "company_code": d.get("company_code"),
            "retailer_code": d.get("retailer_code") or str(d.get("retailer_ref_id")),
            "retailer_name": d.get("retailer_name"),
            "customer_name": d.get("cust_name"),
            "customer_mobile": d.get("cust_mobile"),
            "mobile_no": d.get("cust_mobile"),
            "customer_email": d.get("cust_email"),
            "gateway": gw_label,
            "vendor_name": gw_label,  # Customer-facing labels G-1 / G-2 only
            "payment_mode": d.get("payment_mode") or "UPI",
            "payment_mode_name": d.get("payment_mode_name") or "UPI",
            "method": d.get("payment_mode") or "UPI",
            "card_network": d.get("card_network"),
            "amount": float(d.get("txn_amount") or 0.0),
            "txn_amount": float(d.get("txn_amount") or 0.0),
            "charges": float(d.get("total_charges") or 0.0),
            "mdr_pct": float(d.get("mdr_pct") or 0.0),
            "mdr_fixed": float(d.get("mdr_fixed") or 0.0),
            "mdr_amount": float(d.get("mdr_amount") or 0.0),
            "gst": float(d.get("tax_amount") or 0.0),
            "tax_amount": float(d.get("tax_amount") or 0.0),
            "total_charges": float(d.get("total_charges") or 0.0),
            "total_amount": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "customer_payable": float(d.get("customer_payable") or (float(d.get("txn_amount") or 0.0) + float(d.get("total_charges") or 0.0))),
            "wallet_credit": float(d.get("retailer_credit") or d.get("txn_amount") or 0.0),
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
            "date_time": created_dt.astimezone(IST).strftime("%d %b %Y %I:%M %p") if created_dt else "--",
            "short_code": short_code or detail_receipt_tok,
            "short_url": detail_receipt_url,
            "receipt_token": detail_receipt_tok,
            "receipt_url": detail_receipt_url,
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
    month: Optional[str] = Query(None),
    company_ref_id: Optional[int] = Query(None),
    retailer_ref_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    payment_mode: Optional[str] = Query(None),
    tid: Optional[str] = Query(None),
    mobile: Optional[str] = Query(None),
    mobile_number: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    portal: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Streams filtered PayIn report CSV adhering to strict column specifications.
    """
    auth_ctx = await resolve_payin_auth_context(request, db)
    company_ref_val = clean_int(company_ref_id)
    retailer_ref_val = clean_int(retailer_ref_id)
    status_str = clean_str(status)
    gateway_str = clean_str(gateway)
    payment_mode_str = clean_str(payment_mode)
    tid_str = clean_str(tid)
    mobile_str = clean_str(mobile) or clean_str(mobile_number)
    search_str = clean_str(search)

    effective_comp = auth_ctx["company_ref_id"]
    if auth_ctx["is_super_admin"] and company_ref_val is not None:
        effective_comp = company_ref_val

    effective_retailer = auth_ctx["retailer_ref_id"]
    if auth_ctx["is_admin"] and retailer_ref_val is not None:
        effective_retailer = retailer_ref_val

    start_dt, end_dt = parse_date_range(from_date, to_date, month=month)

    where_clauses = ["1=1"]
    params: Dict[str, Any] = {}

    if start_dt is not None:
        where_clauses.append("t.created_at >= :start_dt")
        params["start_dt"] = start_dt

    if end_dt is not None:
        where_clauses.append("t.created_at <= :end_dt")
        params["end_dt"] = end_dt

    if effective_comp is not None:
        where_clauses.append("t.company_ref_id = :comp_ref")
        params["comp_ref"] = effective_comp

    if not auth_ctx["is_admin"]:
        eff_user = auth_ctx.get("user_ref_id") or auth_ctx.get("retailer_ref_id")
        eff_user_type = auth_ctx.get("user_type_ref_id")
        if eff_user is not None:
            if eff_user_type is not None:
                where_clauses.append("((t.user_ref_id = :eff_user_ref AND t.user_type_ref_id = :eff_user_type_ref) OR (t.retailer_ref_id = :eff_user_ref))")
                params["eff_user_ref"] = eff_user
                params["eff_user_type_ref"] = eff_user_type
            else:
                where_clauses.append("(t.user_ref_id = :eff_user_ref OR t.retailer_ref_id = :eff_user_ref)")
                params["eff_user_ref"] = eff_user
    else:
        if effective_retailer is not None:
            where_clauses.append("(t.user_ref_id = :ret_ref OR t.retailer_ref_id = :ret_ref)")
            params["ret_ref"] = effective_retailer

    if tid_str:
        where_clauses.append("t.tid ILIKE :tid_val")
        params["tid_val"] = f"%{tid_str}%"

    if mobile_str:
        mob_clean = mobile_str[-10:] if len(mobile_str) >= 10 else mobile_str
        where_clauses.append("t.cust_mobile ILIKE :mob_val")
        params["mob_val"] = f"%{mob_clean}%"

    if status_str and status_str.upper() != "ALL":
        st = status_str.upper()
        if st in ("SUCCESS", "COMPLETED", "SETTLED"):
            where_clauses.append("UPPER(t.txn_status) IN ('SUCCESS', 'COMPLETED', 'SETTLED')")
        elif st in ("PENDING", "INITIATED", "PROCESSING"):
            where_clauses.append("UPPER(t.txn_status) IN ('PENDING', 'INITIATED', 'PROCESSING')")
        elif st in ("FAILED", "REJECTED", "TIMEOUT", "FAILURE"):
            where_clauses.append("UPPER(t.txn_status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'FAILURE')")
        elif st in ("REVERSED", "REFUNDED"):
            where_clauses.append("UPPER(t.txn_status) IN ('REVERSED', 'REFUNDED')")
        else:
            where_clauses.append("UPPER(t.txn_status) = :st")
            params["st"] = st

    if gateway_str and gateway_str.upper() != "ALL":
        gw = gateway_str.upper()
        if gw == "G-1":
            where_clauses.append("(t.payin_vendor_ref_id = 1 OR v.vendor_code ILIKE '%BANKME%')")
        elif gw == "G-2":
            where_clauses.append("(t.payin_vendor_ref_id = 2 OR v.vendor_code ILIKE '%EASEBUZZ%')")
        else:
            where_clauses.append("(v.vendor_code ILIKE :gw OR v.vendor_name ILIKE :gw)")
            params["gw"] = f"%{gw}%"

    if payment_mode_str and payment_mode_str.upper() != "ALL":
        pm = payment_mode_str.upper()
        if pm in ("UPI", "QR"):
            where_clauses.append("(t.card_network = 'UPI' OR p.pay_mode_code IN ('UPI', 'UPI_INTENT', 'QR'))")
        elif pm in ("CARD", "CREDIT_CARD", "DEBIT_CARD"):
            where_clauses.append("(t.card_network IN ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'CORP') OR p.pay_mode_code IN ('CREDIT_CARD', 'DEBIT_CARD'))")
        elif pm in ("VISA", "MASTERCARD", "RUPAY", "AMEX", "CORP"):
            where_clauses.append("t.card_network = :pm")
            params["pm"] = pm
        elif pm in ("NETBANKING", "NET_BANKING", "NB"):
            where_clauses.append("p.pay_mode_code IN ('NET_BANKING', 'NETBANKING')")
        elif pm == "WALLET":
            where_clauses.append("p.pay_mode_code = 'WALLET'")
        else:
            where_clauses.append("(t.card_network ILIKE :pm OR p.pay_mode_code ILIKE :pm OR p.pay_mode_name ILIKE :pm)")
            params["pm"] = f"%{pm}%"

    if search_str:
        s = f"%{search_str}%"
        where_clauses.append("""(
            t.tid ILIKE :s OR
            t.merchant_ref_id ILIKE :s OR
            t.provider_ref_id ILIKE :s OR
            t.cust_mobile ILIKE :s OR
            t.cust_name ILIKE :s
        )""")
        params["s"] = s

    base_where = "WHERE " + " AND ".join(where_clauses)

    sql = f"""
    SELECT
        t.payin_transactions_ref_id,
        t.tid,
        t.merchant_ref_id,
        t.provider_ref_id,
        t.company_ref_id,
        c.company_name,
        t.user_type_ref_id,
        t.user_ref_id,
        ut.user_type_name,
        ut.user_type_code,
        t.retailer_ref_id,
        r.retailer_code,
        COALESCE(r.store_name, r.legal_name, r.owner_name, t.cust_name, 'Retailer') AS retailer_name,
        t.payin_vendor_ref_id,
        v.vendor_code,
        v.vendor_name,
        t.card_network,
        COALESCE(p.pay_mode_code, 'UPI') AS payment_mode,
        t.cust_mobile,
        t.txn_amount,
        t.mdr_amount,
        t.tax_amount,
        t.total_charges,
        t.customer_payable,
        t.retailer_credit,
        t.txn_status,
        t.receipt_short_code,
        t.created_at,
        t.completed_at
    FROM public.payin_transactions t
    JOIN public.company c ON t.company_ref_id = c.company_ref_id
    LEFT JOIN public.user_type ut ON t.user_type_ref_id = ut.user_type_ref_id
    LEFT JOIN public.retailer r ON t.retailer_ref_id = r.retailer_ref_id
    LEFT JOIN public.payin_vendors v ON t.payin_vendor_ref_id = v.payin_vendor_ref_id
    LEFT JOIN public.payin_payment_modes p ON t.pay_mode_ref_id = p.payin_payment_mode_ref_id
    {base_where}
    ORDER BY t.created_at DESC
    LIMIT 5000;
    """

    res = await db.execute(text(sql), params)
    rows = res.fetchall()

    is_admin_export = bool(auth_ctx.get("is_admin")) and (portal == "admin" or portal is None or auth_ctx.get("is_super_admin"))

    output = io.StringIO()
    writer = csv.writer(output)
    if is_admin_export:
        writer.writerow([
            "TID",
            "ReferenceID",
            "Retailer",
            "Amount (₹)",
            "Charges (₹)",
            "GST (₹)",
            "Total Amount (₹)",
            "Wallet Credit (₹)",
            "MobileNo",
            "Gateway",
            "Vendor",
            "Method",
            "Status",
            "Date & Time"
        ])
    else:
        writer.writerow([
            "TID",
            "Amount (₹)",
            "Charges (₹)",
            "GST (₹)",
            "Total Amount (₹)",
            "Wallet Credit (₹)",
            "MobileNo",
            "Gateway",
            "Method",
            "Status",
            "Date & Time"
        ])

    for idx, r in enumerate(rows):
        d = dict(r._mapping)
        gw_label = map_gateway_label(d.get("payin_vendor_ref_id"), d.get("vendor_code"))
        created_dt = d.get("created_at")
        dt_str = created_dt.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S") if created_dt else "--"
        mob_val = d.get("cust_mobile") or "--"
        if len(mob_val) >= 10:
            mob_val = mob_val[-10:]

        clean_method = PaymentMethodNormalizer.get_clean_method_display(
            card_network=d.get("card_network"),
            pay_mode_code=d.get("payment_mode")
        )

        if is_admin_export:
            ret_val = d.get("retailer_name")
            ret_code = d.get("retailer_code")
            if ret_code and ret_val and ret_code not in ret_val:
                ret_display = f"{ret_val} ({ret_code})"
            else:
                ret_display = ret_val or ret_code or "Retailer"
            ref_id = d.get("merchant_ref_id") or d.get("provider_ref_id") or d.get("tid") or "--"
            vendor_val = gw_label

            writer.writerow([
                d.get("tid") or "--",
                ref_id,
                ret_display,
                f"{money(d.get('txn_amount')):.2f}",
                f"{money(d.get('total_charges')):.2f}",
                f"{money(d.get('tax_amount')):.2f}",
                f"{money(d.get('customer_payable')):.2f}",
                f"{money(d.get('retailer_credit')):.2f}",
                mob_val,
                gw_label,
                vendor_val,
                clean_method,
                (d.get("txn_status") or "SUCCESS").upper(),
                dt_str
            ])
        else:
            writer.writerow([
                d.get("tid") or "--",
                f"{money(d.get('txn_amount')):.2f}",
                f"{money(d.get('total_charges')):.2f}",
                f"{money(d.get('tax_amount')):.2f}",
                f"{money(d.get('customer_payable')):.2f}",
                f"{money(d.get('retailer_credit')):.2f}",
                mob_val,
                gw_label,
                clean_method,
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
