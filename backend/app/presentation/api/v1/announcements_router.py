import uuid
import mimetypes
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, update, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.infrastructure.db.models import AnnouncementModel, AnnouncementImageModel
from app.application.storage_service import BackblazeStorageService, B2_BUCKET_NAME

DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")

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


# ─────────────────────────────────────────────────────────────────────────────
# 1. RETAILER & DASHBOARD CONSUMER ENDPOINTS (READ-ONLY)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/active", summary="Fetch active announcements for dashboard popup")
async def get_active_announcements(
    audience: Optional[str] = "RETAILER",
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches currently active, valid announcements within start_at and end_at bounds
    filtered for the target audience (e.g. RETAILER, ALL_RETAILERS, ALL).
    """
    now = datetime.now(timezone.utc)
    audience_variants = ["ALL", "ALL_RETAILERS", audience.upper() if audience else "RETAILER"]

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
                AnnouncementModel.audience.in_(audience_variants)
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
                if img.image_url and (img.image_url.startswith("/uploads") or img.image_url.startswith("http://") or img.image_url.startswith("https://") or img.image_url.startswith("data:")):
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
        "count": len(announcements_data),
        "data": announcements_data
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. ADMIN ANNOUNCEMENT MANAGEMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/admin/list", summary="Admin: List all announcements with full metadata")
async def admin_list_announcements(db: AsyncSession = Depends(get_db)):
    """Admin endpoint to list all announcements including drafts, inactive, and active items."""
    stmt = (
        select(AnnouncementModel)
        .options(selectinload(AnnouncementModel.images))
        .where(AnnouncementModel.is_deleted == False)
        .order_by(AnnouncementModel.priority.desc(), AnnouncementModel.created_date.desc())
    )
    results = (await db.execute(stmt)).scalars().all()
    announcements_data = []

    for a in results:
        img_list = []
        for img in sorted(a.images, key=lambda x: x.display_order):
            if not img.is_deleted:
                if img.image_url and (img.image_url.startswith("/uploads") or img.image_url.startswith("http://") or img.image_url.startswith("https://") or img.image_url.startswith("data:")):
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
        "data": announcements_data
    }


@router.post("/admin/create", summary="Admin: Create new announcement")
async def admin_create_announcement(
    payload: AnnouncementCreatePayload,
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to create a new announcement with links, audience, priority, and images."""
    code = f"ANN-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
    pub_id = uuid.uuid4()

    links_dict_list = [l.dict() if hasattr(l, "dict") else dict(l) for l in payload.links] if payload.links else []
    resolved_title = (payload.title or payload.header or "Announcement").strip()
    resolved_content = (payload.message or payload.body or "").strip()

    ann = AnnouncementModel(
        tenant_id=DEFAULT_TENANT_ID,
        company_id=DEFAULT_COMPANY_ID,
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
        "message": f"Announcement {code} created successfully.",
        "data": {
            "id": str(pub_id),
            "announcement_code": code,
            "title": ann.title,
            "image_url": img_candidates[0] if img_candidates else None,
            "is_active": ann.is_active
        }
    }


@router.put("/admin/{announcement_id}", summary="Admin: Update announcement")
async def admin_update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdatePayload,
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to edit announcement title, content, links, status, dates, and images."""
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = select(AnnouncementModel).options(selectinload(AnnouncementModel.images)).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

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
    if payload.start_at is not None:
        ann.start_at = payload.start_at
    if payload.end_at is not None:
        ann.end_at = payload.end_at

    if payload.image_url and isinstance(payload.image_url, str) and payload.image_url.strip():
        # Update or add image
        img_url = payload.image_url.strip()
        if ann.images:
            ann.images[0].image_url = img_url
            ann.images[0].is_active = True
            ann.images[0].is_deleted = False
        else:
            img_pub_id = uuid.uuid4()
            ann_img = AnnouncementImageModel(
                tenant_id=ann.tenant_id,
                company_id=ann.company_id,
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

    ann.updated_date = datetime.now(timezone.utc)
    ann.updated_by = "ADMIN"
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {ann.announcement_code} updated successfully.",
        "data": {
            "id": str(ann.public_id),
            "announcement_code": ann.announcement_code,
            "title": ann.title,
            "is_active": ann.is_active
        }
    }


@router.delete("/admin/{announcement_id}", summary="Admin: Deactivate / Delete announcement")
async def admin_delete_announcement(
    announcement_id: str,
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

    ann.is_deleted = True
    ann.is_active = False
    ann.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "success": True,
        "status": "SUCCESS",
        "message": f"Announcement {ann.announcement_code} deleted successfully."
    }


@router.post("/admin/{announcement_id}/images", summary="Admin: Upload announcement image to Backblaze B2")
async def admin_upload_announcement_image(
    announcement_id: str,
    file: UploadFile = File(...),
    display_order: int = Form(1),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads announcement image directly to Backblaze B2 and links metadata to announcement.
    """
    try:
        ann_uuid = uuid.UUID(announcement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format.")

    stmt = select(AnnouncementModel).where(and_(AnnouncementModel.public_id == ann_uuid, AnnouncementModel.is_deleted == False))
    ann = (await db.execute(stmt)).scalars().first()

    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    content_type = file.content_type or mimetypes.guess_type(file.filename or "image.jpg")[0] or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP) are permitted.")

    # Upload to Backblaze B2
    try:
        b2_res = await BackblazeStorageService.upload_document(
            file_bytes=file_bytes,
            original_filename=file.filename or f"announcement_{uuid.uuid4().hex[:6]}.jpg",
            entity_type="announcements",
            content_type=content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backblaze B2 storage upload failed: {str(e)}")

    b2_key = b2_res.get("path") or f"announcements/{uuid.uuid4().hex[:8]}_{file.filename}"
    img_url = b2_res.get("url") or f"https://f003.backblazeb2.com/file/{B2_BUCKET_NAME}/{b2_key}"

    img_pub_id = uuid.uuid4()
    ann_img = AnnouncementImageModel(
        tenant_id=ann.tenant_id,
        company_id=ann.company_id,
        public_id=img_pub_id,
        announcement_id=ann.public_id,
        b2_object_key=b2_key,
        b2_bucket=B2_BUCKET_NAME,
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
        "message": "Announcement image uploaded to Backblaze B2 successfully.",
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
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to reorder images by display_order."""
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
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to remove an image from an announcement."""
    try:
        img_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid image ID format.")

    stmt = select(AnnouncementImageModel).where(and_(AnnouncementImageModel.public_id == img_uuid, AnnouncementImageModel.is_deleted == False))
    img = (await db.execute(stmt)).scalars().first()

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
