"""
UrbanRupee Automated 5-Minute Status Polling Background Task.
Polls status for all pending payouts every 5 minutes (300 seconds),
conditional on UrbanRupee priority being configured as 1.
"""

import asyncio
import logging
from app.application.urbanrupee_status_poller_service import UrbanRupeeStatusPollerService

logger = logging.getLogger("urbanrupee_scheduler")


async def background_urbanrupee_status_poller(interval_seconds: int = 300):
    """
    Background worker process executing every 5 minutes (300s).
    Automatically checks if UrbanRupee priority is 1:
    - If priority is 1: polls pending transactions from public.view_pending_payout_transactions,
      updates status, and automatically reverses wallet balance to the retailer if failed.
    - If not priority 1: skips execution until next cycle.
    """
    logger.info(f"[URBANRUPEE SCHEDULER] Started background status poller task (Interval: {interval_seconds}s / 5 min)")

    # Initial warm-up delay after app startup
    await asyncio.sleep(15)

    while True:
        try:
            logger.info("[URBANRUPEE SCHEDULER] Initiating scheduled 5-minute status polling cycle...")
            report = await UrbanRupeeStatusPollerService.run_poller_cycle(max_records=50)

            if report.get("status") == "SKIPPED":
                logger.info(f"[URBANRUPEE SCHEDULER] Cycle skipped: {report.get('message')}")
            else:
                logger.info(
                    f"[URBANRUPEE SCHEDULER] Cycle completed: Checked: {report.get('total_checked')}, "
                    f"Success: {report.get('success_count')}, Failed/Reversed: {report.get('failed_count')}, "
                    f"Pending: {report.get('pending_count')}"
                )

        except asyncio.CancelledError:
            logger.info("[URBANRUPEE SCHEDULER] Background status poller cancelled. Shutting down gracefully.")
            break
        except Exception as e:
            logger.error(f"[URBANRUPEE SCHEDULER] Error during status polling cycle: {e}", exc_info=True)

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("[URBANRUPEE SCHEDULER] Background status poller sleep cancelled.")
            break
