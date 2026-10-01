"""
Mailora IMAP Worker - Configuration
====================================
All mailbox credentials and pipeline settings.
Edit this file to add/remove mailboxes.
"""
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ─── Database (Supabase) ─────────────────────────────────────────────────────
DATABASE_URL = "postgresql://postgres:AivioSathus!321@db.arkoolfygfqawyvwnldv.supabase.co:5432/postgres"

# ─── Backblaze B2 ────────────────────────────────────────────────────────────
B2_KEY_ID      = os.getenv("B2_KEY_ID",      "008e0d1d842b")
B2_APP_KEY     = os.getenv("B2_APP_KEY",     "0030f1320724707dc33f380426ddf3371c3fedb37a")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "sathus-pay2pay")

# ─── IMAP Server ─────────────────────────────────────────────────────────────
IMAP_HOST = "mail.pay2pay.in"
IMAP_PORT = 993
IMAP_SSL  = True

# ─── Mailbox Credentials ─────────────────────────────────────────────────────
# Format: (email_address, password, tenant_ref_id)
MAILBOXES = [
    # Pay2Pay mailboxes
    ("admin@pay2pay.in",   "Pay2PayAdmin2026!",   "PAY2PAY"),
    ("tech@pay2pay.in",    "Pay2PayTech2026!",    "PAY2PAY"),
    ("support@pay2pay.in", "Pay2PaySupport2026!", "PAY2PAY"),
    # Sathus mailboxes
    ("admin@sathus.in",   "SathusAdmin2026!",   "SATHUS"),
    ("tech@sathus.in",    "SathusTech2026!",    "SATHUS"),
    ("support@sathus.in", "SathusSupport2026!", "SATHUS"),
    ("sm@sathus.in",      "SathusSm2026!",      "SATHUS"),
    ("vino@sathus.in",    "SathusVino2026!",    "SATHUS"),
]

# ─── OCR Settings ────────────────────────────────────────────────────────────
OCR_ENGINE          = "tesseract"          # "tesseract" or "paddle"
OCR_LANGUAGE        = "eng"               # Tesseract language code
OCR_DPI             = 300                 # DPI for PDF-to-image conversion
MAX_OCR_RETRIES     = 3                   # Maximum retry attempts per document
MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024    # 25MB max attachment size

# ─── Pipeline Behaviour ───────────────────────────────────────────────────────
# "archive"  → move to INBOX/Processed after success
# "delete"   → permanently delete from IMAP after success
EMAIL_POST_PROCESS_ACTION = "archive"
INBOX_FOLDER              = "INBOX"
PROCESSED_FOLDER          = "Processed"
FAILED_FOLDER             = "Failed"

# Supported MIME types for OCR processing
OCR_SUPPORTED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/gif",
    "image/webp",
}

# ─── Worker Settings ──────────────────────────────────────────────────────────
POLL_INTERVAL_SECONDS = 60     # How often to poll each mailbox
LOG_LEVEL             = "INFO"
WORKER_NODE           = os.uname().nodename if hasattr(os, 'uname') else "ocr-worker-01"
