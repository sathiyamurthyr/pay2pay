"""
Admin Company Profile Management & Retailer Read-Only Company Profile API.

Provides:
- Server-side multi-tenant & domain isolation via `get_company_context` and `resolve_domain_context`
- Admin CRUD endpoints: Create, View, Update company profile + Upload Logo
- Authoritative read-only endpoint for Retailer Portal Profile -> Company
- Single-source-of-truth synchronization with `public.company` and `public.company_branding`
"""

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import (
    CompanyContext,
    get_company_context,
    get_current_token_payload,
)
from app.core.database import get_db
from app.core.domain_resolver import clear_domain_cache, extract_host, resolve_domain_context
from app.core.exceptions import ForbiddenException
from app.infrastructure.db.company_profile_models import CompanyProfileModel
from app.infrastructure.db.models import CompanyBrandingModel, CompanyModel

logger = logging.getLogger("company_profile_router")
router = APIRouter(prefix="/company-profile", tags=["Company Profile Management"])

ALLOWED_ADMIN_ROLES = {
    "ADMIN",
    "SUPER_ADMIN",
    "SUPERADMIN",
    "PLATFORM_ADMIN",
    "OPERATIONS_ADMIN",
    "OPS_ADMIN",
    "FINANCE_ADMIN",
    "COMPLIANCE_ADMIN",
}
ALLOWED_LOGO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


class CompanyProfilePayload(BaseModel):
    """Create / Update payload for Admin Company Profile Management."""

    company_ref_id: Optional[int] = Field(None, description="Target company_ref_id (Super Admin only)")

    # A. Company Branding & Header
    logo_url: Optional[str] = None
    company_legal_name: str = Field(..., min_length=2, max_length=255)
    brand_name: str = Field(..., min_length=1, max_length=255)
    operating_partner_info: Optional[str] = None
    corporate_portal_url: Optional[str] = None
    regulatory_status_badge: Optional[str] = None

    # B. Corporate Entity Profile
    cin_number: Optional[str] = None
    gstin: Optional[str] = None
    business_entity_type: Optional[str] = None
    industry_sector: Optional[str] = None
    operating_status: Optional[str] = None
    entity_badge: Optional[str] = None

    # C. Merchant Helpdesk & Support Channels
    support_helpline: Optional[str] = None
    support_email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    operating_hours: Optional[str] = None
    direct_operations_line: Optional[str] = None

    # D. Registered Headquarters & Grievance Redressal
    registered_office_address: Optional[str] = None
    official_website_url: Optional[str] = None
    grievance_officer_name: Optional[str] = None
    grievance_officer_designation: Optional[str] = None
    grievance_escalation_email: Optional[str] = None
    tat_level_1: Optional[str] = None
    tat_level_2: Optional[str] = None


def _clean_opt(val: Optional[str]) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None


def _require_admin_role(ctx: CompanyContext) -> None:
    """Rejects non-admin roles (e.g. Retailer / Distributor / SD) from admin mutations."""
    roles = set()
    if ctx.role:
        roles.add(str(ctx.role).upper())
    if ctx.user:
        user_type = (getattr(ctx.user, "user_type", None) or "").upper()
        if user_type:
            roles.add(user_type)
        for ur in getattr(ctx.user, "user_roles", None) or []:
            if getattr(ur, "role", None) and getattr(ur.role, "code", None):
                roles.add(str(ur.role.code).upper())

    if ctx.is_super_admin:
        return

    if not roles.intersection(ALLOWED_ADMIN_ROLES):
        raise ForbiddenException("Access denied: Admin privileges are required to manage company profiles.")


def _default_entity_type_label(raw_type: Optional[str]) -> str:
    mapping = {
        "PRIVATE_LIMITED": "Private Limited Company",
        "PUBLIC_LIMITED": "Public Limited Company",
        "LLP": "Limited Liability Partnership (LLP)",
        "PARTNERSHIP": "Partnership Firm",
        "PROPRIETORSHIP": "Sole Proprietorship",
    }
    key = (raw_type or "").strip().upper()
    return mapping.get(key, raw_type.strip() if raw_type else "Private Limited Company")


