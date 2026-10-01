"""
Mailora - Database Client
==========================
Thin psycopg2 wrapper that calls the stored procedures in the mailora schema.
All DB logic is isolated here — the worker never writes raw SQL.
"""
import json
import uuid
from datetime import datetime
from typing import Optional

import psycopg2
import psycopg2.extras

from mailora.logger import get_logger

log = get_logger("mailora.db")


def _connect(db_url: str):
    """Open a new synchronous psycopg2 connection."""
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    psycopg2.extras.register_uuid()
    return conn


class MailoraDB:
    """
    Wrapper around the mailora PostgreSQL stored procedures.
    One instance per worker run — connection is reused.
    """

    def __init__(self, db_url: str):
        self.db_url = db_url
        self._conn = None

    def connect(self):
        self._conn = _connect(self.db_url)
        log.info("Database connection established")

    def close(self):
        if self._conn and not self._conn.closed:
            self._conn.close()
            log.info("Database connection closed")

    def _cur(self):
        """Return a dict-style cursor, reconnecting if needed."""
        if self._conn is None or self._conn.closed:
            log.warning("DB connection lost — reconnecting...")
            self._conn = _connect(self.db_url)
        return self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # ─── SP: sp_register_email_message ────────────────────────────────────────
    def register_email(
        self,
        tenant_ref_id: str,
        mailbox_email: str,
        message_id: str,
        imap_uid: int,
        sender: str,
        recipient: str,
        subject: str,
        body_preview: str,
        has_attachments: bool,
        attachment_count: int,
        raw_size_bytes: int,
        received_at: datetime,
    ) -> dict:
        """
        Calls sp_register_email_message.
        Returns {'email_id': UUID, 'is_duplicate': bool}
        """
        cur = self._cur()
        cur.execute(
            """
            SELECT email_id, is_duplicate
            FROM mailora.sp_register_email_message(
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                tenant_ref_id,
                mailbox_email,
                message_id,
                imap_uid,
                sender[:512],
                recipient[:512],
                subject,
                body_preview[:500] if body_preview else None,
                has_attachments,
                attachment_count,
                raw_size_bytes,
                received_at,
            ),
        )
        row = cur.fetchone()
        cur.close()
        return dict(row)

    # ─── SP: sp_register_document ─────────────────────────────────────────────
    def register_document(
        self,
        tenant_ref_id: str,
        email_msg_id: str,
        filename: str,
        content_type: str,
        file_size_bytes: int,
        file_hash: str,
        b2_bucket_name: str,
        b2_object_key: str,
        b2_url: str,
    ) -> dict:
        """
        Calls sp_register_document.
        Returns {'document_id': UUID, 'document_ref_id': str, 'is_duplicate': bool}
        """
        cur = self._cur()
        cur.execute(
            """
            SELECT document_id, document_ref_id, is_duplicate
            FROM mailora.sp_register_document(
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                tenant_ref_id,
                email_msg_id,
                filename[:512],
                content_type,
                file_size_bytes,
                file_hash,
                b2_bucket_name,
                b2_object_key,
                b2_url,
            ),
        )
        row = cur.fetchone()
        cur.close()
        return dict(row)

    # ─── SP: sp_save_ocr_result ───────────────────────────────────────────────
    def save_ocr_result(
        self,
        document_id: str,
        ocr_engine: str,
        raw_text: str,
        structured_json: Optional[dict],
        confidence_score: Optional[float],
        pages_processed: int,
        processing_time_ms: int,
        b2_result_key: Optional[str],
        b2_result_url: Optional[str],
        error_message: Optional[str] = None,
    ) -> dict:
        """
        Calls sp_save_ocr_result.
        Returns {'ocr_result_id': UUID, 'final_status': str}
        """
        cur = self._cur()
        cur.execute(
            """
            SELECT ocr_result_id, final_status::TEXT
            FROM mailora.sp_save_ocr_result(
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                document_id,
                ocr_engine,
                raw_text,
                json.dumps(structured_json) if structured_json else None,
                confidence_score,
                pages_processed,
                processing_time_ms,
                b2_result_key,
                b2_result_url,
                error_message,
            ),
        )
        row = cur.fetchone()
        cur.close()
        return dict(row)

    # ─── SP: sp_complete_pipeline ─────────────────────────────────────────────
    def complete_pipeline(
        self,
        email_message_id: str,
        job_id: str,
        action: str = "processed",
        moved_to_folder: str = "Processed",
        notes: Optional[str] = None,
    ) -> dict:
        """
        Calls sp_complete_pipeline.
        Returns {'success': bool, 'message': str}
        """
        cur = self._cur()
        cur.execute(
            """
            SELECT success, message
            FROM mailora.sp_complete_pipeline(
                %s, %s, %s::mailora.email_action, %s, %s
            )
            """,
            (email_message_id, job_id, action, moved_to_folder, notes),
        )
        row = cur.fetchone()
        cur.close()
        return dict(row)

    # ─── SP: sp_get_pending_ocr_queue ─────────────────────────────────────────
    def get_pending_ocr_queue(
        self, tenant_ref_id: Optional[str] = None, limit: int = 50
    ) -> list:
        """Fetch documents awaiting OCR processing."""
        cur = self._cur()
        cur.execute(
            "SELECT * FROM mailora.sp_get_pending_ocr_queue(%s, %s)",
            (tenant_ref_id, limit),
        )
        rows = cur.fetchall()
        cur.close()
        return [dict(r) for r in rows]

    # ─── Helper: update mailbox last_polled_at ────────────────────────────────
    def update_mailbox_polled(self, email_address: str):
        cur = self._cur()
        cur.execute(
            """
            UPDATE mailora.mailboxes
            SET last_polled_at = NOW(), updated_at = NOW()
            WHERE email_address = %s
            """,
            (email_address,),
        )
        cur.close()

    # ─── Helper: create processing job ───────────────────────────────────────
    def create_job(
        self,
        job_id: str,
        tenant_ref_id: str,
        email_message_id: Optional[str] = None,
        document_id: Optional[str] = None,
    ):
        cur = self._cur()
        cur.execute(
            """
            INSERT INTO mailora.processing_jobs
                (job_id, tenant_id, email_message_id, document_id, job_status, started_at)
            SELECT %s, t.id, %s, %s, 'fetching', NOW()
            FROM mailora.tenants t
            WHERE t.tenant_ref_id = %s
            ON CONFLICT (job_id) DO NOTHING
            """,
            (job_id, email_message_id, document_id, tenant_ref_id),
        )
        cur.close()

    # ─── Helper: update job step log ─────────────────────────────────────────
    def log_job_step(self, job_id: str, step: str, status: str, msg: str = ""):
        cur = self._cur()
        step_entry = json.dumps({
            "step": step,
            "ts": datetime.utcnow().isoformat(),
            "status": status,
            "msg": msg,
        })
        cur.execute(
            """
            UPDATE mailora.processing_jobs
            SET step_log   = step_log || %s::jsonb,
                job_status = %s::mailora.job_status,
                updated_at = NOW()
            WHERE job_id = %s
            """,
            (f"[{step_entry}]", status if status in (
                "queued","fetching","uploading","ocr_processing",
                "saving","completed","failed","retrying"
            ) else "fetching", job_id),
        )
        cur.close()

    # ─── Helper: mark job failed ──────────────────────────────────────────────
    def fail_job(self, job_id: str, error: str):
        cur = self._cur()
        cur.execute(
            """
            UPDATE mailora.processing_jobs
            SET job_status    = 'failed',
                error_message = %s,
                completed_at  = NOW(),
                updated_at    = NOW()
            WHERE job_id = %s
            """,
            (error[:2000], job_id),
        )
        cur.close()
