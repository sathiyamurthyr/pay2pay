"""
Backblaze B2 Storage Service for Pay2Pay
========================================
File path convention:
  cmp/{year}/{month}/{day}/{uuid}_{filename}          → Company documents
  cmp/sd/{year}/{month}/{day}/{uuid}_{filename}       → Super Distributor KYC
  cmp/dist/{year}/{month}/{day}/{uuid}_{filename}     → Distributor KYC
  cmp/ret/{year}/{month}/{day}/{uuid}_{filename}      → Retailer KYC
  cmp/service/{year}/{month}/{day}/{uuid}_{filename}  → Service / others
"""
import io
import re
import uuid
import mimetypes
from datetime import datetime, timezone
from typing import Optional, Tuple
import os
from pathlib import Path

# B2 SDK – installed via: pip install b2sdk
try:
    from b2sdk.v2 import InMemoryAccountInfo, B2Api
    B2_AVAILABLE = True
except ImportError:
    B2_AVAILABLE = False

# Pull credentials from the central Settings
try:
    from app.core.config import settings as _settings
    B2_KEY_ID      = _settings.B2_KEY_ID
    B2_APP_KEY     = _settings.B2_APP_KEY
    B2_BUCKET_NAME = _settings.B2_BUCKET_NAME
except Exception:
    B2_KEY_ID      = os.getenv("B2_KEY_ID",      "008e0d1d842b")
    B2_APP_KEY     = os.getenv("B2_APP_KEY",     "0030f1320724707dc33f380426ddf3371c3fedb37a")
    B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "sathus-pay2pay")

# ---------------------------------------------------------------------------
# Entity-type → B2 sub-path mapping
# ---------------------------------------------------------------------------
ENTITY_PREFIX_MAP = {
    "SD":      "cmp/sd",
    "DIST":    "cmp/dist",
    "RET":     "cmp/ret",
    "CMP":     "cmp",
    "SERVICE": "cmp/service",
    "ANNOUNCEMENTS":     "announcements",
    "ANNOUNCEMENT":      "announcements",
    "SUPER_DISTRIBUTOR": "cmp/sd",
    "DISTRIBUTOR":       "cmp/dist",
    "RETAILER":          "cmp/ret",
    "COMPANY":           "cmp",
}

