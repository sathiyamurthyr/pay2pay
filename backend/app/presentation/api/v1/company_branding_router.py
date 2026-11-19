"""
Company Branding & Multi-Tenant Configuration REST API Router.
Resolves dynamic company branding (name, legal name, logo, favicon, colors)
based on incoming domain/hostname (before login) or authenticated user token (after login).
Enables Super Admin dynamic company registration, branding, and domain configuration.
"""

import uuid
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.application.dependencies import get_optional_company_context, CompanyContext

router = APIRouter(prefix="/companies", tags=["Company Branding & Multi-Company"])


class CompanyRegisterRequest(BaseModel):
    company_name: str = Field(..., example="FinTech Pay")
    company_code: str = Field(..., example="FINTECHPAY")
    legal_name: Optional[str] = Field(None, example="FinTech Pay Private Limited")
    display_name: Optional[str] = Field(None, example="FinTech Pay")
    short_name: Optional[str] = Field(None, example="FTP")
    primary_domain: str = Field(..., example="fintechpay.in")
    additional_domains: List[str] = Field(default_factory=list, example=["login.fintechpay.in"])
    support_email: Optional[str] = Field(None, example="support@fintechpay.in")
    support_phone: Optional[str] = Field(None, example="+91 9876543210")
    primary_colour: Optional[str] = Field("#A20A3A", example="#A20A3A")
    secondary_colour: Optional[str] = Field("#EDC11E", example="#EDC11E")
    logo_url: Optional[str] = Field("/branding/logo.svg", example="/branding/logo.svg")
    favicon_url: Optional[str] = Field("/branding/favicon.png", example="/branding/favicon.png")


class CompanyBrandingUpdateRequest(BaseModel):
    primary_colour: Optional[str] = None
    secondary_colour: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    display_name: Optional[str] = None
    legal_name: Optional[str] = None


class CompanyDomainsUpdateRequest(BaseModel):
    domains: List[str]


def extract_clean_domain(domain_str: str) -> str:
    """Extracts hostname without port, protocol, or trailing slashes."""
    d = domain_str.strip().lower()
    if "://" in d:
        d = d.split("://")[1]
    if "/" in d:
        d = d.split("/")[0]
    if ":" in d:
        d = d.split(":")[0]
    return d


async def resolve_company_ref_by_domain(db: AsyncSession, domain_str: str) -> Optional[int]:
    """Resolves company_ref_id matching the given domain/hostname."""
    clean_dom = extract_clean_domain(domain_str)
    if not clean_dom:
        return None
    
    # Canonical brand identity mappings
    if "pay2pay" in clean_dom:
        dom_part = "pay2pay.in"
        code_guess = "PAY2PAY"
    elif "near4you" in clean_dom:
        dom_part = "near4you.store"
        code_guess = "NEAR4YOU"
    elif "smspay" in clean_dom:
        dom_part = "smspay.store"
        code_guess = "SMSPAY"
    else:
        dom_part = clean_dom
        for sub in ["login.", "admin.", "retailer.", "superadmin.", "super-admin.", "sales.", "receipt.", "www.", "api.", "app."]:
            if dom_part.startswith(sub):
                dom_part = dom_part[len(sub):]
        code_guess = dom_part.split(".")[0].upper()

    stmt = text("""
        SELECT c.company_ref_id
        FROM public.company c
        LEFT JOIN public.company_configuration cc ON (cc.company_id = c.public_id AND cc.config_key = 'domains')
        WHERE c.is_active = true AND c.is_deleted = false
          AND (
              c.website ILIKE :part
              OR cc.config_value::text ILIKE :exact
              OR cc.config_value::text ILIKE :part
              OR c.company_code ILIKE :code
          )
        ORDER BY c.id ASC
        LIMIT 1;
    """)
    res = await db.execute(stmt, {
        "part": f"%{dom_part}%",
        "exact": f"%{clean_dom}%",
        "code": f"%{code_guess}%"
    })
    row = res.fetchone()
    if row:
        return row[0]
    return None


