"""
Consolidated Transaction Reconciliation Router.
Enterprise API for:
- Uploading vendor transaction reports (.csv, .xlsx, .xls)
- Backblaze B2 persistent cloud storage
- Multi-vendor column header and status normalization
- Two-way set-based reconciliation (Vendor vs Internal Ledger)
- KPI and financial mismatch analytics
- Exception reports and streaming CSV exports
- Zero auto-status changes & zero wallet mutations (Reporting & Governance Only)
"""

import uuid
import json
import logging
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from io import StringIO
import csv

from fastapi import (
    APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status, Response
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, text, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import (
    get_optional_token_payload, get_current_tenant_id
)
from app.application.storage_service import BackblazeStorageService
from app.application.reconciliation_parser_service import (
    ReconciliationParserService, ReconciliationValidationError
)
from app.infrastructure.db.reconciliation_models import (
    TxnReconciliationBatchModel,
    TxnReconciliationStagingModel,
    TxnReconciliationResultModel,
    TxnVendorColumnConfigModel,
    TxnReconciliationAuditModel
)

logger = logging.getLogger("reconciliation_router")

router = APIRouter(
    prefix="/admin/reconciliation",
    tags=["Admin - Consolidated Transaction Reconciliation"]
)


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class ReviewRemarkRequest(BaseModel):
    review_status: str = Field(..., description="PENDING_REVIEW, REVIEWED, RESOLVED, IGNORED")
    remarks: str = Field(..., min_length=2, max_length=1000, description="Audit note regarding the discrepancy")


# ==============================================================================
# 1. GET VENDOR CONFIGURATIONS & SERVICES
# ==============================================================================

@router.get("/vendors")
async def get_reconciliation_vendors(
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Returns available vendor configurations with default column mappings.
    """
    stmt = select(TxnVendorColumnConfigModel).order_by(TxnVendorColumnConfigModel.vendor_name.asc())
    rows = (await db.execute(stmt)).scalars().all()

    vendors = [
        {
            "vendor_code": v.vendor_code,
            "vendor_name": v.vendor_name,
            "service_name": v.service_name,
            "column_mapping": v.column_mapping,
            "column_config": v.column_mapping,
            "status_mapping": v.status_mapping,
            "is_active": True
        }
        for v in rows
    ]

    return {"success": True, "data": vendors, "vendors": vendors}


@router.get("/services")
async def get_reconciliation_services(
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Returns available transaction services for reconciliation filtering.
    """
    standard_services = ["PAYOUT", "DMT", "AEPS", "RECHARGE", "BBPS", "UPI", "POS", "QR_PAY", "TOPUP"]
    stmt = text("""
        SELECT DISTINCT service_name 
        FROM public.transactions 
        WHERE service_name IS NOT NULL AND service_name != ''
        ORDER BY service_name ASC;
    """)
    res = await db.execute(stmt)
    db_services = [r[0] for r in res.fetchall()]
    combined = list(dict.fromkeys(standard_services + db_services))

    return {"success": True, "data": combined, "services": combined}


# ==============================================================================
# 2. UPLOAD & PROCESS RECONCILIATION REPORT
# ==============================================================================

@router.post("/batches/upload")
async def upload_and_process_reconciliation_report(
    file: UploadFile = File(...),
    vendor_code: str = Form(...),
    vendor_name: Optional[str] = Form(None),
    service_name: str = Form("ALL"),
    report_date: str = Form(...),
    custom_column_mapping: Optional[str] = Form(None),
    column_mapping: Optional[str] = Form(None),
    custom_status_mapping: Optional[str] = Form(None),
    status_mapping: Optional[str] = Form(None),
    file_type: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id)
):
    """
    Ingests vendor transaction report (.csv, .xlsx, .xls), stores original file in Backblaze B2,
    stages raw records, and triggers two-way set-based database reconciliation.
    """
    # 1. Admin identity
    admin_id = "Admin"
    if auth_payload:
        admin_id = auth_payload.get("sub") or auth_payload.get("username") or auth_payload.get("email") or "Admin"

    # 1.1 Resolve vendor_name if omitted
    if not vendor_name:
        v_meta = (await db.execute(
            select(TxnVendorColumnConfigModel).where(TxnVendorColumnConfigModel.vendor_code == vendor_code)
        )).scalars().first()
        vendor_name = v_meta.vendor_name if v_meta else vendor_code

    # 2. Validate report date
    try:
        parsed_report_date = datetime.strptime(report_date.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid report_date format '{report_date}'. Expected format: YYYY-MM-DD."
        )

    # 3. Read file content
    try:
        file_bytes = await file.read()
        file_size = len(file_bytes)
        if file_size == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
        if file_size > 50 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File size exceeds 50MB limit.")
    except Exception as read_err:
        logger.error(f"Failed to read uploaded file: {read_err}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File read error: {read_err}")

    # 4. Fetch default vendor configuration from DB if not customized
    col_map_dict = None
    stat_map_dict = None

    mapping_raw = custom_column_mapping or column_mapping
    if mapping_raw:
        try:
            col_map_dict = json.loads(mapping_raw)
        except Exception:
            pass

    status_raw = custom_status_mapping or status_mapping
    if status_raw:
        try:
            stat_map_dict = json.loads(status_raw)
        except Exception:
            pass

    if not col_map_dict or not stat_map_dict:
        v_stmt = select(TxnVendorColumnConfigModel).where(TxnVendorColumnConfigModel.vendor_code == vendor_code)
        v_conf = (await db.execute(v_stmt)).scalars().first()
        if v_conf:
            if not col_map_dict: col_map_dict = v_conf.column_mapping
            if not stat_map_dict: stat_map_dict = v_conf.status_mapping

    # 5. Parse and Validate File
    try:
        staging_rows, parse_summary = ReconciliationParserService.parse_file(
            file_bytes=file_bytes,
            filename=file.filename or "vendor_report.csv",
            custom_column_mapping=col_map_dict,
            custom_status_mapping=stat_map_dict
        )
    except ReconciliationValidationError as val_err:
        logger.warning(f"Reconciliation file validation failed: {val_err}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(val_err))
    except Exception as err:
        logger.error(f"Unexpected error during file parsing: {err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"File parsing error: {err}")

    # 6. Upload original report file to Backblaze B2
    batch_hex = uuid.uuid4().hex[:6].upper()
    batch_number = f"RECON-{datetime.now().strftime('%Y%m%d')}-{batch_hex}"
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "csv"
    b2_key = f"reconciliation/reports/{datetime.now().strftime('%Y/%m/%d')}/{batch_number}_{file.filename}"

    try:
        content_type = file.content_type or "application/octet-stream"
        b2_res = BackblazeStorageService.upload_file(
            file_bytes=file_bytes,
            filename=f"{batch_number}_{file.filename}",
            content_type=content_type,
            entity_type="SERVICE"
        )
        file_b2_url = b2_res.get("url", "")
        file_b2_storage_key = b2_res.get("file_name", b2_key)
    except Exception as b2_err:
        logger.warning(f"Backblaze B2 upload failed, using internal URI fallback: {b2_err}")
        file_b2_url = f"https://f003.backblazeb2.com/file/sathus-pay2pay/{b2_key}"
        file_b2_storage_key = b2_key

    # 7. Create Batch Record
    batch = TxnReconciliationBatchModel(
        batch_number=batch_number,
        vendor_code=vendor_code.strip().upper(),
        vendor_name=vendor_name.strip(),
        service_name=service_name.strip().upper(),
        report_date=parsed_report_date,
        file_name=file.filename or "vendor_report",
        file_type=ext.upper(),
        file_size_bytes=file_size,
        file_b2_storage_key=file_b2_storage_key,
        file_b2_url=file_b2_url,
        column_mapping=parse_summary.get("column_mapping", {}),
        status="VALIDATING",
        uploaded_by=admin_id,
        tenant_id=tenant_id
    )
    db.add(batch)
    await db.flush()

    # 8. Bulk Insert Staging Rows in batches of 500
    batch_id = batch.id
    staging_models = [
        TxnReconciliationStagingModel(
            batch_id=batch_id,
            row_index=r["row_index"],
            transaction_id=r["transaction_id"],
            vendor_txn_id=r["vendor_txn_id"],
            amount=r["amount"],
            status=r["status"],
            normalized_status=r["normalized_status"],
            utr=r["utr"],
            service=r["service"],
            retailer_id=r["retailer_id"],
            transaction_date=r["transaction_date"],
            payment_mode=r["payment_mode"],
            currency=r["currency"],
            response_code=r["response_code"],
            response_message=r["response_message"],
            raw_data=r["raw_data"],
            is_duplicate=r["is_duplicate"],
            occurrence_count=r["occurrence_count"],
            validation_error=r["validation_error"]
        )
        for r in staging_rows
    ]

    CHUNK_SIZE = 500
    for i in range(0, len(staging_models), CHUNK_SIZE):
        db.add_all(staging_models[i:i + CHUNK_SIZE])
        await db.flush()

    # 9. Execute Two-Way Stored Procedure Reconciliation Engine
    try:
        sp_query = text("SELECT public.sp_process_transaction_reconciliation(:batch_id);")
        sp_res = await db.execute(sp_query, {"batch_id": batch_id})
        await db.commit()
    except Exception as sp_err:
        await db.rollback()
        logger.error(f"Stored procedure reconciliation failed: {sp_err}")
        # Update batch status to failed
        async with db.begin():
            await db.execute(
                text("UPDATE public.txn_reconciliation_batch SET status = 'FAILED', error_message = :err WHERE id = :id"),
                {"err": str(sp_err), "id": batch_id}
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reconciliation engine failed: {sp_err}"
        )

    # 10. Fetch and return complete batch data
    batch_record = (await db.execute(
        select(TxnReconciliationBatchModel).where(TxnReconciliationBatchModel.id == batch_id)
    )).scalars().first()

    return {
        "success": True,
        "message": "Vendor report uploaded and consolidated reconciliation completed.",
        "data": {
            "id": batch_record.id,
            "public_id": str(batch_record.public_id),
            "batch_number": batch_record.batch_number,
            "vendor_name": batch_record.vendor_name,
            "vendor_code": batch_record.vendor_code,
            "service_name": batch_record.service_name,
            "report_date": batch_record.report_date.isoformat(),
            "status": batch_record.status,
            "file_name": batch_record.file_name,
            "file_b2_url": batch_record.file_b2_url,
            "total_vendor_records": batch_record.total_vendor_records,
            "total_internal_records": batch_record.total_internal_records,
            "matched_records": batch_record.matched_records,
            "amount_mismatch_records": batch_record.amount_mismatch_records,
            "status_mismatch_records": batch_record.status_mismatch_records,
            "missing_in_internal_records": batch_record.missing_in_internal_records,
            "missing_in_vendor_records": batch_record.missing_in_vendor_records,
            "duplicate_vendor_records": batch_record.duplicate_vendor_records,
            "pending_review_records": batch_record.pending_review_records,
            "vendor_total_amount": float(batch_record.vendor_total_amount),
            "internal_total_amount": float(batch_record.internal_total_amount),
            "matched_amount": float(batch_record.matched_amount),
            "amount_difference": float(batch_record.amount_difference)
        }
    }


# ==============================================================================
# 3. LIST RECONCILIATION BATCHES
# ==============================================================================

@router.get("/batches")
async def list_reconciliation_batches(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    vendor_code: Optional[str] = Query(None),
    service_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Returns paginated list of previous reconciliation batches with filter capabilities.
    """
    query = select(TxnReconciliationBatchModel)

    if vendor_code and vendor_code != "ALL":
        query = query.where(TxnReconciliationBatchModel.vendor_code == vendor_code.upper())
    if service_name and service_name != "ALL":
        query = query.where(TxnReconciliationBatchModel.service_name == service_name.upper())
    if status and status != "ALL":
        query = query.where(TxnReconciliationBatchModel.status == status.upper())
    if from_date:
        try:
            query = query.where(TxnReconciliationBatchModel.report_date >= datetime.strptime(from_date, "%Y-%m-%d").date())
        except ValueError:
            pass
    if to_date:
        try:
            query = query.where(TxnReconciliationBatchModel.report_date <= datetime.strptime(to_date, "%Y-%m-%d").date())
        except ValueError:
            pass

    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    stmt = query.order_by(TxnReconciliationBatchModel.uploaded_at.desc()).offset(offset).limit(limit)
    batches = (await db.execute(stmt)).scalars().all()

    items = [
        {
            "id": b.id,
            "public_id": str(b.public_id),
            "batch_number": b.batch_number,
            "batch_reference": b.batch_number,
            "vendor_code": b.vendor_code,
            "vendor_name": b.vendor_name,
            "service_name": b.service_name,
            "report_date": b.report_date.isoformat(),
            "file_name": b.file_name,
            "file_type": b.file_type,
            "file_b2_url": b.file_b2_url,
            "status": b.status,
            "error_message": b.error_message,
            "total_vendor_records": b.total_vendor_records or 0,
            "total_internal_records": b.total_internal_records or 0,
            "matched_records": b.matched_records or 0,
            "matched_count": b.matched_records or 0,
            "amount_mismatch_records": b.amount_mismatch_records or 0,
            "amount_mismatch_count": b.amount_mismatch_records or 0,
            "status_mismatch_records": b.status_mismatch_records or 0,
            "status_mismatch_count": b.status_mismatch_records or 0,
            "missing_in_internal_records": b.missing_in_internal_records or 0,
            "missing_internal_count": b.missing_in_internal_records or 0,
            "missing_in_vendor_records": b.missing_in_vendor_records or 0,
            "missing_vendor_count": b.missing_in_vendor_records or 0,
            "duplicate_vendor_records": b.duplicate_vendor_records or 0,
            "duplicate_count": b.duplicate_vendor_records or 0,
            "invalid_count": getattr(b, "invalid_vendor_records", 0) or 0,
            "pending_review_records": b.pending_review_records or 0,
            "vendor_total_amount": float(b.vendor_total_amount or 0),
            "internal_total_amount": float(b.internal_total_amount or 0),
            "matched_amount": float(b.matched_amount or 0),
            "amount_difference": float(b.amount_difference or 0),
            "uploaded_by": b.uploaded_by,
            "uploaded_by_name": b.uploaded_by or "Admin",
            "uploaded_at": b.uploaded_at.isoformat() if b.uploaded_at else "",
            "created_at": b.uploaded_at.isoformat() if b.uploaded_at else "",
            "completed_at": b.completed_at.isoformat() if b.completed_at else None
        }
        for b in batches
    ]

    return {
        "success": True,
        "data": items,
        "batches": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    }


def _batch_filter(batch_id_or_ref: str):
    clean = str(batch_id_or_ref).strip()
    try:
        b_uuid = uuid.UUID(clean)
        return TxnReconciliationBatchModel.public_id == b_uuid
    except ValueError:
        if clean.isdigit():
            return TxnReconciliationBatchModel.id == int(clean)
        return TxnReconciliationBatchModel.batch_number == clean


def _result_filter(result_id_or_ref: str):
    clean = str(result_id_or_ref).strip()
    try:
        r_uuid = uuid.UUID(clean)
        return TxnReconciliationResultModel.public_id == r_uuid
    except ValueError:
        if clean.isdigit():
            return TxnReconciliationResultModel.id == int(clean)
        return TxnReconciliationResultModel.transaction_id == clean


# ==============================================================================
# 4. GET SINGLE BATCH DETAILS & KPIS
# ==============================================================================

@router.get("/batches/{batch_public_id}")
async def get_reconciliation_batch(
    batch_public_id: str,
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Returns complete batch summary, metrics, and financial breakdown comparison.
    """
    stmt = select(TxnReconciliationBatchModel).where(_batch_filter(batch_public_id))
    batch = (await db.execute(stmt)).scalars().first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation batch not found.")

    batch_data = {
        "id": batch.id,
        "public_id": str(batch.public_id),
        "batch_number": batch.batch_number,
        "batch_reference": batch.batch_number,
        "vendor_code": batch.vendor_code,
        "vendor_name": batch.vendor_name,
        "service_name": batch.service_name,
        "report_date": batch.report_date.isoformat(),
        "file_name": batch.file_name,
        "file_type": batch.file_type,
        "file_format": batch.file_type,
        "file_size_bytes": batch.file_size_bytes or 0,
        "file_url": batch.file_b2_url,
        "file_b2_url": batch.file_b2_url,
        "status": batch.status,
        "error_message": batch.error_message,
        "processing_error": batch.error_message,

        # Root level record counts
        "total_vendor_records": batch.total_vendor_records or 0,
        "total_internal_records": batch.total_internal_records or 0,
        "matched_records": batch.matched_records or 0,
        "matched_count": batch.matched_records or 0,
        "amount_mismatch_records": batch.amount_mismatch_records or 0,
        "amount_mismatch_count": batch.amount_mismatch_records or 0,
        "status_mismatch_records": batch.status_mismatch_records or 0,
        "status_mismatch_count": batch.status_mismatch_records or 0,
        "missing_in_internal_records": batch.missing_in_internal_records or 0,
        "missing_internal_count": batch.missing_in_internal_records or 0,
        "missing_in_vendor_records": batch.missing_in_vendor_records or 0,
        "missing_vendor_count": batch.missing_in_vendor_records or 0,
        "duplicate_vendor_records": batch.duplicate_vendor_records or 0,
        "duplicate_count": batch.duplicate_vendor_records or 0,
        "invalid_count": getattr(batch, "invalid_vendor_records", 0) or 0,
        "pending_review_records": batch.pending_review_records or 0,
        "vendor_total_amount": float(batch.vendor_total_amount or 0),
        "internal_total_amount": float(batch.internal_total_amount or 0),
        "matched_amount": float(batch.matched_amount or 0),
        "amount_difference": float(batch.amount_difference or 0),

        # Consolidated KPI Metrics
        "kpi": {
            "total_vendor_records": batch.total_vendor_records or 0,
            "total_internal_records": batch.total_internal_records or 0,
            "matched_records": batch.matched_records or 0,
            "amount_mismatch_records": batch.amount_mismatch_records or 0,
            "status_mismatch_records": batch.status_mismatch_records or 0,
            "missing_in_internal_records": batch.missing_in_internal_records or 0,
            "missing_in_vendor_records": batch.missing_in_vendor_records or 0,
            "duplicate_vendor_records": batch.duplicate_vendor_records or 0,
            "invalid_vendor_records": getattr(batch, "invalid_vendor_records", 0) or 0,
            "pending_review_records": batch.pending_review_records or 0,
            "match_rate_pct": round(((batch.matched_records or 0) / max(batch.total_vendor_records or 1, 1)) * 100, 2)
        },

        # Financial Summary Comparison
        "financial": {
            "vendor_total_amount": float(batch.vendor_total_amount or 0),
            "internal_total_amount": float(batch.internal_total_amount or 0),
            "matched_amount": float(batch.matched_amount or 0),
            "amount_difference": float(batch.amount_difference or 0),
            "vendor_success_amount": float(batch.vendor_success_amount or 0),
            "vendor_failed_amount": float(batch.vendor_failed_amount or 0),
            "vendor_pending_amount": float(batch.vendor_pending_amount or 0),
            "internal_success_amount": float(batch.internal_success_amount or 0),
            "internal_failed_amount": float(batch.internal_failed_amount or 0),
            "internal_pending_amount": float(batch.internal_pending_amount or 0)
        },

        "summary_metrics": {
            "vendor_success_amount": float(batch.vendor_success_amount or 0),
            "vendor_failed_amount": float(batch.vendor_failed_amount or 0),
            "vendor_pending_amount": float(batch.vendor_pending_amount or 0),
            "internal_success_amount": float(batch.internal_success_amount or 0),
            "internal_failed_amount": float(batch.internal_failed_amount or 0),
            "internal_pending_amount": float(batch.internal_pending_amount or 0)
        },

        "uploaded_by": batch.uploaded_by,
        "uploaded_by_name": batch.uploaded_by or "Admin",
        "uploaded_at": batch.uploaded_at.isoformat() if batch.uploaded_at else "",
        "created_at": batch.uploaded_at.isoformat() if batch.uploaded_at else "",
        "completed_at": batch.completed_at.isoformat() if batch.completed_at else None
    }

    return {
        "success": True,
        "data": batch_data,
        "batch": batch_data
    }


# ==============================================================================
# 5. GET RECONCILIATION RESULTS (PAGINATED & FILTERABLE)
# ==============================================================================

@router.get("/batches/{batch_public_id}/results")
async def get_reconciliation_results(
    batch_public_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    recon_status: Optional[str] = Query(None),
    is_exception: Optional[bool] = Query(None),
    vendor_status: Optional[str] = Query(None),
    internal_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Returns paginated reconciliation results for a batch with rich search and filtering.
    """
    # 1. Resolve batch
    b_stmt = select(TxnReconciliationBatchModel.id).where(_batch_filter(batch_public_id))
    batch_id = (await db.execute(b_stmt)).scalar()
    if not batch_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation batch not found.")

    # 2. Build Query
    query = select(TxnReconciliationResultModel).where(TxnReconciliationResultModel.batch_id == batch_id)

    if recon_status and recon_status != "ALL":
        query = query.where(TxnReconciliationResultModel.recon_status == recon_status.upper())
    if is_exception is not None:
        query = query.where(TxnReconciliationResultModel.is_exception == is_exception)
    if vendor_status and vendor_status != "ALL":
        query = query.where(TxnReconciliationResultModel.vendor_status == vendor_status.upper())
    if internal_status and internal_status != "ALL":
        query = query.where(TxnReconciliationResultModel.internal_status == internal_status.upper())
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                TxnReconciliationResultModel.transaction_id.ilike(term),
                TxnReconciliationResultModel.vendor_utr.ilike(term),
                TxnReconciliationResultModel.internal_utr.ilike(term),
                TxnReconciliationResultModel.internal_ref_id.ilike(term),
                TxnReconciliationResultModel.internal_retailer_name.ilike(term)
            )
        )

    # Count
    count_stmt = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Paginate (Exceptions sorted first, then mismatches, then matched)
    offset = (page - 1) * limit
    stmt = query.order_by(
        TxnReconciliationResultModel.is_exception.desc(),
        TxnReconciliationResultModel.id.asc()
    ).offset(offset).limit(limit)

    results = (await db.execute(stmt)).scalars().all()

    items = [
        {
            "id": r.id,
            "public_id": str(r.public_id),
            "transaction_id": r.transaction_id,
            "recon_status": r.recon_status,
            "reconciliation_status": r.recon_status,
            "service_name": r.internal_service or r.vendor_service or "PAYOUT",
            "retailer_id": r.internal_retailer_id,
            "retailer_name": r.internal_retailer_name,
            "vendor_amount": float(r.vendor_amount) if r.vendor_amount is not None else None,
            "vendor_status": r.vendor_status,
            "vendor_utr": r.vendor_utr,
            "vendor_txn_id": r.vendor_txn_id,
            "vendor_service": r.vendor_service,
            "vendor_retailer": r.vendor_retailer,
            "vendor_date": r.vendor_date.isoformat() if r.vendor_date else None,
            "vendor_timestamp": r.vendor_date.isoformat() if r.vendor_date else None,
            "vendor_payload": r.vendor_payload,
            "internal_amount": float(r.internal_amount) if r.internal_amount is not None else None,
            "internal_status": r.internal_status,
            "internal_utr": r.internal_utr,
            "internal_ref_id": r.internal_ref_id,
            "internal_service": r.internal_service,
            "internal_retailer_id": r.internal_retailer_id,
            "internal_retailer_name": r.internal_retailer_name,
            "internal_date": r.internal_date.isoformat() if r.internal_date else None,
            "internal_timestamp": r.internal_date.isoformat() if r.internal_date else None,
            "internal_payload": r.internal_payload,
            "amount_difference": float(r.amount_difference or 0),
            "is_exception": r.is_exception,
            "exception_category": r.exception_category,
            "mismatch_details": r.mismatch_details,
            "recommended_action": r.recommended_action,
            "review_status": r.review_status,
            "reviewed_by": r.reviewed_by,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "review_remarks": r.review_remarks
        }
        for r in results
    ]

    return {
        "success": True,
        "data": items,
        "results": items,
        "total_results": total_count,
        "total_pages": (total_count + limit - 1) // limit,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    }


# ==============================================================================
# 6. GET EXCEPTION REPORT (DEDICATED VIEW)
# ==============================================================================

@router.get("/batches/{batch_public_id}/exceptions")
async def get_reconciliation_exceptions(
    batch_public_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Returns only exceptions and actionable discrepancies for immediate admin attention.
    """
    b_stmt = select(TxnReconciliationBatchModel.id).where(_batch_filter(batch_public_id))
    batch_id = (await db.execute(b_stmt)).scalar()
    if not batch_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation batch not found.")

    query = select(TxnReconciliationResultModel).where(
        TxnReconciliationResultModel.batch_id == batch_id,
        TxnReconciliationResultModel.is_exception == True
    )

    if category and category != "ALL":
        query = query.where(TxnReconciliationResultModel.exception_category == category.upper())

    count_stmt = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * limit
    stmt = query.order_by(TxnReconciliationResultModel.id.asc()).offset(offset).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    items = [
        {
            "id": r.id,
            "public_id": str(r.public_id),
            "transaction_id": r.transaction_id,
            "recon_status": r.recon_status,
            "reconciliation_status": r.recon_status,
            "exception_category": r.exception_category,
            "vendor_amount": float(r.vendor_amount) if r.vendor_amount is not None else None,
            "internal_amount": float(r.internal_amount) if r.internal_amount is not None else None,
            "amount_difference": float(r.amount_difference or 0),
            "vendor_status": r.vendor_status,
            "internal_status": r.internal_status,
            "vendor_utr": r.vendor_utr,
            "internal_utr": r.internal_utr,
            "vendor_txn_id": r.vendor_txn_id,
            "service_name": r.internal_service or r.vendor_service or "PAYOUT",
            "retailer_name": r.internal_retailer_name,
            "vendor_timestamp": r.vendor_date.isoformat() if r.vendor_date else None,
            "internal_timestamp": r.internal_date.isoformat() if r.internal_date else None,
            "vendor_value": {
                "amount": float(r.vendor_amount) if r.vendor_amount is not None else None,
                "status": r.vendor_status,
                "utr": r.vendor_utr,
                "date": r.vendor_date.isoformat() if r.vendor_date else None
            },
            "internal_value": {
                "amount": float(r.internal_amount) if r.internal_amount is not None else None,
                "status": r.internal_status,
                "utr": r.internal_utr,
                "date": r.internal_date.isoformat() if r.internal_date else None,
                "retailer": r.internal_retailer_name
            },
            "difference": float(r.amount_difference or 0),
            "recommended_action": r.recommended_action,
            "review_status": r.review_status,
            "review_remarks": r.review_remarks
        }
        for r in rows
    ]

    return {
        "success": True,
        "data": items,
        "exceptions": items,
        "total_exceptions": total_count,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    }


# ==============================================================================
# 7. EXPORT RECONCILIATION / EXCEPTION REPORT AS CSV
# ==============================================================================

@router.get("/batches/{batch_public_id}/export")
async def export_reconciliation_csv(
    batch_public_id: str,
    export_type: str = Query("ALL", description="ALL or EXCEPTIONS"),
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Streams CSV export of full reconciliation report or exceptions only.
    """
    b_stmt = select(TxnReconciliationBatchModel).where(_batch_filter(batch_public_id))
    batch = (await db.execute(b_stmt)).scalars().first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation batch not found.")

    query = select(TxnReconciliationResultModel).where(TxnReconciliationResultModel.batch_id == batch.id)
    if export_type.upper() == "EXCEPTIONS":
        query = query.where(TxnReconciliationResultModel.is_exception == True)

    stmt = query.order_by(TxnReconciliationResultModel.id.asc())
    rows = (await db.execute(stmt)).scalars().all()

    output = StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Transaction ID",
        "Reconciliation Status",
        "Vendor Amount",
        "Internal Amount",
        "Amount Difference",
        "Vendor Status",
        "Internal Status",
        "Vendor UTR",
        "Internal UTR",
        "Internal Retailer",
        "Service",
        "Is Exception",
        "Exception Category",
        "Recommended Action",
        "Review Status",
        "Review Remarks"
    ])

    for r in rows:
        writer.writerow([
            r.transaction_id,
            r.recon_status,
            f"{r.vendor_amount:.2f}" if r.vendor_amount is not None else "",
            f"{r.internal_amount:.2f}" if r.internal_amount is not None else "",
            f"{r.amount_difference:.2f}",
            r.vendor_status or "",
            r.internal_status or "",
            r.vendor_utr or "",
            r.internal_utr or "",
            r.internal_retailer_name or "",
            r.internal_service or r.vendor_service or "",
            "YES" if r.is_exception else "NO",
            r.exception_category or "",
            r.recommended_action or "",
            r.review_status or "",
            r.review_remarks or ""
        ])

    output.seek(0)
    filename = f"{batch.batch_number}_{export_type.lower()}_report.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==============================================================================
# 8. MANUAL ADMIN REVIEW ACTION (GOVERNANCE / NO AUTO-WALLET MUTATION)
# ==============================================================================

@router.post("/batches/{batch_public_id}/results/{result_public_id}/review")
async def review_reconciliation_result(
    batch_public_id: str,
    result_public_id: str,
    req: ReviewRemarkRequest,
    db: AsyncSession = Depends(get_db),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_optional_token_payload)
):
    """
    Records an admin audit review note on a specific discrepancy without touching wallets.
    """
    admin_id = "Admin"
    if auth_payload:
        admin_id = auth_payload.get("sub") or auth_payload.get("username") or auth_payload.get("email") or "Admin"

    stmt = select(TxnReconciliationResultModel).where(_result_filter(result_public_id))
    result_row = (await db.execute(stmt)).scalars().first()
    if not result_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reconciliation result item not found.")

    prev_state = f"Status: {result_row.review_status}"
    result_row.review_status = req.review_status.upper()
    result_row.review_remarks = req.remarks.strip()
    result_row.reviewed_by = admin_id
    result_row.reviewed_at = datetime.now(timezone.utc)

    # Log audit
    audit = TxnReconciliationAuditModel(
        batch_id=result_row.batch_id,
        transaction_id=result_row.transaction_id,
        admin_id=admin_id,
        action="TRANSACTION_REVIEWED",
        previous_state=prev_state,
        new_state=f"Status: {result_row.review_status}, Remarks: {result_row.review_remarks}",
        remarks=req.remarks.strip()
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": "Review note recorded successfully.",
        "data": {
            "transaction_id": result_row.transaction_id,
            "review_status": result_row.review_status,
            "review_remarks": result_row.review_remarks,
            "reviewed_by": result_row.reviewed_by,
            "reviewed_at": result_row.reviewed_at.isoformat()
        }
    }
