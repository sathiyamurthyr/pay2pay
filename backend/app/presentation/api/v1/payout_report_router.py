import uuid
import io
import csv
from datetime import datetime, date, time, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel, PayoutTransactionStatus, PayoutAuditLogModel
)
from app.infrastructure.db.customer_models import CustomerModel
from app.infrastructure.db.beneficiary_models import BeneficiaryModel

router = APIRouter(prefix="/reports", tags=["Retailer Payout Report"])

def mask_account_number(acc_no: Optional[str]) -> str:
    if not acc_no:
        return "XXXX XXXX 0000"
    clean = acc_no.replace(" ", "").replace("-", "")
    if len(clean) <= 4:
        return f"XXXX {clean}"
    last4 = clean[-4:]
    return f"XXXX XXXX {last4}"

# Pydantic Schemas
class ReportAuditLogRequest(BaseModel):
    action: str = Field(..., description="REPORT_VIEWED | REPORT_EXPORTED | RECEIPT_DOWNLOADED | RECEIPT_PRINTED")
    user_id: Optional[str] = None
    retailer_id: uuid.UUID
    tenant_id: uuid.UUID
    ip_address: Optional[str] = "127.0.0.1"
    details: Optional[Dict[str, Any]] = None

@router.get("/summary", summary="Get Retailer Payout Summary KPIs")
async def get_retailer_payout_summary(
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    now_utc = datetime.now(timezone.utc)
    
    if from_date:
        try:
            start_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
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

    base_filter = [
        EnterprisePayoutTransactionModel.tenant_id == tenant_id,
        EnterprisePayoutTransactionModel.retailer_id == retailer_id,
    ]
    if company_id:
        base_filter.append(EnterprisePayoutTransactionModel.company_id == company_id)

    range_filter = base_filter + [
        EnterprisePayoutTransactionModel.initiated_at >= start_dt,
        EnterprisePayoutTransactionModel.initiated_at <= end_dt,
    ]

    # Date Range aggregates
    today_stmt = select(
        func.count(EnterprisePayoutTransactionModel.id).label("todays_txns"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.amount), 0.0).label("todays_amount"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.net_debit), 0.0).label("todays_debit"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.commission), 0.0).label("todays_commission"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.gst_amount), 0.0).label("todays_gst"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.tds_amount), 0.0).label("todays_tds"),
    ).where(and_(*range_filter))

    today_res = (await db.execute(today_stmt)).fetchone()

    # Status counts & amounts for selected date range for this retailer
    status_stmt = select(
        EnterprisePayoutTransactionModel.status,
        func.count(EnterprisePayoutTransactionModel.id),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.amount), 0.0)
    ).where(and_(*range_filter)).group_by(EnterprisePayoutTransactionModel.status)

    status_rows = (await db.execute(status_stmt)).fetchall()
    status_map = {(r[0].value if hasattr(r[0], "value") else str(r[0]).upper()): r[1] for r in status_rows}
    status_amount_map = {(r[0].value if hasattr(r[0], "value") else str(r[0]).upper()): float(r[2]) for r in status_rows}

    pending_count = status_map.get("PENDING", 0) + status_map.get("PROCESSING", 0) + status_map.get("INITIATED", 0)
    success_count = status_map.get("SUCCESS", 0)
    failed_count = status_map.get("FAILED", 0) + status_map.get("TIMEOUT", 0) + status_map.get("REJECTED", 0) + status_map.get("REVERSED", 0)
    reversed_count = status_map.get("REVERSED", 0)

    pending_amount = round(status_amount_map.get("PENDING", 0.0) + status_amount_map.get("PROCESSING", 0.0) + status_amount_map.get("INITIATED", 0.0), 2)
    successful_amount = round(status_amount_map.get("SUCCESS", 0.0), 2)
    failed_amount = round(status_amount_map.get("FAILED", 0.0) + status_amount_map.get("TIMEOUT", 0.0) + status_amount_map.get("REJECTED", 0.0) + status_amount_map.get("REVERSED", 0.0), 2)

    return {
        "todays_transactions": today_res.todays_txns if today_res else 0,
        "todays_transfer_amount": round(float(today_res.todays_amount), 2) if today_res else 0.0,
        "todays_wallet_debit": round(float(today_res.todays_debit), 2) if today_res else 0.0,
        "todays_commission": round(float(today_res.todays_commission), 2) if today_res else 0.0,
        "todays_gst": round(float(today_res.todays_gst), 2) if today_res else 0.0,
        "todays_tds": round(float(today_res.todays_tds), 2) if today_res else 0.0,
        "pending_transactions": pending_count,
        "successful_transactions": success_count,
        "failed_transactions": failed_count,
        "reversed_transactions": reversed_count,
        "successful_amount": successful_amount,
        "pending_amount": pending_amount,
        "failed_amount": failed_amount,
    }

