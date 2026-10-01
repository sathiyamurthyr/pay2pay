-- =============================================================================
-- MAILORA - Email-to-OCR Processing Pipeline Schema
-- Database: postgres (Supabase: db.arkoolfygfqawyvwnldv.supabase.co)
-- Schema:   mailora
-- Created:  2026-09-29
-- =============================================================================
-- Run this entire script in Supabase SQL Editor.
-- Fully idempotent: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- =============================================================================


-- ─── 0. Schema & Extensions ──────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS mailora;
-- gen_random_uuid() is built-in to Supabase (pgcrypto), no extension needed
SET search_path TO mailora, public;


-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE mailora.ocr_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mailora.job_status AS ENUM (
    'queued', 'fetching', 'uploading', 'ocr_processing', 'saving',
    'completed', 'failed', 'retrying'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mailora.email_action AS ENUM (
    'pending', 'processed', 'archived', 'deleted', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 2. CORE TABLES
-- =============================================================================

-- ─── 2.1 Tenants ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mailora.tenants (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_ref_id    VARCHAR(64)  UNIQUE NOT NULL,
  name             VARCHAR(255) NOT NULL,
  domain           VARCHAR(255) NOT NULL,
  mailbox_host     VARCHAR(255) NOT NULL DEFAULT 'mail.pay2pay.in',
  mailbox_port     INTEGER      NOT NULL DEFAULT 993,
  mailbox_ssl      BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 2.2 Mailboxes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mailora.mailboxes (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID         NOT NULL REFERENCES mailora.tenants(id) ON DELETE CASCADE,
  email_address        VARCHAR(255) UNIQUE NOT NULL,
  display_name         VARCHAR(255),
  imap_username        VARCHAR(255) NOT NULL,
  imap_password_ref    VARCHAR(512),            -- vault key reference, never store plaintext
  inbox_folder         VARCHAR(100) NOT NULL DEFAULT 'INBOX',
  processed_folder     VARCHAR(100) NOT NULL DEFAULT 'Processed',
  failed_folder        VARCHAR(100) NOT NULL DEFAULT 'Failed',
  delete_after_process BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  last_polled_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 2.3 Email Messages ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mailora.email_messages (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID         NOT NULL REFERENCES mailora.tenants(id),
  mailbox_id       UUID         NOT NULL REFERENCES mailora.mailboxes(id),
  message_id       VARCHAR(512) UNIQUE NOT NULL,  -- IMAP Message-ID header
  imap_uid         BIGINT,
  sender           VARCHAR(512) NOT NULL,
  recipient        VARCHAR(512) NOT NULL,
  subject          TEXT,
  body_preview     TEXT,                           -- first 500 chars
  has_attachments  BOOLEAN      NOT NULL DEFAULT FALSE,
  attachment_count INTEGER      NOT NULL DEFAULT 0,
  raw_size_bytes   BIGINT,
  received_at      TIMESTAMPTZ  NOT NULL,
  fetched_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  email_action     mailora.email_action NOT NULL DEFAULT 'pending',
  imap_moved_to    VARCHAR(100),
  imap_deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 2.4 Documents ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mailora.documents (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  document_ref_id  VARCHAR(128)  UNIQUE NOT NULL,   -- e.g. "DOC-202609-000001"
  tenant_id        UUID          NOT NULL REFERENCES mailora.tenants(id),
  email_message_id UUID          NOT NULL REFERENCES mailora.email_messages(id) ON DELETE CASCADE,
  filename         VARCHAR(512)  NOT NULL,
  content_type     VARCHAR(100),
  file_size_bytes  BIGINT,
  file_hash_sha256 VARCHAR(64),                     -- deduplication
  b2_bucket_name   VARCHAR(255)  NOT NULL DEFAULT 'sathus-pay2pay',
  b2_object_key    VARCHAR(1024) NOT NULL,           -- "PAY2PAY/documents/2026/09/DOC-xxx.pdf"
  b2_url           TEXT,
  b2_uploaded_at   TIMESTAMPTZ,
  b2_upload_status VARCHAR(20)   NOT NULL DEFAULT 'pending',
  ocr_status       mailora.ocr_status NOT NULL DEFAULT 'pending',
  page_count       INTEGER,
  language_hint    VARCHAR(20)   DEFAULT 'eng',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── 2.5 OCR Results ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mailora.ocr_results (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID         UNIQUE NOT NULL REFERENCES mailora.documents(id) ON DELETE CASCADE,
  tenant_id             UUID         NOT NULL REFERENCES mailora.tenants(id),
  ocr_engine            VARCHAR(50)  NOT NULL DEFAULT 'tesseract',
  ocr_version           VARCHAR(20),
  raw_text              TEXT,
  structured_json       JSONB,
  confidence_score      NUMERIC(5,2),
  pages_processed       INTEGER      NOT NULL DEFAULT 0,
  processing_time_ms    INTEGER,
  b2_result_key         VARCHAR(1024),              -- "PAY2PAY/ocr-results/DOC-xxx.json"
  b2_result_url         TEXT,
  b2_result_uploaded_at TIMESTAMPTZ,
  ocr_status            mailora.ocr_status NOT NULL DEFAULT 'pending',
  error_message         TEXT,
  retry_count           INTEGER      NOT NULL DEFAULT 0,
  last_attempted_at     TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 2.6 Processing Jobs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mailora.processing_jobs (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id           VARCHAR(128) UNIQUE NOT NULL,    -- "JOB-20260929-abc123"
  tenant_id        UUID         NOT NULL REFERENCES mailora.tenants(id),
  email_message_id UUID         REFERENCES mailora.email_messages(id),
  document_id      UUID         REFERENCES mailora.documents(id),
  job_status       mailora.job_status NOT NULL DEFAULT 'queued',
  worker_node      VARCHAR(255),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  duration_ms      INTEGER,
  step_log         JSONB        NOT NULL DEFAULT '[]',
  error_message    TEXT,
  retry_count      INTEGER      NOT NULL DEFAULT 0,
  max_retries      INTEGER      NOT NULL DEFAULT 3,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 2.7 Audit Log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mailora.audit_logs (
  id           BIGSERIAL    PRIMARY KEY,
  tenant_id    UUID         REFERENCES mailora.tenants(id),
  table_name   VARCHAR(100) NOT NULL,
  record_id    UUID,
  action       VARCHAR(20)  NOT NULL,
  old_data     JSONB,
  new_data     JSONB,
  performed_by VARCHAR(255) NOT NULL DEFAULT 'system',
  performed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  notes        TEXT
);


-- =============================================================================
-- 3. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_mailora_tenants_ref      ON mailora.tenants(tenant_ref_id);
CREATE INDEX IF NOT EXISTS idx_mailora_mb_tenant        ON mailora.mailboxes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailora_mb_email         ON mailora.mailboxes(email_address);
CREATE INDEX IF NOT EXISTS idx_mailora_em_tenant        ON mailora.email_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailora_em_mailbox       ON mailora.email_messages(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_mailora_em_msgid         ON mailora.email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_mailora_em_received      ON mailora.email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailora_em_action        ON mailora.email_messages(email_action);
CREATE INDEX IF NOT EXISTS idx_mailora_em_imap_uid      ON mailora.email_messages(mailbox_id, imap_uid);
CREATE INDEX IF NOT EXISTS idx_mailora_doc_tenant       ON mailora.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailora_doc_email        ON mailora.documents(email_message_id);
CREATE INDEX IF NOT EXISTS idx_mailora_doc_ocr_status   ON mailora.documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_mailora_doc_ref          ON mailora.documents(document_ref_id);
CREATE INDEX IF NOT EXISTS idx_mailora_doc_hash         ON mailora.documents(file_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_mailora_ocr_doc          ON mailora.ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_mailora_ocr_tenant       ON mailora.ocr_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailora_ocr_status       ON mailora.ocr_results(ocr_status);
CREATE INDEX IF NOT EXISTS idx_mailora_job_tenant       ON mailora.processing_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailora_job_status       ON mailora.processing_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_mailora_job_email        ON mailora.processing_jobs(email_message_id);
CREATE INDEX IF NOT EXISTS idx_mailora_audit_tenant     ON mailora.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailora_audit_ts         ON mailora.audit_logs(performed_at DESC);


-- =============================================================================
-- 4. AUTO-UPDATE updated_at TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION mailora.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants','mailboxes','email_messages','documents','ocr_results','processing_jobs'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_upd ON mailora.%s;
       CREATE TRIGGER trg_%s_upd
       BEFORE UPDATE ON mailora.%s
       FOR EACH ROW EXECUTE FUNCTION mailora.set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;


-- =============================================================================
-- 5. STORED PROCEDURES / FUNCTIONS
-- =============================================================================

-- ─── sp_register_email_message ───────────────────────────────────────────────
-- Registers a fetched IMAP email. Returns email_id + is_duplicate flag.
CREATE OR REPLACE FUNCTION mailora.sp_register_email_message(
  p_tenant_ref_id    VARCHAR,
  p_mailbox_email    VARCHAR,
  p_message_id       VARCHAR,
  p_imap_uid         BIGINT,
  p_sender           VARCHAR,
  p_recipient        VARCHAR,
  p_subject          TEXT,
  p_body_preview     TEXT,
  p_has_attachments  BOOLEAN,
  p_attachment_count INTEGER,
  p_raw_size_bytes   BIGINT,
  p_received_at      TIMESTAMPTZ
)
RETURNS TABLE(email_id UUID, is_duplicate BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_id  UUID;
  v_mailbox_id UUID;
  v_email_id   UUID;
  v_dup        BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_tenant_id FROM mailora.tenants
  WHERE tenant_ref_id = p_tenant_ref_id AND is_active = TRUE;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_ref_id;
  END IF;

  SELECT id INTO v_mailbox_id FROM mailora.mailboxes
  WHERE email_address = p_mailbox_email AND tenant_id = v_tenant_id AND is_active = TRUE;
  IF v_mailbox_id IS NULL THEN
    RAISE EXCEPTION 'Mailbox not found: %', p_mailbox_email;
  END IF;

  SELECT id INTO v_email_id FROM mailora.email_messages
  WHERE message_id = p_message_id;

  IF v_email_id IS NOT NULL THEN
    v_dup := TRUE;
  ELSE
    INSERT INTO mailora.email_messages (
      tenant_id, mailbox_id, message_id, imap_uid,
      sender, recipient, subject, body_preview,
      has_attachments, attachment_count, raw_size_bytes,
      received_at, email_action
    ) VALUES (
      v_tenant_id, v_mailbox_id, p_message_id, p_imap_uid,
      p_sender, p_recipient, p_subject, p_body_preview,
      p_has_attachments, p_attachment_count, p_raw_size_bytes,
      p_received_at, 'pending'
    ) RETURNING id INTO v_email_id;
  END IF;

  RETURN QUERY SELECT v_email_id, v_dup;
END;
$$;


-- ─── sp_register_document ────────────────────────────────────────────────────
-- Registers a B2-uploaded document. Auto-generates document_ref_id.
CREATE OR REPLACE FUNCTION mailora.sp_register_document(
  p_tenant_ref_id   VARCHAR,
  p_email_msg_id    UUID,
  p_filename        VARCHAR,
  p_content_type    VARCHAR,
  p_file_size_bytes BIGINT,
  p_file_hash       VARCHAR,
  p_b2_bucket_name  VARCHAR,
  p_b2_object_key   VARCHAR,
  p_b2_url          TEXT
)
RETURNS TABLE(document_id UUID, document_ref_id VARCHAR, is_duplicate BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_id  UUID;
  v_doc_id     UUID;
  v_doc_ref    VARCHAR;
  v_dup        BOOLEAN := FALSE;
  v_seq        BIGINT;
BEGIN
  SELECT id INTO v_tenant_id FROM mailora.tenants
  WHERE tenant_ref_id = p_tenant_ref_id AND is_active = TRUE;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_ref_id;
  END IF;

  -- SHA256 deduplication
  IF p_file_hash IS NOT NULL THEN
    SELECT id, document_ref_id INTO v_doc_id, v_doc_ref
    FROM mailora.documents
    WHERE file_hash_sha256 = p_file_hash AND tenant_id = v_tenant_id
    LIMIT 1;
  END IF;

  IF v_doc_id IS NOT NULL THEN
    v_dup := TRUE;
  ELSE
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(document_ref_id FROM 'DOC-[0-9]+-([0-9]+)') AS BIGINT)
    ), 0) + 1 INTO v_seq
    FROM mailora.documents WHERE tenant_id = v_tenant_id;

    v_doc_ref := 'DOC-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_seq::TEXT, 6, '0');

    INSERT INTO mailora.documents (
      document_ref_id, tenant_id, email_message_id,
      filename, content_type, file_size_bytes, file_hash_sha256,
      b2_bucket_name, b2_object_key, b2_url,
      b2_upload_status, b2_uploaded_at, ocr_status
    ) VALUES (
      v_doc_ref, v_tenant_id, p_email_msg_id,
      p_filename, p_content_type, p_file_size_bytes, p_file_hash,
      p_b2_bucket_name, p_b2_object_key, p_b2_url,
      'uploaded', NOW(), 'pending'
    ) RETURNING id INTO v_doc_id;
  END IF;

  RETURN QUERY SELECT v_doc_id, v_doc_ref, v_dup;
END;
$$;


-- ─── sp_save_ocr_result ──────────────────────────────────────────────────────
-- Upserts OCR result. Increments retry_count on conflict.
CREATE OR REPLACE FUNCTION mailora.sp_save_ocr_result(
  p_document_id        UUID,
  p_ocr_engine         VARCHAR,
  p_raw_text           TEXT,
  p_structured_json    JSONB,
  p_confidence_score   NUMERIC,
  p_pages_processed    INTEGER,
  p_processing_time_ms INTEGER,
  p_b2_result_key      VARCHAR,
  p_b2_result_url      TEXT,
  p_error_message      TEXT DEFAULT NULL
)
RETURNS TABLE(ocr_result_id UUID, final_status mailora.ocr_status)
LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_id UUID;
  v_ocr_id    UUID;
  v_status    mailora.ocr_status;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM mailora.documents WHERE id = p_document_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  v_status := CASE WHEN p_error_message IS NOT NULL THEN 'failed' ELSE 'completed' END;

  INSERT INTO mailora.ocr_results (
    document_id, tenant_id, ocr_engine,
    raw_text, structured_json, confidence_score,
    pages_processed, processing_time_ms,
    b2_result_key, b2_result_url, b2_result_uploaded_at,
    ocr_status, error_message, completed_at, last_attempted_at
  ) VALUES (
    p_document_id, v_tenant_id, p_ocr_engine,
    p_raw_text, p_structured_json, p_confidence_score,
    p_pages_processed, p_processing_time_ms,
    p_b2_result_key, p_b2_result_url,
    CASE WHEN p_b2_result_key IS NOT NULL THEN NOW() END,
    v_status, p_error_message,
    CASE WHEN v_status = 'completed' THEN NOW() END,
    NOW()
  )
  ON CONFLICT (document_id) DO UPDATE SET
    raw_text              = EXCLUDED.raw_text,
    structured_json       = EXCLUDED.structured_json,
    confidence_score      = EXCLUDED.confidence_score,
    pages_processed       = EXCLUDED.pages_processed,
    processing_time_ms    = EXCLUDED.processing_time_ms,
    b2_result_key         = EXCLUDED.b2_result_key,
    b2_result_url         = EXCLUDED.b2_result_url,
    b2_result_uploaded_at = EXCLUDED.b2_result_uploaded_at,
    ocr_status            = EXCLUDED.ocr_status,
    error_message         = EXCLUDED.error_message,
    completed_at          = EXCLUDED.completed_at,
    retry_count           = mailora.ocr_results.retry_count + 1,
    last_attempted_at     = NOW(),
    updated_at            = NOW()
  RETURNING id INTO v_ocr_id;

  UPDATE mailora.documents
  SET ocr_status = v_status, updated_at = NOW()
  WHERE id = p_document_id;

  RETURN QUERY SELECT v_ocr_id, v_status;
END;
$$;


-- ─── sp_complete_pipeline ────────────────────────────────────────────────────
-- Marks email as processed/archived. Updates job. Writes audit log.
CREATE OR REPLACE FUNCTION mailora.sp_complete_pipeline(
  p_email_message_id UUID,
  p_job_id           VARCHAR,
  p_action           mailora.email_action DEFAULT 'processed',
  p_moved_to_folder  VARCHAR DEFAULT 'Processed',
  p_notes            TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql AS $$
DECLARE v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM mailora.email_messages WHERE id = p_email_message_id;
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Email message not found'::TEXT;
    RETURN;
  END IF;

  UPDATE mailora.email_messages SET
    email_action  = p_action,
    imap_moved_to = p_moved_to_folder,
    imap_deleted  = (p_action = 'deleted'),
    updated_at    = NOW()
  WHERE id = p_email_message_id;

  IF p_job_id IS NOT NULL THEN
    UPDATE mailora.processing_jobs SET
      job_status   = 'completed',
      completed_at = NOW(),
      duration_ms  = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER * 1000,
      updated_at   = NOW()
    WHERE job_id = p_job_id;
  END IF;

  INSERT INTO mailora.audit_logs (tenant_id, table_name, record_id, action, new_data, notes)
  VALUES (
    v_tenant_id, 'email_messages', p_email_message_id, 'PROCESS',
    jsonb_build_object('action', p_action, 'job_id', p_job_id, 'moved_to', p_moved_to_folder),
    p_notes
  );

  RETURN QUERY SELECT TRUE, 'Pipeline completed successfully'::TEXT;
END;
$$;


-- ─── sp_get_pending_ocr_queue ────────────────────────────────────────────────
-- Returns documents waiting for OCR (used by the OCR worker daemon).
CREATE OR REPLACE FUNCTION mailora.sp_get_pending_ocr_queue(
  p_tenant_ref_id VARCHAR DEFAULT NULL,
  p_limit         INTEGER DEFAULT 50
)
RETURNS TABLE(
  document_id     UUID,
  document_ref_id VARCHAR,
  tenant_ref_id   VARCHAR,
  email_subject   TEXT,
  filename        VARCHAR,
  content_type    VARCHAR,
  b2_object_key   VARCHAR,
  retry_count     INTEGER,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.document_ref_id, t.tenant_ref_id,
    e.subject, d.filename, d.content_type, d.b2_object_key,
    COALESCE(r.retry_count, 0), d.created_at
  FROM mailora.documents d
  JOIN mailora.tenants t          ON t.id = d.tenant_id
  JOIN mailora.email_messages e   ON e.id = d.email_message_id
  LEFT JOIN mailora.ocr_results r ON r.document_id = d.id
  WHERE d.ocr_status IN ('pending', 'failed')
    AND COALESCE(r.retry_count, 0) < 3
    AND (p_tenant_ref_id IS NULL OR t.tenant_ref_id = p_tenant_ref_id)
  ORDER BY d.created_at ASC
  LIMIT p_limit;
END;
$$;


-- ─── sp_get_dashboard_stats ──────────────────────────────────────────────────
-- Returns aggregate pipeline metrics for a tenant over a date range.
CREATE OR REPLACE FUNCTION mailora.sp_get_dashboard_stats(
  p_tenant_ref_id VARCHAR,
  p_from_date     DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to_date       DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_emails           BIGINT,
  emails_pending         BIGINT,
  emails_processed       BIGINT,
  emails_failed          BIGINT,
  total_documents        BIGINT,
  ocr_completed          BIGINT,
  ocr_pending            BIGINT,
  ocr_failed             BIGINT,
  avg_confidence_score   NUMERIC,
  avg_processing_time_ms NUMERIC,
  total_file_size_mb     NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM mailora.tenants WHERE tenant_ref_id = p_tenant_ref_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_ref_id;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT e.id),
    COUNT(DISTINCT e.id) FILTER (WHERE e.email_action = 'pending'),
    COUNT(DISTINCT e.id) FILTER (WHERE e.email_action = 'processed'),
    COUNT(DISTINCT e.id) FILTER (WHERE e.email_action = 'failed'),
    COUNT(DISTINCT d.id),
    COUNT(DISTINCT d.id) FILTER (WHERE d.ocr_status = 'completed'),
    COUNT(DISTINCT d.id) FILTER (WHERE d.ocr_status = 'pending'),
    COUNT(DISTINCT d.id) FILTER (WHERE d.ocr_status = 'failed'),
    ROUND(AVG(r.confidence_score), 2),
    ROUND(AVG(r.processing_time_ms), 0),
    ROUND(SUM(d.file_size_bytes) / 1048576.0, 2)
  FROM mailora.email_messages e
  LEFT JOIN mailora.documents d   ON d.email_message_id = e.id
  LEFT JOIN mailora.ocr_results r ON r.document_id = d.id
  WHERE e.tenant_id = v_tenant_id
    AND e.received_at::DATE BETWEEN p_from_date AND p_to_date;
END;
$$;


-- =============================================================================
-- 6. VIEWS
-- =============================================================================

-- ─── v_pipeline_full: email + document + OCR in one row ──────────────────────
CREATE OR REPLACE VIEW mailora.v_pipeline_full AS
SELECT
  t.tenant_ref_id,
  t.name                    AS tenant_name,
  mb.email_address          AS mailbox,
  e.id                      AS email_id,
  e.message_id,
  e.sender,
  e.recipient,
  e.subject,
  e.has_attachments,
  e.received_at,
  e.email_action,
  e.imap_moved_to,
  d.id                      AS document_id,
  d.document_ref_id,
  d.filename,
  d.content_type,
  d.file_size_bytes,
  d.b2_object_key,
  d.b2_upload_status,
  d.ocr_status              AS doc_ocr_status,
  r.id                      AS ocr_result_id,
  r.ocr_engine,
  r.raw_text,
  r.structured_json,
  r.confidence_score,
  r.processing_time_ms,
  r.ocr_status              AS ocr_final_status,
  r.error_message,
  r.completed_at            AS ocr_completed_at,
  e.created_at              AS email_created_at,
  d.created_at              AS document_created_at,
  r.created_at              AS ocr_created_at
FROM mailora.tenants t
JOIN mailora.email_messages e   ON e.tenant_id = t.id
JOIN mailora.mailboxes mb       ON mb.id = e.mailbox_id
LEFT JOIN mailora.documents d   ON d.email_message_id = e.id
LEFT JOIN mailora.ocr_results r ON r.document_id = d.id;


-- ─── v_ocr_pending_queue: documents awaiting OCR ─────────────────────────────
CREATE OR REPLACE VIEW mailora.v_ocr_pending_queue AS
SELECT
  t.tenant_ref_id,
  d.id                       AS document_id,
  d.document_ref_id,
  d.filename,
  d.content_type,
  d.file_size_bytes,
  d.b2_object_key,
  d.language_hint,
  e.subject                  AS email_subject,
  e.sender                   AS email_sender,
  e.received_at              AS email_received_at,
  COALESCE(r.retry_count, 0) AS retry_count,
  d.ocr_status,
  d.created_at
FROM mailora.documents d
JOIN mailora.tenants t          ON t.id = d.tenant_id
JOIN mailora.email_messages e   ON e.id = d.email_message_id
LEFT JOIN mailora.ocr_results r ON r.document_id = d.id
WHERE d.ocr_status IN ('pending', 'failed')
  AND COALESCE(r.retry_count, 0) < 3
ORDER BY d.created_at ASC;


-- ─── v_daily_summary: per-tenant per-day throughput ──────────────────────────
CREATE OR REPLACE VIEW mailora.v_daily_summary AS
SELECT
  t.tenant_ref_id,
  DATE(e.received_at)            AS process_date,
  COUNT(DISTINCT e.id)           AS total_emails,
  COUNT(DISTINCT d.id)           AS total_documents,
  COUNT(d.id) FILTER (WHERE d.ocr_status = 'completed') AS ocr_success,
  COUNT(d.id) FILTER (WHERE d.ocr_status = 'failed')    AS ocr_failed,
  COUNT(d.id) FILTER (WHERE d.ocr_status = 'pending')   AS ocr_pending,
  ROUND(AVG(r.confidence_score), 2)                      AS avg_confidence,
  ROUND(AVG(r.processing_time_ms) / 1000.0, 2)          AS avg_processing_secs,
  SUM(d.file_size_bytes)                                 AS total_bytes_processed
FROM mailora.tenants t
JOIN mailora.email_messages e   ON e.tenant_id = t.id
LEFT JOIN mailora.documents d   ON d.email_message_id = e.id
LEFT JOIN mailora.ocr_results r ON r.document_id = d.id
GROUP BY t.tenant_ref_id, DATE(e.received_at)
ORDER BY process_date DESC;


-- ─── v_failed_items: all failed pipeline items ───────────────────────────────
CREATE OR REPLACE VIEW mailora.v_failed_items AS
SELECT
  t.tenant_ref_id,
  e.id              AS email_id,
  e.message_id,
  e.sender,
  e.subject,
  e.received_at,
  d.id              AS document_id,
  d.document_ref_id,
  d.filename,
  d.ocr_status,
  r.error_message,
  r.retry_count,
  r.last_attempted_at,
  CASE
    WHEN COALESCE(r.retry_count, 0) >= 3              THEN 'MAX_RETRIES_EXCEEDED'
    WHEN d.b2_upload_status = 'failed'                THEN 'B2_UPLOAD_FAILED'
    WHEN e.email_action = 'failed'                    THEN 'EMAIL_PROCESSING_FAILED'
    ELSE                                                   'OCR_FAILED'
  END AS failure_reason
FROM mailora.email_messages e
JOIN mailora.tenants t          ON t.id = e.tenant_id
LEFT JOIN mailora.documents d   ON d.email_message_id = e.id
LEFT JOIN mailora.ocr_results r ON r.document_id = d.id
WHERE e.email_action = 'failed'
   OR d.ocr_status = 'failed'
   OR d.b2_upload_status = 'failed'
ORDER BY e.received_at DESC;


-- ─── v_ocr_results_detail: OCR output with full context ──────────────────────
CREATE OR REPLACE VIEW mailora.v_ocr_results_detail AS
SELECT
  t.tenant_ref_id,
  d.document_ref_id,
  d.filename,
  d.content_type,
  e.sender,
  e.recipient,
  e.subject,
  e.received_at,
  r.ocr_engine,
  r.raw_text,
  r.structured_json,
  r.confidence_score,
  r.pages_processed,
  r.processing_time_ms,
  r.b2_result_key,
  r.ocr_status,
  r.completed_at,
  r.error_message
FROM mailora.ocr_results r
JOIN mailora.documents d         ON d.id = r.document_id
JOIN mailora.tenants t           ON t.id = r.tenant_id
JOIN mailora.email_messages e    ON e.id = d.email_message_id
ORDER BY r.completed_at DESC NULLS LAST;


-- =============================================================================
-- 7. SEED DATA
-- =============================================================================

-- Tenants
INSERT INTO mailora.tenants (tenant_ref_id, name, domain, mailbox_host)
VALUES ('PAY2PAY', 'Pay2Pay Enterprise', 'pay2pay.in', 'mail.pay2pay.in')
ON CONFLICT (tenant_ref_id) DO NOTHING;

INSERT INTO mailora.tenants (tenant_ref_id, name, domain, mailbox_host)
VALUES ('SATHUS', 'Sathus Private Limited', 'sathus.in', 'mail.pay2pay.in')
ON CONFLICT (tenant_ref_id) DO NOTHING;

-- Pay2Pay mailboxes
INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'admin@pay2pay.in',   'Pay2Pay Admin',   'admin@pay2pay.in',   'vault:pay2pay/admin'
FROM mailora.tenants WHERE tenant_ref_id='PAY2PAY' ON CONFLICT (email_address) DO NOTHING;

INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'tech@pay2pay.in',    'Pay2Pay Tech',    'tech@pay2pay.in',    'vault:pay2pay/tech'
FROM mailora.tenants WHERE tenant_ref_id='PAY2PAY' ON CONFLICT (email_address) DO NOTHING;

INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'support@pay2pay.in', 'Pay2Pay Support', 'support@pay2pay.in', 'vault:pay2pay/support'
FROM mailora.tenants WHERE tenant_ref_id='PAY2PAY' ON CONFLICT (email_address) DO NOTHING;

-- Sathus mailboxes
INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'admin@sathus.in',   'Sathus Admin',   'admin@sathus.in',   'vault:sathus/admin'
FROM mailora.tenants WHERE tenant_ref_id='SATHUS' ON CONFLICT (email_address) DO NOTHING;

INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'tech@sathus.in',    'Sathus Tech',    'tech@sathus.in',    'vault:sathus/tech'
FROM mailora.tenants WHERE tenant_ref_id='SATHUS' ON CONFLICT (email_address) DO NOTHING;

INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'support@sathus.in', 'Sathus Support', 'support@sathus.in', 'vault:sathus/support'
FROM mailora.tenants WHERE tenant_ref_id='SATHUS' ON CONFLICT (email_address) DO NOTHING;

INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'sm@sathus.in',      'Sathus SM',      'sm@sathus.in',      'vault:sathus/sm'
FROM mailora.tenants WHERE tenant_ref_id='SATHUS' ON CONFLICT (email_address) DO NOTHING;

INSERT INTO mailora.mailboxes (tenant_id, email_address, display_name, imap_username, imap_password_ref)
SELECT id,'vino@sathus.in',    'Sathus Vino',    'vino@sathus.in',    'vault:sathus/vino'
FROM mailora.tenants WHERE tenant_ref_id='SATHUS' ON CONFLICT (email_address) DO NOTHING;


-- =============================================================================
-- 8. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE mailora.tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailora.mailboxes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailora.email_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailora.documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailora.ocr_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailora.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailora.audit_logs      ENABLE ROW LEVEL SECURITY;

-- service_role (backend key) = full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mailora' AND policyname='service_role_tenants') THEN
    CREATE POLICY service_role_tenants ON mailora.tenants FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mailora' AND policyname='service_role_mailboxes') THEN
    CREATE POLICY service_role_mailboxes ON mailora.mailboxes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mailora' AND policyname='service_role_email_messages') THEN
    CREATE POLICY service_role_email_messages ON mailora.email_messages FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mailora' AND policyname='service_role_documents') THEN
    CREATE POLICY service_role_documents ON mailora.documents FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mailora' AND policyname='service_role_ocr_results') THEN
    CREATE POLICY service_role_ocr_results ON mailora.ocr_results FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mailora' AND policyname='service_role_processing_jobs') THEN
    CREATE POLICY service_role_processing_jobs ON mailora.processing_jobs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mailora' AND policyname='service_role_audit_logs') THEN
    CREATE POLICY service_role_audit_logs ON mailora.audit_logs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE); END IF;
END $$;


-- =============================================================================
-- 9. GRANTS
-- =============================================================================

GRANT USAGE ON SCHEMA mailora TO postgres, service_role, anon, authenticated;
GRANT ALL   ON ALL TABLES    IN SCHEMA mailora TO postgres, service_role;
GRANT SELECT ON ALL TABLES   IN SCHEMA mailora TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA mailora TO postgres, service_role;

-- Sequence grants (for audit_logs BIGSERIAL)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mailora TO postgres, service_role;


-- =============================================================================
-- 10. VERIFICATION
-- =============================================================================

SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'mailora'
ORDER BY tablename;