def resolve_brand_metadata(
    code_hint: Optional[str],
    host_hint: Optional[str],
    db_row: Dict[str, Any]
) -> Dict[str, Any]:
    c_code = (code_hint or db_row.get("company_code") or "").upper().strip()
    h_hint = (host_hint or "").lower().strip()

    is_smspay = "SMSPAY" in c_code or "smspay" in h_hint or ":4002" in h_hint
    is_pay2pay = "PAY2PAY" in c_code or "pay2pay" in h_hint or ":3000" in h_hint or ":4003" in h_hint
    is_near4you = "NEAR4YOU" in c_code or "near4you" in h_hint or ":4001" in h_hint

    if is_smspay:
        resolved_code = "SMSPAY"
        resolved_display = "SMSPAY"
        resolved_name = "SMSPAY"
        resolved_legal = "SMSPAY Technologies Pvt. Ltd."
        resolved_logo = "/branding/smspay-logo.svg"
        resolved_favicon = "/branding/smspay-mark.svg"
        resolved_primary = "#059669"
        resolved_secondary = "#047857"
    elif is_pay2pay:
        resolved_code = "PAY2PAY"
        resolved_display = "Pay2Pay"
        resolved_name = "Pay2Pay"
        resolved_legal = "Pay2Pay FinTech Solutions Pvt. Ltd."
        resolved_logo = "/branding/pay2pay-logo.png"
        resolved_favicon = "/branding/pay2pay-favicon.png"
        resolved_primary = "#2563EB"
        resolved_secondary = "#1E40AF"
    elif is_near4you:
        resolved_code = "NEAR4YOU"
        resolved_display = "Near4You"
        resolved_name = "Near4You"
        resolved_legal = "Near4You Enterprise Technologies Pvt. Ltd."
        resolved_logo = "/branding/logo.svg"
        resolved_favicon = "/branding/favicon.png"
        resolved_primary = "#A20A3A"
        resolved_secondary = "#EDC11E"
    else:
        # Default fallback
        resolved_code = db_row.get("company_code") or "NEAR4YOU"
        resolved_display = db_row.get("display_name") or db_row.get("company_name") or "Near4You"
        resolved_name = db_row.get("company_name") or "Near4You"
        resolved_legal = db_row.get("legal_name") or "Near4You Enterprise Technologies Pvt. Ltd."
        resolved_logo = db_row.get("logo_url") or "/branding/logo.svg"
        resolved_favicon = db_row.get("favicon_url") or "/branding/favicon.png"
        resolved_primary = db_row.get("primary_colour") or "#A20A3A"
        resolved_secondary = db_row.get("secondary_colour") or "#EDC11E"

    # Allow custom db override if present and not a cross-tenant static default
    db_logo = db_row.get("logo_url")
    if db_logo and not (is_smspay and "logo.svg" in db_logo) and not (is_pay2pay and "logo.svg" in db_logo):
        resolved_logo = db_logo

    db_fav = db_row.get("favicon_url")
    if db_fav and db_fav not in ["/favicon.ico", "/branding/favicon.png"]:
        resolved_favicon = db_fav

    return {
        "company_code": resolved_code,
        "company_name": resolved_name,
        "legal_name": resolved_legal,
        "display_name": resolved_display,
        "logo_url": resolved_logo,
        "favicon_url": resolved_favicon,
        "primary_colour": resolved_primary,
        "secondary_colour": resolved_secondary,
    }


