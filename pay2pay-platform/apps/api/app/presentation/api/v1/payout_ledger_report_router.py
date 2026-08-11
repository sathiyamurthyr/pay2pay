import uuid
import io
import csv
from datetime import datetime, date, time, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_, desc, asc, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.infrastructure.db.models import RetailerWalletModel
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutTransactionStatus, PayoutDoubleEntryLedgerModel, PayoutAuditLogModel
)
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel

router = APIRouter(prefix="/reports/ledger", tags=["Retailer Ledger Statement Report"])

class LedgerAuditLogRequest(BaseModel):
    action: str = Field(..., description="LEDGER_VIEWED | LEDGER_EXPORTED | LEDGER_PRINTED")
    user_id: Optional[str] = None
    retailer_id: uuid.UUID
    tenant_id: uuid.UUID
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None

@router.get("/summary", summary="Get Retailer Ledger Passbook Summary KPIs")
async def get_retailer_ledger_summary(
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now_utc = datetime.now(timezone.utc)
    start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)
    end_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)

    # 1. Fetch current available balance from Retailer Wallet
    wallet_stmt = select(RetailerWalletModel).where(
        and_(
            RetailerWalletModel.retailer_id == retailer_id,
            RetailerWalletModel.tenant_id == tenant_id
        )
    )
    wallet = (await db.execute(wallet_stmt)).scalars().first()
    closing_balance = wallet.wallet_balance if wallet else 0.0

    # 2. Total Credits and Debits for Retailer Wallet entries joined with PayoutTransaction
    base_filter = [
        EnterprisePayoutTransactionModel.tenant_id == tenant_id,
        EnterprisePayoutTransactionModel.retailer_id == retailer_id,
        PayoutDoubleEntryLedgerModel.account_type == "RETAILER_WALLET"
    ]
    if company_id:
        base_filter.append(EnterprisePayoutTransactionModel.company_id == company_id)

    tot_stmt = (
        select(
            PayoutDoubleEntryLedgerModel.entry_type,
            func.coalesce(func.sum(PayoutDoubleEntryLedgerModel.amount), 0.0)
        )
        .join(EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel.transaction_id == EnterprisePayoutTransactionModel.public_id)
        .where(and_(*base_filter))
        .group_by(PayoutDoubleEntryLedgerModel.entry_type)
    )

    tot_rows = (await db.execute(tot_stmt)).fetchall()
    type_map = {row[0]: float(row[1]) for row in tot_rows}

    total_credits = round(type_map.get("CREDIT", 0.0), 2)
    total_debits = round(type_map.get("DEBIT", 0.0), 2)

    # 3. Today's Credits and Debits
    today_filter = base_filter + [
        PayoutDoubleEntryLedgerModel.created_date >= start_of_today,
        PayoutDoubleEntryLedgerModel.created_date <= end_of_today
    ]

    today_stmt = (
        select(
            PayoutDoubleEntryLedgerModel.entry_type,
            func.coalesce(func.sum(PayoutDoubleEntryLedgerModel.amount), 0.0)
        )
        .join(EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel.transaction_id == EnterprisePayoutTransactionModel.public_id)
        .where(and_(*today_filter))
        .group_by(PayoutDoubleEntryLedgerModel.entry_type)
    )

    today_rows = (await db.execute(today_stmt)).fetchall()
    today_map = {row[0]: float(row[1]) for row in today_rows}

    todays_credit = round(today_map.get("CREDIT", 0.0), 2)
    todays_debit = round(today_map.get("DEBIT", 0.0), 2)

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
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
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
    filters = [
        EnterprisePayoutTransactionModel.tenant_id == tenant_id,
        EnterprisePayoutTransactionModel.retailer_id == retailer_id,
        PayoutDoubleEntryLedgerModel.account_type == "RETAILER_WALLET"
    ]
    if company_id:
        filters.append(EnterprisePayoutTransactionModel.company_id == company_id)

    if from_date:
        try:
            f_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            filters.append(PayoutDoubleEntryLedgerModel.created_date >= f_dt)
        except ValueError:
            pass

    if to_date:
        try:
            t_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            filters.append(PayoutDoubleEntryLedgerModel.created_date <= t_dt)
        except ValueError:
            pass

    if entry_type and entry_type.upper() != "ALL":
        filters.append(PayoutDoubleEntryLedgerModel.entry_type == entry_type.upper())

    if amount_from is not None:
        filters.append(PayoutDoubleEntryLedgerModel.amount >= amount_from)

    if amount_to is not None:
        filters.append(PayoutDoubleEntryLedgerModel.amount <= amount_to)

    # Base Join
    stmt = (
        select(
            PayoutDoubleEntryLedgerModel,
            EnterprisePayoutTransactionModel
        )
        .join(EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel.transaction_id == EnterprisePayoutTransactionModel.public_id)
        .where(and_(*filters))
    )

    if transaction_id:
        stmt = stmt.where(or_(
            PayoutDoubleEntryLedgerModel.entry_number.ilike(f"%{transaction_id}%"),
            EnterprisePayoutTransactionModel.transaction_number.ilike(f"%{transaction_id}%")
        ))

    if reference_id:
        stmt = stmt.where(or_(
            EnterprisePayoutTransactionModel.vendor_ref.ilike(f"%{reference_id}%"),
            EnterprisePayoutTransactionModel.idempotency_key.ilike(f"%{reference_id}%")
        ))

    # Calculate Totals for Footer
    totals_stmt = (
        select(
            func.count(PayoutDoubleEntryLedgerModel.id).label("total_records"),
            func.coalesce(func.sum(func.cast(PayoutDoubleEntryLedgerModel.entry_type == "CREDIT", Integer) * PayoutDoubleEntryLedgerModel.amount), 0.0).label("tot_credit"),
            func.coalesce(func.sum(func.cast(PayoutDoubleEntryLedgerModel.entry_type == "DEBIT", Integer) * PayoutDoubleEntryLedgerModel.amount), 0.0).label("tot_debit")
        )
        .select_from(PayoutDoubleEntryLedgerModel)
        .join(EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel.transaction_id == EnterprisePayoutTransactionModel.public_id)
        .where(and_(*filters))
    )

    totals_res = (await db.execute(totals_stmt)).fetchone()
    total_records = totals_res.total_records if totals_res else 0

    # Apply Sorting
    sort_column = getattr(PayoutDoubleEntryLedgerModel, sort_by, PayoutDoubleEntryLedgerModel.created_date)
    if sort_dir.lower() == "asc":
        stmt = stmt.order_by(asc(sort_column))
    else:
        stmt = stmt.order_by(desc(sort_column))

    # Apply Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)

    results = (await db.execute(stmt)).all()

    items = []
    tot_cred_calc = 0.0
    tot_deb_calc = 0.0

    for idx, row in enumerate(results, start=offset + 1):
        leg: PayoutDoubleEntryLedgerModel = row[0]
        tx: Optional[EnterprisePayoutTransactionModel] = row[1]

        credit_val = leg.amount if leg.entry_type == "CREDIT" else 0.0
        debit_val = leg.amount if leg.entry_type == "DEBIT" else 0.0

        tot_cred_calc += credit_val
        tot_deb_calc += debit_val

        closing_bal = leg.balance_after
        opening_bal = (closing_bal + leg.amount) if leg.entry_type == "DEBIT" else max(0.0, closing_bal - leg.amount)

        st_str = "SUCCESS"
        if tx and hasattr(tx, "status"):
            st_str = tx.status.value if hasattr(tx.status, "value") else str(tx.status)

        service_name = "DMT Payout"
        if leg.is_reversal_entry:
            service_name = "Payout Reversal"
        elif "Commission" in leg.description:
            service_name = "Commission Settlement"

        items.append({
            "s_no": idx,
            "ledger_id": str(leg.public_id),
            "transaction_date": leg.created_date.isoformat() if leg.created_date else None,
            "transaction_id": tx.transaction_number if tx else leg.entry_number,
            "reference_id": tx.vendor_ref or tx.idempotency_key if tx else leg.entry_number,
            "order_id": tx.vendor_order_id if (tx and hasattr(tx, "vendor_order_id") and tx.vendor_order_id) else f"ORD-{leg.entry_number[-8:]}",
            "service": service_name,
            "description": leg.description,
            "opening_balance": round(opening_bal, 2),
            "credit": round(credit_val, 2),
            "debit": round(debit_val, 2),
            "closing_balance": round(closing_bal, 2),
            "entry_type": leg.entry_type,
            "status": st_str,
            "remarks": leg.description
        })

    wallet_stmt = select(RetailerWalletModel.wallet_balance).where(
        and_(
            RetailerWalletModel.retailer_id == retailer_id,
            RetailerWalletModel.tenant_id == tenant_id
        )
    )
    current_wallet_bal = (await db.execute(wallet_stmt)).scalar() or 0.0

    pages = (total_records + limit - 1) // limit if limit > 0 else 1

    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_records": total_records,
            "total_pages": pages
        },
        "footer_totals": {
            "total_records": total_records,
            "total_credit": round(tot_cred_calc, 2),
            "total_debit": round(tot_deb_calc, 2),
            "net_movement": round(tot_cred_calc - tot_deb_calc, 2),
            "closing_balance": round(current_wallet_bal, 2)
        }
    }

