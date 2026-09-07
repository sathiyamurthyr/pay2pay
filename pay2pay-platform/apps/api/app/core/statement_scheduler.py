"""
Daily Automatic Statement Scheduler
====================================
Background worker that triggers daily statement generation and email dispatch
at 03:00 AM IST (Indian Standard Time) for the previous business day.
Ensures duplicate protection, reconciliation checks, and audit logging.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

logger = logging.getLogger("statement_scheduler")

_last_scheduled_run_date = None


def get_ist_now() -> datetime:
    """Returns the current datetime in Indian Standard Time (UTC+05:30)."""
    if ZoneInfo:
        try:
            return datetime.now(ZoneInfo("Asia/Kolkata"))
        except Exception:
            pass
    # Fallback to fixed UTC offset +05:30
    return datetime.now(timezone(timedelta(hours=5, minutes=30)))


async def background_daily_statement_scheduler():
    """
    Periodic background daemon checking time every 30 seconds.
    Triggers statement generation for all active retailers and Admin at 03:00 AM IST.
    """
    global _last_scheduled_run_date
    logger.info("[STATEMENT SCHEDULER] Daily 3:00 AM statement job scheduler started.")

    while True:
        try:
            await asyncio.sleep(30)

            now_ist = get_ist_now()
            today_str = now_ist.strftime("%Y-%m-%d")

            # Check if it is 03:00 AM (03:00 - 03:02 window) and not yet run for today
            if now_ist.hour == 3 and now_ist.minute in (0, 1, 2) and _last_scheduled_run_date != today_str:
                from app.application.daily_statement_service import DailyAccountStatementService

                statement_date = now_ist.date() - timedelta(days=1)
                logger.info(f"[STATEMENT SCHEDULER] Triggering 03:00 AM statement batch for previous day {statement_date}")

                try:
                    stats = await DailyAccountStatementService.execute_daily_statement_job(
                        statement_date=statement_date,
                        force_regenerate=False
                    )
                    _last_scheduled_run_date = today_str
                    logger.info(f"[STATEMENT SCHEDULER SUCCESS] Batch finished for {statement_date}: {stats}")
                except Exception as batch_err:
                    logger.error(f"[STATEMENT SCHEDULER ERROR] Failed batch execution: {batch_err}")

        except asyncio.CancelledError:
            logger.info("[STATEMENT SCHEDULER] Scheduler task cancelled.")
            break
        except Exception as ex:
            logger.error(f"[STATEMENT SCHEDULER ERROR] Loop exception: {ex}")
            await asyncio.sleep(60)