@router.get("/branding")
async def get_authenticated_company_branding(
    request: Request,
    domain: Optional[str] = None,
    company: Optional[str] = None,
    company_ref_id_param: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns dynamic company branding metadata based on:
    1. Direct company_ref_id_param (if supplied by authorized admin)
    2. Authenticated user's JWT context (tenant_ref_id, company_ref_id, retailer_ref_id)
    3. Incoming domain/hostname before authentication (e.g. login.near4you.store vs login.pay2pay.in)
    4. First active company fallback
    """
    tenant_ref_id = None
    company_ref_id = company_ref_id_param
    tenant_id_uuid = None
    company_id_uuid = None
    retailer_ref_id = None

    # 1. Resolve by explicit domain/company query parameter or hostname first (Domain-driven dynamic branding)
    target_domain = company or domain or request.query_params.get("company") or request.query_params.get("domain")
    host_header = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    clean_h = extract_clean_domain(host_header)
    port_h = host_header.split(":")[1] if ":" in host_header else ""
    if not target_domain:
        if clean_h and clean_h not in ["localhost", "127.0.0.1", "0.0.0.0"]:
            target_domain = clean_h
        elif port_h == "4002":
            target_domain = "smspay.store"
        elif port_h == "4001":
            target_domain = "near4you.store"
        elif port_h in ["3000", "4003"]:
            target_domain = "pay2pay.in"

    domain_was_specified = bool(target_domain and target_domain.lower() not in ["localhost", "127.0.0.1", "0.0.0.0"])

    if domain_was_specified:
        resolved_ref = await resolve_company_ref_by_domain(db, target_domain)
        if resolved_ref:
            company_ref_id = resolved_ref
        else:
            # Unmapped domain: Fail closed! Never return default company as fallback
            corr_id = str(uuid.uuid4())
            logger.warning(f"Domain resolution failure for target_domain='{target_domain}', correlation_id='{corr_id}'")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "UNMAPPED_DOMAIN",
                    "message": f"Domain '{target_domain}' is not mapped to any registered company identity.",
                    "domain": target_domain,
                    "correlation_id": corr_id
                }
            )

    # 2. If not resolved by domain, extract and decode JWT Bearer token / cookies
    if not company_ref_id and not company_id_uuid:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip() if "Bearer " in auth_header else None
        
        if not token:
            # Check cookies
            token = (
                request.cookies.get("p2p_admin_token")
                or request.cookies.get("p2p_super_admin_token")
                or request.cookies.get("p2p_retailer_token")
                or request.cookies.get("pay2pay_access_token")
                or request.cookies.get("p2p_access_token")
                or request.cookies.get("access_token")
                or request.cookies.get("token")
            )

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

    # 3. If retailer_ref_id is present and still unresolved, resolve company from retailer table
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

    # If neither domain nor company context could be resolved, fail closed
    if not company_ref_id and not company_id_uuid and not tenant_ref_id and not tenant_id_uuid:
        # Check if running on localhost / 127.0.0.1 for local dev fallback only
        host_hdr = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
        clean_host = extract_clean_domain(host_hdr)
        port_hdr = host_hdr.split(":")[1] if ":" in host_hdr else ""
        if clean_host in ["localhost", "127.0.0.1", "0.0.0.0"]:
            if port_hdr == "4002":
                company_ref_id = 2  # SMSPAY
            elif port_hdr == "4001":
                company_ref_id = 1  # Near4You
            else:
                company_ref_id = 47 # Pay2Pay default for local development on generic localhost
        else:
            corr_id = str(uuid.uuid4())
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "COMPANY_NOT_FOUND",
                    "message": "Unable to identify your company account.",
                    "correlation_id": corr_id
                }
            )

    # 4. Query company joined with company_branding and company_configuration (domains)
    query_sql = """
        SELECT 
            c.id,
            c.public_id AS company_id,
            c.company_ref_id,
            c.tenant_ref_id,
            c.company_code,
            c.website,
            c.company_name,
            c.legal_name,
            c.display_name,
            COALESCE(cb.logo_url, '/branding/logo.svg') AS logo_url,
            COALESCE(cb.favicon_url, '/branding/favicon.png') AS favicon_url,
            COALESCE(cb.primary_colour, '#2563EB') AS primary_colour,
            COALESCE(cb.secondary_colour, '#1E40AF') AS secondary_colour,
            cc.config_value AS configured_domains
        FROM public.company c
        LEFT JOIN public.company_branding cb ON (cb.company_id = c.public_id)
        LEFT JOIN public.company_configuration cc ON (cc.company_id = c.public_id AND cc.config_key = 'domains')
        WHERE c.is_active = true AND c.is_deleted = false
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
        query_sql += " ORDER BY c.id ASC LIMIT 1"

    if "LIMIT 1" not in query_sql and "ORDER BY" not in query_sql:
        query_sql += " ORDER BY c.id ASC LIMIT 1"

    res = await db.execute(text(query_sql), params)
    row = res.fetchone()

    if not row:
        corr_id = str(uuid.uuid4())
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "COMPANY_NOT_FOUND",
                "message": "Unable to identify your company account.",
                "correlation_id": corr_id
            }
        )

    d = dict(row._mapping)
    domains_list = []
    if d.get("configured_domains"):
        try:
            domains_list = d.get("configured_domains") if isinstance(d.get("configured_domains"), list) else json.loads(d.get("configured_domains"))
        except Exception:
            domains_list = []

    brand_hint = (company or "").upper().strip()
    host_hint = domain or target_domain or clean_h or host_header or ""

    brand_meta = resolve_brand_metadata(
        code_hint=brand_hint or d.get("company_code"),
        host_hint=host_hint,
        db_row=d
    )

    return {
        "success": True,
        "data": {
            "company_id": str(d.get("company_id")) if d.get("company_id") else None,
            "company_ref_id": d.get("company_ref_id"),
            "tenant_ref_id": d.get("tenant_ref_id"),
            "company_code": brand_meta["company_code"],
            "company_name": brand_meta["company_name"],
            "legal_name": brand_meta["legal_name"],
            "display_name": brand_meta["display_name"],
            "logo_url": brand_meta["logo_url"],
            "favicon_url": brand_meta["favicon_url"],
            "primary_colour": brand_meta["primary_colour"],
            "secondary_colour": brand_meta["secondary_colour"],
            "website": d.get("website"),
            "domains": domains_list
        }
    }


