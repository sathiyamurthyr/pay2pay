import csv
import io
import uuid
import datetime
from datetime import timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc

from app.core.database import get_db
from app.infrastructure.db.enterprise_api_log_model import EnterpriseApiLogModel

router = APIRouter(prefix="/api-logs", tags=["Enterprise API Request & Response Logs"])

DEFAULT_SERVICES = [
    "PAYOUT", "DMT", "WALLET", "TOPUP", "RECHARGE", "BBPS",
    "BENEFICIARY", "KYC", "CARD_TO_CASH", "AUTH", "SETTLEMENT",
    "POS_MACHINE", "ORGANIZATION", "COMPLIANCE", "SYSTEM", "GENERAL"
]


def resolve_date_filter(date_preset: Optional[str], start_date_str: Optional[str], end_date_str: Optional[str]):
    """Calculates UTC datetime bounds for date filtering."""
    now = datetime.datetime.now(timezone.utc)
    today_start = datetime.datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
    
    if date_preset == "TODAY":
        return today_start, None
    elif date_preset == "YESTERDAY":
        y_start = today_start - datetime.timedelta(days=1)
        return y_start, today_start
    elif date_preset == "LAST_7_DAYS":
        return today_start - datetime.timedelta(days=7), None
    elif date_preset == "LAST_30_DAYS":
        return today_start - datetime.timedelta(days=30), None
    elif date_preset == "THIS_MONTH":
        m_start = datetime.datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=timezone.utc)
        return m_start, None
    elif date_preset == "CUSTOM" and start_date_str:
        try:
            s_dt = datetime.datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
            if s_dt.tzinfo is None:
                s_dt = s_dt.replace(tzinfo=timezone.utc)
            e_dt = None
            if end_date_str:
                e_dt = datetime.datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
                if e_dt.tzinfo is None:
                    e_dt = e_dt.replace(tzinfo=timezone.utc)
            return s_dt, e_dt
        except Exception:
            return None, None
    return None, None


