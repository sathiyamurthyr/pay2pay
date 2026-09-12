import asyncio
import logging
from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

from sqlalchemy import text
from app.core.database import AsyncSessionLocal

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


async def has_batch_run_for_date(statement_date) -> bool:
    """Checks the database to see if the statement batch was already executed for the target date."""
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                text("SELECT count(*) FROM public.daily_account_statement_log WHERE statement_date = :dt AND statement_type = 'ADMIN';"),
                {"dt": statement_date}
            )
            count = res.scalar() or 0
            return count > 0
    except Exception as ex:
        print(f"[STATEMENT SCHEDULER WARNING] Error checking DB for previous statement run: {ex}")
        return False


async def background_daily_statement_scheduler():
    """
    Periodic background daemon checking time every 30 seconds.
    Triggers statement generation for all active retailers and Admin at 03:00 AM IST.
    Window: 03:00 AM to 03:30 AM IST.
    """
    global _last_scheduled_run_date
    print(f"[{get_ist_now().strftime('%Y-%m-%d %H:%M:%S IST')}] [STATEMENT SCHEDULER] Daily 3:00 AM statement job scheduler started.")

    while True:
        try:
            await asyncio.sleep(30)

            now_ist = get_ist_now()
            today_str = now_ist.strftime("%Y-%m-%d")

            # Check if it is within the 03:00 AM - 03:30 AM IST window
            if now_ist.hour == 3 and now_ist.minute < 30 and _last_scheduled_run_date != today_str:
                statement_date = now_ist.date() - timedelta(days=1)

                # Verify against database so worker restarts or concurrent workers never duplicate
                already_run = await has_batch_run_for_date(statement_date)
                if already_run:
                    _last_scheduled_run_date = today_str
                    print(f"[{now_ist.strftime('%Y-%m-%d %H:%M:%S IST')}] [STATEMENT SCHEDULER] Statement batch for {statement_date} already exists in DB. Marking today as complete.")
                    continue

                from app.application.daily_statement_service import DailyAccountStatementService

                print(f"[{now_ist.strftime('%Y-%m-%d %H:%M:%S IST')}] [STATEMENT SCHEDULER] Triggering 03:00 AM statement batch for previous day {statement_date}")

                try:
                    # Mark immediately to prevent race condition across loop iterations
                    _last_scheduled_run_date = today_str

                    stats = await DailyAccountStatementService.execute_daily_statement_job(
                        statement_date=statement_date,
                        company_id=None,
                        force_regenerate=False
                    )
                    print(f"[{now_ist.strftime('%Y-%m-%d %H:%M:%S IST')}] [STATEMENT SCHEDULER SUCCESS] Batch finished for {statement_date}: Processed {stats.get('retailers_processed')} retailers, Delivered {stats.get('retailers_delivered')}, Admin: {stats.get('admin_statement_status')}")
                except Exception as batch_err:
                    print(f"[{now_ist.strftime('%Y-%m-%d %H:%M:%S IST')}] [STATEMENT SCHEDULER ERROR] Failed batch execution: {batch_err}")

        except asyncio.CancelledError:
            print("[STATEMENT SCHEDULER] Scheduler task cancelled.")
            break
        except Exception as ex:
            print(f"[STATEMENT SCHEDULER ERROR] Loop exception: {ex}")
            await asyncio.sleep(60)
