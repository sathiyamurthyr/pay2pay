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

from app.core.database import get_db
from app.infrastructure.db.swipe_settlement_models import SwipeMachineSettlementModel, SwipeSettlementStatus

router = APIRouter(prefix="/reports/swipe-settlement", tags=["Swipe Machine Settlement Report"])

class SwipeSettlementAuditLogRequest(BaseModel):
    action: str = Field(..., description="REPORT_VIEWED | REPORT_EXPORTED | REPORT_PRINTED | SETTLEMENT_VIEWED")
    user_id: Optional[str] = None
    retailer_id: uuid.UUID
    tenant_id: uuid.UUID
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None

@router.get("/summary", summary="Get Swipe Machine Settlement Summary KPIs")
async def get_swipe_settlement_summary(
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now_utc = datetime.now(timezone.utc)
    start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 0, 0, 0, tzinfo=timezone.utc)
    end_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, 23, 59, 59, tzinfo=timezone.utc)
    start_of_month = datetime(now_utc.year, now_utc.month, 1, 0, 0, 0, tzinfo=timezone.utc)

    base_filter = [
        SwipeMachineSettlementModel.tenant_id == tenant_id,
        SwipeMachineSettlementModel.retailer_id == retailer_id,
    ]
    if company_id:
        base_filter.append(SwipeMachineSettlementModel.company_id == company_id)

    # Today's metrics
    today_filter = base_filter + [
        SwipeMachineSettlementModel.settlement_date >= start_of_today,
        SwipeMachineSettlementModel.settlement_date <= end_of_today,
    ]
    today_stmt = select(
        func.count(SwipeMachineSettlementModel.id).label("today_txns"),
        func.coalesce(func.sum(SwipeMachineSettlementModel.net_settlement_amount), 0.0).label("today_settlement")
    ).where(and_(*today_filter))
    today_res = (await db.execute(today_stmt)).fetchone()

    # Lifetime total settled amount
    tot_stmt = select(
        func.coalesce(func.sum(SwipeMachineSettlementModel.net_settlement_amount), 0.0)
    ).where(and_(*base_filter, SwipeMachineSettlementModel.status == SwipeSettlementStatus.SETTLED))
    tot_settled = (await db.execute(tot_stmt)).scalar() or 0.0

    # This Month total settled amount
    month_filter = base_filter + [
        SwipeMachineSettlementModel.settlement_date >= start_of_month,
        SwipeMachineSettlementModel.status == SwipeSettlementStatus.SETTLED
    ]
    month_stmt = select(
        func.coalesce(func.sum(SwipeMachineSettlementModel.net_settlement_amount), 0.0)
    ).where(and_(*month_filter))
    month_settled = (await db.execute(month_stmt)).scalar() or 0.0

    # Status breakdown
    st_stmt = select(
        SwipeMachineSettlementModel.status,
        func.count(SwipeMachineSettlementModel.id)
    ).where(and_(*base_filter)).group_by(SwipeMachineSettlementModel.status)
    st_rows = (await db.execute(st_stmt)).fetchall()
    st_map = {row[0]: row[1] for row in st_rows}

    pending_cnt = st_map.get(SwipeSettlementStatus.PENDING, 0) + st_map.get(SwipeSettlementStatus.PROCESSING, 0)
    failed_cnt = st_map.get(SwipeSettlementStatus.FAILED, 0)

    return {
        "todays_settlement": round(float(today_res.today_settlement), 2) if today_res else 0.0,
        "todays_transactions": today_res.today_txns if today_res else 0,
        "total_settlement_amount": round(float(tot_settled), 2),
        "pending_settlement": pending_cnt,
        "failed_settlement": failed_cnt,
        "this_month_settlement": round(float(month_settled), 2)
    }

