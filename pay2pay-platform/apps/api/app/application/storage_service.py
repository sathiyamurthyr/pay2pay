"""
Backblaze B2 Storage Service for Pay2Pay Enterprise
===================================================
Direct Cloud Storage Service using Backblaze B2 for KYC, compliance documents,
and topup payment slips.

File path conventions:
  cmp/{year}/{month}/{day}/{uuid}_{filename}                → Company documents
  cmp/sd/{year}/{month}/{day}/{uuid}_{filename}             → Super Distributor KYC
  cmp/dist/{year}/{month}/{day}/{uuid}_{filename}           → Distributor KYC
  cmp/ret/{year}/{month}/{day}/{uuid}_{filename}            → Retailer KYC
  cmp/service/{year}/{month}/{day}/{uuid}_{filename}        → Service / others
  topup_slips/{year}/{month}/{day}/{slip_id}_{filename}     → Topup Payment Slips
  announcements/{year}/{month}/{day}/{uuid}_{filename}      → Announcement banners
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
    "SD":                "cmp/sd",
    "DIST":              "cmp/dist",
    "RET":               "cmp/ret",
    "CMP":               "cmp",
    "SERVICE":           "cmp/service",
    "TOPUP_SLIP":        "topup_slips",
    "TOPUP_SLIPS":       "topup_slips",
    "ANNOUNCEMENTS":     "announcements",
    "ANNOUNCEMENT":      "announcements",
    "SUPER_DISTRIBUTOR": "cmp/sd",
    "DISTRIBUTOR":       "cmp/dist",
    "RETAILER":          "cmp/ret",
    "CUSTOMER":          "cmp/customer",
    "CUST":              "cmp/customer",
    "COMPANY":           "cmp",
}

# Allowed MIME types for uploads
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
DEFAULT_AUTH_DURATION_SECONDS = 7 * 24 * 3600  # 7 days


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal characters and collapse whitespace."""
    filename = os.path.basename(filename)
    filename = re.sub(r"[^\w.\-]", "_", filename)
    return filename[:200]


