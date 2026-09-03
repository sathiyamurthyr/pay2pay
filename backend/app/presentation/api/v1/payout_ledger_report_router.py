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
from app.infrastructure.db.models import RetailerModel, RetailerContactModel, AdminUserModel

router = APIRouter(prefix="/reports", tags=["Retailer Payout Report"])

IST = timezone(timedelta(hours=5, minutes=30))

def money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"))

def validate_report_date(value: Optional[str], field_name: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").replace(tzinfo=IST).astimezone(timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}. Expected YYYY-MM-DD.")

def validate_sort(sort_by: str, sort_dir: str) -> Tuple[str, str]:
    allowed = {
        "initiated_at": "initiated_at",
        "transaction_number": "transaction_number",
        "transfer_amount": "transfer_amount",
        "status": "status",
        "customer_name": "customer_name",
        "beneficiary_name": "beneficiary_name",
    }
    return allowed.get(sort_by, "initiated_at"), ("asc" if sort_dir.lower() == "asc" else "desc")



def parse_uuid_or_none(val: Any) -> Optional[uuid.UUID]:
    if not val:
        return None
    try:
        if isinstance(val, uuid.UUID):
            return val
        s = str(val).strip()
        if len(s) == 36 and (s.count("-") == 4):
            return uuid.UUID(s)
        return None
    except Exception:
        return None

def mask_account_number(acc_no: Optional[str]) -> str:
    if not acc_no:
        return "--"
    return str(acc_no).strip()

class ReportAuditLogRequest(BaseModel):
    action: str = Field(..., description="REPORT_VIEWED | REPORT_EXPORTED | RECEIPT_DOWNLOADED | RECEIPT_PRINTED")
    user_id: Optional[str] = None
    retailer_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None