async def _resolve_admin_target_company_ref(
    request: Request,
    ctx: CompanyContext,
    db: AsyncSession,
    requested_company_ref_id: Optional[int] = None,
) -> int:
    """
    Resolves and validates target company_ref_id for an authenticated Admin.
    Non-super-admin users are locked to their authenticated company & active domain.
    """
    _require_admin_role(ctx)
    if ctx.is_super_admin:
        if requested_company_ref_id is not None:
            return int(requested_company_ref_id)
        try:
            dom_ctx = await resolve_domain_context(request, db)
            return int(dom_ctx.cmp_ref_id)
        except Exception:
            if ctx.company_ref_id is not None:
                return int(ctx.company_ref_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please specify company_ref_id for platform-wide management.",
            )

    ctx.validate_access(requested_company_ref_id)
    if ctx.company_ref_id is None:
        raise ForbiddenException("No company bound to current admin session.")
    return int(ctx.company_ref_id)


def _format_profile_dict(
    comp: CompanyModel,
    branding: Optional[CompanyBrandingModel],
    prof: Optional[CompanyProfileModel],
) -> Dict[str, Any]:
    """Formats combined Company + CompanyBranding + CompanyProfile into canonical API response."""
    website = _clean_opt(prof.official_website_url if prof else None) or _clean_opt(comp.website) or ""
    portal_url = _clean_opt(prof.corporate_portal_url if prof else None) or website
    site_host = website.replace("https://", "").replace("http://", "").split("/")[0].strip()

    legal_name = (
        _clean_opt(prof.company_legal_name if prof else None)
        or _clean_opt(comp.legal_name)
        or _clean_opt(comp.company_name)
        or comp.company_code
    )
    brand_name = (
        _clean_opt(prof.brand_name if prof else None)
        or _clean_opt(comp.display_name)
        or _clean_opt(comp.company_name)
        or comp.company_code
    )
    logo_url = (
        _clean_opt(prof.logo_url if prof else None)
        or _clean_opt(branding.logo_url if branding else None)
        or "/branding/logo.svg"
    )
    operating_partner = (
        _clean_opt(prof.operating_partner_info if prof else None)
        or f"Official Operating Partner & Enterprise FinTech Network: {brand_name}"
    )

    cin = _clean_opt(prof.cin_number if prof else None) or _clean_opt(comp.cin_number)
    gstin = _clean_opt(prof.gstin if prof else None) or _clean_opt(comp.gst_number)

    officer_name = _clean_opt(prof.grievance_officer_name if prof else None)
    officer_designation = _clean_opt(prof.grievance_officer_designation if prof else None)
    if officer_name and officer_designation:
        nodal_display = f"{officer_name} ({officer_designation})"
    else:
        nodal_display = officer_name or officer_designation

    tat_1 = _clean_opt(prof.tat_level_1 if prof else None)
    tat_2 = _clean_opt(prof.tat_level_2 if prof else None)
    tat_parts = [p for p in [tat_1, tat_2] if p]
    resolution_tat = " | ".join(tat_parts) if tat_parts else None

    return {
        "company_profile_ref_id": prof.company_profile_ref_id if prof else None,
        "public_id": str(prof.public_id) if prof else None,
        "has_profile": prof is not None,
        "company_ref_id": comp.company_ref_id,
        "company_id": str(comp.public_id),
        "tenant_ref_id": comp.tenant_ref_id,
        "company_code": comp.company_code,
        "primary_colour": branding.primary_colour if branding else None,
        "secondary_colour": branding.secondary_colour if branding else None,
        "favicon_url": branding.favicon_url if branding else None,

        # A. Company Branding & Header
        "logo_url": logo_url,
        "company_legal_name": legal_name,
        "legal_name": legal_name,
        "company_name": legal_name,
        "brand_name": brand_name,
        "operating_partner_info": operating_partner,
        "corporate_portal_url": portal_url,
        "regulatory_status_badge": (
            _clean_opt(prof.regulatory_status_badge if prof else None) or "RBI / NPCI Authorized"
        ),

        # B. Corporate Entity Profile
        "cin_number": cin,
        "cin": cin,
        "gstin": gstin,
        "business_entity_type": (
            _clean_opt(prof.business_entity_type if prof else None)
            or _default_entity_type_label(comp.company_type)
        ),
        "industry_sector": (
            _clean_opt(prof.industry_sector if prof else None)
            or _clean_opt(comp.industry)
            or "FinTech, Payments & Banking Correspondent Network"
        ),
        "operating_status": (
            _clean_opt(prof.operating_status if prof else None)
            or ("ACTIVE & REGULATED" if comp.is_active else comp.status)
        ),
        "entity_badge": _clean_opt(prof.entity_badge if prof else None) or "Registered Corporate",

        # C. Merchant Helpdesk & Support Channels
        "support_helpline": _clean_opt(prof.support_helpline if prof else None),
        "support_phone": _clean_opt(prof.support_helpline if prof else None),
        "support_email": _clean_opt(prof.support_email if prof else None) or (f"support@{site_host}" if site_host else None),
        "whatsapp_number": _clean_opt(prof.whatsapp_number if prof else None),
        "operating_hours": _clean_opt(prof.operating_hours if prof else None),
        "support_hours": _clean_opt(prof.operating_hours if prof else None),
        "direct_operations_line": _clean_opt(prof.direct_operations_line if prof else None),
        "direct_phone": _clean_opt(prof.direct_operations_line if prof else None),

        # D. Registered Headquarters & Grievance Redressal
        "registered_office_address": _clean_opt(prof.registered_office_address if prof else None),
        "headquarters": _clean_opt(prof.registered_office_address if prof else None),
        "official_website_url": website,
        "website_url": website,
        "grievance_officer_name": officer_name,
        "grievance_officer_designation": officer_designation,
        "nodal_officer": nodal_display,
        "grievance_escalation_email": _clean_opt(prof.grievance_escalation_email if prof else None) or (f"grievance@{site_host}" if site_host else None),
        "grievance_email": _clean_opt(prof.grievance_escalation_email if prof else None) or (f"grievance@{site_host}" if site_host else None),
        "tat_level_1": tat_1,
        "tat_level_2": tat_2,
        "resolution_tat": resolution_tat,

        # Audit metadata
        "created_at": prof.created_at.isoformat() if prof and prof.created_at else None,
        "updated_at": prof.updated_at.isoformat() if prof and prof.updated_at else None,
        "updated_by": prof.updated_by if prof else None,
    }