@router.get("/resolve-by-domain")
async def resolve_by_domain(
    domain: str,
    db: AsyncSession = Depends(get_db)
):
    """Explicit domain resolution endpoint for clients and middleware."""
    resolved_ref = await resolve_company_ref_by_domain(db, domain)
    if not resolved_ref:
        # Fallback to Near4You
        resolved_ref = 1

    res = await db.execute(text("""
        SELECT 
            c.id, c.public_id AS company_id, c.company_ref_id, c.tenant_ref_id,
            c.company_code, c.website,
            COALESCE(c.display_name, c.company_name) AS display_name,
            c.company_name, c.legal_name,
            COALESCE(cb.logo_url, '/branding/logo.svg') AS logo_url,
            COALESCE(cb.favicon_url, '/branding/favicon.png') AS favicon_url,
            COALESCE(cb.primary_colour, '#A20A3A') AS primary_colour,
            COALESCE(cb.secondary_colour, '#EDC11E') AS secondary_colour,
            cc.config_value AS configured_domains
        FROM public.company c
        LEFT JOIN public.company_branding cb ON (cb.company_id = c.public_id)
        LEFT JOIN public.company_configuration cc ON (cc.company_id = c.public_id AND cc.config_key = 'domains')
        WHERE c.company_ref_id = :comp_ref
        LIMIT 1;
    """), {"comp_ref": resolved_ref})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")

    d = dict(row._mapping)
    domains_list = []
    if d.get("configured_domains"):
        try:
            domains_list = d.get("configured_domains") if isinstance(d.get("configured_domains"), list) else json.loads(d.get("configured_domains"))
        except Exception:
            pass

    brand_meta = resolve_brand_metadata(
        code_hint=d.get("company_code"),
        host_hint=domain,
        db_row=d
    )

    return {
        "success": True,
        "data": {
            "company_id": str(d.get("company_id")),
            "company_ref_id": d.get("company_ref_id"),
            "tenant_ref_id": d.get("tenant_ref_id"),
            "company_code": brand_meta["company_code"],
            "company_name": brand_meta["company_name"],
            "display_name": brand_meta["display_name"],
            "legal_name": brand_meta["legal_name"],
            "logo_url": brand_meta["logo_url"],
            "favicon_url": brand_meta["favicon_url"],
            "primary_colour": brand_meta["primary_colour"],
            "secondary_colour": brand_meta["secondary_colour"],
            "website": d.get("website"),
            "domains": domains_list
        }
    }


