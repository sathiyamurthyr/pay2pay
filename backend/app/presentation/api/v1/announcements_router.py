import uuid
import mimetypes
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

logger = logging.getLogger("announcements_router")

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, update, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.domain_resolver import get_domain_context, DomainCompanyContext
from app.infrastructure.db.models import AnnouncementModel, AnnouncementImageModel, CompanyModel
from app.application.storage_service import BackblazeStorageService, B2_BUCKET_NAME

router = APIRouter(prefix="/announcements", tags=["Enterprise Announcements"])


# ─────────────────────────────────────────────────────────────────────────────
# DTO SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class AnnouncementLinkItem(BaseModel):
    label: str = Field(..., example="WhatsApp Channel")
    url: str = Field(..., example="https://whatsapp.com/channel/...")
    icon: Optional[str] = Field("whatsapp", example="whatsapp")


class AnnouncementImageResponse(BaseModel):
    id: str
    b2_object_key: str
    image_url: str
    original_filename: str
    content_type: str
    file_size: int
    display_order: int


class AnnouncementResponse(BaseModel):
    id: str
    announcement_code: str
    company_ref_id: Optional[int]
    title: str
    message: str
    links: List[Dict[str, Any]]
    display_type: str
    priority: int
    audience: str
    status: str
    is_active: bool
    start_at: Optional[str]
    end_at: Optional[str]
    images: List[AnnouncementImageResponse]
    created_at: Optional[str]
    updated_at: Optional[str]


class AnnouncementCreatePayload(BaseModel):
    title: Optional[str] = Field(None, example="Platform System Update")
    header: Optional[str] = None
    message: Optional[str] = Field(None, example="Get latest update on our official channel.")
    body: Optional[str] = None
    company_ref_id: Optional[int] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    images: Optional[List[Any]] = None
    links: Optional[List[AnnouncementLinkItem]] = Field(default_factory=list)
    display_type: Optional[str] = Field("MODAL", example="MODAL")
    priority: Optional[int] = Field(10, example=10)
    audience: Optional[str] = Field("ALL_RETAILERS", example="ALL_RETAILERS")
    status: Optional[str] = Field("ACTIVE", example="ACTIVE")
    is_active: Optional[bool] = Field(True, example=True)
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class AnnouncementUpdatePayload(BaseModel):
    title: Optional[str] = None
    header: Optional[str] = None
    message: Optional[str] = None
    body: Optional[str] = None
    company_ref_id: Optional[int] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    images: Optional[List[Any]] = None
    links: Optional[List[AnnouncementLinkItem]] = None
    display_type: Optional[str] = None
    priority: Optional[int] = None
    audience: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None


class ImageReorderItem(BaseModel):
    image_id: str
    display_order: int


class ImageReorderPayload(BaseModel):
    orderings: List[ImageReorderItem]


async def _resolve_company_entities(cmp_ref_id: int, db: AsyncSession) -> tuple[Optional[uuid.UUID], Optional[uuid.UUID]]:
    """Resolves (company_public_id, tenant_id) from company_ref_id."""
    cmp_stmt = select(CompanyModel).where(CompanyModel.company_ref_id == cmp_ref_id)
    cmp_obj = (await db.execute(cmp_stmt)).scalars().first()
    if cmp_obj:
        return cmp_obj.public_id, cmp_obj.tenant_id
    synth_uuid = uuid.UUID(f"00000000-0000-0000-0000-{cmp_ref_id:012d}")
    return synth_uuid, None


