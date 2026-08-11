from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.infrastructure.db.error_management_models import (
    ErrorMasterModel, VendorApiLogModel, TransactionErrorModel
)
from app.application.error_management_service import ErrorManagementService

router = APIRouter(prefix="/admin/error-management", tags=["Admin Error Management"])


@router.get("/vendor-logs")
async def get_vendor_api_logs(
    vendor_name: Optional[str] = Query(None, description="Filter by vendor name (e.g. BulkPe, Cashfree)"),
    http_status: Optional[int] = Query(None, description="Filter by HTTP status code"),
    search: Optional[str] = Query(None, description="Search term in correlation_id or URL"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    [ADMIN ONLY] Fetch raw vendor API logs with full Request/Response JSON, headers, and latency.
    """
    stmt = select(VendorApiLogModel).order_by(desc(VendorApiLogModel.created_at))
    if vendor_name:
        stmt = stmt.where(VendorApiLogModel.vendor_name == vendor_name)
    if http_status:
        stmt = stmt.where(VendorApiLogModel.http_status == http_status)
    if search:
        stmt = stmt.where(
            (VendorApiLogModel.correlation_id.ilike(f"%{search}%")) |
            (VendorApiLogModel.vendor_url.ilike(f"%{search}%"))
        )

    stmt = stmt.limit(limit).offset(offset)
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return {
        "success": True,
        "count": len(logs),
        "logs": [
            {
                "id": log.id,
                "public_id": str(log.public_id),
                "vendor_name": log.vendor_name,
                "vendor_url": log.vendor_url,
                "http_method": log.http_method,
                "http_status": log.http_status,
                "latency_ms": log.latency_ms,
                "correlation_id": log.correlation_id,
                "request_json": log.request_json,
                "response_json": log.response_json,
                "headers": log.headers,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


@router.get("/master-rules")
async def get_error_master_rules(
    db: AsyncSession = Depends(get_db)
):
    """
    [ADMIN ONLY] List all active internal error_master mapping rules.
    """
    await ErrorManagementService.seed_error_master(db)
    stmt = select(ErrorMasterModel).order_by(ErrorMasterModel.internal_error_code)
    res = await db.execute(stmt)
    rules = res.scalars().all()

    return {
        "success": True,
        "rules": [
            {
                "id": rule.id,
                "internal_error_code": rule.internal_error_code,
                "vendor_name": rule.vendor_name,
                "vendor_error_code": rule.vendor_error_code,
                "customer_message": rule.customer_message,
                "retailer_message": rule.retailer_message,
                "admin_message": rule.admin_message,
                "severity": rule.severity,
                "category": rule.category,
                "is_active": rule.is_active,
            }
            for rule in rules
        ]
    }


@router.get("/transaction-errors")
async def get_transaction_errors(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    [ADMIN ONLY] Fetch transaction error records & rollback statuses.
    """
    stmt = select(TransactionErrorModel).order_by(desc(TransactionErrorModel.created_at)).limit(limit)
    res = await db.execute(stmt)
    errors = res.scalars().all()

    return {
        "success": True,
        "count": len(errors),
        "errors": [
            {
                "id": err.id,
                "transaction_id": err.transaction_id,
                "internal_error_code": err.internal_error_code,
                "friendly_message": err.friendly_message,
                "vendor_reference": err.vendor_reference,
                "vendor_status": err.vendor_status,
                "rollback_status": err.rollback_status,
                "retry_count": err.retry_count,
                "created_at": err.created_at.isoformat() if err.created_at else None,
            }
            for err in errors
        ]
    }