async def get_company_profile_data(
    db: AsyncSession,
    company_ref_id: int,
) -> Dict[str, Any]:
    """Shared service helper used by Company Profile endpoints & Retailer Profile."""
    comp = (
        await db.execute(
            select(CompanyModel).where(
                CompanyModel.company_ref_id == int(company_ref_id),
                CompanyModel.is_deleted == False,
            )
        )
    ).scalars().first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company record not found.")

    branding = (
        await db.execute(
            select(CompanyBrandingModel).where(
                CompanyBrandingModel.company_id == comp.public_id,
                CompanyBrandingModel.is_deleted == False,
            )
        )
    ).scalars().first()

    prof = (
        await db.execute(
            select(CompanyProfileModel).where(
                CompanyProfileModel.company_ref_id == int(company_ref_id),
                CompanyProfileModel.is_deleted == False,
            )
        )
    ).scalars().first()

    return _format_profile_dict(comp, branding, prof)


async def _upsert_company_profile(
    db: AsyncSession,
    company_ref_id: int,
    payload: CompanyProfilePayload,
    actor: str,
    create_only: bool = False,
) -> Dict[str, Any]:
    """Creates or updates `public.company_profile` and syncs `company` & `company_branding`."""
    comp = (
        await db.execute(
            select(CompanyModel).where(
                CompanyModel.company_ref_id == int(company_ref_id),
                CompanyModel.is_deleted == False,
            )
        )
    ).scalars().first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Authorized company not found.")

    prof = (
        await db.execute(
            select(CompanyProfileModel).where(
                CompanyProfileModel.company_ref_id == int(company_ref_id),
                CompanyProfileModel.is_deleted == False,
            )
        )
    ).scalars().first()

    if create_only and prof is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company profile already exists for this company. Use PUT/PATCH to update it.",
        )

    now = datetime.now(timezone.utc)
    if prof is None:
        prof = CompanyProfileModel(
            public_id=uuid.uuid4(),
            company_ref_id=int(company_ref_id),
            company_id=comp.public_id,
            tenant_ref_id=comp.tenant_ref_id,
            tenant_id=comp.tenant_id,
            created_by=actor,
            company_legal_name=payload.company_legal_name.strip(),
            brand_name=payload.brand_name.strip(),
        )
        db.add(prof)

    prof.company_id = comp.public_id
    prof.tenant_ref_id = comp.tenant_ref_id
    prof.tenant_id = comp.tenant_id
    prof.logo_url = _clean_opt(payload.logo_url) or prof.logo_url
    prof.company_legal_name = payload.company_legal_name.strip()
    prof.brand_name = payload.brand_name.strip()
    prof.operating_partner_info = _clean_opt(payload.operating_partner_info)
    prof.corporate_portal_url = _clean_opt(payload.corporate_portal_url)
    prof.regulatory_status_badge = _clean_opt(payload.regulatory_status_badge) or "RBI / NPCI Authorized"

    prof.cin_number = _clean_opt(payload.cin_number)
    prof.gstin = _clean_opt(payload.gstin)
    prof.business_entity_type = _clean_opt(payload.business_entity_type)
    prof.industry_sector = _clean_opt(payload.industry_sector)
    prof.operating_status = _clean_opt(payload.operating_status) or "ACTIVE & REGULATED"
    prof.entity_badge = _clean_opt(payload.entity_badge) or "Registered Corporate"

    prof.support_helpline = _clean_opt(payload.support_helpline)
    prof.support_email = _clean_opt(payload.support_email)
    prof.whatsapp_number = _clean_opt(payload.whatsapp_number)
    prof.operating_hours = _clean_opt(payload.operating_hours)
    prof.direct_operations_line = _clean_opt(payload.direct_operations_line)

    prof.registered_office_address = _clean_opt(payload.registered_office_address)
    prof.official_website_url = _clean_opt(payload.official_website_url)
    prof.grievance_officer_name = _clean_opt(payload.grievance_officer_name)
    prof.grievance_officer_designation = _clean_opt(payload.grievance_officer_designation)
    prof.grievance_escalation_email = _clean_opt(payload.grievance_escalation_email)
    prof.tat_level_1 = _clean_opt(payload.tat_level_1)
    prof.tat_level_2 = _clean_opt(payload.tat_level_2)

    prof.updated_by = actor
    prof.updated_at = now
    prof.is_active = True
    prof.is_deleted = False

    # Synchronize core metadata back to `public.company` and `public.company_branding`
    comp.legal_name = prof.company_legal_name
    comp.company_name = prof.company_legal_name
    comp.display_name = prof.brand_name
    comp.cin_number = prof.cin_number
    comp.gst_number = prof.gstin
    if prof.official_website_url:
        comp.website = prof.official_website_url
    comp.updated_date = now
    comp.updated_by = actor

    branding = (
        await db.execute(
            select(CompanyBrandingModel).where(
                CompanyBrandingModel.company_id == comp.public_id,
                CompanyBrandingModel.is_deleted == False,
            )
        )
    ).scalars().first()
    if branding and prof.logo_url:
        branding.logo_url = prof.logo_url
        branding.updated_date = now
        branding.updated_by = actor

    await db.commit()
    clear_domain_cache()
    return await get_company_profile_data(db, company_ref_id)