# ─────────────────────────────────────────────────────────────────────────────
# 1. RETAILER & DASHBOARD CONSUMER ENDPOINTS (READ-ONLY)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/active", summary="Fetch active announcements for dashboard popup")
async def get_active_announcements(
    audience: Optional[str] = "RETAILER",
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches currently active, valid announcements within start_at and end_at bounds
    filtered for the target audience and strictly isolated to the domain company context.
    NEVER allows cross-company fallbacks or global leaks.
    """
    now = datetime.now(timezone.utc)
    audience_variants = ["ALL", "ALL_RETAILERS", audience.upper() if audience else "RETAILER"]

    # Strictly scope to active domain company
    cmp_public_id, cmp_tenant_id = await _resolve_company_entities(domain_ctx.cmp_ref_id, db)
    synth_uuid = uuid.UUID(f"00000000-0000-0000-0000-{domain_ctx.cmp_ref_id:012d}")

    company_conditions = [
        AnnouncementModel.company_ref_id == domain_ctx.cmp_ref_id
    ]
    if cmp_public_id:
        company_conditions.append(AnnouncementModel.company_id == cmp_public_id)
    company_conditions.append(AnnouncementModel.company_id == synth_uuid)

    stmt = (
        select(AnnouncementModel)
        .options(selectinload(AnnouncementModel.images))
        .where(
            and_(
                AnnouncementModel.is_active == True,
                AnnouncementModel.status == "ACTIVE",
                AnnouncementModel.is_deleted == False,
                or_(AnnouncementModel.start_at == None, AnnouncementModel.start_at <= now),
                or_(AnnouncementModel.end_at == None, AnnouncementModel.end_at >= now),
                AnnouncementModel.audience.in_(audience_variants),
                or_(*company_conditions)
            )
        )
        .order_by(AnnouncementModel.priority.desc(), AnnouncementModel.created_date.desc())
    )

    results = (await db.execute(stmt)).scalars().all()
    announcements_data = []

    for a in results:
        # Sort and map active images
        img_list = []
        for img in sorted(a.images, key=lambda x: x.display_order):
            if not img.is_deleted and img.is_active:
                if img.image_url and (
                    img.image_url.startswith("/uploads")
                    or img.image_url.startswith("http://")
                    or img.image_url.startswith("https://")
                    or img.image_url.startswith("data:")
                ):
                    full_img_url = img.image_url
                else:
                    full_img_url = BackblazeStorageService.get_download_url(img.b2_object_key) or img.image_url
                img_list.append({
                    "id": str(img.public_id),
                    "b2_object_key": img.b2_object_key,
                    "image_url": full_img_url,
                    "original_filename": img.original_filename,
                    "content_type": img.content_type,
                    "file_size": img.file_size,
                    "display_order": img.display_order
                })

        top_img = img_list[0]["image_url"] if img_list else None
        announcements_data.append({
            "id": str(a.public_id),
            "announcement_code": a.announcement_code,
            "company_ref_id": a.company_ref_id or domain_ctx.cmp_ref_id,
            "title": a.title,
            "header": a.title,
            "message": a.content,
            "body": a.content,
            "image_url": top_img,
            "links": a.links or [],
            "display_type": a.display_type or "MODAL",
            "priority": a.priority or 10,
            "audience": a.audience,
            "status": a.status,
            "is_active": a.is_active,
            "start_at": a.start_at.isoformat() if a.start_at else None,
            "end_at": a.end_at.isoformat() if a.end_at else None,
            "images": img_list,
            "created_at": a.created_date.isoformat() if a.created_date else None,
            "updated_at": a.updated_date.isoformat() if a.updated_date else None,
        })

    return {
        "success": True,
        "status": "SUCCESS",
        "company_ref_id": domain_ctx.cmp_ref_id,
        "app_id": domain_ctx.company_code,
        "count": len(announcements_data),
        "data": announcements_data
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. ADMIN ANNOUNCEMENT MANAGEMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/admin/list", summary="Admin: List all announcements with full metadata")
async def admin_list_announcements(
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to list all announcements scoped strictly to active domain company."""
    cmp_public_id, _ = await _resolve_company_entities(domain_ctx.cmp_ref_id, db)
    synth_uuid = uuid.UUID(f"00000000-0000-0000-0000-{domain_ctx.cmp_ref_id:012d}")

    company_conditions = [
        AnnouncementModel.company_ref_id == domain_ctx.cmp_ref_id
    ]
    if cmp_public_id:
        company_conditions.append(AnnouncementModel.company_id == cmp_public_id)
    company_conditions.append(AnnouncementModel.company_id == synth_uuid)

    stmt = (
        select(AnnouncementModel)
        .options(selectinload(AnnouncementModel.images))
        .where(
            and_(
                AnnouncementModel.is_deleted == False,
                or_(*company_conditions)
            )
        )
        .order_by(AnnouncementModel.priority.desc(), AnnouncementModel.created_date.desc())
    )
    results = (await db.execute(stmt)).scalars().all()
    announcements_data = []

    for a in results:
        img_list = []
        for img in sorted(a.images, key=lambda x: x.display_order):
            if not img.is_deleted:
                if img.image_url and (
                    img.image_url.startswith("/uploads")
                    or img.image_url.startswith("http://")
                    or img.image_url.startswith("https://")
                    or img.image_url.startswith("data:")
                ):
                    full_img_url = img.image_url
                else:
                    full_img_url = BackblazeStorageService.get_download_url(img.b2_object_key) or img.image_url
                img_list.append({
                    "id": str(img.public_id),
                    "b2_object_key": img.b2_object_key,
                    "image_url": full_img_url,
                    "original_filename": img.original_filename,
                    "content_type": img.content_type,
                    "file_size": img.file_size,
                    "display_order": img.display_order
                })

        top_img = img_list[0]["image_url"] if img_list else None
        announcements_data.append({
            "id": str(a.public_id),
            "announcement_code": a.announcement_code,
            "company_ref_id": a.company_ref_id or domain_ctx.cmp_ref_id,
            "title": a.title,
            "header": a.title,
            "message": a.content,
            "body": a.content,
            "image_url": top_img,
            "links": a.links or [],
            "display_type": a.display_type or "MODAL",
            "priority": a.priority or 10,
            "audience": a.audience,
            "status": a.status,
            "is_active": a.is_active,
            "start_at": a.start_at.isoformat() if a.start_at else None,
            "end_at": a.end_at.isoformat() if a.end_at else None,
            "images": img_list,
            "created_at": a.created_date.isoformat() if a.created_date else None,
            "updated_at": a.updated_date.isoformat() if a.updated_date else None,
        })

    return {
        "success": True,
        "status": "SUCCESS",
        "company_ref_id": domain_ctx.cmp_ref_id,
        "app_id": domain_ctx.company_code,
        "data": announcements_data
    }


@router.post("/admin/create", summary="Admin: Create new announcement")
async def admin_create_announcement(
    payload: AnnouncementCreatePayload,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to create a new announcement bound to the active domain company context."""
    target_cmp_ref_id = payload.company_ref_id or domain_ctx.cmp_ref_id
    cmp_public_id, cmp_tenant_id = await _resolve_company_entities(target_cmp_ref_id, db)

    effective_tenant_id = cmp_tenant_id or (
        uuid.UUID(domain_ctx.tenant_id) if domain_ctx.tenant_id else uuid.UUID("00000000-0000-0000-0000-000000000001")
    )
    effective_company_id = cmp_public_id or uuid.UUID(f"00000000-0000-0000-0000-{target_cmp_ref_id:012d}")

    code = f"ANN-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
    pub_id = uuid.uuid4()

    links_dict_list = [l.dict() if hasattr(l, "dict") else dict(l) for l in payload.links] if payload.links else []
    resolved_title = (payload.title or payload.header or "Announcement").strip()
    resolved_content = (payload.message or payload.body or "").strip()

    ann = AnnouncementModel(
        tenant_id=effective_tenant_id,
        company_id=effective_company_id,
        company_ref_id=target_cmp_ref_id,
        public_id=pub_id,
        announcement_code=code,
        title=resolved_title,
        content=resolved_content,
        links=links_dict_list,
        display_type=payload.display_type or "MODAL",
        priority=payload.priority if payload.priority is not None else 10,
        audience=payload.audience or "ALL_RETAILERS",
        status=payload.status or "ACTIVE",
        is_active=payload.is_active if payload.is_active is not None else True,
        start_at=payload.start_at,
        end_at=payload.end_at,
        created_by="ADMIN"
    )
    db.add(ann)

    # Persist images if image_url or images array is provided
    img_candidates: List[str] = []
    if payload.image_url and isinstance(payload.image_url, str) and payload.image_url.strip():
        img_candidates.append(payload.image_url.strip())
    if payload.image_urls:
        for u in payload.image_urls:
            if u and isinstance(u, str) and u.strip():
                img_candidates.append(u.strip())
    if payload.images:
        for item in payload.images:
            if isinstance(item, str) and item.strip():
                img_candidates.append(item.strip())
            elif isinstance(item, dict) and item.get("image_url"):
                img_candidates.append(str(item["image_url"]).strip())

    for idx, u in enumerate(img_candidates, start=1):
        img_pub_id = uuid.uuid4()
        ann_img = AnnouncementImageModel(
            tenant_id=ann.tenant_id,
            company_id=ann.company_id,
            company_ref_id=target_cmp_ref_id,
            public_id=img_pub_id,
            announcement_id=ann.public_id,
            b2_object_key=u if not u.startswith("/uploads") else f"local_{img_pub_id.hex[:8]}",
            b2_bucket="local" if u.startswith("/uploads") else B2_BUCKET_NAME,
            image_url=u,
            original_filename="banner.jpg",
            content_type="image/jpeg",
            file_size=1024,
            display_order=idx,
            is_active=True,
            created_by="ADMIN"
        )
        db.add(ann_img)

    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {code} created successfully for company {target_cmp_ref_id}.",
        "data": {
            "id": str(pub_id),
            "announcement_code": code,
            "company_ref_id": target_cmp_ref_id,
            "title": ann.title,
            "image_url": img_candidates[0] if img_candidates else None,
            "is_active": ann.is_active
        }
    }


@router.put("/admin/{announcement_id}", summary="Admin: Update announcement")
@router.patch("/admin/{announcement_id}", summary="Admin: Partially update announcement (e.g. is_active)")
async def admin_update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdatePayload,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to edit announcement with company isolation validation."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = (
        select(AnnouncementModel)
        .options(selectinload(AnnouncementModel.images))
        .where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    )
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    # Validate company isolation
    if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You cannot modify announcements belonging to another company."
        )

    if payload.title is not None or payload.header is not None:
        ann.title = (payload.title or payload.header or ann.title).strip()
    if payload.message is not None or payload.body is not None:
        ann.content = (payload.message or payload.body or ann.content).strip()
    if payload.links is not None:
        ann.links = [l.dict() if hasattr(l, "dict") else dict(l) for l in payload.links]
    if payload.display_type is not None:
        ann.display_type = payload.display_type
    if payload.priority is not None:
        ann.priority = payload.priority
    if payload.audience is not None:
        ann.audience = payload.audience
    if payload.status is not None:
        ann.status = payload.status
    if payload.is_active is not None:
        ann.is_active = payload.is_active
        if not payload.status:
            ann.status = "ACTIVE" if ann.is_active else "INACTIVE"
    if payload.start_at is not None:
        ann.start_at = payload.start_at
    if payload.end_at is not None:
        ann.end_at = payload.end_at

    if payload.image_url is not None:
        if isinstance(payload.image_url, str) and payload.image_url.strip():
            img_url = payload.image_url.strip()
            active_imgs = [img for img in (ann.images or []) if not img.is_deleted]
            if active_imgs:
                active_imgs[0].image_url = img_url
                active_imgs[0].is_active = True
                active_imgs[0].is_deleted = False
                active_imgs[0].company_ref_id = ann.company_ref_id or domain_ctx.cmp_ref_id
                if img_url.startswith("/uploads"):
                    active_imgs[0].b2_bucket = "local"
            else:
                img_pub_id = uuid.uuid4()
                ann_img = AnnouncementImageModel(
                    tenant_id=ann.tenant_id,
                    company_id=ann.company_id,
                    company_ref_id=ann.company_ref_id or domain_ctx.cmp_ref_id,
                    public_id=img_pub_id,
                    announcement_id=ann.public_id,
                    b2_object_key=img_url if not img_url.startswith("/uploads") else f"local_{img_pub_id.hex[:8]}",
                    b2_bucket="local" if img_url.startswith("/uploads") else B2_BUCKET_NAME,
                    image_url=img_url,
                    original_filename="banner.jpg",
                    content_type="image/jpeg",
                    file_size=1024,
                    display_order=1,
                    is_active=True,
                    created_by="ADMIN"
                )
                db.add(ann_img)
        elif isinstance(payload.image_url, str) and payload.image_url.strip() == "":
            for img in (ann.images or []):
                img.is_active = False
                img.is_deleted = True

    ann.updated_date = datetime.now(timezone.utc)
    ann.updated_by = "ADMIN"
    await db.commit()

    active_imgs = [img for img in (ann.images or []) if not img.is_deleted and img.is_active]
    top_img_url = active_imgs[0].image_url if active_imgs else None

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {ann.announcement_code} updated successfully.",
        "data": {
            "id": str(ann.public_id),
            "announcement_code": ann.announcement_code,
            "company_ref_id": ann.company_ref_id,
            "title": ann.title,
            "image_url": top_img_url,
            "is_active": ann.is_active,
            "status": ann.status
        }
    }


@router.post("/admin/{announcement_id}/toggle", summary="Admin: Toggle announcement active status")
async def admin_toggle_announcement(
    announcement_id: str,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to toggle announcement active/inactive status."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify announcements belonging to another company.")

    ann.is_active = not ann.is_active
    ann.status = "ACTIVE" if ann.is_active else "INACTIVE"
    ann.updated_date = datetime.now(timezone.utc)
    ann.updated_by = "ADMIN"
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {ann.announcement_code} is now {'Active' if ann.is_active else 'Inactive'}.",
        "data": {
            "id": str(ann.public_id),
            "announcement_code": ann.announcement_code,
            "company_ref_id": ann.company_ref_id,
            "title": ann.title,
            "is_active": ann.is_active,
            "status": ann.status
        }
    }


@router.post("/admin/{announcement_id}/enable", summary="Admin: Enable announcement")
async def admin_enable_announcement(
    announcement_id: str,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to enable announcement."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify announcements belonging to another company.")

    ann.is_active = True
    ann.status = "ACTIVE"
    ann.updated_date = datetime.now(timezone.utc)
    ann.updated_by = "ADMIN"
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {ann.announcement_code} enabled successfully.",
        "data": {
            "id": str(ann.public_id),
            "announcement_code": ann.announcement_code,
            "company_ref_id": ann.company_ref_id,
            "title": ann.title,
            "is_active": True,
            "status": "ACTIVE"
        }
    }


@router.post("/admin/{announcement_id}/disable", summary="Admin: Disable announcement")
async def admin_disable_announcement(
    announcement_id: str,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to disable announcement."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify announcements belonging to another company.")

    ann.is_active = False
    ann.status = "INACTIVE"
    ann.updated_date = datetime.now(timezone.utc)
    ann.updated_by = "ADMIN"
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {ann.announcement_code} disabled successfully.",
        "data": {
            "id": str(ann.public_id),
            "announcement_code": ann.announcement_code,
            "company_ref_id": ann.company_ref_id,
            "title": ann.title,
            "is_active": False,
            "status": "INACTIVE"
        }
    }


@router.delete("/admin/{announcement_id}", summary="Admin: Deactivate / Delete announcement")
async def admin_delete_announcement(
    announcement_id: str,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to soft-delete an announcement."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot delete announcements belonging to another company.")

    ann.is_deleted = True
    ann.is_active = False
    ann.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {ann.announcement_code} deleted successfully."
    }


async def _save_image_with_fallback(file_bytes: bytes, filename: str, content_type: str) -> tuple[str, str, str]:
    """
    Attempts to upload image to Backblaze B2.
    If Backblaze B2 fails or credentials are invalid, safely falls back to local static storage (/uploads/announcements/).
    Returns: (object_key, public_url, bucket_name)
    """
    ext = Path(filename or "image.jpg").suffix.lower() or ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]:
        ext = ".jpg"

    # 1. Attempt Backblaze B2
    try:
        b2_res = await BackblazeStorageService.upload_document(
            file_bytes=file_bytes,
            original_filename=filename or f"announcement_{uuid.uuid4().hex[:6]}{ext}",
            entity_type="announcements",
            content_type=content_type
        )
        if b2_res and b2_res.get("url"):
            b2_key = b2_res.get("path") or f"announcements/{uuid.uuid4().hex[:8]}_{filename}"
            return b2_key, b2_res["url"], B2_BUCKET_NAME
    except Exception as e:
        logger.warning(f"Backblaze B2 upload failed ({e}), falling back to local storage.")

    # 2. Local static storage fallback
    unique_name = f"{uuid.uuid4().hex[:12]}{ext}"
    target_dir = Path("uploads") / "announcements"
    target_dir.mkdir(parents=True, exist_ok=True)
    file_path = target_dir / unique_name
    file_path.write_bytes(file_bytes)

    local_url = f"/uploads/announcements/{unique_name}"
    return f"local_{unique_name}", local_url, "local"


@router.post("/admin/upload-image", summary="Admin: Upload announcement image with instant preview")
async def admin_upload_announcement_image_standalone(
    file: UploadFile = File(...),
    announcement_id: Optional[str] = Form(None),
    display_order: int = Form(1),
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Direct upload endpoint for immediate admin preview and permanent storage.
    Supports JPG, PNG, WEBP, GIF, SVG up to 5MB.
    Tries B2 first; gracefully falls back to local static storage.
    Optionally attaches to existing announcement if announcement_id is provided.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]:
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP, GIF, SVG) are permitted.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 5 MB limit.")

    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "image/jpeg"
    b2_key, img_url, bucket_name = await _save_image_with_fallback(file_bytes, file.filename, content_type)

    img_pub_id = uuid.uuid4()
    if announcement_id:
        try:
            ann_uuid = uuid.UUID(announcement_id)
            stmt = select(AnnouncementModel).options(selectinload(AnnouncementModel.images)).where(
                and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False)
            )
            ann = (await db.execute(stmt)).scalars().first()
            if ann:
                ann_img = AnnouncementImageModel(
                    tenant_id=ann.tenant_id,
                    company_id=ann.company_id,
                    company_ref_id=ann.company_ref_id or domain_ctx.cmp_ref_id,
                    public_id=img_pub_id,
                    announcement_id=ann.public_id,
                    b2_object_key=b2_key,
                    b2_bucket=bucket_name,
                    image_url=img_url,
                    original_filename=file.filename or "image.jpg",
                    content_type=content_type,
                    file_size=len(file_bytes),
                    display_order=display_order,
                    is_active=True,
                    created_by="ADMIN"
                )
                db.add(ann_img)
                await db.commit()
        except Exception as e:
            logger.warning(f"Could not link image to announcement_id {announcement_id}: {e}")

    return {
        "success": True,
        "status": "SUCCESS",
        "message": "Image uploaded successfully.",
        "url": img_url,
        "image_url": img_url,
        "data": {
            "id": str(img_pub_id),
            "url": img_url,
            "image_url": img_url,
            "b2_object_key": b2_key,
            "original_filename": file.filename,
            "display_order": display_order
        }
    }


@router.post("/admin/{announcement_id}/images", summary="Admin: Upload announcement image to storage")
async def admin_upload_announcement_image(
    announcement_id: str,
    file: UploadFile = File(...),
    display_order: int = Form(1),
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads announcement image to storage (B2 or local fallback) and links metadata to announcement.
    """
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify announcements belonging to another company.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    content_type = file.content_type or mimetypes.guess_type(file.filename or "image.jpg")[0] or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP, GIF, SVG) are permitted.")

    b2_key, img_url, bucket_name = await _save_image_with_fallback(file_bytes, file.filename or "image.jpg", content_type)

    img_pub_id = uuid.uuid4()
    ann_img = AnnouncementImageModel(
        tenant_id=ann.tenant_id,
        company_id=ann.company_id,
        company_ref_id=ann.company_ref_id or domain_ctx.cmp_ref_id,
        public_id=img_pub_id,
        announcement_id=ann.public_id,
        b2_object_key=b2_key,
        b2_bucket=bucket_name,
        image_url=img_url,
        original_filename=file.filename or "image.jpg",
        content_type=content_type,
        file_size=len(file_bytes),
        display_order=display_order,
        is_active=True,
        created_by="ADMIN"
    )
    db.add(ann_img)
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": "Announcement image uploaded successfully.",
        "url": img_url,
        "image_url": img_url,
        "data": {
            "id": str(img_pub_id),
            "announcement_id": str(ann.public_id),
            "b2_object_key": b2_key,
            "image_url": img_url,
            "display_order": display_order
        }
    }


