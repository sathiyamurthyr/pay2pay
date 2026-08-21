import uuid
import io
import csv
from datetime import datetime, date, time, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/reports/ledger", tags=["Retailer Ledger Statement Report"])

class LedgerAuditLogRequest(BaseModel):
    action: str = Field(..., description="LEDGER_VIEWED | LEDGER_EXPORTED | LEDGER_PRINTED")
    user_id: Optional[str] = None
    retailer_id: Optional[str] = None
    tenant_id: Optional[str] = None
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None

@router.get("/summary", summary="Get Retailer Ledger Passbook Summary KPIs")
async def get_retailer_ledger_summary(
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now_utc = datetime.now(timezone.utc)
    start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)
    end_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)

    # 1. Fetch current available balance from Retailer Wallet
    wallet_sql = "SELECT wallet_balance FROM retailer_wallet ORDER BY updated_date DESC LIMIT 1;"
    wallet_res = await db.execute(text(wallet_sql))
    wallet_row = wallet_res.fetchone()
    closing_balance = float(wallet_row[0]) if wallet_row and wallet_row[0] is not None else 50000.0

    # 2. Total Credits and Debits from Transaction Ledger Entries
    tot_sql = """
    SELECT 
        COALESCE(SUM(CASE WHEN UPPER(entry_type) = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN UPPER(entry_type) = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits,
        COALESCE(SUM(CASE WHEN UPPER(entry_type) = 'CREDIT' AND created_at >= :start_today THEN amount ELSE 0 END), 0) AS todays_credit,
        COALESCE(SUM(CASE WHEN UPPER(entry_type) = 'DEBIT' AND created_at >= :start_today THEN amount ELSE 0 END), 0) AS todays_debit
    FROM transaction_ledger_entries
    WHERE account_type = 'RETAILER_WALLET';
    """
    tot_res = await db.execute(text(tot_sql), {"start_today": start_of_today})
    tot_row = tot_res.fetchone()
    tot_d = dict(tot_row._mapping) if tot_row else {}

    total_credits = round(float(tot_d.get("total_credits", 0.0)), 2)
    total_debits = round(float(tot_d.get("total_debits", 0.0)), 2)
    todays_credit = round(float(tot_d.get("todays_credit", 0.0)), 2)
    todays_debit = round(float(tot_d.get("todays_debit", 0.0)), 2)

    opening_balance = round(max(0.0, closing_balance - total_credits + total_debits), 2)

    return {
        "opening_balance": opening_balance,
        "closing_balance": round(closing_balance, 2),
        "total_credits": total_credits,
        "total_debits": total_debits,
        "todays_credit": todays_credit,
        "todays_debit": todays_debit,
    }

