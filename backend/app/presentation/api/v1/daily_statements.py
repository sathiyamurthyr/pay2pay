"""
Daily Account Statements API Router
===================================
Provides enterprise administrative endpoints to inspect daily statements,
view balance reconciliation statuses, download password-protected bank PDFs,
resend statement emails, and trigger manual batch generation.

Strictly uses PostgreSQL Stored Procedures via DailyAccountStatementService.
"""

import os
import io
from datetime import date, datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.daily_statement_service import daily_statement_service
from app.core.global_context import GlobalContext

router = APIRouter(prefix="/statements", tags=["Daily Account Statements"])


class GenerateStatementsRequest(BaseModel):
    statement_date: Optional[str] = Field(None, description="Target statement date in YYYY-MM-DD format (defaults to yesterday)")
    company_id: Optional[str] = Field(None, description="Tenant / Company UUID")
    force_regenerate: bool = Field(False, description="Whether to overwrite existing statements and resend emails")


class GenerateSingleRetailerRequest(BaseModel):
    retailer_id: str = Field(..., description="Retailer UUID")
    statement_date: Optional[str] = Field(None, description="Statement date in YYYY-MM-DD format")
    force_regenerate: bool = Field(False, description="Whether to overwrite existing statement")


@router.get("", summary="Get Paginated Daily Account Statements for Admin")
@router.get("/", summary="Get Paginated Daily Account Statements for Admin (trailing slash)")
async def get_statements(
    statement_date: Optional[str] = Query(None, description="Date filter YYYY-MM-DD"),
    status: Optional[str] = Query(None, description="Filter: ALL, RECONCILED, FAILED, SENT, PENDING"),
    search: Optional[str] = Query(None, description="Search statement number, retailer code, name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves statements list, reconciliation status, and platform summary metrics.
    Executes PostgreSQL Stored Procedure `sp_get_daily_statements_admin`.
    """
    d_date = None
    if statement_date and statement_date.strip():
        try:
            d_date = date.fromisoformat(statement_date.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid statement_date format. Expected YYYY-MM-DD.")

    res = await daily_statement_service.get_statements_admin(
        statement_date=d_date,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
        session=db
    )
    return res


@router.get("/{statement_id}", summary="Get Daily Account Statement Details")
async def get_statement_details(
    statement_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full statement line-item transactions, reconciliation metrics, and delivery audit log.
    Executes PostgreSQL Stored Procedure `sp_get_daily_statement_details`.
    """
    res = await daily_statement_service.get_statement_details(statement_id, session=db)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("message", "Statement not found."))
    return res


@router.get("/{statement_id}/download", summary="Download Password-Protected Bank Statement PDF")
async def download_statement_pdf(
    statement_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Streams the password-protected bank statement PDF for the given statement ID.
    """
    pdf_path, stmt_num = await daily_statement_service.get_statement_pdf_path(statement_id, session=db)
    if not pdf_path or not os.path.exists(pdf_path):
        # Regenerate if file missing on disk
        stmt_info = await daily_statement_service.get_statement_details(statement_id, session=db)
        d = stmt_info.get("statement") or stmt_info
        if not d or not d.get("statement_number"):
            raise HTTPException(status_code=404, detail="Statement record not found.")

        pdf_bytes = daily_statement_service.build_bank_statement_pdf(d)
        os.makedirs(os.path.dirname(pdf_path or "storage/statements"), exist_ok=True)
        pdf_path = pdf_path or f"storage/statements/{d.get('statement_date')}/{d.get('statement_number')}.pdf"
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
        stmt_num = d.get("statement_number", "statement")

    filename = f"{stmt_num or 'Pay2Pay_Statement'}.pdf"
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/generate", summary="Trigger Daily Statement Generation Batch")
async def generate_statements_batch(
    payload: GenerateStatementsRequest,
    background_tasks: BackgroundTasks
):
    """
    Executes daily statement generation for all active retailers and Admin account.
    Defaults to yesterday's transactions (00:00:00 to 23:59:59).
    """
    target_date = None
    if payload.statement_date and payload.statement_date.strip():
        try:
            target_date = date.fromisoformat(payload.statement_date.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid statement_date format. Expected YYYY-MM-DD.")

    # Execute batch runner synchronously or via background task
    stats = await daily_statement_service.execute_daily_statement_job(
        statement_date=target_date,
        company_id=payload.company_id,
        force_regenerate=payload.force_regenerate
    )
    return {
        "success": True,
        "message": f"Daily statements generation completed for {stats.get('statement_date')}",
        "stats": stats
    }


@router.post("/{statement_id}/resend", summary="Resend Statement Email")
async def resend_statement_email(
    statement_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies reconciliation and re-dispatches the statement email with password-protected PDF.
    """
    res = await daily_statement_service.resend_statement_email(statement_id, session=db)
    if not res.get("success"):
        raise HTTPException(
            status_code=400 if "Reconciliation" in str(res.get("message")) else 500,
            detail=res.get("message", "Failed to send statement email.")
        )
    return {
        "success": True,
        "message": "Statement email dispatched successfully.",
        "email_status": res.get("email_status")
    }


@router.post("/retailer", summary="Generate Statement for Specific Retailer")
async def generate_retailer_statement(
    payload: GenerateSingleRetailerRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates and reconciles statement for a specific retailer on demand.
    """
    target_date = date.today()
    if payload.statement_date and payload.statement_date.strip():
        try:
            target_date = date.fromisoformat(payload.statement_date.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid statement_date format. Expected YYYY-MM-DD.")

    res = await daily_statement_service.generate_retailer_statement(
        retailer_id=payload.retailer_id,
        statement_date=target_date,
        force_regenerate=payload.force_regenerate,
        session=db
    )
    return res