# Allowed MIME types for uploads
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal characters and collapse whitespace."""
    filename = os.path.basename(filename)
    filename = re.sub(r"[^\w.\-]", "_", filename)
    return filename[:200]


def _build_b2_path(entity_type: str, filename: str) -> str:
    """
    Build a structured B2 object path.
    e.g. cmp/sd/2026/08/02/3fa85f64_pan_card.pdf
    """
    prefix = ENTITY_PREFIX_MAP.get(entity_type.upper(), "cmp/service")
    now = datetime.now(timezone.utc)
    year  = now.strftime("%Y")
    month = now.strftime("%m")
    day   = now.strftime("%d")
    uid   = str(uuid.uuid4()).split("-")[0]
    safe_name = _sanitize_filename(filename)
    return f"{prefix}/{year}/{month}/{day}/{uid}_{safe_name}"


class BackblazeStorageService:
    """B2 Storage Service with graceful local fallback."""

    _api: Optional[object] = None
    _bucket: Optional[object] = None
    _b2_failed: bool = False

    @classmethod
    def _get_api(cls) -> Tuple[Optional[object], Optional[object]]:
        """Initialize B2 API and bucket safely."""
        if cls._b2_failed:
            return None, None

        if not B2_AVAILABLE:
            cls._b2_failed = True
            return None, None

        if cls._api is None:
            try:
                info = InMemoryAccountInfo()
                cls._api = B2Api(info)
                cls._api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)

                try:
                    cls._bucket = cls._api.get_bucket_by_name(B2_BUCKET_NAME)
                except Exception:
                    cls._bucket = cls._api.create_bucket(
                        B2_BUCKET_NAME,
                        bucket_type="allPrivate",
                    )
            except Exception as e:
                print(f"[StorageService Warning] B2 authorization error: {e}. Falling back to local storage structure.")
                cls._b2_failed = True
                return None, None

        return cls._api, cls._bucket

    @classmethod
    async def upload_document(
        cls,
        file_bytes: bytes,
        original_filename: str,
        entity_type: str,
        content_type: Optional[str] = None,
    ) -> dict:
        """
        Upload a KYC/compliance document to Backblaze B2 or local structured path.
        """
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"File size {len(file_bytes)} bytes exceeds maximum of {MAX_FILE_SIZE_BYTES} bytes (10 MB)."
            )

        if content_type is None:
            content_type, _ = mimetypes.guess_type(original_filename)
        if content_type not in ALLOWED_MIME_TYPES:
            content_type = "application/pdf"

        b2_path = _build_b2_path(entity_type, original_filename)
        api_obj, bucket = cls._get_api()
        file_id = None

        # 1. Upload to Backblaze B2 for secure cloud persistence
        if api_obj and bucket:
            try:
                file_info = bucket.upload_bytes(
                    data_bytes=file_bytes,
                    file_name=b2_path,
                    content_type=content_type,
                )
                file_id = file_info.id_
            except Exception as err:
                print(f"[StorageService] B2 Upload notice: {err}")

        # 2. Save to local structured storage for fast static direct URL serving
        uploads_dir = Path("uploads") / Path(b2_path).parent
        uploads_dir.mkdir(parents=True, exist_ok=True)
        local_filepath = Path("uploads") / b2_path
        
        with open(local_filepath, "wb") as f:
            f.write(file_bytes)

        direct_url = f"/uploads/{b2_path}"

        return {
            "url": direct_url,
            "path": b2_path,
            "filename": _sanitize_filename(original_filename),
            "entity_type": entity_type.upper(),
            "size_bytes": len(file_bytes),
            "file_id": file_id,
            "storage": "B2+LOCAL_DIRECT",
        }

    @classmethod
    def save_base64_photo(
        cls,
        base64_data: str,
        entity_type: str = "RET",
        filename: str = "profile_photo.jpg"
    ) -> str:
        """
        Decodes base64/data-URL image string, uploads to Backblaze B2 for backup,
        saves to local uploads folder, and returns direct /uploads/... URL path to store in DB.
        """
        import base64
        if not base64_data:
            return ""
        
        # If it's already a regular HTTP URL or local static URL, return as is
        if base64_data.startswith("http://") or base64_data.startswith("https://") or base64_data.startswith("/uploads/"):
            return base64_data

        try:
            # Strip data URL prefix if present (e.g. data:image/jpeg;base64,)
            clean_b64 = base64_data
            if "," in base64_data:
                clean_b64 = base64_data.split(",", 1)[1]

            image_bytes = base64.b64decode(clean_b64)
            b2_path = _build_b2_path(entity_type, filename)
            
            # Save to local uploads folder structure
            local_filepath = Path("uploads") / b2_path
            local_filepath.parent.mkdir(parents=True, exist_ok=True)
            
            with open(local_filepath, "wb") as f:
                f.write(image_bytes)

            # Upload to B2 for permanent cloud storage
            api_obj, bucket = cls._get_api()
            if api_obj and bucket:
                try:
                    bucket.upload_bytes(
                        data_bytes=image_bytes,
                        file_name=b2_path,
                        content_type="image/jpeg"
                    )
                except Exception as b2_err:
                    print(f"[StorageService] B2 Base64 upload notice: {b2_err}")

            # Return direct relative static route URL for database storage
            return f"/uploads/{b2_path}"
        except Exception as ex:
            print(f"[StorageService Warning] Base64 photo decode/save failed: {ex}")
            return base64_data

    @classmethod
    def upload_file(
        cls,
        file_bytes: bytes,
        filename: str,
        content_type: str = "image/jpeg",
        entity_type: str = "RET",
    ) -> dict:
        """
        Synchronous/Direct upload method for document and video uploads.
        Uploads to Backblaze B2 for backup, saves to local uploads directory, and returns direct /uploads/... URL.
        """
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File size {len(file_bytes)} bytes exceeds maximum of {MAX_FILE_SIZE_BYTES} bytes.")

        b2_path = _build_b2_path(entity_type, filename)
        api_obj, bucket = cls._get_api()
        file_id = None

        if api_obj and bucket:
            try:
                file_info = bucket.upload_bytes(
                    data_bytes=file_bytes,
                    file_name=b2_path,
                    content_type=content_type,
                )
                file_id = file_info.id_
            except Exception as err:
                print(f"[StorageService] B2 Upload notice: {err}, using local structured storage.")

        # Save to local uploads folder structure
        uploads_dir = Path("uploads") / Path(b2_path).parent
        uploads_dir.mkdir(parents=True, exist_ok=True)
        local_filepath = Path("uploads") / b2_path
        with open(local_filepath, "wb") as f:
            f.write(file_bytes)

        return {
            "url": f"/uploads/{b2_path}",
            "file_name": b2_path,
            "path": b2_path,
            "filename": _sanitize_filename(filename),
            "entity_type": entity_type.upper(),
            "size_bytes": len(file_bytes),
            "file_id": file_id,
            "storage": "B2+LOCAL_DIRECT",
        }

    @classmethod
    def get_download_url(cls, file_path: str) -> str:
        """Get accessible direct /uploads/ static URL or valid HTTP URL."""
        if not file_path:
            return ""
        
        # If it's already a direct static /uploads/ URL
        if file_path.startswith("/uploads/"):
            return file_path

        # If it's a relative path (e.g. cmp/ret/...)
        if not file_path.startswith("http://") and not file_path.startswith("https://"):
            return f"/uploads/{file_path.lstrip('/')}"

        # If it's a Backblaze B2 URL (either download_file_by_id or file/bucket/path)
        if "backblazeb2.com" in file_path:
            clean_path = file_path.replace(f"https://f003.backblazeb2.com/file/{B2_BUCKET_NAME}/", "")
            clean_path = clean_path.split("?")[0].lstrip("/")
            local_file = Path("uploads") / clean_path
            if local_file.exists():
                return f"/uploads/{clean_path}"

        return file_path