@router.get("/current", summary="Get Read-Only Company Profile for Active Domain & Session")
async def get_current_company_profile(
    request: Request,
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db),
):
    """
    Read-only endpoint used by Retailer Portal (Profile -> Company).
    Resolves company strictly from authenticated session + active domain host and rejects mismatches.
    """
    session_comp_ref = payload.get("company_ref_id")
    token_roles = [str(r).upper() for r in (payload.get("roles") or [])]
    is_super = (
        payload.get("is_super_admin") is True
        or "SUPER_ADMIN" in token_roles
        or "SUPERADMIN" in token_roles
    ) and session_comp_ref is None

    if session_comp_ref is None and not is_super and payload.get("sub"):
        try:
            sub_uuid = uuid.UUID(str(payload["sub"]))
            row_val = (
                await db.execute(
                    text("SELECT company_ref_id FROM public.retailer WHERE public_id = :pid LIMIT 1"),
                    {"pid": sub_uuid},
                )
            ).scalar_one_or_none()
            if row_val is None:
                row_val = (
                    await db.execute(
                        text("SELECT company_ref_id FROM public.admin_user WHERE public_id = :pid LIMIT 1"),
                        {"pid": sub_uuid},
                    )
                ).scalar_one_or_none()
            if row_val is not None:
                session_comp_ref = int(row_val)
        except Exception:
            pass

    host = extract_host(request)
    is_local = host in ("", "localhost", "127.0.0.1", "0.0.0.0", "backend", "near4you-retailer-backend", "testserver")

    resolved_comp_ref: Optional[int] = None
    if not is_local:
        dom_ctx = await resolve_domain_context(request, db)
        resolved_comp_ref = int(dom_ctx.cmp_ref_id)
        if session_comp_ref is not None and not is_super and int(session_comp_ref) != resolved_comp_ref:
            raise ForbiddenException(
                "Access denied: Authenticated user company does not match active domain company."
            )
    else:
        resolved_comp_ref = int(session_comp_ref) if session_comp_ref is not None else None
        if resolved_comp_ref is None:
            dom_ctx = await resolve_domain_context(request, db)
            resolved_comp_ref = int(dom_ctx.cmp_ref_id)

    if resolved_comp_ref is None:
        raise ForbiddenException("Unable to resolve authorized company identity.")

    data = await get_company_profile_data(db, resolved_comp_ref)
    return {"success": True, "data": data}


