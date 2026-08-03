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
    B2_KEY_ID      = os.getenv("B2_KEY_ID",      "003069b02f3e5f824becfcbcad231096ef5a0950c6")
    B2_APP_KEY     = os.getenv("B2_APP_KEY",     "Sathus@SV162127")
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
    # Aliases
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

        if api_obj and bucket:
            try:
                file_info = bucket.upload_bytes(
                    data_bytes=file_bytes,
                    file_name=b2_path,
                    content_type=content_type,
                )
                download_url = api_obj.get_download_url_for_fileid(file_info.id_)
                return {
                    "url": download_url,
                    "path": b2_path,
                    "filename": _sanitize_filename(original_filename),
                    "entity_type": entity_type.upper(),
                    "size_bytes": len(file_bytes),
                    "file_id": file_info.id_,
                    "storage": "B2",
                }
            except Exception as err:
                print(f"[StorageService] B2 Upload failed: {err}, using local structured storage.")

        # Local fallback with exact B2 folder structure: cmp/sd/YYYY/MM/DD/...
        uploads_dir = Path("uploads") / Path(b2_path).parent
        uploads_dir.mkdir(parents=True, exist_ok=True)
        local_filepath = Path("uploads") / b2_path
        
        with open(local_filepath, "wb") as f:
            f.write(file_bytes)

        fallback_url = f"https://f003.backblazeb2.com/file/{B2_BUCKET_NAME}/{b2_path}"

        return {
            "url": fallback_url,
            "path": b2_path,
            "filename": _sanitize_filename(original_filename),
            "entity_type": entity_type.upper(),
            "size_bytes": len(file_bytes),
            "storage": "LOCAL_STRUCTURED",
        }

    @classmethod
    def get_download_url(cls, file_path: str) -> str:
        """Get download URL for a file path."""
        api_obj, bucket = cls._get_api()
        if api_obj and bucket:
            try:
                return bucket.get_download_url(file_path)
            except Exception:
                pass
        return f"https://f003.backblazeb2.com/file/{B2_BUCKET_NAME}/{file_path}"