@router.put("/admin/{announcement_id}/images/reorder", summary="Admin: Reorder announcement images")
async def admin_reorder_announcement_images(
    announcement_id: str,
    payload: ImageReorderPayload,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to reorder images by display_order."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
        stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
        ann = (await db.execute(stmt)).scalars().first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found.")
        if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot modify announcements belonging to another company.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    for item in payload.orderings:
        try:
            img_uuid = uuid.UUID(item.image_id)
            stmt = (
                update(AnnouncementImageModel)
                .where(AnnouncementImageModel.public_id == img_uuid)
                .values(display_order=item.display_order)
            )
            await db.execute(stmt)
        except Exception:
            continue

    await db.commit()
    return {
        "success": True,
        "status": "SUCCESS",
        "message": "Images reordered successfully."
    }


@router.delete("/admin/{announcement_id}/images/{image_id}", summary="Admin: Delete announcement image")
async def admin_delete_announcement_image(
    announcement_id: str,
    image_id: str,
    domain_ctx: DomainCompanyContext = Depends(get_domain_context),
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to remove an image from an announcement."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
        img_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format.")

    stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    if ann.company_ref_id is not None and ann.company_ref_id != domain_ctx.cmp_ref_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify announcements belonging to another company.")

    stmt_img = select(AnnouncementImageModel).where(and_(AnnouncementImageModel.public_id == img_uuid, AnnouncementImageModel.is_deleted == False))
    img = (await db.execute(stmt_img)).scalars().first()

    if not img:
        raise HTTPException(status_code=404, detail="Announcement image not found.")

    img.is_deleted = True
    img.is_active = False
    img.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": "Announcement image removed successfully."
    }