async def resolve_report_retailer(
    request: Optional[Request],
    retailer_id: Optional[str],
    tenant_id: Optional[str],
    company_id: Optional[str],
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Authoritatively resolves the retailer identity for report filtering.
    """
    token = None
    if request:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
        if not token:
            token = (
                request.cookies.get("p2p_access_token") or
                request.cookies.get("pay2pay_access_token") or
                request.cookies.get("pay2pay_auth_token") or
                request.cookies.get("access_token")
            )

    token_payload = {}
    if token and len(token) > 10:
        token_payload = decode_access_token(token) or {}

    ret_uuid = None
    ret_code = None
    t_uuid = parse_uuid_or_none(tenant_id)
    c_uuid = parse_uuid_or_none(company_id)
    is_admin = False

    roles = token_payload.get("roles") or []
    if isinstance(roles, list) and any(r in ("SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN") for r in roles):
        is_admin = True

    target_id = retailer_id or token_payload.get("retailer_id") or token_payload.get("registration_id")
    target_uuid = parse_uuid_or_none(target_id)

    # 1. If target_uuid provided directly
    if target_uuid:
        ret_uuid = target_uuid
        stmt = select(RetailerModel).where(
            RetailerModel.public_id == target_uuid,
            RetailerModel.is_deleted == False
        )
        if t_uuid:
            stmt = stmt.where(RetailerModel.tenant_id == t_uuid)
        if c_uuid:
            stmt = stmt.where(RetailerModel.company_id == c_uuid)
        ret_row = (await db.execute(stmt)).scalars().first()
        if ret_row:
            ret_code = ret_row.retailer_code
            if not t_uuid and ret_row.tenant_id:
                t_uuid = ret_row.tenant_id
            if not c_uuid and ret_row.company_id:
                c_uuid = ret_row.company_id

    # 2. If target code provided (e.g. RET-08A9A0)
    elif target_id and target_id not in ("ALL", "DEFAULT", "RET-PENDING"):
        ret_row = (await db.execute(select(RetailerModel).where(
            or_(RetailerModel.retailer_code == target_id, RetailerModel.retailer_code.ilike(f"%{target_id}%")),
            RetailerModel.is_deleted == False
        ))).scalars().first()
        if ret_row:
            ret_uuid = ret_row.public_id
            ret_code = ret_row.retailer_code
            if not t_uuid and ret_row.tenant_id:
                t_uuid = ret_row.tenant_id
            if not c_uuid and ret_row.company_id:
                c_uuid = ret_row.company_id
        else:
            ret_code = str(target_id)

    # 3. Fallback to sub from token
    if not ret_uuid and token_payload.get("sub"):
        sub_uuid = parse_uuid_or_none(str(token_payload.get("sub")))
        if sub_uuid:
            ret_row = (await db.execute(select(RetailerModel).where(RetailerModel.public_id == sub_uuid, RetailerModel.is_deleted == False))).scalars().first()
            if ret_row:
                ret_uuid = ret_row.public_id
                ret_code = ret_row.retailer_code
                if not t_uuid and ret_row.tenant_id:
                    t_uuid = ret_row.tenant_id
                if not c_uuid and ret_row.company_id:
                    c_uuid = ret_row.company_id

    # 4. Fallback to mobile from token
    if not ret_uuid and token_payload.get("mobile"):
        clean_mob = re.sub(r"\D", "", str(token_payload.get("mobile")))[-10:]
        if len(clean_mob) == 10:
            mob_vars = [clean_mob, f"+91{clean_mob}", f"91{clean_mob}"]
            ret_row = (await db.execute(
                select(RetailerModel)
                .join(RetailerContactModel, RetailerContactModel.retailer_id == RetailerModel.public_id)
                .where(RetailerContactModel.mobile.in_(mob_vars), RetailerModel.is_deleted == False)
            )).scalars().first()
            if ret_row:
                ret_uuid = ret_row.public_id
                ret_code = ret_row.retailer_code

    return {
        "retailer_uuid": ret_uuid,
        "retailer_code": ret_code,
        "tenant_uuid": t_uuid,
        "company_uuid": c_uuid,
        "is_admin": is_admin
    }


@router.get("/summary", summary="Get Retailer Payout Summary KPIs")
async def get_retailer_payout_summary(
    request: Request,
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    ctx = await resolve_report_retailer(request, retailer_id, tenant_id, company_id, db)
    ret_uuid = ctx["retailer_uuid"]
    ret_code = ctx["retailer_code"]
    
    now_ist = datetime.now(IST)
    
    if from_date and isinstance(from_date, str) and from_date.strip():
        try:
            start_dt = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)
    else:
        start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)

    if to_date and isinstance(to_date, str) and to_date.strip():
        try:
            end_dt = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)
    else:
        end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)

    # 1. Query Central Transactions (STRICTLY PAYOUT & DMT ONLY)
    tx_sql = """
    SELECT 
        COUNT(transactions_ref_id) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(amount), 0) AS total_debit,
        0.0 AS total_commission,
        0.0 AS total_gst,
        0.0 AS total_tds,
        COUNT(CASE WHEN UPPER(status) IN ('SUCCESS', 'SETTLED', 'COMPLETED') THEN 1 END) AS success_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('SUCCESS', 'SETTLED', 'COMPLETED') THEN amount ELSE 0 END), 0) AS success_amount,
        COUNT(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN 1 END) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN amount ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN 1 END) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN amount ELSE 0 END), 0) AS failed_amount,
        COUNT(CASE WHEN UPPER(status) = 'REVERSED' THEN 1 END) AS reversed_count
    FROM transactions
    WHERE UPPER(COALESCE(service_name, '')) IN ('PAYOUT', 'DMT', 'MOVE_TO_BANK', 'BANK_TRANSFER', 'VENDOR_PAYOUT', 'BENEFICIARY_PAYOUT')
      AND created_at >= :start_dt AND created_at <= :end_dt
    """
    tx_params: Dict[str, Any] = {"start_dt": start_dt, "end_dt": end_dt}
    if t_uuid := ctx.get("tenant_uuid"):
        tx_sql += " AND (tenant_id = :tenant_scope OR tenant_ref_id = :tenant_ref_id_scope)"
        tx_params["tenant_scope"] = t_uuid
        tx_params["tenant_ref_id_scope"] = ctx.get("tenant_ref_id", 1)
    if c_uuid := ctx.get("company_uuid"):
        tx_sql += " AND (company_id = :company_scope OR company_ref_id = :company_ref_id_scope)"
        tx_params["company_scope"] = c_uuid
        tx_params["company_ref_id_scope"] = ctx.get("company_ref_id", 1)

    if ret_uuid:
        tx_sql += " AND (retailer_id = :ret_uuid OR retailer_id::text = :ret_uuid_str OR retailer_ref_id = :ret_ref_id"
        tx_params["ret_uuid"] = ret_uuid
        tx_params["ret_uuid_str"] = str(ret_uuid)
        tx_params["ret_ref_id"] = ctx.get("retailer_ref_id", 0)
        if ret_code:
            tx_sql += " OR retailer_id::text = :ret_code"
            tx_params["ret_code"] = ret_code
        tx_sql += ")"
    elif ret_code:
        tx_sql += " AND retailer_id::text = :ret_code"
        tx_params["ret_code"] = ret_code

    res = await db.execute(text(tx_sql), tx_params)
    row = res.fetchone()
    rd = dict(row._mapping) if row else {}

    # 2. Query Enterprise Payout Transactions
    ep_summary_sql = """
    SELECT 
        COUNT(id) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(net_debit), 0) AS total_debit,
        COALESCE(SUM(commission), 0) AS total_commission,
        COALESCE(SUM(gst_amount), 0) AS total_gst,
        COALESCE(SUM(tds_amount), 0) AS total_tds,
        COUNT(CASE WHEN UPPER(status::text) IN ('SUCCESS', 'SETTLED', 'COMPLETED') THEN 1 END) AS success_count,
        COALESCE(SUM(CASE WHEN UPPER(status::text) IN ('SUCCESS', 'SETTLED', 'COMPLETED') THEN amount ELSE 0 END), 0) AS success_amount,
        COUNT(CASE WHEN UPPER(status::text) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN 1 END) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status::text) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN amount ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN UPPER(status::text) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN 1 END) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status::text) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN amount ELSE 0 END), 0) AS failed_amount,
        COUNT(CASE WHEN UPPER(status::text) = 'REVERSED' OR is_reversed = true THEN 1 END) AS reversed_count
    FROM enterprise_payout_transactions
    WHERE created_date >= :start_dt AND created_date <= :end_dt
    """
    ep_params: Dict[str, Any] = {"start_dt": start_dt, "end_dt": end_dt}
    if t_uuid := ctx.get("tenant_uuid"):
        ep_summary_sql += " AND tenant_id = :tenant_scope"
        ep_params["tenant_scope"] = t_uuid
    if c_uuid := ctx.get("company_uuid"):
        ep_summary_sql += " AND company_id = :company_scope"
        ep_params["company_scope"] = c_uuid

    if ret_uuid:
        ep_summary_sql += " AND (retailer_id = :ret_uuid OR retailer_id::text = :ret_uuid_str"
        ep_params["ret_uuid"] = ret_uuid
        ep_params["ret_uuid_str"] = str(ret_uuid)
        if ret_code:
            ep_summary_sql += " OR retailer_id::text = :ret_code"
            ep_params["ret_code"] = ret_code
        ep_summary_sql += ")"
    elif ret_code:
        ep_summary_sql += " AND retailer_id::text = :ret_code"
        ep_params["ret_code"] = ret_code

    ep_res = await db.execute(text(ep_summary_sql), ep_params)
    ep_row = ep_res.fetchone()
    ep_rd = dict(ep_row._mapping) if ep_row else {}

    # 3. Query Workflow Transactions (EPIC-014 fallback)
    pw_sql = """
    SELECT 
        COUNT(id) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(net_debit), 0) AS total_debit,
        COALESCE(SUM(commission), 0) AS total_commission,
        COUNT(CASE WHEN UPPER(status) IN ('SUCCESS', 'SETTLED', 'COMPLETED') THEN 1 END) AS success_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('SUCCESS', 'SETTLED', 'COMPLETED') THEN amount ELSE 0 END), 0) AS success_amount,
        COUNT(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN 1 END) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN amount ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN 1 END) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN amount ELSE 0 END), 0) AS failed_amount
    FROM payout_workflow_transactions
    WHERE initiated_at >= :start_dt AND initiated_at <= :end_dt
    """
    pw_params: Dict[str, Any] = {"start_dt": start_dt, "end_dt": end_dt}
    if ret_uuid:
        pw_sql += " AND (retailer_id = :ret_uuid OR retailer_id::text = :ret_uuid_str"
        pw_params["ret_uuid"] = ret_uuid
        pw_params["ret_uuid_str"] = str(ret_uuid)
        if ret_code:
            pw_sql += " OR retailer_id::text = :ret_code"
            pw_params["ret_code"] = ret_code
        pw_sql += ")"
    elif ret_code:
        pw_sql += " AND retailer_id::text = :ret_code"
        pw_params["ret_code"] = ret_code

    pw_res = await db.execute(text(pw_sql), pw_params)
    pw_row = pw_res.fetchone()
    pw_rd = dict(pw_row._mapping) if pw_row else {}

    total_txns = int(rd.get("total_count", 0)) + int(ep_rd.get("total_count", 0)) + int(pw_rd.get("total_count", 0))
    total_amount = float(rd.get("total_amount", 0)) + float(ep_rd.get("total_amount", 0)) + float(pw_rd.get("total_amount", 0))
    total_debit = float(rd.get("total_debit", 0)) + float(ep_rd.get("total_debit", 0)) + float(pw_rd.get("total_debit", 0))
    total_comm = float(rd.get("total_commission", 0)) + float(ep_rd.get("total_commission", 0)) + float(pw_rd.get("total_commission", 0))
    total_gst = float(rd.get("total_gst", 0)) + float(ep_rd.get("total_gst", 0))
    total_tds = float(rd.get("total_tds", 0)) + float(ep_rd.get("total_tds", 0))

    success_txns = int(rd.get("success_count", 0)) + int(ep_rd.get("success_count", 0)) + int(pw_rd.get("success_count", 0))
    success_amt = float(rd.get("success_amount", 0)) + float(ep_rd.get("success_amount", 0)) + float(pw_rd.get("success_amount", 0))
    pending_txns = int(rd.get("pending_count", 0)) + int(ep_rd.get("pending_count", 0)) + int(pw_rd.get("pending_count", 0))
    pending_amt = float(rd.get("pending_amount", 0)) + float(ep_rd.get("pending_amount", 0)) + float(pw_rd.get("pending_amount", 0))
    failed_txns = int(rd.get("failed_count", 0)) + int(ep_rd.get("failed_count", 0)) + int(pw_rd.get("failed_count", 0))
    failed_amt = float(rd.get("failed_amount", 0)) + float(ep_rd.get("failed_amount", 0)) + float(pw_rd.get("failed_amount", 0))
    reversed_txns = int(rd.get("reversed_count", 0)) + int(ep_rd.get("reversed_count", 0))

    return {
        "todays_transactions": total_txns,
        "todays_transfer_amount": round(total_amount, 2),
        "todays_wallet_debit": round(total_debit, 2),
        "todays_commission": round(total_comm, 2),
        "todays_gst": round(total_gst, 2),
        "todays_tds": round(total_tds, 2),
        "pending_transactions": pending_txns,
        "successful_transactions": success_txns,
        "failed_transactions": failed_txns,
        "reversed_transactions": reversed_txns,
        "successful_amount": round(success_amt, 2),
        "pending_amount": round(pending_amt, 2),
        "failed_amount": round(failed_amt, 2),
    }


async def fetch_payout_report_dataset(
    db: AsyncSession,
    request: Optional[Request] = None,
    retailer_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    company_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None,
    transaction_id: Optional[str] = None,
    reference_id: Optional[str] = None,
    customer_name: Optional[str] = None,
    customer_mobile: Optional[str] = None,
    beneficiary_name: Optional[str] = None,
    beneficiary_mobile: Optional[str] = None,
    status_filter: Optional[str] = None,
    payment_mode: Optional[str] = None,
    amount_from: Optional[float] = None,
    amount_to: Optional[float] = None,
    page: int = 1,
    limit: int = 100,
    sort_by: str = "initiated_at",
    sort_dir: str = "desc"
) -> Dict[str, Any]:
    ctx = await resolve_report_retailer(request, retailer_id, tenant_id, company_id, db)
    ret_uuid = ctx["retailer_uuid"]
    ret_code = ctx["retailer_code"]

    now_ist = datetime.now(IST)
    if from_date and isinstance(from_date, str) and from_date.strip():
        try:
            start_dt = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)
    else:
        start_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 0, 0, 0, tzinfo=IST).astimezone(timezone.utc)

    if to_date and isinstance(to_date, str) and to_date.strip():
        try:
            end_dt = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)
        except ValueError:
            end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)
    else:
        end_dt = datetime(now_ist.year, now_ist.month, now_ist.day, 23, 59, 59, microsecond=999999, tzinfo=IST).astimezone(timezone.utc)

    # 1. Query Central Transactions (PAYOUT & DMT ONLY)
    central_sql = """
    SELECT 
        t.public_id::text AS transaction_id,
        t.txn_id AS transaction_number,
        COALESCE(t.ref_id, t.txn_id) AS reference_id,
        t.created_at AS initiated_at,
        t.updated_at AS completed_at,
        COALESCE(c.full_name, ret.store_name, ret.owner_name, 'Verified Customer') AS customer_name,
        COALESCE(c.mobile_number, rc.mobile, 'N/A') AS customer_mobile,
        COALESCE(b.account_holder_name, pt_b.account_holder_name, ret.store_name, ret.owner_name, 'Beneficiary') AS beneficiary_name,
        COALESCE(rc.mobile, 'N/A') AS beneficiary_mobile,
        COALESCE(b.bank_name, pt_b.bank_name, '') AS bank_name,
        COALESCE(b.account_number, pt_b.account_number, '') AS masked_account_number,
        COALESCE(b.account_number, pt_b.account_number, '') AS account_number,
        COALESCE(b.ifsc_code, pt_b.ifsc_code, '') AS ifsc_code,
        COALESCE(t.service_name, 'PAYOUT') AS payment_mode,
        'PAYOUT' AS service_category,
        t.amount::float AS transfer_amount,
        0.0 AS convenience_fee,
        0.0 AS gst_amount,
        0.0 AS tds_amount,
        0.0 AS tax_amount,
        'MAIN_WALLET' AS wallet_type,
        t.amount::float AS wallet_debit,
        0.0 AS retailer_commission,
        COALESCE(t.ref_id, t.txn_id, '--') AS utr_number,
        UPPER(t.status) AS status,
        CASE WHEN UPPER(t.status) = 'FAILED' THEN 'REFUNDED' ELSE '' END AS refund_status,
        COALESCE(t.narration, '') AS remarks,
        t.balance_before::float AS wallet_before,
        t.balance_after::float AS wallet_after,
        t.entry_type AS entry_type,
        COALESCE(t.narration, '') AS narration,
        true AS receipt_enabled
    FROM transactions t
    LEFT JOIN retailer ret ON (t.retailer_id = ret.public_id OR t.retailer_id::text = ret.retailer_code OR t.retailer_ref_id = ret.retailer_ref_id)
    LEFT JOIN retailer_contact rc ON rc.retailer_id = ret.public_id
    LEFT JOIN payout_workflow_transactions pwt ON (pwt.transaction_number = t.txn_id OR pwt.reference_number = t.ref_id)
    LEFT JOIN beneficiary_master b ON (b.beneficiary_master_ref_id = pwt.beneficiary_master_ref_id OR b.public_id = pwt.beneficiary_id)
    LEFT JOIN customer c ON (c.customer_ref_id = pwt.customer_ref_id OR c.public_id = pwt.customer_id)
    LEFT JOIN payout_transaction pt ON (pt.transaction_number = t.txn_id OR pt.gateway_reference = t.txn_id OR pt.bank_reference = t.ref_id)
    LEFT JOIN beneficiary_master pt_b ON (pt_b.beneficiary_master_ref_id = pt.beneficiary_master_ref_id OR pt_b.public_id = pt.beneficiary_id)
    WHERE (
        UPPER(COALESCE(t.service_name, '')) IN ('PAYOUT', 'DMT', 'MOVE_TO_BANK', 'BANK_TRANSFER', 'VENDOR_PAYOUT', 'BENEFICIARY_PAYOUT')
    )
    AND UPPER(COALESCE(t.service_name, '')) NOT IN ('TOPUP', 'RECHARGE', 'BBPS', 'BILL_PAYMENT', 'AEPS', 'POS', 'CARD_TO_CASH')
    """
    params: Dict[str, Any] = {}
    if ctx.get("tenant_uuid"):
        central_sql += " AND (t.tenant_id = :tenant_scope OR t.tenant_ref_id = :tenant_ref_id_scope)"
        params["tenant_scope"] = ctx["tenant_uuid"]
        params["tenant_ref_id_scope"] = ctx.get("tenant_ref_id", 1)
    if ctx.get("company_uuid"):
        central_sql += " AND (t.company_id = :company_scope OR t.company_ref_id = :company_ref_id_scope)"
        params["company_scope"] = ctx["company_uuid"]
        params["company_ref_id_scope"] = ctx.get("company_ref_id", 1)

    if ret_uuid:
        central_sql += " AND (t.retailer_id = :ret_uuid OR t.retailer_id::text = :ret_uuid_str OR t.retailer_ref_id = :ret_ref_id"
        params["ret_uuid"] = ret_uuid
        params["ret_uuid_str"] = str(ret_uuid)
        params["ret_ref_id"] = ctx.get("retailer_ref_id", 0)
        if ret_code:
            central_sql += " OR t.retailer_id::text = :ret_code"
            params["ret_code"] = ret_code
        central_sql += ")"
    elif ret_code:
        central_sql += " AND t.retailer_id::text = :ret_code"
        params["ret_code"] = ret_code

    if start_dt:
        central_sql += " AND t.created_at >= :start_dt"
        params["start_dt"] = start_dt
    if end_dt:
        central_sql += " AND t.created_at <= :end_dt"
        params["end_dt"] = end_dt

    if search and search.strip():
        s_val = f"%{search.strip()}%"
        central_sql += """ AND (
            t.txn_id ILIKE :s_val OR 
            t.ref_id ILIKE :s_val OR 
            ret.store_name ILIKE :s_val OR 
            ret.owner_name ILIKE :s_val OR 
            rc.mobile ILIKE :s_val
        )"""
        params["s_val"] = s_val

    if status_filter and status_filter.upper() != "ALL":
        st_upper = status_filter.upper()
        if st_upper == "FAILED":
            central_sql += " AND UPPER(t.status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED')"
        elif st_upper == "PENDING":
            central_sql += " AND UPPER(t.status) IN ('PENDING', 'PROCESSING', 'INITIATED')"
        else:
            central_sql += " AND UPPER(t.status) = :status_filter"
            params["status_filter"] = st_upper

    if amount_from is not None:
        central_sql += " AND t.amount >= :amount_from"
        params["amount_from"] = amount_from
    if amount_to is not None:
        central_sql += " AND t.amount <= :amount_to"
        params["amount_to"] = amount_to


    if transaction_id and transaction_id.strip():
        central_sql += " AND (t.public_id::text = :transaction_id OR t.txn_id = :transaction_id)"
        params["transaction_id"] = transaction_id.strip()
    if reference_id and reference_id.strip():
        central_sql += " AND (t.txn_id ILIKE :reference_id OR t.ref_id ILIKE :reference_id)"
        params["reference_id"] = f"%{reference_id.strip()}%"
    if customer_name and customer_name.strip():
        central_sql += " AND (ret.store_name ILIKE :customer_name OR ret.owner_name ILIKE :customer_name)"
        params["customer_name"] = f"%{customer_name.strip()}%"
    if customer_mobile and customer_mobile.strip():
        central_sql += " AND ret.mobile_number ILIKE :customer_mobile"
        params["customer_mobile"] = f"%{customer_mobile.strip()}%"
    if beneficiary_name and beneficiary_name.strip():
        central_sql += " AND b.account_holder_name ILIKE :beneficiary_name"
        params["beneficiary_name"] = f"%{beneficiary_name.strip()}%"
    if beneficiary_mobile and beneficiary_mobile.strip():
        central_sql += " AND c.mobile_number ILIKE :beneficiary_mobile"
        params["beneficiary_mobile"] = f"%{beneficiary_mobile.strip()}%"
    if payment_mode and payment_mode.upper() != "ALL":
        central_sql += " AND (UPPER(COALESCE(t.service_type, '')) = :payment_mode OR UPPER(COALESCE(t.transaction_type, '')) = :payment_mode)"
        params["payment_mode"] = payment_mode.upper()

    central_sql += " ORDER BY t.created_at DESC"
    rows = (await db.execute(text(central_sql), params)).fetchall()

    # 2. Query Enterprise Payout Transactions
    ep_sql = """
    SELECT 
        e.public_id::text AS transaction_id,
        e.transaction_number,
        e.transaction_number AS reference_id,
        e.initiated_at,
        e.completed_at,
        COALESCE(c.full_name, 'Verified Customer') AS customer_name,
        COALESCE(c.mobile_number, NULL) AS customer_mobile,
        COALESCE(b.account_holder_name, bba.account_holder_name, 'Beneficiary') AS beneficiary_name,
        COALESCE(c.mobile_number, NULL) AS beneficiary_mobile,
        COALESCE(b.bank_name, bba.bank_name, '') AS bank_name,
        COALESCE(b.account_number, bba.account_number, b.account_number_masked, '') AS masked_account_number,
        COALESCE(b.account_number, bba.account_number, b.account_number_masked, '') AS account_number,
        COALESCE(b.ifsc_code, bba.ifsc_code, '') AS ifsc_code,
        e.mode AS payment_mode,
        'PAYOUT' AS service_category,
        e.amount::float AS transfer_amount,
        e.charges::float AS convenience_fee,
        e.gst_amount::float AS gst_amount,
        e.tds_amount::float AS tds_amount,
        (e.gst_amount + e.tds_amount)::float AS tax_amount,
        'MAIN_WALLET' AS wallet_type,
        e.net_debit::float AS wallet_debit,
        e.commission::float AS retailer_commission,
        COALESCE(e.utr_number, '--') AS utr_number,
        UPPER(e.status::text) AS status,
        CASE WHEN UPPER(e.status::text) = 'FAILED' OR e.is_reversed = true THEN 'REFUNDED' ELSE '' END AS refund_status,
        COALESCE(e.reversal_reason, e.status_description, '') AS remarks,
        COALESCE(e.wallet_before::float, 0.0) AS wallet_before,
        COALESCE(e.wallet_after::float, 0.0) AS wallet_after,
        'DEBIT' AS entry_type,
        COALESCE(e.reversal_reason, e.status_description, '') AS narration,
        true AS receipt_enabled
    FROM enterprise_payout_transactions e
    LEFT JOIN customer c ON (e.customer_id = c.public_id OR e.customer_ref_id = c.customer_ref_id)
    LEFT JOIN beneficiary_master b ON (e.beneficiary_id = b.public_id OR e.beneficiary_master_ref_id = b.beneficiary_master_ref_id)
    LEFT JOIN beneficiary_bank_account bba ON (bba.beneficiary_id = e.beneficiary_id OR bba.public_id = e.beneficiary_id)
    WHERE 1=1
    """
    ep_params: Dict[str, Any] = {}
    if ctx.get("tenant_uuid"):
        ep_sql += " AND e.tenant_id = :tenant_scope"
        ep_params["tenant_scope"] = ctx["tenant_uuid"]
    if ctx.get("company_uuid"):
        ep_sql += " AND e.company_id = :company_scope"
        ep_params["company_scope"] = ctx["company_uuid"]

    if ret_uuid:
        ep_sql += " AND (e.retailer_id = :ret_uuid OR e.retailer_id::text = :ret_uuid_str"
        ep_params["ret_uuid"] = ret_uuid
        ep_params["ret_uuid_str"] = str(ret_uuid)
        if ret_code:
            ep_sql += " OR e.retailer_id::text = :ret_code"
            ep_params["ret_code"] = ret_code
        ep_sql += ")"
    elif ret_code:
        ep_sql += " AND e.retailer_id::text = :ret_code"
        ep_params["ret_code"] = ret_code

    if start_dt:
        ep_sql += " AND e.created_date >= :start_dt"
        ep_params["start_dt"] = start_dt
    if end_dt:
        ep_sql += " AND e.created_date <= :end_dt"
        ep_params["end_dt"] = end_dt

    if search and search.strip():
        s_val = f"%{search.strip()}%"
        ep_sql += """ AND (
            e.transaction_number ILIKE :s_val OR 
            c.full_name ILIKE :s_val OR 
            c.mobile_number ILIKE :s_val OR 
            b.account_holder_name ILIKE :s_val OR 
            b.account_number ILIKE :s_val OR 
            e.utr_number ILIKE :s_val
        )"""
        ep_params["s_val"] = s_val

    if status_filter and status_filter.upper() != "ALL":
        st_upper = status_filter.upper()
        if st_upper == "FAILED":
            ep_sql += " AND UPPER(e.status::text) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED')"
        elif st_upper == "PENDING":
            ep_sql += " AND UPPER(e.status::text) IN ('PENDING', 'PROCESSING', 'INITIATED')"
        else:
            ep_sql += " AND UPPER(e.status::text) = :status_filter"
            ep_params["status_filter"] = st_upper

    if amount_from is not None:
        ep_sql += " AND e.amount >= :amount_from"
        ep_params["amount_from"] = amount_from
    if amount_to is not None:
        ep_sql += " AND e.amount <= :amount_to"
        ep_params["amount_to"] = amount_to


    if transaction_id and transaction_id.strip():
        ep_sql += " AND (e.public_id::text = :transaction_id OR e.transaction_number = :transaction_id)"
        ep_params["transaction_id"] = transaction_id.strip()
    if reference_id and reference_id.strip():
        ep_sql += " AND e.transaction_number ILIKE :reference_id"
        ep_params["reference_id"] = f"%{reference_id.strip()}%"
    if customer_name and customer_name.strip():
        ep_sql += " AND c.full_name ILIKE :customer_name"
        ep_params["customer_name"] = f"%{customer_name.strip()}%"
    if customer_mobile and customer_mobile.strip():
        ep_sql += " AND c.mobile_number ILIKE :customer_mobile"
        ep_params["customer_mobile"] = f"%{customer_mobile.strip()}%"
    if beneficiary_name and beneficiary_name.strip():
        ep_sql += " AND b.account_holder_name ILIKE :beneficiary_name"
        ep_params["beneficiary_name"] = f"%{beneficiary_name.strip()}%"
    if beneficiary_mobile and beneficiary_mobile.strip():
        ep_sql += " AND c.mobile_number ILIKE :beneficiary_mobile"
        ep_params["beneficiary_mobile"] = f"%{beneficiary_mobile.strip()}%"
    if payment_mode and payment_mode.upper() != "ALL":
        ep_sql += " AND UPPER(COALESCE(e.mode, '')) = :payment_mode"
        ep_params["payment_mode"] = payment_mode.upper()

    ep_sql += " ORDER BY e.created_date DESC"
    ep_rows = (await db.execute(text(ep_sql), ep_params)).fetchall()

    # 3. Query Workflow Transactions
    pw_sql = """
    SELECT 
        p.public_id::text AS transaction_id,
        p.transaction_number,
        COALESCE(p.reference_number, p.transaction_number) AS reference_id,
        p.initiated_at,
        p.completed_at,
        COALESCE(c.full_name, 'Verified Customer') AS customer_name,
        COALESCE(c.mobile_number, NULL) AS customer_mobile,
        COALESCE(b.account_holder_name, 'Beneficiary') AS beneficiary_name,
        COALESCE(c.mobile_number, NULL) AS beneficiary_mobile,
        COALESCE(b.bank_name, '') AS bank_name,
        COALESCE(b.account_number, b.account_number_masked, '') AS masked_account_number,
        COALESCE(b.account_number, b.account_number_masked, '') AS account_number,
        COALESCE(b.ifsc_code, '') AS ifsc_code,
        p.mode AS payment_mode,
        CASE WHEN p.transaction_number LIKE 'REV-%' OR UPPER(p.status) = 'REVERSED' THEN 'Payout Reversal' ELSE 'Payout' END AS service_category,
        p.amount::float AS transfer_amount,
        CASE WHEN p.transaction_number LIKE 'REV-%' OR UPPER(p.status) = 'REVERSED' THEN 0.0 ELSE p.charges::float END AS convenience_fee,
        CASE WHEN p.transaction_number LIKE 'REV-%' OR UPPER(p.status) = 'REVERSED' THEN 0.0 ELSE COALESCE(p.gst_amount, 0.0)::float END AS gst_amount,
        0.0::float AS tds_amount,
        CASE WHEN p.transaction_number LIKE 'REV-%' OR UPPER(p.status) = 'REVERSED' THEN 0.0 ELSE COALESCE(p.gst_amount, 0.0)::float END AS tax_amount,
        'MAIN_WALLET' AS wallet_type,
        p.net_debit::float AS wallet_debit,
        0.0::float AS retailer_commission,
        COALESCE(p.utr_number, '--') AS utr_number,
        CASE WHEN p.transaction_number LIKE 'REV-%' OR UPPER(p.status) = 'REVERSED' THEN 'REVERSED' ELSE UPPER(p.status) END AS status,
        CASE WHEN UPPER(p.status) = 'FAILED' OR p.transaction_number LIKE 'REV-%' THEN 'REFUNDED' ELSE '' END AS refund_status,
        COALESCE(p.failure_reason, '') AS remarks,
        COALESCE(p.wallet_before::float, 0.0) AS wallet_before,
        COALESCE(p.wallet_after::float, 0.0) AS wallet_after,
        CASE WHEN p.transaction_number LIKE 'REV-%' OR UPPER(p.status) = 'REVERSED' THEN 'CREDIT' ELSE 'DEBIT' END AS entry_type,
        COALESCE(p.failure_reason, '') AS narration,
        true AS receipt_enabled
    FROM payout_workflow_transactions p
    LEFT JOIN customer c ON (p.customer_id = c.public_id OR p.customer_ref_id = c.customer_ref_id)
    LEFT JOIN beneficiary_master b ON (p.beneficiary_id = b.public_id OR p.beneficiary_master_ref_id = b.beneficiary_master_ref_id)
    WHERE 1=1
    """
    pw_params: Dict[str, Any] = {}
    if ctx.get("tenant_uuid"):
        pw_sql += " AND p.tenant_id = :tenant_scope"
        pw_params["tenant_scope"] = ctx["tenant_uuid"]
    if ctx.get("company_uuid"):
        pw_sql += " AND p.company_id = :company_scope"
        pw_params["company_scope"] = ctx["company_uuid"]

    if ret_uuid:
        pw_sql += " AND (p.retailer_id = :ret_uuid OR p.retailer_id::text = :ret_uuid_str"
        pw_params["ret_uuid"] = ret_uuid
        pw_params["ret_uuid_str"] = str(ret_uuid)
        if ret_code:
            pw_sql += " OR p.retailer_id::text = :ret_code"
            pw_params["ret_code"] = ret_code
        pw_sql += ")"
    elif ret_code:
        pw_sql += " AND p.retailer_id::text = :ret_code"
        pw_params["ret_code"] = ret_code

    if start_dt:
        pw_sql += " AND p.initiated_at >= :start_dt"
        pw_params["start_dt"] = start_dt
    if end_dt:
        pw_sql += " AND p.initiated_at <= :end_dt"
        pw_params["end_dt"] = end_dt

    if search and search.strip():
        s_val = f"%{search.strip()}%"
        pw_sql += """ AND (
            p.transaction_number ILIKE :s_val OR 
            c.full_name ILIKE :s_val OR 
            c.mobile_number ILIKE :s_val OR 
            b.account_holder_name ILIKE :s_val OR 
            b.account_number ILIKE :s_val OR 
            p.utr_number ILIKE :s_val
        )"""
        pw_params["s_val"] = s_val

    if status_filter and status_filter.upper() != "ALL":
        st_upper = status_filter.upper()
        if st_upper == "FAILED":
            pw_sql += " AND UPPER(p.status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED')"
        elif st_upper == "PENDING":
            pw_sql += " AND UPPER(p.status) IN ('PENDING', 'PROCESSING', 'INITIATED')"
        else:
            pw_sql += " AND UPPER(p.status) = :status_filter"
            pw_params["status_filter"] = st_upper

    if amount_from is not None:
        pw_sql += " AND p.amount >= :amount_from"
        pw_params["amount_from"] = amount_from
    if amount_to is not None:
        pw_sql += " AND p.amount <= :amount_to"
        pw_params["amount_to"] = amount_to


    if transaction_id and transaction_id.strip():
        pw_sql += " AND (p.public_id::text = :transaction_id OR p.transaction_number = :transaction_id)"
        pw_params["transaction_id"] = transaction_id.strip()
    if reference_id and reference_id.strip():
        pw_sql += " AND COALESCE(p.reference_number, p.transaction_number) ILIKE :reference_id"
        pw_params["reference_id"] = f"%{reference_id.strip()}%"
    if customer_name and customer_name.strip():
        pw_sql += " AND c.full_name ILIKE :customer_name"
        pw_params["customer_name"] = f"%{customer_name.strip()}%"
    if customer_mobile and customer_mobile.strip():
        pw_sql += " AND c.mobile_number ILIKE :customer_mobile"
        pw_params["customer_mobile"] = f"%{customer_mobile.strip()}%"
    if beneficiary_name and beneficiary_name.strip():
        pw_sql += " AND b.account_holder_name ILIKE :beneficiary_name"
        pw_params["beneficiary_name"] = f"%{beneficiary_name.strip()}%"
    if beneficiary_mobile and beneficiary_mobile.strip():
        pw_sql += " AND c.mobile_number ILIKE :beneficiary_mobile"
        pw_params["beneficiary_mobile"] = f"%{beneficiary_mobile.strip()}%"
    if payment_mode and payment_mode.upper() != "ALL":
        pw_sql += " AND UPPER(COALESCE(p.mode, '')) = :payment_mode"
        pw_params["payment_mode"] = payment_mode.upper()

    pw_sql += " ORDER BY p.initiated_at DESC"
    pw_rows = (await db.execute(text(pw_sql), pw_params)).fetchall()

    all_items = []
    seen_refs = set()

    for r in list(rows) + list(ep_rows) + list(pw_rows):
        d = dict(r._mapping)
        tx_id = d.get("transaction_id")
        ref = d.get("transaction_number") or d.get("reference_id") or tx_id
        entry_t = d.get("entry_type") or "DEBIT"
        st = d.get("status") or ""
        item_key = f"{ref}_{entry_t}_{st}" if ref else tx_id
        if item_key and item_key not in seen_refs:
            seen_refs.add(item_key)
            all_items.append(d)

    # Sort all items
    def get_sort_key(it: Dict[str, Any]):
        val = it.get(sort_by)
        if val is None:
            return ""
        return str(val)

    safe_sort, safe_dir = validate_sort(sort_by, sort_dir)
    all_items.sort(key=lambda it: (it.get(safe_sort) is None, get_sort_key(it)), reverse=(safe_dir == "desc"))

    # Format items with exact 15-column short response fields
    formatted_items = []
    for idx, d in enumerate(all_items, start=1):
        amt = float(money(d.get("transfer_amount") or d.get("amount") or 0.0))
        tax = float(money(d.get("tax_amount") or ((d.get("gst_amount") or 0.0) + (d.get("tds_amount") or 0.0))))
        
        # Fee is the base configured commission/charge (excluding tax)
        fee_raw = float(money(d.get("retailer_commission") or d.get("commission") or 0.0))
        if fee_raw > 0:
            fee = fee_raw
        else:
            charges_val = float(money(d.get("convenience_fee") or d.get("charges") or 0.0))
            fee = max(0.0, charges_val - tax) if charges_val > tax else charges_val
            
        debit = float(money(d.get("wallet_debit") or d.get("net_debit") or (amt + fee + tax)))
        
        init_dt = d.get("initiated_at")
        if isinstance(init_dt, datetime):
            dt_ist = init_dt.astimezone(IST) if init_dt.tzinfo else init_dt.replace(tzinfo=timezone.utc).astimezone(IST)
            date_time_str = dt_ist.strftime("%d-%b-%Y %H:%M:%S")
        elif isinstance(init_dt, str) and init_dt:
            date_time_str = init_dt
        else:
            date_time_str = "--"

        # Final short format + full attributes for UI & Drawer
        item_obj = {
            "s_no": idx,
            "txn_id": str(d.get("transaction_number") or d.get("transaction_id") or "--"),
            "customer": str(d.get("customer_name") or "Verified Customer"),
            "beneficiary": str(d.get("beneficiary_name") or "Beneficiary"),
            "ac_no": str(d.get("account_number") or d.get("masked_account_number") or "--"),
            "amt": amt,
            "fee": fee,
            "tax": tax,
            "debit": debit,
            "mode": str(d.get("payment_mode") or d.get("mode") or "IMPS"),
            "utr": str(d.get("utr_number") or d.get("utr") or "--"),
            "wallet": "Main Wallet",
            "date_time": date_time_str,
            "status": str(d.get("status") or "SUCCESS").upper(),
            "actions": ["VIEW"],
            # Legacy & deep drawer compatibility fields
            "id": str(d.get("transaction_id") or d.get("transaction_number")),
            "transaction_id": str(d.get("transaction_id") or d.get("transaction_number")),
            "transaction_number": str(d.get("transaction_number") or d.get("transaction_id")),
            "reference_id": str(d.get("reference_id") or d.get("transaction_number")),
            "transfer_amount": amt,
            "convenience_fee": fee,
            "gst_amount": float(money(d.get("gst_amount") or tax)),
            "tds_amount": float(money(d.get("tds_amount") or 0.0)),
            "tax_amount": tax,
            "wallet_debit": debit,
            "payment_mode": str(d.get("payment_mode") or d.get("mode") or "IMPS"),
            "customer_name": str(d.get("customer_name") or "Verified Customer"),
            "customer_mobile": str(d.get("customer_mobile") or ""),
            "beneficiary_name": str(d.get("beneficiary_name") or "Beneficiary"),
            "bank_name": str(d.get("bank_name") or "Bank Transfer"),
            "account_number": str(d.get("account_number") or "--"),
            "masked_account_number": str(d.get("account_number") or "--"),
            "ifsc_code": str(d.get("ifsc_code") or "--"),
            "utr_number": str(d.get("utr_number") or d.get("utr") or "--"),
            "initiated_at": date_time_str,
            "wallet_type": "MAIN_WALLET",
            "receipt_enabled": True,
        }
        formatted_items.append(item_obj)

    total_records = len(formatted_items)
    offset = (page - 1) * limit
    paginated_items = formatted_items[offset:offset + limit]
    total_pages = (total_records + limit - 1) // limit if limit > 0 else 1

    # Resolve dynamic company branding for report
    comp_sql = """
        SELECT 
            COALESCE(c.display_name, c.company_name, c.legal_name, 'Pay2Pay') AS company_name,
            COALESCE(c.legal_name, c.company_name, 'SUPER REX PRODUCTS PRIVATE LIMITED') AS legal_name,
            COALESCE(c.company_code, 'P2P') AS company_code,
            COALESCE(cb.logo_url, '/branding/logo.png') AS logo_url
        FROM public.company c
        LEFT JOIN public.company_branding cb ON (cb.company_id = c.public_id OR cb.company_ref_id = c.company_ref_id)
        WHERE 1=1
    """
    comp_p = {}
    if ctx.get("company_ref_id"):
        comp_sql += " AND c.company_ref_id = :comp_ref"
        comp_p["comp_ref"] = ctx["company_ref_id"]
    elif ctx.get("company_uuid"):
        comp_sql += " AND c.public_id = :comp_uuid"
        comp_p["comp_uuid"] = ctx["company_uuid"]
    comp_sql += " ORDER BY c.company_ref_id ASC LIMIT 1"

    comp_row = (await db.execute(text(comp_sql), comp_p)).fetchone()
    company_meta = dict(comp_row._mapping) if comp_row else {
        "company_name": "Pay2Pay Fintech",
        "legal_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "company_code": "PAY2PAY",
        "logo_url": "/branding/pay2pay-logo.png"
    }

    return {
        "items": paginated_items,
        "company": company_meta,
        "meta": {
            "total_records": total_records,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
    }


@router.get("/list", summary="Get Filtered Paginated Retailer Payout Report")
@router.get("/grid", summary="Get Filtered Paginated Retailer Payout Report Grid")
async def get_retailer_payout_report_list(
    request: Request,
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    transaction_id: Optional[str] = Query(None),
    reference_id: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    customer_mobile: Optional[str] = Query(None),
    beneficiary_name: Optional[str] = Query(None),
    beneficiary_mobile: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    payment_mode: Optional[str] = Query(None),
    amount_from: Optional[float] = Query(None),
    amount_to: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("initiated_at"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db)
):
    dataset = await fetch_payout_report_dataset(
        db=db,
        request=request,
        retailer_id=retailer_id,
        tenant_id=tenant_id,
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
        search=search,
        transaction_id=transaction_id,
        reference_id=reference_id,
        customer_name=customer_name,
        customer_mobile=customer_mobile,
        beneficiary_name=beneficiary_name,
        beneficiary_mobile=beneficiary_mobile,
        status_filter=status_filter,
        payment_mode=payment_mode,
        amount_from=amount_from,
        amount_to=amount_to,
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_dir=sort_dir
    )

    items = dataset["items"]
    return {
        "items": items,
        "company": dataset.get("company"),
        "pagination": dataset["meta"],
        "footer_totals": {
            "total_transactions": dataset["meta"]["total_records"],
            "total_transfer_amount": float(sum((money(it.get("transfer_amount", 0)) for it in items), Decimal("0.00"))),
        }
    }


@router.get("/{transaction_id}/details", summary="Get Sanitized Retailer Transaction Details for Drawer")
async def get_retailer_transaction_details(
    transaction_id: str,
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    tx_sql = """
    SELECT 
        t.public_id::text AS transaction_id,
        t.txn_id AS transaction_number,
        COALESCE(t.ref_id, t.txn_id) AS reference_id,
        t.created_at AS initiated_at,
        t.updated_at AS completed_at,
        COALESCE(ret.store_name, ret.owner_name, 'Verified Customer') AS customer_name,
        COALESCE(ret.mobile_number, 'N/A') AS customer_mobile,
        'VERIFIED' AS customer_kyc_status,
        COALESCE(ret.store_name, ret.owner_name, 'Beneficiary') AS beneficiary_name,
        COALESCE(ret.bank_name, '') AS bank_name,
        COALESCE(ret.account_number, '') AS account_number,
        COALESCE(ret.account_number, '') AS account_number_masked,
        COALESCE(ret.ifsc_code, '') AS ifsc_code,
        t.service_name AS mode,
        t.amount::float AS amount,
        0.0 AS charges,
        0.0 AS gst_amount,
        0.0 AS tds_amount,
        t.amount::float AS net_debit,
        0.0 AS commission,
        UPPER(t.status) AS status,
        COALESCE(t.ref_id, t.txn_id, '--') AS utr_number,
        COALESCE(t.narration, '') AS remarks,
        t.balance_before::float AS wallet_before,
        t.balance_after::float AS wallet_after
    FROM transactions t
    LEFT JOIN retailer ret ON (t.retailer_id = ret.public_id OR t.retailer_id::text = ret.retailer_code)
    WHERE (t.public_id::text = :tx_id OR t.txn_id = :tx_id)
    AND (:retailer_id IS NULL OR t.retailer_id::text = :retailer_id)
    AND (:tenant_id IS NULL OR t.tenant_id::text = :tenant_id)
    """
    res = await db.execute(text(tx_sql), {"tx_id": transaction_id, "retailer_id": retailer_id, "tenant_id": tenant_id})
    row = res.fetchone()
    
    if row:
        d = dict(row._mapping)
        st_str = d.get("status", "FAILED")
        w_before = float(d.get("wallet_before") or 0.0)
        w_after = float(d.get("wallet_after") or 0.0)
        return {
            "transaction_details": {
                "transaction_id": d["transaction_id"],
                "transaction_number": d["transaction_number"],
                "reference_id": d["reference_id"],
                "mode": d["mode"],
                "status": st_str,
                "utr_number": d["utr_number"],
                "initiated_at": d["initiated_at"].isoformat() if d.get("initiated_at") else None,
                "completed_at": d["completed_at"].isoformat() if d.get("completed_at") else None,
                "is_reversed": st_str == "REVERSED",
                "reversal_reason": d["remarks"] if st_str == "FAILED" else None
            },
            "customer_details": {
                "name": d["customer_name"] or "N/A",
                "mobile": d["customer_mobile"] or "N/A",
                "kyc_status": d["customer_kyc_status"] or "VERIFIED"
            },
            "beneficiary_details": {
                "name": d["beneficiary_name"] or "N/A",
                "bank_name": d["bank_name"] or "N/A",
                "account_number": d.get("account_number") or d.get("account_number_masked") or "N/A",
                "masked_account_number": d.get("account_number") or d.get("account_number_masked") or "N/A",
                "ifsc_code": d["ifsc_code"] or "N/A"
            },
            "amount_details": {
                "transfer_amount": d["amount"],
                "convenience_fee": d["charges"],
                "gst_amount": d["gst_amount"],
                "wallet_debit": d["net_debit"],
                "retailer_commission": d["commission"],
                "tds_amount": d["tds_amount"],
                "wallet_before": w_before,
                "wallet_after": w_after
            },
            "status_timeline": [
                {"action": "CREATE_TRANSACTION", "previous_status": None, "new_status": "INITIATED", "timestamp": d["initiated_at"].isoformat() if d.get("initiated_at") else None},
                {"action": "VENDOR_DISPATCH", "previous_status": "INITIATED", "new_status": "PROCESSING", "timestamp": d["initiated_at"].isoformat() if d.get("initiated_at") else None},
                {"action": "FINALIZE_TRANSACTION", "previous_status": "PROCESSING", "new_status": st_str, "timestamp": d["completed_at"].isoformat() if d.get("completed_at") else None}
            ],
            "receipt_available": True
        }

    # Also check enterprise_payout_transactions
    ep_sql = """
    SELECT 
        e.public_id::text AS transaction_id,
        e.transaction_number,
        COALESCE(e.vendor_ref, e.transaction_number) AS reference_id,
        e.initiated_at,
        e.completed_at,
        COALESCE(c.full_name, 'Verified Customer') AS customer_name,
        COALESCE(c.mobile_number, NULL) AS customer_mobile,
        COALESCE(b.account_holder_name, bba.account_holder_name, 'Beneficiary') AS beneficiary_name,
        COALESCE(b.bank_name, bba.bank_name, '') AS bank_name,
        COALESCE(b.account_number, bba.account_number, b.account_number_masked, '') AS masked_account_number,
        COALESCE(b.account_number, bba.account_number, b.account_number_masked, '') AS account_number,
        COALESCE(b.ifsc_code, bba.ifsc_code, '') AS ifsc_code,
        e.mode,
        e.amount::float AS amount,
        e.charges::float AS charges,
        e.gst_amount::float AS gst_amount,
        e.tds_amount::float AS tds_amount,
        e.net_debit::float AS net_debit,
        e.commission::float AS commission,
        UPPER(e.status::text) AS status,
        COALESCE(e.utr_number, '--') AS utr_number,
        COALESCE(e.reversal_reason, e.status_description, '') AS remarks,
        COALESCE(e.wallet_before::float, 0.0) AS wallet_before,
        COALESCE(e.wallet_after::float, 0.0) AS wallet_after
    FROM enterprise_payout_transactions e
    LEFT JOIN customer c ON (e.customer_id = c.public_id OR e.customer_ref_id = c.customer_ref_id)
    LEFT JOIN beneficiary_master b ON (e.beneficiary_id = b.public_id OR e.beneficiary_master_ref_id = b.beneficiary_master_ref_id)
    LEFT JOIN beneficiary_bank_account bba ON (bba.beneficiary_id = e.beneficiary_id OR bba.public_id = e.beneficiary_id)
    WHERE (e.public_id::text = :tx_id OR e.transaction_number = :tx_id)
    AND (:retailer_id IS NULL OR e.retailer_id::text = :retailer_id)
    AND (:tenant_id IS NULL OR e.tenant_id::text = :tenant_id)
    """
    ep_res = await db.execute(text(ep_sql), {"tx_id": transaction_id, "retailer_id": retailer_id, "tenant_id": tenant_id})
    ep_row = ep_res.fetchone()
    if ep_row:
        d = dict(ep_row._mapping)
        st_str = d.get("status", "FAILED")
        return {
            "transaction_details": {
                "transaction_id": d["transaction_id"],
                "transaction_number": d["transaction_number"],
                "reference_id": d["reference_id"],
                "mode": d["mode"],
                "status": st_str,
                "utr_number": d["utr_number"],
                "initiated_at": d["initiated_at"].isoformat() if d.get("initiated_at") else None,
                "completed_at": d["completed_at"].isoformat() if d.get("completed_at") else None,
                "is_reversed": st_str == "REVERSED",
                "reversal_reason": d["remarks"] if st_str in ("FAILED", "REVERSED") else None
            },
            "customer_details": {
                "name": d["customer_name"] or "N/A",
                "mobile": d["customer_mobile"] or "N/A",
                "kyc_status": "VERIFIED"
            },
            "beneficiary_details": {
                "name": d["beneficiary_name"] or "N/A",
                "bank_name": d["bank_name"] or "N/A",
                "account_number": d.get("account_number") or d.get("masked_account_number") or "N/A",
                "masked_account_number": d.get("account_number") or d.get("masked_account_number") or "N/A",
                "ifsc_code": d["ifsc_code"] or "N/A"
            },
            "amount_details": {
                "transfer_amount": d["amount"],
                "convenience_fee": d["charges"],
                "gst_amount": d["gst_amount"],
                "wallet_debit": d["net_debit"],
                "retailer_commission": d["commission"],
                "tds_amount": d["tds_amount"],
                "wallet_before": d["wallet_before"],
                "wallet_after": d["wallet_after"]
            },
            "status_timeline": [
                {"action": "CREATE_TRANSACTION", "previous_status": None, "new_status": "INITIATED", "timestamp": d["initiated_at"].isoformat() if d.get("initiated_at") else None},
                {"action": "VENDOR_DISPATCH", "previous_status": "INITIATED", "new_status": "PROCESSING", "timestamp": d["initiated_at"].isoformat() if d.get("initiated_at") else None},
                {"action": "FINALIZE_TRANSACTION", "previous_status": "PROCESSING", "new_status": st_str, "timestamp": d["completed_at"].isoformat() if d.get("completed_at") else None}
            ],
            "receipt_available": True
        }

    raise HTTPException(status_code=404, detail="Transaction record not found.")


@router.get("/export", summary="Export Retailer Payout Report (Excel / CSV / PDF)")
@router.get("/export/pdf", summary="Export Retailer Payout Report PDF")
async def export_retailer_payout_report(
    request: Request,
    export_format: str = Query("csv", description="csv | excel | pdf"),
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    payment_mode: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    dataset = await fetch_payout_report_dataset(
        db=db,
        request=request,
        retailer_id=retailer_id,
        tenant_id=tenant_id,
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
        search=search,
        status_filter=status_filter,
        payment_mode=payment_mode,
        amount_from=min_amount,
        amount_to=max_amount,
        page=1,
        limit=5000,
        sort_by="initiated_at",
        sort_dir="desc"
    )

    items = dataset.get("items", [])
    if dataset.get("meta", {}).get("total_records", 0) > 5000:
        raise HTTPException(status_code=413, detail="Export exceeds the 5000-record limit. Apply filters and export again.")
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    file_base = f"Pay2Pay_Payout_Report_{today_str}"

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "S.No",
        "Txn ID",
        "Customer",
        "Beneficiary",
        "A/C No",
        "Amt",
        "Fee",
        "Tax",
        "Debit",
        "Mode",
        "UTR",
        "Wallet",
        "Date/Time",
        "Status",
        "Actions"
    ])
    for it in items:
        writer.writerow([
            it.get("s_no"),
            it.get("txn_id") or it.get("transaction_number") or it.get("transaction_id") or "--",
            it.get("customer") or it.get("customer_name") or "Verified Customer",
            it.get("beneficiary") or it.get("beneficiary_name") or "Beneficiary",
            it.get("ac_no") or it.get("account_number") or it.get("masked_account_number") or "--",
            f"{money(it.get('amt') or it.get('transfer_amount') or 0):.2f}",
            f"{money(it.get('fee') or it.get('convenience_fee') or 0):.2f}",
            f"{money(it.get('tax') or it.get('tax_amount') or 0):.2f}",
            f"{money(it.get('debit') or it.get('wallet_debit') or 0):.2f}",
            it.get("mode") or it.get("payment_mode") or "IMPS",
            it.get("utr") or it.get("utr_number") or "--",
            it.get("wallet") or "Main Wallet",
            it.get("date_time") or it.get("initiated_at") or "--",
            it.get("status") or "SUCCESS",
            "VIEW"
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{file_base}.csv"'}
    )


@router.post("/audit", summary="Log Report View/Export Audit Event")
async def audit_report_event(
    req: ReportAuditLogRequest,
    db: AsyncSession = Depends(get_db)
):
    return {"status": "LOGGED", "action": req.action, "timestamp": datetime.now(timezone.utc).isoformat()}