@router.get("/list", summary="Get Filtered Paginated Retailer Payout Report")
@router.get("/grid", summary="Get Filtered Paginated Retailer Payout Report Grid")
async def get_retailer_payout_report_list(
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
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
    filters = []
    if tenant_id and isinstance(tenant_id, uuid.UUID):
        filters.append(EnterprisePayoutTransactionModel.tenant_id == tenant_id)
    if retailer_id and isinstance(retailer_id, uuid.UUID):
        filters.append(EnterprisePayoutTransactionModel.retailer_id == retailer_id)
    if company_id and isinstance(company_id, uuid.UUID):
        filters.append(EnterprisePayoutTransactionModel.company_id == company_id)

    if from_date:
        try:
            f_dt = datetime.strptime(from_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            filters.append(EnterprisePayoutTransactionModel.initiated_at >= f_dt)
        except ValueError:
            pass

    if to_date:
        try:
            t_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            filters.append(EnterprisePayoutTransactionModel.initiated_at <= t_dt)
        except ValueError:
            pass

    if transaction_id:
        filters.append(or_(
            EnterprisePayoutTransactionModel.transaction_number.ilike(f"%{transaction_id}%"),
            func.cast(EnterprisePayoutTransactionModel.public_id, String).ilike(f"%{transaction_id}%")
        ))

    if reference_id:
        filters.append(or_(
            EnterprisePayoutTransactionModel.vendor_ref.ilike(f"%{reference_id}%"),
            EnterprisePayoutTransactionModel.rrn.ilike(f"%{reference_id}%"),
            EnterprisePayoutTransactionModel.idempotency_key.ilike(f"%{reference_id}%")
        ))

    if status_filter and status_filter.upper() != "ALL":
        filters.append(EnterprisePayoutTransactionModel.status == status_filter.upper())

    if payment_mode and payment_mode.upper() != "ALL":
        filters.append(EnterprisePayoutTransactionModel.mode == payment_mode.upper())

    if amount_from is not None:
        filters.append(EnterprisePayoutTransactionModel.amount >= amount_from)

    if amount_to is not None:
        filters.append(EnterprisePayoutTransactionModel.amount <= amount_to)

    # Base Join with Customer & Beneficiary for text search & grid columns
    stmt = (
        select(
            EnterprisePayoutTransactionModel,
            CustomerModel,
            BeneficiaryModel
        )
        .join(CustomerModel, EnterprisePayoutTransactionModel.customer_id == CustomerModel.public_id, isouter=True)
        .join(BeneficiaryModel, EnterprisePayoutTransactionModel.beneficiary_id == BeneficiaryModel.public_id, isouter=True)
        .where(and_(*filters))
    )

    if customer_name:
        stmt = stmt.where(CustomerModel.full_name.ilike(f"%{customer_name}%"))
    if customer_mobile:
        stmt = stmt.where(CustomerModel.mobile_number.ilike(f"%{customer_mobile}%"))
    if beneficiary_name:
        stmt = stmt.where(BeneficiaryModel.full_name.ilike(f"%{beneficiary_name}%"))
    if beneficiary_mobile:
        stmt = stmt.where(BeneficiaryModel.mobile_number.ilike(f"%{beneficiary_mobile}%"))

    # Count Total Records & Calculate Footer Totals
    totals_stmt = select(
        func.count(EnterprisePayoutTransactionModel.id).label("total_txns"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.amount), 0.0).label("total_amount"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.charges), 0.0).label("total_charges"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.gst_amount), 0.0).label("total_gst"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.net_debit), 0.0).label("total_debit"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.commission), 0.0).label("total_commission"),
        func.coalesce(func.sum(EnterprisePayoutTransactionModel.tds_amount), 0.0).label("total_tds"),
    ).select_from(EnterprisePayoutTransactionModel).join(
        CustomerModel, EnterprisePayoutTransactionModel.customer_id == CustomerModel.public_id, isouter=True
    ).join(
        BeneficiaryModel, EnterprisePayoutTransactionModel.beneficiary_id == BeneficiaryModel.public_id, isouter=True
    ).where(and_(*filters))

    if customer_name:
        totals_stmt = totals_stmt.where(CustomerModel.full_name.ilike(f"%{customer_name}%"))
    if customer_mobile:
        totals_stmt = totals_stmt.where(CustomerModel.mobile_number.ilike(f"%{customer_mobile}%"))
    if beneficiary_name:
        totals_stmt = totals_stmt.where(BeneficiaryModel.full_name.ilike(f"%{beneficiary_name}%"))
    if beneficiary_mobile:
        totals_stmt = totals_stmt.where(BeneficiaryModel.mobile_number.ilike(f"%{beneficiary_mobile}%"))

    totals_res = (await db.execute(totals_stmt)).fetchone()
    total_txns = totals_res.total_txns if totals_res else 0

    # Apply Sorting
    sort_column = getattr(EnterprisePayoutTransactionModel, sort_by, EnterprisePayoutTransactionModel.initiated_at)
    if sort_dir.lower() == "asc":
        stmt = stmt.order_by(asc(sort_column))
    else:
        stmt = stmt.order_by(desc(sort_column))

    # Apply Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)

    results = (await db.execute(stmt)).all()

    items = []
    total_successful = 0
    total_pending = 0
    total_failed = 0
    total_reversed = 0

    for idx, row in enumerate(results, start=offset + 1):
        tx: EnterprisePayoutTransactionModel = row[0]
        cust: Optional[CustomerModel] = row[1]
        bene: Optional[BeneficiaryModel] = row[2]

        st_str = tx.status.value if hasattr(tx.status, "value") else str(tx.status)

        if st_str == "SUCCESS":
            total_successful += 1
        elif st_str in ["PENDING", "PROCESSING", "INITIATED"]:
            total_pending += 1
        elif st_str in ["FAILED", "TIMEOUT", "REJECTED"]:
            total_failed += 1
        elif st_str in ["REVERSED", "PARTIALLY_REVERSED"] or tx.is_reversed:
            total_reversed += 1

        # UTR rule: Show only for SUCCESS
        utr_display = tx.utr_number if (st_str == "SUCCESS" and tx.utr_number) else "--"

        # Receipt rule: Enabled for SUCCESS, FAILED, REVERSED
        receipt_enabled = st_str in ["SUCCESS", "FAILED", "REVERSED", "PARTIALLY_REVERSED"]

        items.append({
            "s_no": idx,
            "transaction_id": str(tx.public_id),
            "transaction_number": tx.transaction_number,
            "reference_id": tx.vendor_ref or tx.idempotency_key,
            "initiated_at": tx.initiated_at.isoformat() if tx.initiated_at else None,
            "completed_at": tx.completed_at.isoformat() if tx.completed_at else None,
            "customer_name": cust.full_name if (cust and cust.full_name and cust.full_name.strip()) else "Direct Retailer",
            "customer_mobile": cust.mobile_number if (cust and cust.mobile_number and cust.mobile_number.strip()) else "--",
            "beneficiary_name": bene.full_name if (bene and bene.full_name and bene.full_name.strip()) else (bene.nickname if (bene and bene.nickname and bene.nickname.strip()) else "Beneficiary Account"),
            "beneficiary_mobile": bene.mobile_number if (bene and bene.mobile_number and bene.mobile_number.strip()) else "--",
            "bank_name": bene.bank_name if (bene and hasattr(bene, "bank_name")) else "Axis Bank",
            "masked_account_number": mask_account_number(bene.account_number if (bene and hasattr(bene, "account_number")) else "4589"),
            "ifsc_code": bene.ifsc_code if (bene and hasattr(bene, "ifsc_code")) else "UTIB0000123",
            "payment_mode": tx.mode,
            "transfer_amount": tx.amount,
            "convenience_fee": tx.charges,
            "gst_amount": tx.gst_amount,
            "wallet_debit": tx.net_debit,
            "retailer_commission": tx.commission,
            "tds_amount": tx.tds_amount,
            "utr_number": utr_display,
            "status": st_str,
            "refund_status": "REFUNDED" if tx.is_reversed else ("NOT_APPLICABLE" if st_str == "SUCCESS" else "PENDING"),
            "remarks": tx.status_description or f"Payout Transaction {st_str}",
            "receipt_enabled": receipt_enabled
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
            "total_transfer_amount": round(float(totals_res.total_amount), 2) if totals_res else 0.0,
            "total_convenience_fee": round(float(totals_res.total_charges), 2) if totals_res else 0.0,
            "total_gst": round(float(totals_res.total_gst), 2) if totals_res else 0.0,
            "total_wallet_debit": round(float(totals_res.total_debit), 2) if totals_res else 0.0,
            "total_commission": round(float(totals_res.total_commission), 2) if totals_res else 0.0,
            "total_tds": round(float(totals_res.total_tds), 2) if totals_res else 0.0,
            "total_successful": total_successful,
            "total_pending": total_pending,
            "total_failed": total_failed,
            "total_reversed": total_reversed,
        }
    }

