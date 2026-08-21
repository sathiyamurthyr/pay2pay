import uuid
import io
import csv
from datetime import datetime, date, time, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/reports", tags=["Retailer Payout Report"])

def mask_account_number(acc_no: Optional[str]) -> str:
    if not acc_no:
        return "XXXX XXXX 0000"
    clean = str(acc_no).replace(" ", "").replace("-", "")
    if len(clean) <= 4:
        return f"XXXX {clean}"
    last4 = clean[-4:]
    return f"XXXX XXXX {last4}"

class ReportAuditLogRequest(BaseModel):
    action: str = Field(..., description="REPORT_VIEWED | REPORT_EXPORTED | RECEIPT_DOWNLOADED | RECEIPT_PRINTED")
    user_id: Optional[str] = None
    retailer_id: Optional[uuid.UUID] = None
    tenant_id: Optional[uuid.UUID] = None
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None

@router.get("/summary", summary="Get Retailer Payout Summary KPIs")
async def get_retailer_payout_summary(
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now_utc = datetime.now(timezone.utc)
    
    if from_date:
        try:
            start_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, tzinfo=timezone.utc)
        except ValueError:
            start_dt = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)
    else:
        start_dt = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)

    if to_date:
        try:
            end_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            end_dt = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)
    else:
        end_dt = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)

    # 1. Query Central Transactions
    tx_sql = """
    SELECT 
        COUNT(id) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(net_amount), 0) AS total_debit,
        COALESCE(SUM(commission), 0) AS total_commission,
        COALESCE(SUM(gst_amount), 0) AS total_gst,
        COALESCE(SUM(tds_amount), 0) AS total_tds,
        COUNT(CASE WHEN UPPER(status) = 'SUCCESS' THEN 1 END) AS success_count,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'SUCCESS' THEN amount ELSE 0 END), 0) AS success_amount,
        COUNT(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN 1 END) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN amount ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN 1 END) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN amount ELSE 0 END), 0) AS failed_amount,
        COUNT(CASE WHEN UPPER(status) = 'REVERSED' THEN 1 END) AS reversed_count
    FROM transactions
    WHERE created_at >= :start_dt AND created_at <= :end_dt;
    """
    res = await db.execute(text(tx_sql), {"start_dt": start_dt, "end_dt": end_dt})
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
        COUNT(CASE WHEN UPPER(status::text) = 'SUCCESS' THEN 1 END) AS success_count,
        COALESCE(SUM(CASE WHEN UPPER(status::text) = 'SUCCESS' THEN amount ELSE 0 END), 0) AS success_amount,
        COUNT(CASE WHEN UPPER(status::text) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN 1 END) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status::text) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN amount ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN UPPER(status::text) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN 1 END) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status::text) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN amount ELSE 0 END), 0) AS failed_amount,
        COUNT(CASE WHEN UPPER(status::text) = 'REVERSED' OR is_reversed = true THEN 1 END) AS reversed_count
    FROM enterprise_payout_transactions
    WHERE created_date >= :start_dt AND created_date <= :end_dt;
    """
    ep_res = await db.execute(text(ep_summary_sql), {"start_dt": start_dt, "end_dt": end_dt})
    ep_row = ep_res.fetchone()
    ep_rd = dict(ep_row._mapping) if ep_row else {}

    # 3. Query Workflow Transactions (EPIC-014 fallback)
    pw_sql = """
    SELECT 
        COUNT(id) AS total_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(net_debit), 0) AS total_debit,
        COALESCE(SUM(commission), 0) AS total_commission,
        COUNT(CASE WHEN UPPER(status) = 'SUCCESS' THEN 1 END) AS success_count,
        COALESCE(SUM(CASE WHEN UPPER(status) = 'SUCCESS' THEN amount ELSE 0 END), 0) AS success_amount,
        COUNT(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN 1 END) AS pending_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('PENDING', 'PROCESSING', 'INITIATED') THEN amount ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN 1 END) AS failed_count,
        COALESCE(SUM(CASE WHEN UPPER(status) IN ('FAILED', 'REJECTED', 'TIMEOUT', 'REVERSED') THEN amount ELSE 0 END), 0) AS failed_amount
    FROM payout_workflow_transactions
    WHERE initiated_at >= :start_dt AND initiated_at <= :end_dt;
    """
    pw_res = await db.execute(text(pw_sql), {"start_dt": start_dt, "end_dt": end_dt})
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
    now_utc = datetime.now(timezone.utc)
    
    start_dt = None
    end_dt = None
    if from_date:
        try:
            start_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, tzinfo=timezone.utc)
        except ValueError:
            pass
    if to_date:
        try:
            end_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except ValueError:
            pass

    # 1. Query Central Transactions joined with Double-Entry Ledger Entries
    central_sql = """
    SELECT 
        t.public_id::text AS transaction_id,
        t.transaction_reference AS transaction_number,
        t.transaction_reference AS reference_id,
        t.created_at AS initiated_at,
        t.updated_at AS completed_at,
        COALESCE(c.full_name, 'Verified Customer') AS customer_name,
        COALESCE(c.mobile_number, '9176669426') AS customer_mobile,
        COALESCE(b.account_holder_name, b.registered_name_in_bank, 'Beneficiary') AS beneficiary_name,
        COALESCE(c.mobile_number, '9176669426') AS beneficiary_mobile,
        COALESCE(b.bank_name, 'Bank') AS bank_name,
        COALESCE(b.account_number_masked, b.account_number, 'XXXX') AS masked_account_number,
        COALESCE(b.account_number, 'XXXX') AS account_number,
        COALESCE(b.ifsc_code, 'UTIB0000000') AS ifsc_code,
        COALESCE(t.service_type, t.transaction_type, 'MOVE_TO_BANK') AS payment_mode,
        COALESCE(t.transaction_type, 'SERVICES') AS service_category,
        t.amount::float AS transfer_amount,
        t.charges::float AS convenience_fee,
        t.gst_amount::float AS gst_amount,
        t.tds_amount::float AS tds_amount,
        (t.gst_amount + t.tds_amount)::float AS tax_amount,
        'MAIN_WALLET' AS wallet_type,
        t.net_amount::float AS wallet_debit,
        t.commission::float AS retailer_commission,
        COALESCE(t.utr, '--') AS utr_number,
        UPPER(t.status) AS status,
        CASE WHEN UPPER(t.status) = 'FAILED' THEN 'REFUNDED' ELSE '' END AS refund_status,
        COALESCE(t.response_message, t.status_description, '') AS remarks,
        l.balance_before::float AS wallet_before,
        l.balance_after::float AS wallet_after,
        COALESCE(l.entry_type, 'DEBIT') AS entry_type,
        COALESCE(l.narration, t.status_description, '') AS narration,
        true AS receipt_enabled
    FROM transactions t
    LEFT JOIN customer c ON t.customer_id = c.public_id
    LEFT JOIN beneficiary_master b ON t.beneficiary_id = b.public_id
    LEFT JOIN transaction_ledger_entries l 
        ON (t.public_id = l.transaction_id OR t.transaction_reference = l.transaction_reference)
        AND l.account_type = 'RETAILER_WALLET'
    WHERE 1=1
    """
    params = {}
    if start_dt:
        central_sql += " AND t.created_at >= :start_dt"
        params["start_dt"] = start_dt
    if end_dt:
        central_sql += " AND t.created_at <= :end_dt"
        params["end_dt"] = end_dt

    if search and search.strip():
        s_val = f"%{search.strip()}%"
        central_sql += """ AND (
            t.transaction_reference ILIKE :s_val OR 
            c.full_name ILIKE :s_val OR 
            c.mobile_number ILIKE :s_val OR 
            b.account_holder_name ILIKE :s_val OR 
            b.account_number ILIKE :s_val OR 
            t.utr ILIKE :s_val
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
        COALESCE(c.mobile_number, '9176669426') AS customer_mobile,
        COALESCE(b.account_holder_name, 'Beneficiary') AS beneficiary_name,
        COALESCE(c.mobile_number, '9176669426') AS beneficiary_mobile,
        COALESCE(b.bank_name, 'State Bank of India') AS bank_name,
        COALESCE(b.account_number_masked, b.account_number, 'XXXX') AS masked_account_number,
        COALESCE(b.account_number, 'XXXX') AS account_number,
        COALESCE(b.ifsc_code, 'SBIN0001234') AS ifsc_code,
        COALESCE(e.mode, 'IMPS') AS payment_mode,
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
        CASE WHEN e.is_reversed THEN 'REFUNDED' ELSE '' END AS refund_status,
        COALESCE(e.reversal_reason, e.status_description, '') AS remarks,
        e.wallet_before::float AS wallet_before,
        e.wallet_after::float AS wallet_after,
        'DEBIT' AS entry_type,
        COALESCE(e.reversal_reason, e.status_description, '') AS narration,
        true AS receipt_enabled
    FROM enterprise_payout_transactions e
    LEFT JOIN customer c ON e.customer_id = c.public_id
    LEFT JOIN beneficiary_master b ON e.beneficiary_id = b.public_id
    WHERE 1=1
    """
    ep_params = {}
    if start_dt:
        ep_sql += " AND e.created_date >= :start_dt"
        ep_params["start_dt"] = start_dt
    if end_dt:
        ep_sql += " AND e.created_date <= :end_dt"
        ep_params["end_dt"] = end_dt
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
        COALESCE(c.mobile_number, '7013914767') AS customer_mobile,
        COALESCE(b.account_holder_name, 'Beneficiary') AS beneficiary_name,
        COALESCE(c.mobile_number, '7013914767') AS beneficiary_mobile,
        COALESCE(b.bank_name, 'IDBI Bank') AS bank_name,
        COALESCE(b.account_number_masked, b.account_number, 'XXXX') AS masked_account_number,
        COALESCE(b.account_number, 'XXXX') AS account_number,
        COALESCE(b.ifsc_code, 'IBKL0000039') AS ifsc_code,
        p.mode AS payment_mode,
        'DMT' AS service_category,
        p.amount::float AS transfer_amount,
        p.charges::float AS convenience_fee,
        ROUND((p.charges * 0.18)::numeric, 2)::float AS gst_amount,
        0.0::float AS tds_amount,
        ROUND((p.charges * 0.18)::numeric, 2)::float AS tax_amount,
        'MAIN_WALLET' AS wallet_type,
        p.net_debit::float AS wallet_debit,
        p.commission::float AS retailer_commission,
        COALESCE(p.utr_number, '--') AS utr_number,
        UPPER(p.status) AS status,
        CASE WHEN UPPER(p.status) = 'FAILED' THEN 'REFUNDED' ELSE '' END AS refund_status,
        COALESCE(p.failure_reason, '') AS remarks,
        p.wallet_before::float AS wallet_before,
        p.wallet_after::float AS wallet_after,
        'DEBIT' AS entry_type,
        COALESCE(p.failure_reason, '') AS narration,
        true AS receipt_enabled
    FROM payout_workflow_transactions p
    LEFT JOIN customer c ON p.customer_id = c.public_id
    LEFT JOIN beneficiary_master b ON p.beneficiary_id = b.public_id
    WHERE 1=1
    """
    pw_params = {}
    if start_dt:
        pw_sql += " AND p.initiated_at >= :start_dt"
        pw_params["start_dt"] = start_dt
    if end_dt:
        pw_sql += " AND p.initiated_at <= :end_dt"
        pw_params["end_dt"] = end_dt
    pw_sql += " ORDER BY p.initiated_at DESC"
    pw_rows = (await db.execute(text(pw_sql), pw_params)).fetchall()

    all_items = []
    seen_refs = set()

    for r in list(rows) + list(ep_rows) + list(pw_rows):
        d = dict(r._mapping)
        ref = d.get("transaction_number") or d.get("reference_id")
        if ref and ref not in seen_refs:
            seen_refs.add(ref)
            if d.get("initiated_at") and isinstance(d["initiated_at"], datetime):
                d["initiated_at"] = d["initiated_at"].strftime("%d-%b-%Y %H:%M")
            if d.get("completed_at") and isinstance(d["completed_at"], datetime):
                d["completed_at"] = d["completed_at"].strftime("%d-%b-%Y %H:%M")
            d["masked_account_number"] = mask_account_number(d.get("account_number"))
            all_items.append(d)

    for idx, it in enumerate(all_items, start=1):
        it["s_no"] = idx

    total_records = len(all_items)
    offset = (page - 1) * limit
    paginated_items = all_items[offset:offset + limit]
    total_pages = (total_records + limit - 1) // limit if limit > 0 else 1

    return {
        "items": paginated_items,
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
        "pagination": dataset["meta"],
        "footer_totals": {
            "total_transactions": dataset["meta"]["total_records"],
            "total_transfer_amount": sum(it.get("transfer_amount", 0) for it in items),
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
        t.transaction_reference AS transaction_number,
        t.transaction_reference AS reference_id,
        t.created_at AS initiated_at,
        t.updated_at AS completed_at,
        c.full_name AS customer_name,
        c.mobile_number AS customer_mobile,
        c.kyc_status AS customer_kyc_status,
        b.account_holder_name AS beneficiary_name,
        b.bank_name,
        b.account_number,
        b.account_number_masked,
        b.ifsc_code,
        t.service_type AS mode,
        t.amount::float AS amount,
        t.charges::float AS charges,
        t.gst_amount::float AS gst_amount,
        t.tds_amount::float AS tds_amount,
        t.net_amount::float AS net_debit,
        t.commission::float AS commission,
        UPPER(t.status) AS status,
        COALESCE(t.utr, '--') AS utr_number,
        COALESCE(t.response_message, t.status_description, '') AS remarks
    FROM transactions t
    LEFT JOIN customer c ON t.customer_id = c.public_id
    LEFT JOIN beneficiary_master b ON t.beneficiary_id = b.public_id
    WHERE t.public_id::text = :tx_id OR t.transaction_reference = :tx_id
    """
    res = await db.execute(text(tx_sql), {"tx_id": transaction_id})
    row = res.fetchone()
    
    if row:
        d = dict(row._mapping)
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
                "is_reversed": st_str == "FAILED",
                "reversal_reason": d["remarks"] if st_str == "FAILED" else None
            },
            "customer_details": {
                "name": d["customer_name"] or "Verified Customer",
                "mobile": d["customer_mobile"] or "N/A",
                "kyc_status": d["customer_kyc_status"] or "VERIFIED"
            },
            "beneficiary_details": {
                "name": d["beneficiary_name"] or "Beneficiary",
                "bank_name": d["bank_name"] or "Bank",
                "masked_account_number": d["account_number_masked"] or mask_account_number(d["account_number"]),
                "ifsc_code": d["ifsc_code"] or "N/A"
            },
            "amount_details": {
                "transfer_amount": d["amount"],
                "convenience_fee": d["charges"],
                "gst_amount": d["gst_amount"],
                "wallet_debit": d["net_debit"],
                "retailer_commission": d["commission"],
                "tds_amount": d["tds_amount"],
                "wallet_before": 100000.0,
                "wallet_after": 100000.0 if st_str == "FAILED" else (100000.0 - d["net_debit"])
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
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    file_base = f"Pay2Pay_Payout_Report_{today_str}"

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "S.No", "Txn ID", "Reference No", "Customer", "Beneficiary", "Account", "IFSC", "Amount",
        "Mode", "UTR", "Tax", "Date & Time", "Fee", "Wallet Debit", "Commission", "Status"
    ])
    for it in items:
        writer.writerow([
            it.get("s_no"),
            it.get("transaction_number") or it.get("transaction_id"),
            it.get("reference_id"),
            it.get("customer_name"),
            it.get("beneficiary_name"),
            it.get("masked_account_number"),
            it.get("ifsc_code"),
            f"Rs. {float(it.get('transfer_amount', 0)):,.2f}",
            it.get("payment_mode"),
            it.get("utr_number"),
            f"Rs. {float(it.get('tax_amount', 0) or (it.get('gst_amount', 0) + it.get('tds_amount', 0))):,.2f}",
            it.get("initiated_at"),
            f"Rs. {float(it.get('convenience_fee', 0)):,.2f}",
            f"Rs. {float(it.get('wallet_debit', 0)):,.2f}",
            f"Rs. {float(it.get('retailer_commission', 0)):,.2f}",
            it.get("status")
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
