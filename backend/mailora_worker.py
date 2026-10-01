"""
Mailora Worker - Main Entry Point
===================================
Polls all configured mailboxes on a schedule, runs the full
IMAP → DB → B2 → OCR → B2 → DB → IMAP pipeline.

Usage:
  # Run continuously (polls every POLL_INTERVAL_SECONDS):
  python mailora_worker.py

  # Run once and exit (good for cron/systemd oneshot):
  python mailora_worker.py --once

  # Process a specific tenant only:
  python mailora_worker.py --tenant PAY2PAY

  # Dry-run: fetch emails but do NOT upload to B2 or write to DB:
  python mailora_worker.py --dry-run --once
"""
import argparse
import signal
import sys
import time
import traceback
from datetime import datetime

# ── Ensure parent dir is on path when run as a script ────────────────────────
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mailora import config as cfg
from mailora.b2_client import B2Client
from mailora.db import MailoraDB
from mailora.imap_fetcher import ImapFetcher
from mailora.logger import get_logger
from mailora.ocr_engine import OcrEngine
from mailora.pipeline import PipelineProcessor

log = get_logger("mailora.worker")

# ── Graceful shutdown flag ────────────────────────────────────────────────────
_running = True


def _handle_signal(sig, frame):
    global _running
    log.info(f"Signal {sig} received — shutting down after current poll cycle...")
    _running = False


signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


def process_mailbox(
    db: MailoraDB,
    b2: B2Client,
    ocr: OcrEngine,
    email_address: str,
    password: str,
    tenant_ref_id: str,
    dry_run: bool = False,
) -> dict:
    """
    Poll one mailbox and process all unseen emails.
    Returns a stats dict: {fetched, processed, skipped, failed}
    """
    stats = {"fetched": 0, "processed": 0, "skipped": 0, "failed": 0}

    imap = ImapFetcher(
        host=cfg.IMAP_HOST,
        port=cfg.IMAP_PORT,
        use_ssl=cfg.IMAP_SSL,
        email_address=email_address,
        password=password,
        inbox_folder=cfg.INBOX_FOLDER,
        processed_folder=cfg.PROCESSED_FOLDER,
        failed_folder=cfg.FAILED_FOLDER,
        max_attachment_size=cfg.MAX_ATTACHMENT_SIZE,
        supported_types=cfg.OCR_SUPPORTED_TYPES,
    )

    if not imap.connect():
        log.error(f"Skipping {email_address} — IMAP connection failed")
        return stats

    try:
        emails = imap.fetch_unseen()
        stats["fetched"] = len(emails)

        if not emails:
            db.update_mailbox_polled(email_address)
            return stats

        if dry_run:
            log.info(f"  [DRY-RUN] Would process {len(emails)} email(s) from {email_address}")
            for e in emails:
                log.info(f"    - {e.subject[:60]} | attachments={e.attachment_count}")
            stats["skipped"] = len(emails)
            return stats

        processor = PipelineProcessor(
            db=db,
            b2=b2,
            ocr=ocr,
            imap=imap,
            tenant_ref_id=tenant_ref_id,
            mailbox_email=email_address,
            post_process_action=cfg.EMAIL_POST_PROCESS_ACTION,
            processed_folder=cfg.PROCESSED_FOLDER,
            failed_folder=cfg.FAILED_FOLDER,
            worker_node=cfg.WORKER_NODE,
        )

        for fetched_email in emails:
            try:
                ok = processor.run(fetched_email)
                if ok:
                    stats["processed"] += 1
                else:
                    stats["failed"] += 1
            except Exception as e:
                log.error(f"  Unexpected error processing email: {e}")
                log.debug(traceback.format_exc())
                stats["failed"] += 1

        db.update_mailbox_polled(email_address)

    finally:
        imap.disconnect()

    return stats