@router.get("/admin/companies", summary="Admin: List Authorized Companies for Profile Management")
async def list_authorized_companies_for_profile(
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db),
):
    _require_admin_role(ctx)
    stmt = select(CompanyModel).where(CompanyModel.is_deleted == False, CompanyModel.is_active == True)
    if not ctx.is_super_admin:
        stmt = stmt.where(CompanyModel.company_ref_id == ctx.company_ref_id)
    stmt = stmt.order_by(CompanyModel.company_ref_id.asc())

    rows = (await db.execute(stmt)).scalars().all()
    return {
        "success": True,
        "is_super_admin": ctx.is_super_admin,
        "data": [
            {
                "company_ref_id": c.company_ref_id,
                "company_id": str(c.public_id),
                "company_code": c.company_code,
                "company_name": c.company_name,
                "legal_name": c.legal_name,
                "display_name": c.display_name,
            }
            for c in rows
        ],
    }


@router.get("/admin", summary="Admin: Retrieve Company Profile")
async def admin_get_company_profile(
    request: Request,
    company_ref_id: Optional[int] = Query(None),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db),
):
    target_comp_ref = await _resolve_admin_target_company_ref(request, ctx, db, company_ref_id)
    data = await get_company_profile_data(db, target_comp_ref)
    return {"success": True, "data": data}


