"""
Company Branding & Multi-Tenant Configuration REST API Router.
Resolves dynamic company branding (name, legal name, logo, favicon, colors)
based strictly on the authenticated caller's tenant and company context.
"""

import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token

router = APIRouter(prefix="/companies", tags=["Company Branding"])


@router.get("/branding")
async def get_authenticated_company_branding(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the authenticated company's branding metadata:
    - Company Name (Display Name / Brand Name)
    - Legal Name
    - Company Code
    - Logo URL (from company_branding or storage)
    - Favicon URL
    - Brand Colors
    """
    # 1. Extract and decode JWT Bearer token
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
    
    tenant_ref_id = None
    company_ref_id = None
    tenant_id_uuid = None
    company_id_uuid = None
    retailer_ref_id = None

    if token:
        payload = decode_access_token(token)
        if payload:
            tenant_ref_id = payload.get("tenant_ref_id")
            company_ref_id = payload.get("company_ref_id")
            retailer_ref_id = payload.get("retailer_ref_id")
            if payload.get("tenant_id"):
                try:
                    tenant_id_uuid = uuid.UUID(str(payload.get("tenant_id")))
                except Exception:
                    pass
            if payload.get("company_id"):
                try:
                    company_id_uuid = uuid.UUID(str(payload.get("company_id")))
                except Exception:
                    pass

    # 2. If retailer_ref_id is present, resolve company from retailer table if not in token
    if (not company_ref_id and not company_id_uuid) and retailer_ref_id:
        ret_res = await db.execute(text("""
            SELECT company_id, company_ref_id, tenant_id, tenant_ref_id 
            FROM public.retailer 
            WHERE retailer_ref_id = :ret_id OR public_id::text = :ret_id_str
            LIMIT 1;
        """), {"ret_id": retailer_ref_id, "ret_id_str": str(retailer_ref_id)})
        ret_row = ret_res.fetchone()
        if ret_row:
            r_dict = dict(ret_row._mapping)
            company_ref_id = company_ref_id or r_dict.get("company_ref_id")
            tenant_ref_id = tenant_ref_id or r_dict.get("tenant_ref_id")
            company_id_uuid = company_id_uuid or r_dict.get("company_id")
            tenant_id_uuid = tenant_id_uuid or r_dict.get("tenant_id")

    # 3. Query company joined with company_branding
    query_sql = """
        SELECT 
            c.id,
            c.public_id AS company_id,
            c.company_ref_id,
            c.tenant_ref_id,
            c.company_code,
            COALESCE(c.display_name, c.company_name, c.legal_name, 'Pay2Pay') AS company_name,
            COALESCE(c.legal_name, c.company_name, 'Pay2Pay Technologies Private Limited') AS legal_name,
            COALESCE(c.display_name, c.company_name) AS display_name,
            cb.logo_url,
            cb.favicon_url,
            COALESCE(cb.primary_colour, '#2563EB') AS primary_colour,
            COALESCE(cb.secondary_colour, '#1E40AF') AS secondary_colour
        FROM public.company c
        LEFT JOIN public.company_branding cb ON (cb.company_id = c.public_id OR cb.company_ref_id = c.company_ref_id)
        WHERE 1=1
    """
    params: Dict[str, Any] = {}

    if company_ref_id:
        query_sql += " AND c.company_ref_id = :comp_ref"
        params["comp_ref"] = company_ref_id
    elif company_id_uuid:
        query_sql += " AND c.public_id = :comp_uuid"
        params["comp_uuid"] = company_id_uuid
    elif tenant_ref_id:
        query_sql += " AND c.tenant_ref_id = :ten_ref"
        params["ten_ref"] = tenant_ref_id
    elif tenant_id_uuid:
        query_sql += " AND c.tenant_id = :ten_uuid"
        params["ten_uuid"] = tenant_id_uuid
    else:
        # Fallback to the active first company
        query_sql += " ORDER BY c.company_ref_id ASC LIMIT 1"

    if "ORDER BY" not in query_sql:
        query_sql += " LIMIT 1"

    res = await db.execute(text(query_sql), params)
    row = res.fetchone()

    if not row:
        # Default fallback
        return {
            "success": True,
            "data": {
                "company_id": None,
                "company_ref_id": 1,
                "tenant_ref_id": 1,
                "company_code": "PAY2PAY",
                "company_name": "Pay2Pay Fintech",
                "legal_name": "Pay2Pay Technologies Private Limited",
                "logo_url": "/branding/pay2pay-logo.png",
                "favicon_url": "/branding/favicon.png",
                "primary_colour": "#2563EB",
                "secondary_colour": "#1E40AF"
            }
        }

    d = dict(row._mapping)
    logo = d.get("logo_url") or "/branding/logo.png"

    return {
        "success": True,
        "data": {
            "company_id": str(d.get("company_id")) if d.get("company_id") else None,
            "company_ref_id": d.get("company_ref_id"),
            "tenant_ref_id": d.get("tenant_ref_id"),
            "company_code": d.get("company_code") or "P2P",
            "company_name": d.get("company_name") or "Pay2Pay",
            "legal_name": d.get("legal_name") or "Pay2Pay Technologies Private Limited",
            "display_name": d.get("display_name") or d.get("company_name"),
            "logo_url": logo,
            "favicon_url": d.get("favicon_url") or "/branding/favicon.png",
            "primary_colour": d.get("primary_colour") or "#2563EB",
            "secondary_colour": d.get("secondary_colour") or "#1E40AF"
        }
    }
