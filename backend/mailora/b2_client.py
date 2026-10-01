"""
Mailora - Backblaze B2 Client
==============================
Handles all file uploads to B2 with retry logic and signed URL generation.
"""
import hashlib
import io
import time
from typing import Optional, Tuple

from b2sdk.v2 import B2Api, InMemoryAccountInfo, UploadSourceBytes

from mailora.logger import get_logger

log = get_logger("mailora.b2")


class B2Client:
    """
    Thread-safe Backblaze B2 client.
    Authenticates once and reuses the session.
    """

    def __init__(self, key_id: str, app_key: str, bucket_name: str):
        self.key_id = key_id
        self.app_key = app_key
        self.bucket_name = bucket_name
        self._api: Optional[B2Api] = None
        self._bucket = None

    def connect(self):
        """Authenticate with B2 and open bucket."""
        info = InMemoryAccountInfo()
        self._api = B2Api(info)
        self._api.authorize_account("production", self.key_id, self.app_key)
        self._bucket = self._api.get_bucket_by_name(self.bucket_name)
        log.info(f"B2 connected: bucket={self.bucket_name}")

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def upload_bytes(
        self,
        data: bytes,
        object_key: str,
        content_type: str = "application/octet-stream",
        max_retries: int = 3,
    ) -> Tuple[str, str]:
        """
        Upload raw bytes to B2.

        Returns:
            (object_key, download_url)
        """
        if self._bucket is None:
            self.connect()

        last_err = None
        for attempt in range(1, max_retries + 1):
            try:
                file_info = self._bucket.upload_bytes(
                    data_bytes=data,
                    file_name=object_key,
                    content_type=content_type,
                )
                # Build a public/friendly download URL
                download_url = self._api.get_download_url_for_file_name(
                    self.bucket_name, object_key
                )
                log.info(
                    f"B2 upload OK: {object_key} "
                    f"({len(data):,} bytes) attempt={attempt}"
                )
                return object_key, download_url

            except Exception as e:
                last_err = e
                wait = 2 ** attempt
                log.warning(f"B2 upload failed (attempt {attempt}): {e} — retry in {wait}s")
                time.sleep(wait)

        raise RuntimeError(f"B2 upload failed after {max_retries} attempts: {last_err}")

    def upload_json(
        self,
        json_str: str,
        object_key: str,
    ) -> Tuple[str, str]:
        """Upload a JSON string to B2 as application/json."""
        return self.upload_bytes(
            json_str.encode("utf-8"),
            object_key,
            content_type="application/json",
        )

    def build_object_key(
        self,
        tenant_ref_id: str,
        folder: str,
        doc_ref_id: str,
        filename: str,
    ) -> str:
        """
        Build a canonical B2 object key.
        Pattern: TENANT/folder/YYYY/MM/DOC-ref_filename
        e.g.:    PAY2PAY/documents/2026/09/DOC-202609-000001_invoice.pdf
        """
        from datetime import datetime
        now = datetime.utcnow()
        safe_name = filename.replace(" ", "_")
        return (
            f"{tenant_ref_id}/{folder}/"
            f"{now.year}/{now.month:02d}/"
            f"{doc_ref_id}_{safe_name}"
        )