def run_poll_cycle(
    db: MailoraDB,
    b2: B2Client,
    ocr: OcrEngine,
    tenant_filter: str = None,
    dry_run: bool = False,
) -> dict:
    """
    Poll all configured mailboxes in sequence.
    Returns aggregate stats.
    """
    total = {"fetched": 0, "processed": 0, "skipped": 0, "failed": 0}
    cycle_start = datetime.utcnow()

    log.info("=" * 60)
    log.info(f"Poll cycle started: {cycle_start.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    if dry_run:
        log.info("DRY-RUN MODE — no DB writes, no B2 uploads")
    log.info("=" * 60)

    for email_address, password, tenant_ref_id in cfg.MAILBOXES:
        if tenant_filter and tenant_ref_id != tenant_filter.upper():
            continue

        log.info(f"\nMailbox: {email_address} [{tenant_ref_id}]")
        try:
            stats = process_mailbox(
                db=db,
                b2=b2,
                ocr=ocr,
                email_address=email_address,
                password=password,
                tenant_ref_id=tenant_ref_id,
                dry_run=dry_run,
            )
            for k in total:
                total[k] += stats[k]

            log.info(
                f"  Done: fetched={stats['fetched']} "
                f"processed={stats['processed']} "
                f"skipped={stats['skipped']} "
                f"failed={stats['failed']}"
            )
        except Exception as e:
            log.error(f"  Mailbox {email_address} raised: {e}")
            log.debug(traceback.format_exc())

    elapsed = (datetime.utcnow() - cycle_start).total_seconds()
    log.info("\n" + "=" * 60)
    log.info(
        f"Cycle complete in {elapsed:.1f}s | "
        f"Fetched={total['fetched']} "
        f"Processed={total['processed']} "
        f"Skipped={total['skipped']} "
        f"Failed={total['failed']}"
    )
    log.info("=" * 60)
    return total


def main():
    parser = argparse.ArgumentParser(description="Mailora IMAP-to-OCR pipeline worker")
    parser.add_argument("--once",    action="store_true", help="Run one poll cycle and exit")
    parser.add_argument("--dry-run", action="store_true", help="Fetch only, no writes")
    parser.add_argument("--tenant",  type=str, default=None, help="Process only this tenant (PAY2PAY|SATHUS)")
    args = parser.parse_args()

    log.info("Mailora Worker starting...")
    log.info(f"  IMAP host:    {cfg.IMAP_HOST}:{cfg.IMAP_PORT} ssl={cfg.IMAP_SSL}")
    log.info(f"  B2 bucket:    {cfg.B2_BUCKET_NAME}")
    log.info(f"  OCR engine:   {cfg.OCR_ENGINE} lang={cfg.OCR_LANGUAGE}")
    log.info(f"  Poll interval:{cfg.POLL_INTERVAL_SECONDS}s")
    log.info(f"  Post-process: {cfg.EMAIL_POST_PROCESS_ACTION}")
    log.info(f"  Mailboxes:    {len(cfg.MAILBOXES)}")

    # ── Initialise shared clients ─────────────────────────────────────────────
    db = MailoraDB(cfg.DATABASE_URL)
    db.connect()

    b2 = B2Client(cfg.B2_KEY_ID, cfg.B2_APP_KEY, cfg.B2_BUCKET_NAME)
    if not args.dry_run:
        b2.connect()

    ocr = OcrEngine(
        engine=cfg.OCR_ENGINE,
        language=cfg.OCR_LANGUAGE,
        dpi=cfg.OCR_DPI,
    )

    # ── Main loop ─────────────────────────────────────────────────────────────
    try:
        if args.once:
            run_poll_cycle(
                db=db, b2=b2, ocr=ocr,
                tenant_filter=args.tenant,
                dry_run=args.dry_run,
            )
        else:
            log.info("Running continuously. Press Ctrl+C to stop.")
            while _running:
                run_poll_cycle(
                    db=db, b2=b2, ocr=ocr,
                    tenant_filter=args.tenant,
                    dry_run=args.dry_run,
                )
                if _running:
                    log.info(f"Next poll in {cfg.POLL_INTERVAL_SECONDS}s...")
                    for _ in range(cfg.POLL_INTERVAL_SECONDS):
                        if not _running:
                            break
                        time.sleep(1)

    except KeyboardInterrupt:
        log.info("Interrupted by user")
    finally:
        db.close()
        log.info("Mailora Worker stopped.")


if __name__ == "__main__":
    main()
