"""
Enterprise Service-Wise GST Reporting Router
API endpoints for Admin and Retailer GST compliance, reporting, and downloads.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Request, Response, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.domain_resolver import resolve_domain_context
from app.application.gst_reporting_service import GstReportingService

router = APIRouter(prefix="/reports/gst", tags=["Enterprise GST Reports"])


async def resolve_gst_auth_context(request: Request, db: AsyncSession) -> Dict[str, Any]:
    """
    Extracts authenticated user context, roles, and enforces tenant scoping.
    Prevents cross-retailer and cross-company context leakage.
    """
    domain_ctx = await resolve_domain_context(request, db)
    ctx: Dict[str, Any] = {
        "company_ref_id": domain_ctx.cmp_ref_id,
        "retailer_ref_id": None,
        "is_admin": False,
        "is_super_admin": False,
        "user_id": None,
        "domain_ctx": domain_ctx,
        "domain_cmp_ref_id": domain_ctx.cmp_ref_id,
    }

    token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "").strip()
    if not token:
        token = (
            request.cookies.get("p2p_admin_token") or
            request.cookies.get("p2p_super_admin_token") or
            request.cookies.get("p2p_retailer_token") or
            request.cookies.get("p2p_access_token") or
            request.cookies.get("pay2pay_access_token") or
            request.cookies.get("access_token")
        )

    if not token:
        # Unauthenticated calls cannot elevate to admin or cross-company via headers;
        # lock strictly to active domain company context.
        ctx["company_ref_id"] = domain_ctx.cmp_ref_id
        return ctx

    try:
        payload = decode_access_token(token) or {}
        sub_str = str(payload.get("sub") or "")
        ctx["user_id"] = sub_str
        roles = payload.get("roles") or []
        if isinstance(roles, str):
            roles = [roles]
        upper_roles = [str(r).upper() for r in roles]

        user_type_ref = payload.get("user_type_ref_id")
        user_type_str = str(payload.get("user_type") or "").upper()
        role_str = str(payload.get("role") or "").upper()
        if role_str and role_str not in upper_roles:
            upper_roles.append(role_str)

        is_super = any("SUPER_ADMIN" in r for r in upper_roles) or payload.get("is_super_admin") is True
        is_adm = (
            is_super
            or user_type_ref == 1
            or user_type_str == "ADMIN"
            or any(r in ("ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "OPS_ADMIN", "FINANCE", "COMPANY_ADMIN", "COMPLIANCE_OFFICER") for r in upper_roles)
        )

        ctx["is_super_admin"] = is_super
        ctx["is_admin"] = is_adm

        raw_comp = payload.get("company_ref_id")
        if is_super and raw_comp is not None and str(raw_comp).isdigit():
            ctx["company_ref_id"] = int(raw_comp)
        elif not is_super:
            if raw_comp is not None and str(raw_comp).isdigit() and int(raw_comp) != domain_ctx.cmp_ref_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Authenticated company ({raw_comp}) does not match active domain company ({domain_ctx.company_code})."
                )
            # Strictly enforce active domain's company reference ID for standard admin and retailer
            ctx["company_ref_id"] = domain_ctx.cmp_ref_id

        raw_ret = payload.get("retailer_ref_id") or payload.get("user_ref_id")
        if raw_ret is not None and str(raw_ret).isdigit():
            ctx["retailer_ref_id"] = int(raw_ret)

        # If not admin and retailer_ref_id is missing, look up from DB
        if not is_adm and not ctx["retailer_ref_id"] and sub_str:
            from sqlalchemy import text
            ret_q = await db.execute(text("""
                SELECT retailer_ref_id, company_ref_id
                FROM public.retailer
                WHERE public_id::text = :sub OR retailer_code = :sub
                LIMIT 1;
            """), {"sub": sub_str})
            ret_row = ret_q.fetchone()
            if ret_row:
                ctx["retailer_ref_id"] = int(ret_row[0])
                if not ctx["company_ref_id"] and ret_row[1]:
                    ctx["company_ref_id"] = int(ret_row[1])

    except HTTPException:
        raise
    except Exception as e:
        print(f"[GST Auth Warning] Failed to parse token: {e}")

    return ctx


@router.get("/filters")
async def get_gst_filters(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns available filter options for Admin and Retailer.
    """
    auth_ctx = await resolve_gst_auth_context(request, db)
    data = await GstReportingService.get_filter_options(db, auth_ctx)
    return {"success": True, "data": data}


