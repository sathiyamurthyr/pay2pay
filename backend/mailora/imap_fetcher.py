"""
Mailora - IMAP Fetcher
=======================
Connects to a mailbox, reads unseen emails, extracts attachments,
and moves/deletes messages after processing.
"""
import email
import email.utils
import imaplib
import ssl
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Tuple

from mailora.logger import get_logger

log = get_logger("mailora.imap")


@dataclass
class Attachment:
    filename: str
    content_type: str
    data: bytes
    size: int = 0

    def __post_init__(self):
        self.size = len(self.data)


@dataclass
class FetchedEmail:
    imap_uid: int
    message_id: str
    sender: str
    recipient: str
    subject: str
    body_preview: str
    received_at: datetime
    raw_size_bytes: int
    attachments: List[Attachment] = field(default_factory=list)

    @property
    def has_attachments(self) -> bool:
        return len(self.attachments) > 0

    @property
    def attachment_count(self) -> int:
        return len(self.attachments)


class ImapFetcher:
    """
    Connects to an IMAP mailbox, reads new emails, extracts attachments.
    """

    def __init__(
        self,
        host: str,
        port: int,
        use_ssl: bool,
        email_address: str,
        password: str,
        inbox_folder: str = "INBOX",
        processed_folder: str = "Processed",
        failed_folder: str = "Failed",
        max_attachment_size: int = 25 * 1024 * 1024,
        supported_types: Optional[set] = None,
    ):
        self.host = host
        self.port = port
        self.use_ssl = use_ssl
        self.email_address = email_address
        self.password = password
        self.inbox_folder = inbox_folder
        self.processed_folder = processed_folder
        self.failed_folder = failed_folder
        self.max_attachment_size = max_attachment_size
        self.supported_types = supported_types or {
            "application/pdf",
            "image/jpeg", "image/jpg", "image/png",
            "image/tiff", "image/bmp",
        }
        self._imap: Optional[imaplib.IMAP4_SSL] = None

    # ─── Connection ───────────────────────────────────────────────────────────

    def connect(self) -> bool:
        """Open IMAP connection and authenticate."""
        try:
            if self.use_ssl:
                ctx = ssl.create_default_context()
                self._imap = imaplib.IMAP4_SSL(self.host, self.port, ssl_context=ctx)
            else:
                self._imap = imaplib.IMAP4(self.host, self.port)

            self._imap.login(self.email_address, self.password)
            log.debug(f"IMAP connected: {self.email_address}")
            return True
        except Exception as e:
            log.error(f"IMAP connect failed for {self.email_address}: {e}")
            return False

    def disconnect(self):
        """Safely close the IMAP connection."""
        if self._imap:
            try:
                self._imap.logout()
            except Exception:
                pass
            self._imap = None

    def _ensure_folder(self, folder: str):
        """Create folder if it doesn't exist (IMAP CREATE)."""
        try:
            res, _ = self._imap.select(folder)
            if res != "OK":
                self._imap.create(folder)
                log.info(f"  Created IMAP folder: {folder}")
        except Exception as e:
            log.warning(f"  Could not create folder {folder}: {e}")

    # ─── Fetch ────────────────────────────────────────────────────────────────

    def fetch_unseen(self) -> List[FetchedEmail]:
        """
        Select INBOX, search for UNSEEN messages, parse each one.
        Returns a list of FetchedEmail objects with decoded attachments.
        """
        emails: List[FetchedEmail] = []

        try:
            status, _ = self._imap.select(self.inbox_folder)
            if status != "OK":
                log.error(f"Cannot SELECT {self.inbox_folder} for {self.email_address}")
                return emails

            status, data = self._imap.uid("SEARCH", None, "UNSEEN")
            if status != "OK":
                return emails

            uid_list = data[0].decode().split()
            if not uid_list:
                log.debug(f"  No new messages in {self.email_address}")
                return emails

            log.info(f"  {len(uid_list)} new message(s) in {self.email_address}")

            for uid_str in uid_list:
                try:
                    fetched = self._fetch_single(int(uid_str))
                    if fetched:
                        emails.append(fetched)
                except Exception as e:
                    log.error(f"  Failed to parse UID={uid_str}: {e}")

        except Exception as e:
            log.error(f"fetch_unseen failed for {self.email_address}: {e}")

        return emails

    def _fetch_single(self, uid: int) -> Optional[FetchedEmail]:
        """Fetch and parse a single email by IMAP UID."""
        status, data = self._imap.uid("FETCH", str(uid), "(RFC822 RFC822.SIZE)")
        if status != "OK" or not data:
            return None

        # Extract raw bytes and size
        raw_bytes = None
        raw_size = 0
        for part in data:
            if isinstance(part, tuple):
                raw_bytes = part[1]
                # Try to extract size from the response header line
                header_line = part[0].decode("utf-8", errors="replace")
                if "RFC822.SIZE" in header_line:
                    try:
                        idx = header_line.index("RFC822.SIZE") + len("RFC822.SIZE ")
                        raw_size = int(header_line[idx:].split()[0].rstrip(")"))
                    except Exception:
                        raw_size = len(raw_bytes) if raw_bytes else 0

        if not raw_bytes:
            return None

        msg = email.message_from_bytes(raw_bytes)

        # Parse headers
        message_id = msg.get("Message-ID", f"<generated-{uid}@{self.email_address}>").strip()
        sender = msg.get("From", "unknown@unknown.com")
        recipient = msg.get("To", self.email_address)
        subject = msg.get("Subject", "(No Subject)")
        date_str = msg.get("Date", "")

        # Decode RFC2047 encoded subject/sender
        try:
            from email.header import decode_header
            decoded_parts = decode_header(subject)
            subject = "".join(
                part.decode(enc or "utf-8") if isinstance(part, bytes) else part
                for part, enc in decoded_parts
            )
        except Exception:
            pass

        # Parse received_at
        try:
            received_at = datetime(*email.utils.parsedate(date_str)[:6]) if date_str else datetime.utcnow()
        except Exception:
            received_at = datetime.utcnow()

        # Extract body preview (plain text)
        body_preview = ""
        attachments: List[Attachment] = []

        for part in msg.walk():
            ct = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))

            # Body text (first 500 chars)
            if ct == "text/plain" and "attachment" not in disposition and not body_preview:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    body_preview = (part.get_payload(decode=True) or b"").decode(charset, errors="replace")[:500]
                except Exception:
                    pass

            # Attachments
            elif "attachment" in disposition or ct in self.supported_types:
                filename = part.get_filename() or f"attachment.{ct.split('/')[-1]}"
                try:
                    payload = part.get_payload(decode=True)
                    if payload and len(payload) <= self.max_attachment_size:
                        if ct in self.supported_types:
                            attachments.append(Attachment(
                                filename=filename,
                                content_type=ct,
                                data=payload,
                            ))
                            log.debug(f"    Attachment: {filename} ({len(payload):,} bytes) [{ct}]")
                        else:
                            log.debug(f"    Skipped unsupported type: {filename} [{ct}]")
                    elif payload:
                        log.warning(f"    Attachment too large (>{self.max_attachment_size//1024//1024}MB): {filename}")
                except Exception as e:
                    log.warning(f"    Failed to extract attachment {filename}: {e}")

        return FetchedEmail(
            imap_uid=uid,
            message_id=message_id,
            sender=sender,
            recipient=recipient,
            subject=subject,
            body_preview=body_preview.strip(),
            received_at=received_at,
            raw_size_bytes=raw_size or len(raw_bytes),
            attachments=attachments,
        )

    # ─── Post-processing actions ──────────────────────────────────────────────

    def mark_seen(self, uid: int):
        r"""Mark message as \Seen (Read)."""
        try:
            self._imap.uid("STORE", str(uid), "+FLAGS", "\\Seen")
        except Exception as e:
            log.warning(f"  mark_seen failed for UID={uid}: {e}")

    def move_to_folder(self, uid: int, target_folder: str) -> bool:
        """
        Move a message to a target folder.
        Ensures folder exists first, then COPY + DELETE + EXPUNGE.
        """
        try:
            self._ensure_folder(target_folder)
            # Re-select INBOX to make sure we're in the right context
            self._imap.select(self.inbox_folder)
            # COPY to target
            status, _ = self._imap.uid("COPY", str(uid), target_folder)
            if status != "OK":
                log.error(f"  IMAP COPY failed for UID={uid} -> {target_folder}")
                return False
            # Delete original
            self._imap.uid("STORE", str(uid), "+FLAGS", "\\Deleted")
            self._imap.expunge()
            log.debug(f"  Moved UID={uid} to {target_folder}")
            return True
        except Exception as e:
            log.error(f"  move_to_folder failed UID={uid} -> {target_folder}: {e}")
            return False

    def delete_message(self, uid: int) -> bool:
        """Permanently delete a message from INBOX."""
        try:
            self._imap.select(self.inbox_folder)
            self._imap.uid("STORE", str(uid), "+FLAGS", "\\Deleted")
            self._imap.expunge()
            log.debug(f"  Deleted UID={uid}")
            return True
        except Exception as e:
            log.error(f"  delete_message failed UID={uid}: {e}")
            return False