@router.get("")
@router.get("/list")
async def list_companies(
    ctx: Optional[CompanyContext] = Depends(get_optional_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Lists registered companies, strictly filtered to authenticated company for non-super-admins."""
    where_clause = "WHERE c.is_deleted = false"
    params: Dict[str, Any] = {}
    if ctx and not ctx.is_super_admin:
        where_clause += " AND c.company_ref_id = :comp_ref"
        params["comp_ref"] = ctx.company_ref_id

    res = await db.execute(text(f"""
        SELECT 
            c.id, c.public_id, c.company_ref_id, c.tenant_ref_id,
            c.company_code, c.company_name, c.legal_name, c.display_name, c.short_name,
            c.website, c.status, c.is_active, c.created_date,
            COALESCE(cb.logo_url, '/branding/logo.svg') AS logo_url,
            COALESCE(cb.favicon_url, '/branding/favicon.png') AS favicon_url,
            COALESCE(cb.primary_colour, '#A20A3A') AS primary_colour,
            COALESCE(cb.secondary_colour, '#EDC11E') AS secondary_colour,
            cc.config_value AS configured_domains
        FROM public.company c
        LEFT JOIN public.company_branding cb ON (cb.company_id = c.public_id)
        LEFT JOIN public.company_configuration cc ON (cc.company_id = c.public_id AND cc.config_key = 'domains')
        {where_clause}
        ORDER BY c.company_ref_id ASC;
    """), params)
    companies = []
    for row in res.fetchall():
        d = dict(row._mapping)
        domains_list = []
        if d.get("configured_domains"):
            try:
                domains_list = d.get("configured_domains") if isinstance(d.get("configured_domains"), list) else json.loads(d.get("configured_domains"))
            except Exception:
                pass
        companies.append({
            "id": d.get("id"),
            "public_id": str(d.get("public_id")),
            "company_ref_id": d.get("company_ref_id"),
            "tenant_ref_id": d.get("tenant_ref_id"),
            "company_code": d.get("company_code"),
            "company_name": d.get("company_name"),
            "legal_name": d.get("legal_name"),
            "display_name": d.get("display_name"),
            "short_name": d.get("short_name"),
            "website": d.get("website"),
            "status": d.get("status"),
            "is_active": d.get("is_active"),
            "created_date": d.get("created_date").isoformat() if d.get("created_date") else None,
            "logo_url": d.get("logo_url"),
            "favicon_url": d.get("favicon_url"),
            "primary_colour": d.get("primary_colour"),
            "secondary_colour": d.get("secondary_colour"),
            "domains": domains_list
        })
    return {"success": True, "data": companies, "total": len(companies)}


@router.post("")
async def create_company(
    req: CompanyRegisterRequest,
    ctx: Optional[CompanyContext] = Depends(get_optional_company_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin endpoint to onboard a future company dynamically without code changes.
    Enforces uniqueness, provisions company, company_branding, and company_configuration records.
    Restricted strictly to Platform Super Admin.
    """
    if ctx and not ctx.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only Platform Super Admin can register new companies."
        )
    code_upper = req.company_code.strip().upper()
    existing = await db.execute(text("SELECT id FROM public.company WHERE company_code = :code;"), {"code": code_upper})
    if existing.fetchone():
        raise HTTPException(status_code=400, detail=f"Company code '{code_upper}' already exists.")

    # Generate sequential company_ref_id
    r = await db.execute(text("SELECT COALESCE(MAX(company_ref_id), 0) FROM public.company;"))
    max_ref = r.scalar() or 0
    new_comp_ref = max_ref + 1

    r_id = await db.execute(text("SELECT COALESCE(MAX(id), 0) FROM public.company;"))
    new_id = (r_id.scalar() or 0) + 1

    comp_uuid = uuid.uuid4()
    tenant_uuid = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8") # SATHUS tenant
    now = datetime.now(timezone.utc)

    # Insert into company
    await db.execute(text("""
        INSERT INTO public.company (
            id, public_id, company_id, tenant_id, tenant_ref_id, company_ref_id,
            company_code, company_name, legal_name, display_name, short_name,
            tenant_code, company_type, status, is_active, is_deleted,
            website, logo_path, email, mobile, created_date, updated_date, version_no, record_status
        ) VALUES (
            :id, :pub_id, :pub_id, :ten_id, 1, :comp_ref,
            :code, :name, :legal, :disp, :short,
            'SATHUS', 'PRIVATE_LIMITED', 'ACTIVE', true, false,
            :web, :logo, :email, :mobile, :now, :now, 1, 'ACTIVE'
        );
    """), {
        "id": new_id, "pub_id": comp_uuid, "ten_id": tenant_uuid, "comp_ref": new_comp_ref,
        "code": code_upper, "name": req.company_name, "legal": req.legal_name or req.company_name,
        "disp": req.display_name or req.company_name, "short": req.short_name or code_upper[:4],
        "web": f"https://{req.primary_domain}", "logo": req.logo_url,
        "email": req.support_email, "mobile": req.support_phone, "now": now
    })

    # Insert into company_branding
    r_brand = await db.execute(text("SELECT COALESCE(MAX(id), 0) FROM public.company_branding;"))
    new_brand_id = (r_brand.scalar() or 0) + 1
    await db.execute(text("""
        INSERT INTO public.company_branding (
            id, public_id, tenant_id, company_id, tenant_ref_id, company_ref_id,
            company_branding_ref_id, logo_url, favicon_url, primary_colour, secondary_colour,
            created_date, updated_date, version_no, record_status, is_active, is_deleted
        ) VALUES (
            :id, :pub_id, :ten_id, :comp_id, 1, :comp_ref,
            :brand_ref, :logo, :fav, :p_col, :s_col,
            :now, :now, 1, 'ACTIVE', true, false
        );
    """), {
        "id": new_brand_id, "pub_id": uuid.uuid4(), "ten_id": tenant_uuid, "comp_id": comp_uuid,
        "comp_ref": new_comp_ref, "brand_ref": new_brand_id, "logo": req.logo_url,
        "fav": req.favicon_url or "/branding/favicon.png",
        "p_col": req.primary_colour, "s_col": req.secondary_colour, "now": now
    })

    # Insert into company_configuration (domains)
    all_domains = [req.primary_domain] + [d for d in req.additional_domains if d != req.primary_domain]
    r_conf = await db.execute(text("SELECT COALESCE(MAX(id), 0) FROM public.company_configuration;"))
    new_conf_id = (r_conf.scalar() or 0) + 1
    await db.execute(text("""
        INSERT INTO public.company_configuration (
            id, public_id, tenant_id, company_id, tenant_ref_id, company_ref_id,
            company_configuration_ref_id, config_key, config_value, category,
            created_date, updated_date, version_no, record_status, is_active, is_deleted
        ) VALUES (
            :id, :pub_id, :ten_id, :comp_id, 1, :comp_ref,
            :conf_ref, 'domains', CAST(:val AS jsonb), 'SYSTEM',
            :now, :now, 1, 'ACTIVE', true, false
        );
    """), {
        "id": new_conf_id, "pub_id": uuid.uuid4(), "ten_id": tenant_uuid, "comp_id": comp_uuid,
        "comp_ref": new_comp_ref, "conf_ref": new_conf_id, "val": json.dumps(all_domains), "now": now
    })

    await db.commit()
    return {
        "success": True,
        "message": f"Company '{req.company_name}' registered successfully under Sathus Technology platform.",
        "data": {
            "company_ref_id": new_comp_ref,
            "company_code": code_upper,
            "company_name": req.company_name,
            "domains": all_domains
        }
    }


@router.put("/{company_ref_id}/branding")
async def update_company_branding(
    company_ref_id: int,
    req: CompanyBrandingUpdateRequest,
    ctx: Optional[CompanyContext] = Depends(get_optional_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin or Company Admin endpoint to customize brand colors, logos, and names dynamically."""
    if ctx:
        ctx.validate_access(company_ref_id)
    now = datetime.now(timezone.utc)
    if req.display_name or req.legal_name:
        await db.execute(text("""
            UPDATE public.company
            SET display_name = COALESCE(:disp, display_name),
                legal_name = COALESCE(:legal, legal_name),
                updated_date = :now
            WHERE company_ref_id = :comp_ref;
        """), {"disp": req.display_name, "legal": req.legal_name, "now": now, "comp_ref": company_ref_id})

    update_fields = []
    params: Dict[str, Any] = {"comp_ref": company_ref_id, "now": now}
    if req.primary_colour:
        update_fields.append("primary_colour = :p_col")
        params["p_col"] = req.primary_colour
    if req.secondary_colour:
        update_fields.append("secondary_colour = :s_col")
        params["s_col"] = req.secondary_colour
    if req.logo_url:
        update_fields.append("logo_url = :logo")
        params["logo"] = req.logo_url
    if req.favicon_url:
        update_fields.append("favicon_url = :fav")
        params["fav"] = req.favicon_url

    if update_fields:
        update_fields.append("updated_date = :now")
        sql = f"UPDATE public.company_branding SET {', '.join(update_fields)} WHERE company_ref_id = :comp_ref;"
        await db.execute(text(sql), params)

    await db.commit()
    return {"success": True, "message": "Branding updated successfully."}


@router.put("/{company_ref_id}/domains")
async def update_company_domains(
    company_ref_id: int,
    req: CompanyDomainsUpdateRequest,
    ctx: Optional[CompanyContext] = Depends(get_optional_company_context),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin or Company Admin endpoint to configure assigned domains/hostnames."""
    if ctx:
        ctx.validate_access(company_ref_id)
    now = datetime.now(timezone.utc)
    clean_domains = [extract_clean_domain(d) for d in req.domains if extract_clean_domain(d)]
    domains_json = json.dumps(clean_domains)

    r = await db.execute(text("SELECT id FROM public.company_configuration WHERE company_ref_id = :c_ref AND config_key = 'domains';"),
                         {"c_ref": company_ref_id})
    existing = r.fetchone()
    if existing:
        await db.execute(text("""
            UPDATE public.company_configuration
            SET config_value = CAST(:val AS jsonb), updated_date = :now
            WHERE id = :cid;
        """), {"val": domains_json, "now": now, "cid": existing[0]})
    else:
        r_conf = await db.execute(text("SELECT COALESCE(MAX(id), 0) FROM public.company_configuration;"))
        new_conf_id = (r_conf.scalar() or 0) + 1
        tenant_uuid = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
        comp_uuid = uuid.uuid4()
        await db.execute(text("""
            INSERT INTO public.company_configuration (
                id, public_id, tenant_id, company_id, tenant_ref_id, company_ref_id,
                company_configuration_ref_id, config_key, config_value, category,
                created_date, updated_date, version_no, record_status, is_active, is_deleted
            ) VALUES (
                :id, :pub_id, :ten_id, :comp_id, 1, :comp_ref,
                :conf_ref, 'domains', CAST(:val AS jsonb), 'SYSTEM',
                :now, :now, 1, 'ACTIVE', true, false
            );
        """), {
            "id": new_conf_id, "pub_id": uuid.uuid4(), "ten_id": tenant_uuid, "comp_id": comp_uuid,
            "comp_ref": company_ref_id, "conf_ref": new_conf_id, "val": domains_json, "now": now
        })

    await db.commit()
    return {"success": True, "message": "Domains updated successfully.", "domains": clean_domains}