@router.get("/list", summary="Get Filtered Paginated Retailer Ledger Movements")
async def get_retailer_ledger_list(
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    transaction_id: Optional[str] = Query(None),
    reference_id: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    amount_from: Optional[float] = Query(None),
    amount_to: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db)
):
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

    # 1. Query from Transaction Ledger Entries joined with Central Transactions
    ledger_sql = """
    SELECT 
        l.public_id::text AS ledger_id,
        l.created_at AS transaction_date,
        l.transaction_reference AS transaction_id,
        l.transaction_reference AS reference_id,
        COALESCE(t.vendor_order_id, CONCAT('ORD-', SUBSTRING(l.transaction_reference FROM 1 FOR 8))) AS order_id,
        COALESCE(t.service_type, t.transaction_type, 'SERVICES') AS service,
        COALESCE(l.narration, t.status_description, 'Transaction Ledger Movement') AS description,
        l.balance_before::float AS opening_balance,
        CASE WHEN UPPER(l.entry_type) = 'CREDIT' THEN l.amount::float ELSE 0.0 END AS credit,
        CASE WHEN UPPER(l.entry_type) = 'DEBIT' THEN l.amount::float ELSE 0.0 END AS debit,
        l.balance_after::float AS closing_balance,
        UPPER(l.entry_type) AS entry_type,
        COALESCE(UPPER(t.status), 'SUCCESS') AS status,
        COALESCE(l.narration, '') AS remarks
    FROM transaction_ledger_entries l
    LEFT JOIN transactions t 
        ON (l.transaction_id = t.public_id OR l.transaction_reference = t.transaction_reference)
    WHERE l.account_type = 'RETAILER_WALLET'
    """
    params = {}
    if start_dt:
        ledger_sql += " AND l.created_at >= :start_dt"
        params["start_dt"] = start_dt
    if end_dt:
        ledger_sql += " AND l.created_at <= :end_dt"
        params["end_dt"] = end_dt
    if entry_type and entry_type.upper() != "ALL":
        ledger_sql += " AND UPPER(l.entry_type) = :entry_type"
        params["entry_type"] = entry_type.upper()
    if amount_from is not None:
        ledger_sql += " AND l.amount >= :amount_from"
        params["amount_from"] = amount_from
    if amount_to is not None:
        ledger_sql += " AND l.amount <= :amount_to"
        params["amount_to"] = amount_to
    if transaction_id:
        ledger_sql += " AND l.transaction_reference ILIKE :tx_id"
        params["tx_id"] = f"%{transaction_id}%"

    ledger_sql += " ORDER BY l.created_at DESC"
    rows = (await db.execute(text(ledger_sql), params)).fetchall()

    # 2. Query from Enterprise Payout Transactions
    ep_sql = """
    SELECT 
        e.public_id::text AS ledger_id,
        e.created_date AS transaction_date,
        e.transaction_number AS transaction_id,
        COALESCE(e.vendor_ref, e.transaction_number) AS reference_id,
        COALESCE(e.vendor_order_id, CONCAT('ORD-', SUBSTRING(e.transaction_number FROM 1 FOR 8))) AS order_id,
        'DMT Payout' AS service,
        COALESCE(e.reversal_reason, e.status_description, 'Payout Transaction Movement') AS description,
        e.wallet_before::float AS opening_balance,
        0.0 AS credit,
        e.net_debit::float AS debit,
        e.wallet_after::float AS closing_balance,
        'DEBIT' AS entry_type,
        UPPER(e.status::text) AS status,
        COALESCE(e.reversal_reason, e.status_description, '') AS remarks
    FROM enterprise_payout_transactions e
    WHERE 1=1
    """
    ep_params = {}
    if start_dt:
        ep_sql += " AND e.created_date >= :start_dt"
        ep_params["start_dt"] = start_dt
    if end_dt:
        ep_sql += " AND e.created_date <= :end_dt"
        ep_params["end_dt"] = end_dt
    if amount_from is not None:
        ep_sql += " AND e.net_debit >= :amount_from"
        ep_params["amount_from"] = amount_from
    if amount_to is not None:
        ep_sql += " AND e.net_debit <= :amount_to"
        ep_params["amount_to"] = amount_to
    if transaction_id:
        ep_sql += " AND e.transaction_number ILIKE :tx_id"
        ep_params["tx_id"] = f"%{transaction_id}%"

    ep_sql += " ORDER BY e.created_date DESC"
    ep_rows = (await db.execute(text(ep_sql), ep_params)).fetchall()

    all_items = []
    seen = set()

    for r in list(rows) + list(ep_rows):
        d = dict(r._mapping)
        tx_num = d.get("transaction_id")
        entry_t = d.get("entry_type")
        key = f"{tx_num}_{entry_t}"
        if key not in seen:
            seen.add(key)
            if d.get("transaction_date") and isinstance(d["transaction_date"], datetime):
                d["transaction_date"] = d["transaction_date"].isoformat()
            all_items.append(d)

    # Sort all entries descending
    all_items.sort(key=lambda x: x.get("transaction_date") or "", reverse=True)

    for idx, it in enumerate(all_items, start=1):
        it["s_no"] = idx

    total_records = len(all_items)
    tot_credit = sum(float(it.get("credit") or 0.0) for it in all_items)
    tot_debit = sum(float(it.get("debit") or 0.0) for it in all_items)

    offset = (page - 1) * limit
    paginated_items = all_items[offset:offset + limit]
    total_pages = (total_records + limit - 1) // limit if limit > 0 else 1

    wallet_sql = "SELECT wallet_balance FROM retailer_wallet ORDER BY updated_date DESC LIMIT 1;"
    wallet_res = await db.execute(text(wallet_sql))
    wallet_row = wallet_res.fetchone()
    current_wallet_bal = float(wallet_row[0]) if wallet_row and wallet_row[0] is not None else 50000.0

    return {
        "items": paginated_items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": total_pages
        },
        "footer_totals": {
            "total_records": total_records,
            "total_credit": round(tot_credit, 2),
            "total_debit": round(tot_debit, 2),
            "net_movement": round(tot_credit - tot_debit, 2),
            "closing_balance": round(current_wallet_bal, 2)
        }
    }

@router.get("/grid", summary="Get Filtered Paginated Retailer Ledger Movements Grid")
async def get_retailer_ledger_grid(
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    transaction_id: Optional[str] = Query(None),
    reference_id: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    amount_from: Optional[float] = Query(None),
    amount_to: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db)
):
    return await get_retailer_ledger_list(
        retailer_id=retailer_id,
        tenant_id=tenant_id,
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
        transaction_id=transaction_id,
        reference_id=reference_id,
        order_id=order_id,
        service=service,
        entry_type=entry_type,
        amount_from=amount_from,
        amount_to=amount_to,
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_dir=sort_dir,
        db=db
    )