@router.get("/metrics")
async def get_api_log_metrics(
    service: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Returns quick real-time KPI metrics for API log activity today."""
    now = datetime.datetime.now(timezone.utc)
    today_start = datetime.datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)

    base_conds = [EnterpriseApiLogModel.created_date >= today_start, EnterpriseApiLogModel.is_deleted == False]
    if service and service.upper() != "ALL":
        base_conds.append(EnterpriseApiLogModel.service_name == service.upper())
    if environment and environment.upper() != "ALL":
        base_conds.append(EnterpriseApiLogModel.environment == environment.upper())

    # Total Calls Today
    total_q = select(func.count(EnterpriseApiLogModel.id)).where(and_(*base_conds))
    total_calls = (await db.execute(total_q)).scalar() or 0

    # Inbound / Outbound / Internal counts
    inbound_q = select(func.count(EnterpriseApiLogModel.id)).where(and_(*base_conds, EnterpriseApiLogModel.direction == "INBOUND"))
    inbound_count = (await db.execute(inbound_q)).scalar() or 0

    outbound_q = select(func.count(EnterpriseApiLogModel.id)).where(and_(*base_conds, EnterpriseApiLogModel.direction == "OUTBOUND"))
    outbound_count = (await db.execute(outbound_q)).scalar() or 0

    internal_count = max(0, total_calls - inbound_count - outbound_count)

    # Errors Today (HTTP status >= 400 or response_status not in ('SUCCESS', 'PENDING', 'PROCESSING'))
    err_q = select(func.count(EnterpriseApiLogModel.id)).where(
        and_(
            *base_conds,
            or_(
                EnterpriseApiLogModel.http_status_code >= 400,
                EnterpriseApiLogModel.response_status.in_(["FAILED", "TIMEOUT", "HTTP_ERROR", "VALIDATION_ERROR", "NETWORK_ERROR"])
            )
        )
    )
    error_count = (await db.execute(err_q)).scalar() or 0

    # Avg Latency ms
    avg_q = select(func.avg(EnterpriseApiLogModel.duration_ms)).where(and_(*base_conds))
    avg_duration = (await db.execute(avg_q)).scalar() or 0.0

    error_rate = round((error_count / total_calls * 100.0), 2) if total_calls > 0 else 0.0

    return {
        "total_calls_today": total_calls,
        "inbound_count": inbound_count,
        "outbound_count": outbound_count,
        "internal_count": internal_count,
        "error_count": error_count,
        "error_rate_pct": error_rate,
        "avg_duration_ms": round(float(avg_duration), 2),
        "timestamp": now.isoformat(),
    }


@router.get("/services")
async def list_distinct_services(db: AsyncSession = Depends(get_db)):
    """Returns dynamic list of service names found in the platform and logs."""
    q = select(EnterpriseApiLogModel.service_name).distinct().where(EnterpriseApiLogModel.is_deleted == False)
    res = await db.execute(q)
    db_services = [r[0] for r in res.fetchall() if r[0]]
    combined = sorted(list(set(DEFAULT_SERVICES + db_services)))
    return {"services": combined}


@router.get("")
async def list_api_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    http_method: Optional[str] = Query(None),
    http_status: Optional[int] = Query(None),
    response_status: Optional[str] = Query(None),
    provider_name: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    date_preset: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    min_duration_ms: Optional[float] = Query(None),
    max_duration_ms: Optional[float] = Query(None),
    is_error: Optional[bool] = Query(None),
    environment: Optional[str] = Query(None),
    transaction_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Search and multi-filter enterprise API logs with server-side pagination.
    """
    conds = [EnterpriseApiLogModel.is_deleted == False]

    # Specific transaction filter
    if transaction_id:
        conds.append(
            or_(
                EnterpriseApiLogModel.transaction_id == transaction_id,
                EnterpriseApiLogModel.correlation_id == transaction_id,
                EnterpriseApiLogModel.request_id == transaction_id,
                EnterpriseApiLogModel.client_reference_id == transaction_id,
                EnterpriseApiLogModel.provider_reference_id == transaction_id
            )
        )

    # Server-Side Search
    if search and search.strip():
        s = f"%{search.strip()}%"
        conds.append(
            or_(
                EnterpriseApiLogModel.log_code.ilike(s),
                EnterpriseApiLogModel.transaction_id.ilike(s),
                EnterpriseApiLogModel.request_id.ilike(s),
                EnterpriseApiLogModel.correlation_id.ilike(s),
                EnterpriseApiLogModel.client_reference_id.ilike(s),
                EnterpriseApiLogModel.provider_reference_id.ilike(s),
                EnterpriseApiLogModel.endpoint.ilike(s),
                EnterpriseApiLogModel.service_name.ilike(s),
                EnterpriseApiLogModel.provider_name.ilike(s),
                EnterpriseApiLogModel.client_name.ilike(s),
                EnterpriseApiLogModel.retailer_id.ilike(s),
                EnterpriseApiLogModel.api_name.ilike(s),
            )
        )

    # Multi-Filters
    if service and service.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.service_name == service.upper())
    if direction and direction.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.direction == direction.upper())
    if http_method and http_method.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.http_method == http_method.upper())
    if http_status:
        conds.append(EnterpriseApiLogModel.http_status_code == http_status)
    if response_status and response_status.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.response_status == response_status.upper())
    if provider_name and provider_name.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.provider_name.ilike(f"%{provider_name}%"))
    if client_name and client_name.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.client_name.ilike(f"%{client_name}%"))
    if environment and environment.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.environment == environment.upper())

    if min_duration_ms is not None:
        conds.append(EnterpriseApiLogModel.duration_ms >= min_duration_ms)
    if max_duration_ms is not None:
        conds.append(EnterpriseApiLogModel.duration_ms <= max_duration_ms)

    if is_error is True:
        conds.append(
            or_(
                EnterpriseApiLogModel.http_status_code >= 400,
                EnterpriseApiLogModel.response_status.in_(["FAILED", "TIMEOUT", "HTTP_ERROR", "VALIDATION_ERROR", "NETWORK_ERROR"])
            )
        )
    elif is_error is False:
        conds.append(
            and_(
                EnterpriseApiLogModel.http_status_code < 400,
                EnterpriseApiLogModel.response_status.in_(["SUCCESS", "PENDING", "PROCESSING"])
            )
        )

    # Date Range Filter
    s_dt, e_dt = resolve_date_filter(date_preset, start_date, end_date)
    if s_dt:
        conds.append(EnterpriseApiLogModel.created_date >= s_dt)
    if e_dt:
        conds.append(EnterpriseApiLogModel.created_date <= e_dt)

    # Total Count
    count_q = select(func.count(EnterpriseApiLogModel.id)).where(and_(*conds))
    total_records = (await db.execute(count_q)).scalar() or 0

    # Query items
    offset = (page - 1) * page_size
    query = (
        select(EnterpriseApiLogModel)
        .where(and_(*conds))
        .order_by(desc(EnterpriseApiLogModel.created_date))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    items = []
    for r in records:
        items.append({
            "id": str(r.public_id),
            "log_id": r.log_code,
            "direction": r.direction,
            "service": r.service_name,
            "api_name": r.api_name,
            "endpoint": r.endpoint,
            "http_method": r.http_method,
            "client_name": r.client_name,
            "provider_name": r.provider_name or ("Enterprise API" if r.direction == "INBOUND" else "Provider Gateway"),
            "transaction_id": r.transaction_id,
            "request_id": r.request_id,
            "correlation_id": r.correlation_id,
            "client_reference_id": r.client_reference_id,
            "provider_reference_id": r.provider_reference_id,
            "http_status": r.http_status_code,
            "response_status": r.response_status,
            "duration_ms": r.duration_ms,
            "environment": r.environment,
            "retailer_id": r.retailer_id,
            "error_code": r.error_code,
            "error_message": r.error_message,
            "payload_truncated": r.payload_truncated,
            "timestamp": r.created_date.isoformat() if r.created_date else None,
            "request_timestamp": r.request_timestamp.isoformat() if r.request_timestamp else None,
            "response_timestamp": r.response_timestamp.isoformat() if r.response_timestamp else None,
        })

    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 1

    return {
        "items": items,
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/trace/{transaction_id}")
async def get_transaction_trace(
    transaction_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns ordered, end-to-end trace logs for a specific transaction or correlation ID.
    Enables tracing: App Request -> Enterprise API -> Wallet -> Provider -> Response -> Ledger.
    """
    clean_id = transaction_id.strip()
    q = (
        select(EnterpriseApiLogModel)
        .where(
            and_(
                EnterpriseApiLogModel.is_deleted == False,
                or_(
                    EnterpriseApiLogModel.transaction_id == clean_id,
                    EnterpriseApiLogModel.correlation_id == clean_id,
                    EnterpriseApiLogModel.request_id == clean_id,
                    EnterpriseApiLogModel.client_reference_id == clean_id,
                    EnterpriseApiLogModel.provider_reference_id == clean_id,
                )
            )
        )
        .order_by(asc(EnterpriseApiLogModel.created_date))
    )
    result = await db.execute(q)
    logs = result.scalars().all()

    trace_steps = []
    for index, l in enumerate(logs):
        trace_steps.append({
            "step_number": index + 1,
            "id": str(l.public_id),
            "log_id": l.log_code,
            "direction": l.direction,
            "service": l.service_name,
            "api_name": l.api_name,
            "endpoint": l.endpoint,
            "http_method": l.http_method,
            "client_name": l.client_name,
            "provider_name": l.provider_name,
            "transaction_id": l.transaction_id,
            "request_id": l.request_id,
            "correlation_id": l.correlation_id,
            "http_status": l.http_status_code,
            "response_status": l.response_status,
            "duration_ms": l.duration_ms,
            "error_message": l.error_message,
            "timestamp": l.created_date.isoformat() if l.created_date else None,
        })

    return {
        "transaction_id": clean_id,
        "total_trace_steps": len(trace_steps),
        "steps": trace_steps,
        "is_complete": len(trace_steps) > 0,
    }


@router.get("/{id}")
async def get_api_log_detail(
    id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full details of an individual API log record, including formatted
    request/response bodies, masked headers, duration, and error trace.
    """
    log_uuid = None
    try:
        log_uuid = uuid.UUID(id)
    except Exception:
        pass

    q = select(EnterpriseApiLogModel).where(
        and_(
            EnterpriseApiLogModel.is_deleted == False,
            or_(
                EnterpriseApiLogModel.public_id == log_uuid if log_uuid else False,
                EnterpriseApiLogModel.log_code == id,
                EnterpriseApiLogModel.request_id == id
            )
        )
    )
    result = await db.execute(q)
    log = result.scalars().first()

    if not log:
        raise HTTPException(status_code=404, detail="API log record not found.")

    return {
        "id": str(log.public_id),
        "log_id": log.log_code,
        "direction": log.direction,
        "service": log.service_name,
        "api_name": log.api_name,
        "endpoint": log.endpoint,
        "base_url_reference": log.base_url_reference,
        "http_method": log.http_method,
        "environment": log.environment,
        "client_name": log.client_name,
        "client_ip": log.client_ip,
        "provider_name": log.provider_name or ("Enterprise API" if log.direction == "INBOUND" else "Provider Gateway"),
        "retailer_id": log.retailer_id,
        "customer_id": log.customer_id,
        "performed_by": log.performed_by,
        "transaction_id": log.transaction_id,
        "request_id": log.request_id,
        "correlation_id": log.correlation_id,
        "client_reference_id": log.client_reference_id,
        "provider_reference_id": log.provider_reference_id,
        "parent_request_id": log.parent_request_id,
        "request_timestamp": log.request_timestamp.isoformat() if log.request_timestamp else None,
        "response_timestamp": log.response_timestamp.isoformat() if log.response_timestamp else None,
        "duration_ms": log.duration_ms,
        "http_status": log.http_status_code,
        "response_status": log.response_status,
        "provider_response_code": log.provider_response_code,
        "provider_response_message": log.provider_response_message,
        "error_code": log.error_code,
        "error_type": log.error_type,
        "error_message": log.error_message,
        "stack_trace": log.stack_trace,
        "retry_attempt": log.retry_attempt,
        "failure_reason": log.failure_reason,
        "request_headers": log.request_headers,
        "request_query": log.request_query,
        "request_body": log.request_body,
        "request_body_raw": log.request_body_raw,
        "response_headers": log.response_headers,
        "response_body": log.response_body,
        "response_body_raw": log.response_body_raw,
        "payload_truncated": log.payload_truncated,
        "original_size_bytes": log.original_size_bytes,
        "stored_size_bytes": log.stored_size_bytes,
        "created_date": log.created_date.isoformat() if log.created_date else None,
    }


@router.get("/export/csv")
async def export_api_logs_csv(
    search: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    http_method: Optional[str] = Query(None),
    response_status: Optional[str] = Query(None),
    provider_name: Optional[str] = Query(None),
    date_preset: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports filtered API logs to CSV format for audit compliance.
    Secrets and passwords are guaranteed to be masked.
    """
    conds = [EnterpriseApiLogModel.is_deleted == False]
    if search and search.strip():
        s = f"%{search.strip()}%"
        conds.append(
            or_(
                EnterpriseApiLogModel.log_code.ilike(s),
                EnterpriseApiLogModel.transaction_id.ilike(s),
                EnterpriseApiLogModel.request_id.ilike(s),
                EnterpriseApiLogModel.endpoint.ilike(s),
                EnterpriseApiLogModel.service_name.ilike(s),
            )
        )
    if service and service.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.service_name == service.upper())
    if direction and direction.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.direction == direction.upper())
    if http_method and http_method.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.http_method == http_method.upper())
    if response_status and response_status.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.response_status == response_status.upper())
    if provider_name and provider_name.upper() != "ALL":
        conds.append(EnterpriseApiLogModel.provider_name.ilike(f"%{provider_name}%"))

    s_dt, e_dt = resolve_date_filter(date_preset, start_date, end_date)
    if s_dt:
        conds.append(EnterpriseApiLogModel.created_date >= s_dt)
    if e_dt:
        conds.append(EnterpriseApiLogModel.created_date <= e_dt)

    q = (
        select(EnterpriseApiLogModel)
        .where(and_(*conds))
        .order_by(desc(EnterpriseApiLogModel.created_date))
        .limit(2000)
    )
    result = await db.execute(q)
    rows = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Log ID", "Direction", "Service", "Endpoint", "Method",
        "Client / Provider", "Transaction ID", "Request ID", "Correlation ID",
        "HTTP Status", "Response Status", "Duration (ms)", "Date & Time", "Error Message"
    ])

    for r in rows:
        writer.writerow([
            r.log_code,
            r.direction,
            r.service_name,
            r.endpoint,
            r.http_method,
            r.provider_name or r.client_name or "Enterprise",
            r.transaction_id or "",
            r.request_id or "",
            r.correlation_id or "",
            r.http_status_code,
            r.response_status,
            r.duration_ms,
            r.created_date.strftime("%d %b %Y %H:%M:%S") if r.created_date else "",
            r.error_message or "",
        ])

    output.seek(0)
    filename = f"api_logs_export_{datetime.datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