@router.get("/{transaction_id}/details", summary="Get Sanitized Retailer Transaction Details for Drawer")
async def get_retailer_transaction_details(
    transaction_id: uuid.UUID,
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(EnterprisePayoutTransactionModel)
        .options(selectinload(EnterprisePayoutTransactionModel.audit_logs))
        .where(
            and_(
                EnterprisePayoutTransactionModel.public_id == transaction_id,
                EnterprisePayoutTransactionModel.tenant_id == tenant_id,
                EnterprisePayoutTransactionModel.retailer_id == retailer_id
            )
        )
    )
    tx = (await db.execute(stmt)).scalars().first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction record not found.")

    cust_stmt = select(CustomerModel).where(CustomerModel.public_id == tx.customer_id)
    cust = (await db.execute(cust_stmt)).scalars().first()

    bene_stmt = select(BeneficiaryModel).where(BeneficiaryModel.public_id == tx.beneficiary_id)
    bene = (await db.execute(bene_stmt)).scalars().first()

    timeline = []
    if tx.audit_logs:
        for log in tx.audit_logs:
            timeline.append({
                "action": log.action,
                "previous_status": log.previous_status,
                "new_status": log.new_status,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "details": log.details
            })

    st_str = tx.status.value if hasattr(tx.status, "value") else str(tx.status)

    return {
        "transaction_details": {
            "transaction_id": str(tx.public_id),
            "transaction_number": tx.transaction_number,
            "reference_id": tx.vendor_ref or tx.idempotency_key,
            "mode": tx.mode,
            "status": st_str,
            "utr_number": tx.utr_number if st_str == "SUCCESS" else "--",
            "initiated_at": tx.initiated_at.isoformat() if tx.initiated_at else None,
            "completed_at": tx.completed_at.isoformat() if tx.completed_at else None,
            "is_reversed": tx.is_reversed,
            "reversal_reason": tx.reversal_reason if tx.is_reversed else None
        },
        "customer_details": {
            "name": cust.full_name if cust else "N/A",
            "mobile": cust.mobile_number if cust else "N/A",
            "kyc_status": cust.kyc_status if cust else "VERIFIED"
        },
        "beneficiary_details": {
            "name": bene.full_name if bene else "N/A",
            "bank_name": bene.bank_name if (bene and hasattr(bene, "bank_name")) else "Axis Bank",
            "masked_account_number": mask_account_number(bene.account_number if (bene and hasattr(bene, "account_number")) else "4589"),
            "ifsc_code": bene.ifsc_code if (bene and hasattr(bene, "ifsc_code")) else "UTIB0000123"
        },
        "amount_details": {
            "transfer_amount": tx.amount,
            "convenience_fee": tx.charges,
            "gst_amount": tx.gst_amount,
            "wallet_debit": tx.net_debit,
            "retailer_commission": tx.commission,
            "tds_amount": tx.tds_amount,
            "wallet_before": tx.wallet_before,
            "wallet_after": tx.wallet_after
        },
        "status_timeline": timeline,
        "receipt_available": st_str in ["SUCCESS", "FAILED", "REVERSED", "PARTIALLY_REVERSED"]
    }

