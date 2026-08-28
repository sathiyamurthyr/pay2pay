import uuid
import io
import csv
import re
from datetime import datetime, date, time, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.infrastructure.db.models import RetailerModel, RetailerContactModel, RetailerWalletModel

router = APIRouter(prefix="/reports/ledger", tags=["Retailer Ledger Statement Report"])

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

class LedgerAuditLogRequest(BaseModel):
    action: str = Field(..., description="LEDGER_VIEWED | LEDGER_EXPORTED | LEDGER_PRINTED")
    user_id: Optional[str] = None
    retailer_id: Optional[str] = None
    tenant_id: Optional[str] = None
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None


async def resolve_ledger_retailer(
    request: Optional[Request],
    retailer_id: Optional[str],
    tenant_id: Optional[str],
    company_id: Optional[str],
    db: AsyncSession
) -> Dict[str, Any]:
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

    if target_uuid:
        ret_uuid = target_uuid
        ret_row = (await db.execute(select(RetailerModel).where(RetailerModel.public_id == target_uuid, RetailerModel.is_deleted == False))).scalars().first()
        if ret_row:
            ret_code = ret_row.retailer_code
            if not t_uuid and ret_row.tenant_id:
                t_uuid = ret_row.tenant_id
            if not c_uuid and ret_row.company_id:
                c_uuid = ret_row.company_id
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

    if not ret_uuid and token_payload.get("sub"):
        sub_uuid = parse_uuid_or_none(str(token_payload.get("sub")))
        if sub_uuid:
            ret_row = (await db.execute(select(RetailerModel).where(RetailerModel.public_id == sub_uuid, RetailerModel.is_deleted == False))).scalars().first()
            if ret_row:
                ret_uuid = ret_row.public_id
                ret_code = ret_row.retailer_code

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


@router.get("/summary", summary="Get Retailer Ledger Passbook Summary KPIs")
async def get_retailer_ledger_summary(
    request: Request,
    retailer_id: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    ctx = await resolve_ledger_retailer(request, retailer_id, tenant_id, company_id, db)
    ret_uuid = ctx["retailer_uuid"]
    ret_code = ctx["retailer_code"]

    now_utc = datetime.now(timezone.utc)
    start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)
    end_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)

    # 1. Fetch current available balance specifically for THIS Retailer's Wallet
    closing_balance = 0.0
    if ret_uuid:
        wal_stmt = select(RetailerWalletModel.wallet_balance).where(RetailerWalletModel.retailer_id == ret_uuid)
        wal_res = await db.execute(wal_stmt)
        wal_bal = wal_res.scalar()
        if wal_bal is not None:
            closing_balance = float(wal_bal)
    elif ret_code:
        wal_sql = """
        SELECT rw.wallet_balance FROM retailer_wallet rw
        JOIN retailer r ON rw.retailer_id = r.public_id
        WHERE r.retailer_code = :ret_code
        """
        wal_res = await db.execute(text(wal_sql), {"ret_code": ret_code})
        wal_row = wal_res.fetchone()
        if wal_row and wal_row[0] is not None:
            closing_balance = float(wal_row[0])

    # 2. Total Credits and Debits from Transaction Ledger Entries scoped to retailer
    tot_sql = """
    SELECT 
        COALESCE(SUM(CASE WHEN UPPER(l.entry_type) = 'CREDIT' THEN l.amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN UPPER(l.entry_type) = 'DEBIT' THEN l.amount ELSE 0 END), 0) AS total_debits,
        COALESCE(SUM(CASE WHEN UPPER(l.entry_type) = 'CREDIT' AND l.created_at >= :start_today THEN l.amount ELSE 0 END), 0) AS todays_credit,
        COALESCE(SUM(CASE WHEN UPPER(l.entry_type) = 'DEBIT' AND l.created_at >= :start_today THEN l.amount ELSE 0 END), 0) AS todays_debit
    FROM transaction_ledger_entries l
    LEFT JOIN transactions t ON (l.transaction_id = t.public_id OR l.transaction_reference = t.transaction_reference)
    WHERE l.account_type = 'RETAILER_WALLET'
    """
    tot_params: Dict[str, Any] = {"start_today": start_of_today}
    if ret_uuid:
        tot_sql += " AND (t.retailer_id = :ret_uuid OR t.retailer_id::text = :ret_uuid_str"
        tot_params["ret_uuid"] = ret_uuid
        tot_params["ret_uuid_str"] = str(ret_uuid)
        if ret_code:
            tot_sql += " OR t.retailer_id::text = :ret_code"
            tot_params["ret_code"] = ret_code
        tot_sql += ")"
    elif ret_code:
        tot_sql += " AND t.retailer_id::text = :ret_code"
        tot_params["ret_code"] = ret_code

    tot_res = await db.execute(text(tot_sql), tot_params)
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
    request: Request,
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
    ctx = await resolve_ledger_retailer(request, retailer_id, tenant_id, company_id, db)
    ret_uuid = ctx["retailer_uuid"]
    ret_code = ctx["retailer_code"]

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
    params: Dict[str, Any] = {}
    if ret_uuid:
        ledger_sql += " AND (t.retailer_id = :ret_uuid OR t.retailer_id::text = :ret_uuid_str"
        params["ret_uuid"] = ret_uuid
        params["ret_uuid_str"] = str(ret_uuid)
        if ret_code:
            ledger_sql += " OR t.retailer_id::text = :ret_code"
            params["ret_code"] = ret_code
        ledger_sql += ")"
    elif ret_code:
        ledger_sql += " AND t.retailer_id::text = :ret_code"
        params["ret_code"] = ret_code

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
    ep_params: Dict[str, Any] = {}
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

    all_items.sort(key=lambda x: x.get("transaction_date") or "", reverse=True)

    for idx, it in enumerate(all_items, start=1):
        it["s_no"] = idx

    total_records = len(all_items)
    tot_credit = sum(float(it.get("credit") or 0.0) for it in all_items)
    tot_debit = sum(float(it.get("debit") or 0.0) for it in all_items)

    offset = (page - 1) * limit
    paginated_items = all_items[offset:offset + limit]
    total_pages = (total_records + limit - 1) // limit if limit > 0 else 1

    current_wallet_bal = 0.0
    if ret_uuid:
        wal_stmt = select(RetailerWalletModel.wallet_balance).where(RetailerWalletModel.retailer_id == ret_uuid)
        wal_res = await db.execute(wal_stmt)
        wal_bal = wal_res.scalar()
        if wal_bal is not None:
            current_wallet_bal = float(wal_bal)

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
    request: Request,
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
        request=request,
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
    request: Request,
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
        request=request,
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
    return {"status": "LOGGED", "action": req.action, "timestamp": datetime.now(timezone.utc).isoformat()}
