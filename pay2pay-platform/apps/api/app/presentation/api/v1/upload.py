"""
KYC Document Upload API — Backblaze B2
POST /api/v1/upload/kyc  — Upload a single KYC document for an entity
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.application.dependencies import get_current_user
from app.application.storage_service import BackblazeStorageService, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/upload", tags=["Document Upload & KYC Storage"])

ALLOWED_ENTITY_TYPES = {
    "SD", "DIST", "RET", "CMP", "SERVICE",
    "SUPER_DISTRIBUTOR", "DISTRIBUTOR", "RETAILER", "COMPANY",
}


@router.post("/kyc", summary="Upload KYC / Compliance Document to Backblaze B2")
async def upload_kyc_document(
    file: UploadFile = File(..., description="Document file — PDF, JPG, PNG (max 10 MB)"),
    entity_type: str = Form(..., description="Entity type: SD | DIST | RET | CMP | SERVICE"),
    entity_id: Optional[str] = Form(None, description="Optional entity public_id for audit"),
    doc_type: Optional[str] = Form(None, description="Document type label, e.g. PAN, AADHAAR, GST, BANK_PROOF"),
    current_user: AdminUserModel = Depends(get_current_user),
):
    """
    Upload a KYC or compliance document to Backblaze B2.

    **Path structure in B2:**
    - `cmp/{year}/{month}/{day}/...` — Company
    - `cmp/sd/{year}/{month}/{day}/...` — Super Distributor
    - `cmp/dist/{year}/{month}/{day}/...` — Distributor
    - `cmp/ret/{year}/{month}/{day}/...` — Retailer
    - `cmp/service/{year}/{month}/{day}/...` — Service / General

    Returns the permanent download URL and path.
    """
    # Validate entity type
    if entity_type.upper() not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type '{entity_type}'. Must be one of: {', '.join(sorted(ALLOWED_ENTITY_TYPES))}",
        )

    # Validate filename
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided.",
        )

    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{content_type}' is not allowed. Upload PDF, JPEG, or PNG files only.",
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size {len(file_bytes) // 1024} KB exceeds the 10 MB limit.",
        )

    try:
        result = await BackblazeStorageService.upload_document(
            file_bytes=file_bytes,
            original_filename=file.filename,
            entity_type=entity_type,
            content_type=content_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "message": "Document uploaded successfully",
            "data": {
                **result,
                "entity_id": entity_id,
                "doc_type": doc_type,
                "uploaded_by": current_user.email,
            },
        },
    )


@router.get("/kyc/allowed-types", summary="Get allowed file types and size limits")
async def get_upload_constraints(
    current_user: AdminUserModel = Depends(get_current_user),
):
    """Returns allowed MIME types and the maximum file size for document uploads."""
    return {
        "allowed_mime_types": sorted(ALLOWED_MIME_TYPES),
        "max_file_size_bytes": MAX_FILE_SIZE_BYTES,
        "max_file_size_mb": MAX_FILE_SIZE_BYTES // (1024 * 1024),
        "entity_types": sorted(ALLOWED_ENTITY_TYPES),
    }


@router.post("/image", summary="Upload Announcement / Banner Image to Local Fast Storage")
async def upload_local_image(
    file: UploadFile = File(..., description="Image file: PNG, JPG, WEBP, GIF, SVG (max 5 MB)"),
    folder: str = Form("announcements", description="Subfolder within uploads"),
):
    """
    Saves image to local static folder (/uploads/announcements/...)
    for zero-latency, super-fast loading on user dashboards.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")

    from pathlib import Path
    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File type is not allowed. Upload JPG, PNG, WEBP, GIF, or SVG images only.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size exceeds 5 MB limit.",
        )

    # Sanitize folder path
    safe_folder = "".join(c for c in folder if c.isalnum() or c in ("-", "_")) or "announcements"
    target_dir = Path("uploads") / safe_folder
    target_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex[:12]}{ext}"
    file_path = target_dir / unique_name
    file_path.write_bytes(file_bytes)

    relative_url = f"/uploads/{safe_folder}/{unique_name}"
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,
            "message": "Image uploaded successfully to local storage",
            "url": relative_url,
            "path": relative_url,
            "filename": unique_name,
            "file_size": len(file_bytes),
        },
    )


@router.api_route("/document", methods=["GET", "HEAD"], summary="Proxy & Stream KYC Document / PDF with Auth")
async def stream_document(
    path: str,
):
    """
    Safely stream or serve any KYC document / PDF / image.
    If local, returns local file. If in Backblaze B2, signs URL and streams content with 200 OK.
    """
    from fastapi.responses import Response, RedirectResponse, FileResponse
    from pathlib import Path
    import urllib.request

    clean = path.strip().lstrip("/")
    if clean.startswith("uploads/"):
        clean = clean[len("uploads/"):]

    # 1. Check local uploads
    local_candidates = [
        Path("uploads") / clean,
        Path("backend/uploads") / clean,
        Path("/home/ubuntu/pay2pay/backend/uploads") / clean,
        Path("/home/ubuntu/pay2pay/uploads") / clean,
        Path(f"d:/pay2pay/backend/uploads/{clean}"),
        Path(f"d:/pay2pay/uploads/{clean}"),
    ]
    for p in local_candidates:
        if p.exists() and p.is_file():
            mime_type, _ = mimetypes.guess_type(str(p))
            return FileResponse(p, media_type=mime_type or "application/octet-stream")

    # 2. Get signed B2 download URL
    signed_url = BackblazeStorageService.get_download_url(clean)
    if signed_url and signed_url.startswith("http"):
        try:
            req = urllib.request.Request(signed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                content_type = resp.headers.get("Content-Type") or mimetypes.guess_type(clean)[0] or "application/octet-stream"
                return Response(
                    content=data,
                    media_type=content_type,
                    headers={
                        "Content-Type": content_type,
                        "Content-Disposition": f"inline; filename=\"{Path(clean).name}\"",
                        "Cache-Control": "public, max-age=86400",
                        "Access-Control-Allow-Origin": "*",
                    }
                )
        except Exception:
            return RedirectResponse(signed_url, status_code=302)

    raise HTTPException(status_code=404, detail="Document not found")


@router.get("/signed-url", summary="Get Authenticated Backblaze B2 Download URL")
async def get_signed_download_url(path: str):
    signed_url = BackblazeStorageService.get_download_url(path)
    return {
        "success": True,
        "raw_path": path,
        "signed_url": signed_url
    }