@router.get("/list", summary="Get Filtered Paginated Swipe Settlement Report")
async def get_swipe_settlement_list(
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    settlement_id: Optional[str] = Query(None),
    transaction_id: Optional[str] = Query(None),
    terminal_id: Optional[str] = Query(None),
    merchant_id: Optional[str] = Query(None),
    card_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    amount_from: Optional[float] = Query(None),
    amount_to: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("settlement_date"),
    sort_dir: str = Query("desc"),
    db: AsyncSession = Depends(get_db)
):
    filters = [
        SwipeMachineSettlementModel.tenant_id == tenant_id,
        SwipeMachineSettlementModel.retailer_id == retailer_id,
    ]
    if company_id:
        filters.append(SwipeMachineSettlementModel.company_id == company_id)

    if from_date:
        try:
            f_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            filters.append(SwipeMachineSettlementModel.settlement_date >= f_dt)
        except ValueError:
            pass

    if to_date:
        try:
            t_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            filters.append(SwipeMachineSettlementModel.settlement_date <= t_dt)
        except ValueError:
            pass

    if settlement_id:
        filters.append(SwipeMachineSettlementModel.settlement_number.ilike(f"%{settlement_id}%"))
    if transaction_id:
        filters.append(SwipeMachineSettlementModel.transaction_number.ilike(f"%{transaction_id}%"))
    if terminal_id:
        filters.append(SwipeMachineSettlementModel.terminal_id.ilike(f"%{terminal_id}%"))
    if merchant_id:
        filters.append(SwipeMachineSettlementModel.merchant_id.ilike(f"%{merchant_id}%"))

    if card_type and card_type.upper() != "ALL":
        filters.append(SwipeMachineSettlementModel.card_type.ilike(f"%{card_type}%"))

    if status_filter and status_filter.upper() != "ALL":
        filters.append(SwipeMachineSettlementModel.status == status_filter.upper())

    if amount_from is not None:
        filters.append(SwipeMachineSettlementModel.transaction_amount >= amount_from)
    if amount_to is not None:
        filters.append(SwipeMachineSettlementModel.transaction_amount <= amount_to)

    # Base Select
    stmt = select(SwipeMachineSettlementModel).where(and_(*filters))

    # Footer Totals calculation
    totals_stmt = select(
        func.count(SwipeMachineSettlementModel.id).label("total_txns"),
        func.coalesce(func.sum(SwipeMachineSettlementModel.transaction_amount), 0.0).label("gross_amount"),
        func.coalesce(func.sum(SwipeMachineSettlementModel.mdr_charge), 0.0).label("total_mdr"),
        func.coalesce(func.sum(SwipeMachineSettlementModel.gst_amount), 0.0).label("total_gst"),
        func.coalesce(func.sum(SwipeMachineSettlementModel.tds_amount), 0.0).label("total_tds"),
        func.coalesce(func.sum(SwipeMachineSettlementModel.other_charges), 0.0).label("other_charges"),
        func.coalesce(func.sum(SwipeMachineSettlementModel.net_settlement_amount), 0.0).label("total_net"),
        func.coalesce(func.sum(func.cast(SwipeMachineSettlementModel.status == SwipeSettlementStatus.PENDING, Integer) * SwipeMachineSettlementModel.net_settlement_amount), 0.0).label("pending_amount"),
    ).where(and_(*filters))

    totals_res = (await db.execute(totals_stmt)).fetchone()
    total_txns = totals_res.total_txns if totals_res else 0

    # Sorting & Pagination
    sort_column = getattr(SwipeMachineSettlementModel, sort_by, SwipeMachineSettlementModel.settlement_date)
    if sort_dir.lower() == "asc":
        stmt = stmt.order_by(asc(sort_column))
    else:
        stmt = stmt.order_by(desc(sort_column))

    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)

    results = (await db.execute(stmt)).scalars().all()

    items = []
    for idx, row in enumerate(results, start=offset + 1):
        st_str = row.status.value if hasattr(row.status, "value") else str(row.status)
        items.append({
            "s_no": idx,
            "settlement_id": str(row.public_id),
            "settlement_number": row.settlement_number,
            "transaction_number": row.transaction_number,
            "order_id": row.order_id,
            "terminal_id": row.terminal_id,
            "merchant_id": row.merchant_id,
            "bank_name": row.bank_name,
            "card_type": row.card_type,
            "card_network": row.card_network,
            "masked_card_number": row.masked_card_number,
            "transaction_amount": row.transaction_amount,
            "mdr_charge": round(row.mdr_charge, 2),
            "gst_amount": round(row.gst_amount, 2),
            "tds_amount": round(row.tds_amount, 2),
            "other_charges": round(row.other_charges, 2),
            "net_settlement_amount": round(row.net_settlement_amount, 2),
            "settlement_bank_account": row.settlement_bank_account,
            "utr_number": row.utr_number if st_str == "SETTLED" else "--",
            "status": st_str,
            "settlement_date": row.settlement_date.isoformat() if row.settlement_date else None,
            "transaction_date": row.transaction_date.isoformat() if row.transaction_date else None,
            "remarks": row.remarks or f"Swipe settlement {st_str}"
        })

    pages = (total_txns + limit - 1) // limit if limit > 0 else 1

    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_records": total_txns,
            "total_pages": pages
        },
        "footer_totals": {
            "total_transactions": totals_res.total_txns if totals_res else 0,
            "gross_transaction_amount": round(float(totals_res.gross_amount), 2) if totals_res else 0.0,
            "total_mdr": round(float(totals_res.total_mdr), 2) if totals_res else 0.0,
            "total_gst": round(float(totals_res.total_gst), 2) if totals_res else 0.0,
            "total_tds": round(float(totals_res.total_tds), 2) if totals_res else 0.0,
            "other_charges": round(float(totals_res.other_charges), 2) if totals_res else 0.0,
            "total_net_settlement": round(float(totals_res.total_net), 2) if totals_res else 0.0,
            "pending_settlement_amount": round(float(totals_res.pending_amount), 2) if totals_res else 0.0,
        }
    }