@router.get("/{entry_id}/details", summary="Get Sanitized Retailer Ledger Side Drawer Details")
async def get_retailer_ledger_details(
    entry_id: uuid.UUID,
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PayoutDoubleEntryLedgerModel, EnterprisePayoutTransactionModel)
        .join(EnterprisePayoutTransactionModel, PayoutDoubleEntryLedgerModel.transaction_id == EnterprisePayoutTransactionModel.public_id)
        .where(
            and_(
                PayoutDoubleEntryLedgerModel.public_id == entry_id,
                EnterprisePayoutTransactionModel.tenant_id == tenant_id,
                EnterprisePayoutTransactionModel.retailer_id == retailer_id
            )
        )
    )
    res_row = (await db.execute(stmt)).first()
    if not res_row:
        raise HTTPException(status_code=404, detail="Ledger entry not found.")

    leg: PayoutDoubleEntryLedgerModel = res_row[0]
    tx: EnterprisePayoutTransactionModel = res_row[1]

    cust = None
    bene = None
    if tx:
        c_res = await db.execute(select(CustomerModel).where(CustomerModel.public_id == tx.customer_id))
        cust = c_res.scalars().first()
        b_res = await db.execute(select(BeneficiaryModel).where(BeneficiaryModel.public_id == tx.beneficiary_id))
        bene = b_res.scalars().first()

    credit_val = leg.amount if leg.entry_type == "CREDIT" else 0.0
    debit_val = leg.amount if leg.entry_type == "DEBIT" else 0.0

    closing_bal = leg.balance_after
    opening_bal = (closing_bal + leg.amount) if leg.entry_type == "DEBIT" else max(0.0, closing_bal - leg.amount)

    timeline = []
    if tx and tx.audit_logs:
        for log in tx.audit_logs:
            timeline.append({
                "action": log.action,
                "status": log.new_status,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "details": log.details
            })

    return {
        "ledger_details": {
            "entry_number": leg.entry_number,
            "entry_type": leg.entry_type,
            "description": leg.description,
            "opening_balance": round(opening_bal, 2),
            "credit": round(credit_val, 2),
            "debit": round(debit_val, 2),
            "closing_balance": round(closing_bal, 2),
            "created_at": leg.created_date.isoformat() if leg.created_date else None
        },
        "transaction_details": {
            "transaction_number": tx.transaction_number if tx else leg.entry_number,
            "reference_id": tx.vendor_ref or tx.idempotency_key if tx else leg.entry_number,
            "order_id": tx.vendor_order_id if (tx and hasattr(tx, "vendor_order_id") and tx.vendor_order_id) else f"ORD-{leg.entry_number[-8:]}",
            "transfer_amount": tx.amount if tx else leg.amount,
            "status": tx.status.value if (tx and hasattr(tx.status, "value")) else "SUCCESS"
        },
        "customer_name": cust.full_name if cust else "N/A",
        "beneficiary_name": bene.full_name if bene else "N/A",
        "timeline": timeline
    }

@router.post("/export", summary="Export Retailer Ledger Report (CSV / Excel / PDF)")
async def export_retailer_ledger_report(
    export_format: str = Query(..., description="csv | excel | pdf"),
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
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
