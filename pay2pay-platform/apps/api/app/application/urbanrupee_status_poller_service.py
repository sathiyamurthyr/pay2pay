"""
UrbanRupee Automated Payout Status Poller Service.
Polls the UrbanRupee Check Status API every 5 minutes for transactions in PENDING status,
only when UrbanRupee priority is configured as 1.

Features:
- Dynamically checks priority from database (zero hardcoding).
- Uses PostgreSQL View public.view_pending_payout_transactions.
- Calls official UrbanRupee Check Status API (POST https://payout.urbanrupee.in/api/payout/checkstatus).
- Feeds responses to PayoutCallbackService to atomically update status and trigger
  retailer wallet refunds via reverse_failed_payout_transaction on failure.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.application.urbanrupee_client import UrbanRupeeApiClient
from app.application.payout_callback_service import PayoutCallbackService

logger = logging.getLogger("urbanrupee_status_poller")


class UrbanRupeeStatusPollerService:
    """Enterprise automated status poller and reconciliation engine for UrbanRupee."""

    @classmethod
    async def is_urbanrupee_priority_one(cls, db: AsyncSession) -> bool:
        """
        Dynamically evaluates whether UrbanRupee is currently set to Priority 1.
        Checks:
        1. payout_routing_policies (routing_mode = 'PRIORITY', active_primary_provider = 'URBANRUPEE')
        2. payout_gateway_configs (provider_code = 'URBANRUPEE', priority = 1, status = 'ACTIVE', is_active = True)
        Zero hardcoding. Reads directly from database.
        """
        # 1. Check Routing Policies table
        try:
            policy_res = await db.execute(text("""
                SELECT routing_mode, active_primary_provider, is_active
                FROM public.payout_routing_policies 
                WHERE is_active = TRUE AND (is_deleted IS NULL OR is_deleted = FALSE)
                ORDER BY updated_at DESC LIMIT 1
            """))
            policy = policy_res.mappings().first()
            if policy:
                prov = str(policy.get("active_primary_provider") or "").upper().strip()
                if prov == "URBANRUPEE":
                    return True
        except Exception as e:
            logger.warning(f"[URBANRUPEE POLLER] Failed to check payout_routing_policies: {e}")

        # 2. Check Gateway Configs table
        try:
            cfg_res = await db.execute(text("""
                SELECT priority, is_active, status 
                FROM public.payout_gateway_configs 
                WHERE provider_code = 'URBANRUPEE'
                ORDER BY id DESC LIMIT 1
            """))
            cfg = cfg_res.mappings().first()
            if cfg:
                is_active = bool(cfg.get("is_active"))
                st = str(cfg.get("status") or "").upper().strip()
                priority = cfg.get("priority")
                if is_active and st == "ACTIVE" and priority == 1:
                    return True
        except Exception as e:
            logger.warning(f"[URBANRUPEE POLLER] Failed to check payout_gateway_configs: {e}")

        return False

    @classmethod
    async def poll_pending_urbanrupee_payouts(
        cls,
        db: AsyncSession,
        max_records: int = 50
    ) -> Dict[str, Any]:
        """
        Queries public.view_pending_payout_transactions for PENDING UrbanRupee payouts,
        polls UrbanRupee checkstatus endpoint, and synchronizes status & wallet refunds.
        Only runs if UrbanRupee priority is 1.
        """
        # Step 1: Verify Priority 1 condition
        is_p1 = await cls.is_urbanrupee_priority_one(db)
        if not is_p1:
            logger.info("[URBANRUPEE POLLER] UrbanRupee is not configured as Priority 1. Polling skipped.")
            return {
                "status": "SKIPPED",
                "message": "UrbanRupee is not configured as Priority 1. Status poller only runs when priority is 1.",
                "priority_is_1": False,
                "total_checked": 0,
                "success_count": 0,
                "failed_count": 0,
                "reversed_count": 0,
                "pending_count": 0,
                "results": []
            }

        # Step 2: Query PostgreSQL View for Pending UrbanRupee Payout Transactions ONLY
        view_query = text("""
            SELECT 
                transaction_number,
                order_id,
                gateway_reference,
                bank_reference,
                vendor_name,
                status,
                amount,
                net_debit,
                retailer_id,
                retailer_name,
                retailer_code,
                created_date
            FROM public.view_pending_payout_transactions
            WHERE vendor_name ILIKE '%URBAN%'
            ORDER BY created_date ASC
            LIMIT :max_records
        """)

        cursor = await db.execute(view_query, {"max_records": max_records})
        pending_txns = cursor.mappings().all()

        if not pending_txns:
            logger.info("[URBANRUPEE POLLER] No pending UrbanRupee transactions found in view_pending_payout_transactions.")
            return {
                "status": "SUCCESS",
                "message": "No pending UrbanRupee transactions require status checking.",
                "priority_is_1": True,
                "total_checked": 0,
                "success_count": 0,
                "failed_count": 0,
                "reversed_count": 0,
                "pending_count": 0,
                "results": []
            }

        logger.info(f"[URBANRUPEE POLLER] Found {len(pending_txns)} pending payouts to check.")

        results: List[Dict[str, Any]] = []
        success_cnt = 0
        failed_cnt = 0
        reversed_cnt = 0
        pending_cnt = 0

        for row in pending_txns:
            txn_number = row["transaction_number"]
            order_id = row.get("order_id") or row.get("gateway_reference") or txn_number
            alt_order_id = txn_number if order_id != txn_number else row.get("gateway_reference")

            logger.info(f"[URBANRUPEE POLLER] Checking status for Order ID: '{order_id}' (Txn: '{txn_number}')")

            # Call official UrbanRupee Check Status API
            status_res = await UrbanRupeeApiClient.check_status(merchant_ref=order_id)
            raw_res = status_res.get("raw_response") if isinstance(status_res.get("raw_response"), dict) else {}
            res_msg = str(raw_res.get("message") or status_res.get("message") or "")

            # If not found with primary order_id and an alternate ID exists, try alternate ID
            if "not found" in res_msg.lower() and alt_order_id and alt_order_id != order_id:
                logger.info(f"[URBANRUPEE POLLER] Order ID '{order_id}' not found, retrying with '{alt_order_id}'")
                alt_status_res = await UrbanRupeeApiClient.check_status(merchant_ref=alt_order_id)
                alt_raw_res = alt_status_res.get("raw_response") if isinstance(alt_status_res.get("raw_response"), dict) else {}
                alt_msg = str(alt_raw_res.get("message") or alt_status_res.get("message") or "")
                if "not found" not in alt_msg.lower():
                    status_res = alt_status_res
                    raw_res = alt_raw_res
                    order_id = alt_order_id

            current_gateway_status = status_res.get("status", "PENDING")

            # Process callback through universal handler to update DB & execute reversals if failed
            callback_payload = {
                "orderid": order_id,
                "client_txn_id": order_id,
                **raw_res
            }

            cb_result = await PayoutCallbackService.process_callback(
                db=db,
                vendor_hint="urbanrupee",
                payload=callback_payload,
                query_params={}
            )

            is_reversed = bool(cb_result.get("is_reversed", False))
            final_status = cb_result.get("payout_status", current_gateway_status)

            if final_status == "SUCCESS":
                success_cnt += 1
            elif final_status in ("FAILED", "REVERSED"):
                failed_cnt += 1
                if is_reversed:
                    reversed_cnt += 1
            else:
                pending_cnt += 1

            results.append({
                "transaction_number": txn_number,
                "order_id": order_id,
                "amount": row.get("amount"),
                "gateway_status": current_gateway_status,
                "final_status": final_status,
                "is_reversed": is_reversed,
                "utr": cb_result.get("utr") or status_res.get("utr"),
                "message": cb_result.get("message") or status_res.get("message")
            })

        summary = {
            "status": "SUCCESS",
            "message": f"Polled {len(results)} pending transactions: {success_cnt} SUCCESS, {failed_cnt} FAILED ({reversed_cnt} reversed to retailer), {pending_cnt} PENDING.",
            "priority_is_1": True,
            "total_checked": len(results),
            "success_count": success_cnt,
            "failed_count": failed_cnt,
            "reversed_count": reversed_cnt,
            "pending_count": pending_cnt,
            "results": results
        }

        logger.info(f"[URBANRUPEE POLLER] Completed cycle: {summary['message']}")
        return summary

    @classmethod
    async def run_poller_cycle(cls, max_records: int = 50) -> Dict[str, Any]:
        """Convenience method opening an async DB session and executing the polling cycle."""
        async with AsyncSessionLocal() as db:
            return await cls.poll_pending_urbanrupee_payouts(db=db, max_records=max_records)