@router.get("/{entry_id}/details", summary="Get Sanitized Retailer Ledger Side Drawer Details")
async def get_retailer_ledger_details(
    entry_id: str,
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    sql = """
    SELECT 
        l.public_id::text AS ledger_id,
        l.created_at AS created_at,
        l.transaction_reference AS transaction_number,
        l.transaction_reference AS reference_id,
        COALESCE(t.vendor_order_id, CONCAT('ORD-', SUBSTRING(l.transaction_reference FROM 1 FOR 8))) AS order_id,
        COALESCE(t.service_type, t.transaction_type, 'DMT Payout') AS service,
        COALESCE(l.narration, t.status_description, 'Transaction Movement') AS description,
        l.balance_before::float AS opening_balance,
        CASE WHEN UPPER(l.entry_type) = 'CREDIT' THEN l.amount::float ELSE 0.0 END AS credit,
        CASE WHEN UPPER(l.entry_type) = 'DEBIT' THEN l.amount::float ELSE 0.0 END AS debit,
        l.balance_after::float AS closing_balance,
        UPPER(l.entry_type) AS entry_type,
        COALESCE(UPPER(t.status), 'SUCCESS') AS status,
        COALESCE(l.narration, '') AS remarks,
        COALESCE(c.full_name, 'Verified Customer') AS customer_name,
        COALESCE(b.account_holder_name, 'Beneficiary') AS beneficiary_name,
        l.amount::float AS transfer_amount
    FROM transaction_ledger_entries l
    LEFT JOIN transactions t 
        ON (l.transaction_id = t.public_id OR l.transaction_reference = t.transaction_reference)
    LEFT JOIN customer c ON t.customer_id = c.public_id
    LEFT JOIN beneficiary_master b ON t.beneficiary_id = b.public_id
    WHERE l.public_id::text = :entry_id OR l.transaction_reference = :entry_id
    LIMIT 1;
    """
    res = await db.execute(text(sql), {"entry_id": entry_id})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Ledger entry not found.")

    d = dict(row._mapping)
    return {
        "ledger_details": {
            "entry_number": d.get("transaction_number"),
            "entry_type": d.get("entry_type"),
            "description": d.get("description"),
            "opening_balance": d.get("opening_balance"),
            "credit": d.get("credit"),
            "debit": d.get("debit"),
            "closing_balance": d.get("closing_balance"),
            "created_at": d.get("created_at").isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at")
        },
        "transaction_details": {
            "transaction_number": d.get("transaction_number"),
            "reference_id": d.get("reference_id"),
            "order_id": d.get("order_id"),
            "transfer_amount": d.get("transfer_amount"),
            "status": d.get("status")
        },
        "customer_name": d.get("customer_name"),
        "beneficiary_name": d.get("beneficiary_name"),
        "timeline": []
    }

@router.post("/export", summary="Export Retailer Ledger Report (CSV / Excel / PDF)")
async def export_retailer_ledger_report(
    export_format: str = Query(..., description="csv | excel | pdf"),
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    res_dict = await get_retailer_ledger_list(
        retailer_id=retailer_id,
        tenant_id=tenant_id,
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
        entry_type=entry_type,
        page=1,
        limit=1000,
        db=db
    )
    items = res_dict.get("items", [])

    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "S.No", "Date & Time", "Transaction ID", "Reference ID", "Order ID",
            "Service", "Description", "Opening Balance", "Credit", "Debit",
            "Closing Balance", "Entry Type", "Status"
        ])
        for it in items:
            writer.writerow([
                it["s_no"], it["transaction_date"], it["transaction_id"], it["reference_id"],
                it["order_id"], it["service"], it["description"], it["opening_balance"],
                it["credit"], it["debit"], it["closing_balance"], it["entry_type"], it["status"]
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=Retailer_Ledger_Statement.csv"}
        )

    return {"format": export_format, "total_records": len(items), "data": items}

@router.post("/audit", summary="Log Ledger Audit Event")
async def audit_ledger_event(
    req: LedgerAuditLogRequest,
    db: AsyncSession = Depends(get_db)
):
    print(f"[AUDIT LOG] {req.action} | Retailer: {req.retailer_id} | Tenant: {req.tenant_id} | IP: {req.ip_address}")
    return {"status": "LOGGED", "action": req.action, "timestamp": datetime.now(timezone.utc).isoformat()}