@router.post("", summary="Admin: Create Company Profile")
@router.post("/admin", summary="Admin: Create Company Profile")
async def admin_create_company_profile(
    req: CompanyProfilePayload,
    request: Request,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db),
):
    target_comp_ref = await _resolve_admin_target_company_ref(request, ctx, db, req.company_ref_id)
    data = await _upsert_company_profile(db, target_comp_ref, req, actor=ctx.user_email, create_only=True)
    return {"success": True, "message": "Company profile created successfully.", "data": data}


@router.put("", summary="Admin: Update Company Profile")
@router.patch("", summary="Admin: Update Company Profile")
@router.put("/admin", summary="Admin: Update Company Profile")
@router.patch("/admin", summary="Admin: Update Company Profile")
async def admin_update_company_profile(
    req: CompanyProfilePayload,
    request: Request,
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db),
):
    target_comp_ref = await _resolve_admin_target_company_ref(request, ctx, db, req.company_ref_id)
    data = await _upsert_company_profile(db, target_comp_ref, req, actor=ctx.user_email, create_only=False)
    return {"success": True, "message": "Company profile saved successfully.", "data": data}


@router.post("/upload-logo", summary="Admin: Upload Company Logo")
@router.post("/admin/upload-logo", summary="Admin: Upload Company Logo")
async def admin_upload_company_logo(
    request: Request,
    file: UploadFile = File(..., description="Logo file (PNG, JPG, JPEG, WEBP, SVG — max 5 MB)"),
    company_ref_id: Optional[int] = Form(None),
    persist: bool = Form(True),
    ctx: CompanyContext = Depends(get_company_context),
    db: AsyncSession = Depends(get_db),
):
    target_comp_ref = await _resolve_admin_target_company_ref(request, ctx, db, company_ref_id)

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No logo file provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported logo format. Allowed formats: PNG, JPG, JPEG, WEBP, SVG.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded logo file is empty.")
    if len(file_bytes) > MAX_LOGO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Logo file size exceeds the 5 MB limit.",
        )

    logo_dir = Path("uploads") / "company-logos"
    logo_dir.mkdir(parents=True, exist_ok=True)
    filename = f"company_{target_comp_ref}_{uuid.uuid4().hex[:12]}{ext}"
    (logo_dir / filename).write_bytes(file_bytes)
    relative_url = f"/uploads/company-logos/{filename}"

    if persist:
        now = datetime.now(timezone.utc)
        comp = (
            await db.execute(
                select(CompanyModel).where(
                    CompanyModel.company_ref_id == target_comp_ref,
                    CompanyModel.is_deleted == False,
                )
            )
        ).scalars().first()
        if comp:
            prof = (
                await db.execute(
                    select(CompanyProfileModel).where(
                        CompanyProfileModel.company_ref_id == target_comp_ref,
                        CompanyProfileModel.is_deleted == False,
                    )
                )
            ).scalars().first()
            if prof:
                prof.logo_url = relative_url
                prof.updated_at = now
                prof.updated_by = ctx.user_email

            branding = (
                await db.execute(
                    select(CompanyBrandingModel).where(
                        CompanyBrandingModel.company_id == comp.public_id,
                        CompanyBrandingModel.is_deleted == False,
                    )
                )
            ).scalars().first()
            if branding:
                branding.logo_url = relative_url
                branding.updated_date = now
                branding.updated_by = ctx.user_email

            await db.commit()
            clear_domain_cache()

    return {
        "success": True,
        "message": "Company logo uploaded successfully.",
        "logo_url": relative_url,
        "url": relative_url,
        "company_ref_id": target_comp_ref,
    }