def _build_b2_path(entity_type: str, filename: str) -> str:
    """
    Build a structured B2 object path.
    e.g. cmp/ret/2026/08/23/3fa85f64_pan_card.jpg
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
    """Enterprise Backblaze B2 Cloud Storage Service."""

    _api: Optional[object] = None
    _bucket: Optional[object] = None
    _b2_failed: bool = False

    @classmethod
    def _get_api(cls) -> Tuple[Optional[object], Optional[object]]:
        """Initialize B2 API and bucket safely."""
        if cls._b2_failed:
            return None, None

        if not B2_AVAILABLE:
            print("[StorageService Warning] b2sdk is not installed. Cloud storage unavailable.")
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
                print(f"[StorageService Error] B2 authorization error: {e}")
                cls._b2_failed = True
                return None, None

        return cls._api, cls._bucket

    @classmethod
    def get_b2_download_url(cls, file_path_or_url: str, duration_seconds: int = DEFAULT_AUTH_DURATION_SECONDS) -> str:
        """
        Generate a fully authenticated Backblaze B2 download URL with authorization token
        valid for duration_seconds (default 7 days).
        Handles raw B2 paths, relative paths, or existing full URLs.
        """
        if not file_path_or_url:
            return ""

        clean_path = str(file_path_or_url).strip()

        # If it's already a full B2 URL with an Authorization token, verify/return
        if "backblazeb2.com" in clean_path and "Authorization=" in clean_path:
            return clean_path

        # If it's a B2 URL without token, extract the key
        if "/file/" in clean_path:
            try:
                parts = clean_path.split("/file/")
                if len(parts) > 1:
                    bucket_and_key = parts[1].split("?")[0].lstrip("/")
                    if bucket_and_key.startswith(f"{B2_BUCKET_NAME}/"):
                        clean_path = bucket_and_key[len(f"{B2_BUCKET_NAME}/"):]
                    elif "/" in bucket_and_key:
                        clean_path = "/".join(bucket_and_key.split("/")[1:])
            except Exception:
                pass

        # Strip any leading /uploads/ or /
        clean_path = clean_path.lstrip("/")
        if clean_path.startswith("uploads/"):
            clean_path = clean_path[len("uploads/"):]

        api_obj, bucket = cls._get_api()
        if api_obj and bucket:
            try:
                auth_token = bucket.get_download_authorization(
                    file_name_prefix=clean_path,
                    valid_duration_in_seconds=duration_seconds
                )
                return f"https://f003.backblazeb2.com/file/{B2_BUCKET_NAME}/{clean_path}?Authorization={auth_token}"
            except Exception as e:
                print(f"[StorageService] B2 download authorization error for {clean_path}: {e}")
                return f"https://f003.backblazeb2.com/file/{B2_BUCKET_NAME}/{clean_path}"

        # Fallback raw B2 URL
        return f"https://f003.backblazeb2.com/file/{B2_BUCKET_NAME}/{clean_path}"

    @classmethod
    def get_download_url(cls, file_path: str) -> str:
        """Alias for get_b2_download_url."""
        return cls.get_b2_download_url(file_path)

    @classmethod
    async def upload_document(
        cls,
        file_bytes: bytes,
        original_filename: str,
        entity_type: str,
        content_type: Optional[str] = None,
    ) -> dict:
        """
        Upload a KYC or compliance document directly to Backblaze B2.
        Returns the permanent Backblaze B2 authorized URL and metadata.
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

        if api_obj and bucket:
            try:
                file_info = bucket.upload_bytes(
                    data_bytes=file_bytes,
                    file_name=b2_path,
                    content_type=content_type,
                )
                file_id = getattr(file_info, "id_", None)
            except Exception as err:
                print(f"[StorageService Error] B2 Upload failed: {err}")
                raise RuntimeError(f"Cloud storage upload failed: {err}")
        else:
            raise RuntimeError("Backblaze B2 Cloud Storage is currently unavailable.")

        b2_url = cls.get_b2_download_url(b2_path)

        return {
            "url": b2_url,
            "b2_url": b2_url,
            "path": b2_path,
            "filename": _sanitize_filename(original_filename),
            "entity_type": entity_type.upper(),
            "size_bytes": len(file_bytes),
            "file_id": file_id,
            "storage": "BACKBLAZE_B2",
        }

    @classmethod
    def upload_file(
        cls,
        file_bytes: bytes,
        filename: str,
        content_type: str = "image/jpeg",
        entity_type: str = "RET",
    ) -> dict:
        """
        Synchronous / Direct upload method for documents, slips, and photos to Backblaze B2.
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
                file_id = getattr(file_info, "id_", None)
            except Exception as err:
                print(f"[StorageService Error] B2 Upload failed: {err}")
                raise RuntimeError(f"Cloud storage upload failed: {err}")
        else:
            raise RuntimeError("Backblaze B2 Cloud Storage is not configured.")

        b2_url = cls.get_b2_download_url(b2_path)

        return {
            "url": b2_url,
            "b2_url": b2_url,
            "file_name": b2_path,
            "path": b2_path,
            "filename": _sanitize_filename(filename),
            "entity_type": entity_type.upper(),
            "size_bytes": len(file_bytes),
            "file_id": file_id,
            "storage": "BACKBLAZE_B2",
        }

    @classmethod
    def upload_topup_slip(
        cls,
        file_bytes: bytes,
        filename: str,
        slip_id: str,
        content_type: str = "image/jpeg",
    ) -> dict:
        """
        Upload a retailer payment topup slip directly to Backblaze B2 under topup_slips/ hierarchy.
        Returns the authentic B2 download URL.
        """
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File size {len(file_bytes)} bytes exceeds 10 MB limit.")

        now = datetime.now(timezone.utc)
        year  = now.strftime("%Y")
        month = now.strftime("%m")
        day   = now.strftime("%d")
        safe_name = _sanitize_filename(filename)
        b2_path = f"topup_slips/{year}/{month}/{day}/{slip_id}_{safe_name}"

        api_obj, bucket = cls._get_api()
        file_id = None

        if api_obj and bucket:
            try:
                file_info = bucket.upload_bytes(
                    data_bytes=file_bytes,
                    file_name=b2_path,
                    content_type=content_type,
                )
                file_id = getattr(file_info, "id_", None)
            except Exception as err:
                print(f"[StorageService Error] B2 Topup Slip upload failed: {err}")
                raise RuntimeError(f"B2 upload error: {err}")
        else:
            raise RuntimeError("Backblaze B2 storage is unavailable.")

        b2_url = cls.get_b2_download_url(b2_path)

        return {
            "slip_id": slip_id,
            "slip_url": b2_url,
            "storage_path": b2_path,
            "original_filename": filename,
            "mime_type": content_type,
            "file_size_bytes": len(file_bytes),
            "file_id": file_id,
            "storage": "BACKBLAZE_B2",
        }

    @classmethod
    def save_base64_photo(
        cls,
        base64_data: str,
        entity_type: str = "RET",
        filename: str = "profile_photo.jpg"
    ) -> str:
        """
        Decodes base64/data-URL image string, uploads directly to Backblaze B2,
        and returns the authorized B2 download URL for database storage.
        """
        import base64
        if not base64_data:
            return ""

        # If it's already an HTTP URL, return as is or ensure B2 auth
        if base64_data.startswith("http://") or base64_data.startswith("https://"):
            return cls.get_b2_download_url(base64_data)

        try:
            clean_b64 = base64_data
            if "," in clean_b64:
                clean_b64 = clean_b64.split(",", 1)[1]

            clean_b64 = "".join(clean_b64.split())
            missing_padding = len(clean_b64) % 4
            if missing_padding:
                clean_b64 += "=" * (4 - missing_padding)

            image_bytes = base64.b64decode(clean_b64)
            b2_path = _build_b2_path(entity_type, filename)

            api_obj, bucket = cls._get_api()
            if api_obj and bucket:
                bucket.upload_bytes(
                    data_bytes=image_bytes,
                    file_name=b2_path,
                    content_type="image/jpeg"
                )

            return cls.get_b2_download_url(b2_path)
        except Exception as ex:
            print(f"[StorageService Warning] Base64 photo decode/save failed: {ex}")
            return base64_data