@router.get("/summary")
async def get_gst_report_summary(
    request: Request,
    financial_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns Consolidated GST KPI Summary, Service-wise Breakdown, and Retailer Breakdown.
    """
    auth_ctx = await resolve_gst_auth_context(request, db)

    filters = {
        "financial_year": financial_year,
        "month": month,
        "company_id": company_id,
        "retailer_id": retailer_id,
        "service": service,
        "status": status,
    }

    report = await GstReportingService.fetch_gst_data(db, filters, auth_ctx)

    # For retailer portal, omit the all-retailers breakdown to preserve privacy
    retailer_breakdown = report["retailer_breakdown"] if auth_ctx.get("is_admin") else []

    return {
        "success": True,
        "data": {
            "summary": report["summary"],
            "service_breakdown": report["service_breakdown"],
            "retailer_breakdown": retailer_breakdown,
            "reversals_summary": {
                "count": report["summary"]["total_reversals_count"],
                "amount": report["summary"]["total_reversals_amount"]
            },
            "metadata": report["metadata"]
        }
    }


@router.get("/transactions")
async def get_gst_transactions(
    request: Request,
    financial_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated transaction-level GST records with statutory columns.
    """
    auth_ctx = await resolve_gst_auth_context(request, db)

    filters = {
        "financial_year": financial_year,
        "month": month,
        "company_id": company_id,
        "retailer_id": retailer_id,
        "service": service,
        "status": status,
    }

    report = await GstReportingService.fetch_gst_data(db, filters, auth_ctx)
    all_txns = report["transactions"]

    total = len(all_txns)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    items = all_txns[start_idx:end_idx]
    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "success": True,
        "data": {
            "items": items,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages
            }
        }
    }


@router.get("/export/csv")
async def export_gst_csv(
    request: Request,
    financial_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates and downloads clean CSV export of matching GST transaction records.
    """
    auth_ctx = await resolve_gst_auth_context(request, db)

    filters = {
        "financial_year": financial_year,
        "month": month,
        "company_id": company_id,
        "retailer_id": retailer_id,
        "service": service,
        "status": status,
    }

    report = await GstReportingService.fetch_gst_data(db, filters, auth_ctx)
    csv_content = GstReportingService.generate_gst_csv(report)

    fy_safe = (financial_year or "FY").replace(" ", "_").replace("-", "_")
    m_safe = (month or "All").replace(" ", "_")
    filename = f"GST_Report_{fy_safe}_{m_safe}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/excel")
async def export_gst_excel(
    request: Request,
    financial_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates and downloads official multi-sheet Excel (.xlsx) workbook.
    """
    auth_ctx = await resolve_gst_auth_context(request, db)

    filters = {
        "financial_year": financial_year,
        "month": month,
        "company_id": company_id,
        "retailer_id": retailer_id,
        "service": service,
        "status": status,
    }

    report = await GstReportingService.fetch_gst_data(db, filters, auth_ctx)
    excel_stream = GstReportingService.generate_gst_excel(report)

    fy_safe = (financial_year or "FY").replace(" ", "_").replace("-", "_")
    m_safe = (month or "All").replace(" ", "_")
    filename = f"GST_Report_{fy_safe}_{m_safe}.xlsx"

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/pdf")
async def export_gst_pdf(
    request: Request,
    financial_year: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    retailer_id: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates and downloads statutory PDF report statement with Sathus branding.
    """
    auth_ctx = await resolve_gst_auth_context(request, db)

    filters = {
        "financial_year": financial_year,
        "month": month,
        "company_id": company_id,
        "retailer_id": retailer_id,
        "service": service,
        "status": status,
    }

    report = await GstReportingService.fetch_gst_data(db, filters, auth_ctx)
    pdf_stream = GstReportingService.generate_gst_pdf(report)

    fy_safe = (financial_year or "FY").replace(" ", "_").replace("-", "_")
    m_safe = (month or "All").replace(" ", "_")
    filename = f"GST_Statement_{fy_safe}_{m_safe}.pdf"

    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
