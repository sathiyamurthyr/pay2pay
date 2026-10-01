"""
Mailora - Email Pipeline Processor
====================================
Core orchestration: for each fetched email, run the full pipeline:
  IMAP → DB register → B2 upload → OCR → B2 result → DB complete → IMAP move/delete

This module is called by the worker for each mailbox.
"""
import json
import uuid
from datetime import datetime
from typing import Optional

from mailora.b2_client import B2Client
from mailora.db import MailoraDB
from mailora.imap_fetcher import FetchedEmail, Attachment, ImapFetcher
from mailora.logger import get_logger
from mailora.ocr_engine import OcrEngine

log = get_logger("mailora.pipeline")


class PipelineProcessor:
    """
    Processes a single fetched email through the full pipeline.
    All steps are wrapped with error handling so one failure
    does not block other emails.
    """

    def __init__(
        self,
        db: MailoraDB,
        b2: B2Client,
        ocr: OcrEngine,
        imap: ImapFetcher,
        tenant_ref_id: str,
        mailbox_email: str,
        post_process_action: str = "archive",  # "archive" | "delete"
        processed_folder: str = "Processed",
        failed_folder: str = "Failed",
        worker_node: str = "worker-01",
    ):
        self.db = db
        self.b2 = b2
        self.ocr = ocr
        self.imap = imap
        self.tenant_ref_id = tenant_ref_id
        self.mailbox_email = mailbox_email
        self.post_process_action = post_process_action
        self.processed_folder = processed_folder
        self.failed_folder = failed_folder
        self.worker_node = worker_node

    def run(self, fetched_email: FetchedEmail) -> bool:
        """
        Full pipeline for a single email.
        Returns True if all steps completed successfully.
        """
        job_id = f"JOB-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
        log.info(
            f"[{job_id}] Processing: '{fetched_email.subject[:60]}' "
            f"from {fetched_email.sender[:40]}"
        )

        # ── Step 1: Register email in DB ──────────────────────────────────────
        try:
            email_result = self.db.register_email(
                tenant_ref_id=self.tenant_ref_id,
                mailbox_email=self.mailbox_email,
                message_id=fetched_email.message_id,
                imap_uid=fetched_email.imap_uid,
                sender=fetched_email.sender,
                recipient=fetched_email.recipient,
                subject=fetched_email.subject,
                body_preview=fetched_email.body_preview,
                has_attachments=fetched_email.has_attachments,
                attachment_count=fetched_email.attachment_count,
                raw_size_bytes=fetched_email.raw_size_bytes,
                received_at=fetched_email.received_at,
            )

            if email_result["is_duplicate"]:
                log.info(f"[{job_id}] Duplicate message — skipping (already in DB)")
                self.imap.mark_seen(fetched_email.imap_uid)
                return True

            email_id = str(email_result["email_id"])
            log.info(f"[{job_id}] Email registered: {email_id}")
        except Exception as e:
            log.error(f"[{job_id}] Step 1 FAILED (register email): {e}")
            self._move_failed(fetched_email.imap_uid)
            return False

        # ── Create job record ─────────────────────────────────────────────────
        try:
            self.db.create_job(
                job_id=job_id,
                tenant_ref_id=self.tenant_ref_id,
                email_message_id=email_id,
            )
        except Exception as e:
            log.warning(f"[{job_id}] Could not create job record: {e}")

        # ── Step 2: If no attachments, mark complete right away ───────────────
        if not fetched_email.has_attachments:
            log.info(f"[{job_id}] No attachments — marking complete")
            self._finish(fetched_email.imap_uid, email_id, job_id, success=True)
            return True

        # ── Step 3: Process each attachment ───────────────────────────────────
        all_ok = True
        for attachment in fetched_email.attachments:
            ok = self._process_attachment(
                job_id=job_id,
                email_id=email_id,
                attachment=attachment,
            )
            if not ok:
                all_ok = False

        # ── Step 4: Finish — move/delete email ───────────────────────────────
        self._finish(fetched_email.imap_uid, email_id, job_id, success=all_ok)
        return all_ok

    def _process_attachment(
        self,
        job_id: str,
        email_id: str,
        attachment: Attachment,
    ) -> bool:
        """
        Process a single attachment:
          1. Compute hash
          2. Upload to B2
          3. Register document in DB
          4. Run OCR
          5. Upload OCR result JSON to B2
          6. Save OCR result to DB
        """
        log.info(
            f"[{job_id}] Attachment: {attachment.filename} "
            f"({attachment.size:,} bytes) [{attachment.content_type}]"
        )

        # ── 3a. Compute SHA256 hash ────────────────────────────────────────────
        file_hash = B2Client.compute_sha256(attachment.data)

        # ── 3b. Upload original file to B2 ────────────────────────────────────
        try:
            self.db.log_job_step(job_id, "uploading", "uploading", f"Uploading {attachment.filename}")
            # Generate a temporary doc_ref for key building (will get real one from DB)
            temp_ref = f"TEMP-{uuid.uuid4().hex[:8]}"
            b2_key = self.b2.build_object_key(
                self.tenant_ref_id, "documents", temp_ref, attachment.filename
            )
            b2_key, b2_url = self.b2.upload_bytes(
                attachment.data, b2_key, attachment.content_type
            )
            log.info(f"[{job_id}] B2 uploaded: {b2_key}")
        except Exception as e:
            log.error(f"[{job_id}] B2 upload FAILED for {attachment.filename}: {e}")
            self.db.log_job_step(job_id, "uploading", "failed", str(e)[:500])
            return False

        # ── 3c. Register document in DB ───────────────────────────────────────
        try:
            doc_result = self.db.register_document(
                tenant_ref_id=self.tenant_ref_id,
                email_msg_id=email_id,
                filename=attachment.filename,
                content_type=attachment.content_type,
                file_size_bytes=attachment.size,
                file_hash=file_hash,
                b2_bucket_name=self.b2.bucket_name,
                b2_object_key=b2_key,
                b2_url=b2_url,
            )

            if doc_result["is_duplicate"]:
                log.info(f"[{job_id}] Duplicate document (same hash) — OCR already done")
                return True

            document_id = str(doc_result["document_id"])
            doc_ref_id = doc_result["document_ref_id"]
            log.info(f"[{job_id}] Document registered: {doc_ref_id} ({document_id})")
        except Exception as e:
            log.error(f"[{job_id}] Document register FAILED: {e}")
            self.db.log_job_step(job_id, "saving", "failed", str(e)[:500])
            return False

        # ── 3d. Run OCR ────────────────────────────────────────────────────────
        try:
            self.db.log_job_step(job_id, "ocr_processing", "ocr_processing", f"Running OCR on {doc_ref_id}")
            ocr_result = self.ocr.process(
                attachment.data,
                attachment.content_type,
                attachment.filename,
            )

            if ocr_result.success:
                log.info(
                    f"[{job_id}] OCR complete: {ocr_result.pages_processed} pages, "
                    f"conf={ocr_result.confidence_score:.1f}%, "
                    f"{len(ocr_result.raw_text)} chars, "
                    f"{ocr_result.processing_time_ms}ms"
                )
            else:
                log.warning(f"[{job_id}] OCR returned error: {ocr_result.error_message}")
        except Exception as e:
            log.error(f"[{job_id}] OCR engine exception: {e}")
            ocr_result = None
            ocr_error = str(e)
        else:
            ocr_error = ocr_result.error_message if not ocr_result.success else None

        # ── 3e. Upload OCR JSON result to B2 ──────────────────────────────────
        b2_result_key = None
        b2_result_url = None
        if ocr_result and ocr_result.success and ocr_result.structured_json:
            try:
                result_key = self.b2.build_object_key(
                    self.tenant_ref_id, "ocr-results", doc_ref_id, f"{doc_ref_id}_result.json"
                )
                result_json = json.dumps({
                    "document_ref_id": doc_ref_id,
                    "document_id": document_id,
                    "ocr_engine": ocr_result.engine,
                    "processed_at": datetime.utcnow().isoformat(),
                    "raw_text": ocr_result.raw_text,
                    "structured": ocr_result.structured_json,
                }, ensure_ascii=False, indent=2)
                b2_result_key, b2_result_url = self.b2.upload_json(result_json, result_key)
                log.info(f"[{job_id}] OCR result uploaded to B2: {b2_result_key}")
            except Exception as e:
                log.warning(f"[{job_id}] OCR result B2 upload failed (non-fatal): {e}")

        # ── 3f. Save OCR result to DB ──────────────────────────────────────────
        try:
            self.db.log_job_step(job_id, "saving", "saving", f"Saving OCR result for {doc_ref_id}")
            save_result = self.db.save_ocr_result(
                document_id=document_id,
                ocr_engine=ocr_result.engine if ocr_result else "tesseract",
                raw_text=ocr_result.raw_text if (ocr_result and ocr_result.success) else None,
                structured_json=ocr_result.structured_json if (ocr_result and ocr_result.success) else None,
                confidence_score=ocr_result.confidence_score if (ocr_result and ocr_result.success) else None,
                pages_processed=ocr_result.pages_processed if ocr_result else 0,
                processing_time_ms=ocr_result.processing_time_ms if ocr_result else 0,
                b2_result_key=b2_result_key,
                b2_result_url=b2_result_url,
                error_message=ocr_error,
            )
            log.info(f"[{job_id}] OCR saved: status={save_result['final_status']}")
        except Exception as e:
            log.error(f"[{job_id}] OCR save to DB FAILED: {e}")
            return False

        return ocr_result.success if ocr_result else False

    def _finish(self, imap_uid: int, email_id: str, job_id: str, success: bool):
        """
        Final step: call sp_complete_pipeline, then move/delete from IMAP.
        """
        if success:
            action = "processed"
            target_folder = self.processed_folder
        else:
            action = "failed"
            target_folder = self.failed_folder

        # DB: mark pipeline complete
        try:
            result = self.db.complete_pipeline(
                email_message_id=email_id,
                job_id=job_id,
                action=action,
                moved_to_folder=target_folder,
            )
            log.info(f"[{job_id}] Pipeline DB complete: {result.get('message', '')}")
        except Exception as e:
            log.error(f"[{job_id}] complete_pipeline DB call failed: {e}")

        # IMAP: move or delete
        if self.post_process_action == "delete" and success:
            self.imap.delete_message(imap_uid)
        else:
            moved = self.imap.move_to_folder(imap_uid, target_folder)
            if not moved:
                # Fallback: at least mark as seen
                self.imap.mark_seen(imap_uid)

    def _move_failed(self, imap_uid: int):
        """Move to Failed folder when we can't even register the email."""
        try:
            self.imap.move_to_folder(imap_uid, self.failed_folder)
        except Exception:
            self.imap.mark_seen(imap_uid)
