import asyncio
import logging
from app.core.database import AsyncSessionLocal
from app.application.enterprise_payout_execution_service import EnterprisePayoutExecutionService

logger = logging.getLogger(__name__)

async def run_payout_status_poller(interval_seconds: int = 60):
    """
    Background worker process polling pending/processing payouts every interval_seconds.
    """
    logger.info(f"Starting Enterprise Payout Status Poller loop (interval: {interval_seconds}s)")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                res = await EnterprisePayoutExecutionService.reconcile_pending_transactions(db)
                if res.get("total_reconciled", 0) > 0:
                    logger.info(f"Payout Poller reconciled {res}")
        except Exception as e:
            logger.error(f"Error in Payout Status Poller loop: {e}", exc_info=True)
        await asyncio.sleep(interval_seconds)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_payout_status_poller())