@router.get("/{settlement_id}/details", summary="Get Sanitized Swipe Settlement Details for Drawer")
async def get_swipe_settlement_details(
    settlement_id: uuid.UUID,
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SwipeMachineSettlementModel).where(
        and_(
            SwipeMachineSettlementModel.public_id == settlement_id,
            SwipeMachineSettlementModel.tenant_id == tenant_id,
            SwipeMachineSettlementModel.retailer_id == retailer_id
        )
    )
    row = (await db.execute(stmt)).scalars().first()
    if not row:
        raise HTTPException(status_code=404, detail="Settlement record not found.")

    st_str = row.status.value if hasattr(row.status, "value") else str(row.status)

    return {
        "settlement_details": {
            "settlement_id": str(row.public_id),
            "settlement_number": row.settlement_number,
            "transaction_number": row.transaction_number,
            "order_id": row.order_id,
            "utr_number": row.utr_number if st_str == "SETTLED" else "--",
            "status": st_str,
            "settlement_date": row.settlement_date.isoformat() if row.settlement_date else None,
            "transaction_date": row.transaction_date.isoformat() if row.transaction_date else None
        },
        "pos_details": {
            "terminal_id": row.terminal_id,
            "merchant_id": row.merchant_id,
            "card_type": row.card_type,
            "card_network": row.card_network,
            "masked_card_number": row.masked_card_number
        },
        "bank_details": {
            "bank_name": row.bank_name,
            "settlement_account": row.settlement_bank_account
        },
        "amount_details": {
            "gross_transaction_amount": row.transaction_amount,
            "mdr_charge": row.mdr_charge,
            "gst_amount": row.gst_amount,
            "tds_amount": row.tds_amount,
            "other_charges": row.other_charges,
            "net_settlement_amount": row.net_settlement_amount
        },
        "remarks": row.remarks
    }

@router.post("/export", summary="Export Swipe Settlement Report (CSV / Excel / PDF)")
async def export_swipe_settlement_report(
    export_format: str = Query(..., description="csv | excel | pdf"),
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    res_dict = await get_swipe_settlement_list(
        retailer_id=retailer_id,
        tenant_id=tenant_id,
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
        status_filter=status_filter,
        page=1,
        limit=1000,
        db=db
    )
    items = res_dict.get("items", [])

    if export_format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "S.No", "Settlement Date", "Txn Date", "Settlement ID", "Txn ID", "Order ID",
            "TID", "MID", "Bank Name", "Card Type", "Card Network", "Masked Card",
            "Gross Amount", "MDR", "GST", "TDS", "Other Charges", "Net Settlement",
            "Settlement Bank Account", "UTR", "Status"
        ])
        for it in items:
            writer.writerow([
                it["s_no"], it["settlement_date"], it["transaction_date"], it["settlement_number"],
                it["transaction_number"], it["order_id"], it["terminal_id"], it["merchant_id"],
                it["bank_name"], it["card_type"], it["card_network"], it["masked_card_number"],
                it["transaction_amount"], it["mdr_charge"], it["gst_amount"], it["tds_amount"],
                it["other_charges"], it["net_settlement_amount"], it["settlement_bank_account"],
                it["utr_number"], it["status"]
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=Swipe_Machine_Settlement_Report.csv"}
        )

    return {"format": export_format, "total_records": len(items), "data": items}

@router.post("/audit", summary="Log Swipe Settlement Audit Event")
async def audit_swipe_settlement_event(
    req: SwipeSettlementAuditLogRequest,
    db: AsyncSession = Depends(get_db)
):
    print(f"[AUDIT LOG] {req.action} | Retailer: {req.retailer_id} | Tenant: {req.tenant_id} | IP: {req.ip_address}")
    return {"status": "LOGGED", "action": req.action, "timestamp": datetime.now(timezone.utc).isoformat()}