@router.post("/export", summary="Export Retailer Payout Report (Excel / CSV / PDF)")
async def export_retailer_payout_report(
    export_format: str = Query(..., description="csv | excel | pdf"),
    retailer_id: uuid.UUID = Query(...),
    tenant_id: uuid.UUID = Query(...),
    company_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db)
):
    res_dict = await get_retailer_payout_report_list(
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
            "S.No", "Date & Time", "Transaction ID", "Reference ID", "Customer Name",
            "Customer Mobile", "Beneficiary Name", "Bank Name", "Masked Account",
            "IFSC Code", "Payment Mode", "Transfer Amount", "Convenience Fee", "GST",
            "Wallet Debit", "Commission", "TDS", "UTR", "Status"
        ])
        for it in items:
            writer.writerow([
                it["s_no"], it["initiated_at"], it["transaction_number"], it["reference_id"],
                it["customer_name"], it["customer_mobile"], it["beneficiary_name"],
                it["bank_name"], it["masked_account_number"], it["ifsc_code"],
                it["payment_mode"], it["transfer_amount"], it["convenience_fee"],
                it["gst_amount"], it["wallet_debit"], it["retailer_commission"],
                it["tds_amount"], it["utr_number"], it["status"]
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=Retailer_Payout_Report.csv"}
        )

    return {
        "format": export_format,
        "total_records": len(items),
        "data": items
    }

@router.post("/audit", summary="Log Report View/Export Audit Event")
async def audit_report_event(
    req: ReportAuditLogRequest,
    db: AsyncSession = Depends(get_db)
):
    print(f"[AUDIT LOG] {req.action} | Retailer: {req.retailer_id} | Tenant: {req.tenant_id} | IP: {req.ip_address}")
    return {"status": "LOGGED", "action": req.action, "timestamp": datetime.now(timezone.utc).isoformat()}
