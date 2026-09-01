"""
Universal Enterprise Payout Callback & Webhook Service.
Supports all payout gateway providers:
- BulkPe
- WowPe
- Cashfree
- Razorpay
- Decentro
- Easebuzz
- PayU
- SafeGold
- Eko
- PaySprint
- InstantPay
- Generic CBS / Bank API Gateway
"""

import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.payout_workflow_models import (
    PayoutWorkflowTransactionModel,
    PayoutAuditModel
)
from app.infrastructure.db.enterprise_payout_models import (
    EnterprisePayoutTransactionModel,
    PayoutDoubleEntryLedgerModel,
    PayoutAuditLogModel,
    PayoutTransactionStatus
)
from app.infrastructure.db.models import RetailerWalletModel
from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO

logger = logging.getLogger("payout_callback_service")


class PayoutCallbackService:
    """Universal Webhook & Callback Engine for all Payout Gateways."""

    SUPPORTED_VENDORS = {
        "universal": {
            "name": "Universal Auto-Detect Gateway",
            "path": "/api/v1/payout/callback",
            "description": "Auto-detects payload format across all integrated providers."
        },
        "urbanrupee": {
            "name": "UrbanRupee Payout Gateway",
            "path": "/api/v1/payout/callback/urbanrupee",
            "webhook_path": "/api/v1/payout/webhook/urbanrupee",
            "description": "UrbanRupee official instant payout webhook callback listener."
        },
        "bulkpe": {
            "name": "BulkPe Payout Gateway",
            "path": "/api/v1/payout/callback/bulkpe",
            "webhook_path": "/api/v1/payout/webhook/bulkpe",
            "description": "BulkPe webhook receiver for real-time IMPS/NEFT/RTGS settlement updates."
        },
        "cashfree": {
            "name": "Cashfree Payouts",
            "path": "/api/v1/payout/callback/cashfree",
            "webhook_path": "/api/v1/payout/webhook/cashfree",
            "description": "Cashfree auto-settlement webhook notification receiver."
        },
        "razorpay": {
            "name": "RazorpayX Payouts",
            "path": "/api/v1/payout/callback/razorpay",
            "webhook_path": "/api/v1/payout/webhook/razorpay",
            "description": "RazorpayX payout.processed, payout.failed and payout.reversed webhook listener."
        },
        "decentro": {
            "name": "Decentro Payout Gateway",
            "path": "/api/v1/payout/callback/decentro",
            "webhook_path": "/api/v1/payout/webhook/decentro",
            "description": "Decentro banking API transaction callback receiver."
        },
        "easebuzz": {
            "name": "Easebuzz Wire Payouts",
            "path": "/api/v1/payout/callback/easebuzz",
            "webhook_path": "/api/v1/payout/webhook/easebuzz",
            "description": "Easebuzz wire payout callback URL listener."
        },
        "payu": {
            "name": "PayU Payouts",
            "path": "/api/v1/payout/callback/payu",
            "webhook_path": "/api/v1/payout/webhook/payu",
            "description": "PayU instant settlement payout webhook receiver."
        },
        "safegold": {
            "name": "SafeGold Digital Gold Payout",
            "path": "/api/v1/payout/callback/safegold",
            "webhook_path": "/api/v1/payout/webhook/safegold",
            "description": "SafeGold digital gold redemption and settlement callback."
        },
        "eko": {
            "name": "Eko Connect Payouts",
            "path": "/api/v1/payout/callback/eko",
            "webhook_path": "/api/v1/payout/webhook/eko",
            "description": "Eko money transfer CBS status callback receiver."
        },
        "paysprint": {
            "name": "PaySprint DMR Gateway",
            "path": "/api/v1/payout/callback/paysprint",
            "webhook_path": "/api/v1/payout/webhook/paysprint",
            "description": "PaySprint DMT & Payout callback notification URL."
        },
        "instantpay": {
            "name": "InstantPay Neo Banking",
            "path": "/api/v1/payout/callback/instantpay",
            "webhook_path": "/api/v1/payout/webhook/instantpay",
            "description": "InstantPay enterprise banking payout webhook receiver."
        }
    }

    DEFAULT_BASE_URL = "https://api.pay2pay.in"

    @classmethod
    def get_all_callback_urls(cls, base_url: str = "") -> Dict[str, Any]:
        """Returns the full catalog of webhook & callback URLs for all vendors."""
        clean_base = (base_url.rstrip("/") if base_url and "localhost" not in base_url and "test" not in base_url else cls.DEFAULT_BASE_URL)
        catalog = {}
        for code, info in cls.SUPPORTED_VENDORS.items():
            primary_url = f"{clean_base}{info['path']}"
            wh_url = f"{clean_base}{info.get('webhook_path', info['path'])}"
            catalog[code] = {
                "vendor_code": code,
                "vendor_name": info["name"],
                "description": info["description"],
                "callback_url": primary_url,
                "webhook_url": wh_url,
                "legacy_path": info.get("legacy_path"),
                "supported_methods": ["POST", "GET"] if code in ("universal", "easebuzz", "payu") else ["POST"],
                "expected_events": ["SUCCESS", "FAILED", "PENDING", "REVERSED"]
            }
        return {
            "status": "SUCCESS",
            "base_url": clean_base,
            "universal_callback_url": f"{clean_base}/api/v1/payout/callback",
            "universal_webhook_url": f"{clean_base}/api/v1/payout/webhook",
            "total_vendors_supported": len(catalog),
            "vendors": catalog
        }

    @classmethod
    def normalize_vendor_payload(
        cls,
        vendor_hint: Optional[str],
        payload: Dict[str, Any],
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Normalizes arbitrary vendor callback payloads into a standard internal dictionary:
        - reference_id: client / system order number
        - vendor_tx_id: provider's internal transaction ID
        - status: SUCCESS | FAILED | PENDING | REVERSED
        - utr: Bank UTR / RRN number
        - message: Vendor response message / error
        - raw_payload: Original data dictionary
        """
        merged = {**query_params, **payload}
        v = (vendor_hint or "").lower().strip()

        ref_id = None
        vendor_tx_id = None
        raw_status = None
        utr = None
        message = None

        # 1. UrbanRupee Format
        if v in ("urbanrupee", "urban_rupee", "ur") or "client_txn_id" in merged or ("transaction_id" in merged and "orderid" in merged):
            ref_id = merged.get("client_txn_id") or merged.get("orderid") or merged.get("order_id")
            vendor_tx_id = merged.get("transaction_id") or merged.get("id")
            raw_st = str(merged.get("current_status") or merged.get("status") or "").lower()
            if raw_st == "success":
                raw_status = "SUCCESS"
            elif raw_st in ("failed", "failure", "rejected"):
                raw_status = "FAILED"
            elif raw_st in ("pending", "processing", "initiated", "accepted"):
                raw_status = "PENDING"
            else:
                raw_status = merged.get("status")
            utr = merged.get("utr")
            message = merged.get("message")

        # 2. BulkPe Format
        elif v == "bulkpe" or "data" in merged and ("vendor_tx_id" in merged.get("data", {}) or "bulkpe" in str(merged).lower()):
            data = merged.get("data", {}) if isinstance(merged.get("data"), dict) else {}
            vendor_tx_id = merged.get("vendor_tx_id") or data.get("vendor_tx_id") or merged.get("reference_id")
            ref_id = merged.get("client_order_id") or merged.get("order_id") or data.get("reference_id") or merged.get("reference_number")
            raw_status = merged.get("status") or data.get("status") or merged.get("event")
            utr = merged.get("utr") or data.get("utr") or merged.get("bank_reference")
            message = merged.get("message") or data.get("message")

        # 3. WowPe Format (Legacy compatibility)
        elif v == "wowpe" or "statusCode" in merged or "clientOrderId" in merged:
            ref_id = merged.get("clientOrderId") or merged.get("client_order_id") or merged.get("orderId")
            vendor_tx_id = merged.get("orderId") or merged.get("order_id")
            status_code = str(merged.get("statusCode", ""))
            if status_code == "1" or merged.get("status") == 1 or str(merged.get("status", "")).upper() == "SUCCESS":
                raw_status = "SUCCESS"
            elif status_code in ("0", "4") or merged.get("status") == 0 or str(merged.get("status", "")).upper() in ("FAILED", "FAILURE"):
                raw_status = "FAILED"
            else:
                raw_status = merged.get("status")
            utr = merged.get("utr")
            message = merged.get("message")

        # 3. Cashfree Format
        elif v == "cashfree" or "transferId" in merged or "referenceId" in merged or "subCode" in merged:
            data = merged.get("data", {}) if isinstance(merged.get("data"), dict) else {}
            vendor_tx_id = merged.get("transferId") or data.get("transferId")
            ref_id = merged.get("referenceId") or data.get("referenceId") or merged.get("orderId")
            raw_status = merged.get("status") or data.get("status") or merged.get("event")
            utr = merged.get("utr") or data.get("utr")
            message = merged.get("reason") or merged.get("message") or data.get("reason")

        # 4. RazorpayX Format
        elif v == "razorpay" or "event" in merged and "payout" in str(merged.get("event", "")):
            event = merged.get("event", "")
            payout_entity = merged.get("payload", {}).get("payout", {}).get("entity", {})
            vendor_tx_id = payout_entity.get("id") or merged.get("payout_id")
            ref_id = payout_entity.get("reference_id") or merged.get("reference_id")
            raw_status = payout_entity.get("status") or ("SUCCESS" if "processed" in event else "FAILED" if "failed" in event else "REVERSED" if "reversed" in event else "PENDING")
            utr = payout_entity.get("utr")
            message = payout_entity.get("failure_reason") or payout_entity.get("narration")

        # 5. Decentro Format
        elif v == "decentro" or "decentroTxnId" in merged or "bankReferenceNumber" in merged:
            vendor_tx_id = merged.get("decentroTxnId") or merged.get("transactionId")
            ref_id = merged.get("referenceId") or merged.get("client_id")
            raw_status = merged.get("status") or merged.get("transactionStatus")
            utr = merged.get("bankReferenceNumber") or merged.get("utr")
            message = merged.get("message") or merged.get("responseMessage")

        # 6. Easebuzz Format
        elif v == "easebuzz" or "easepayid" in merged or "txnid" in merged:
            vendor_tx_id = merged.get("easepayid")
            ref_id = merged.get("txnid") or merged.get("transaction_id")
            raw_status = merged.get("status")
            utr = merged.get("bank_ref_num") or merged.get("bank_ref_no") or merged.get("bank_txn_id")
            message = merged.get("error_desc") or merged.get("error_Message") or merged.get("status")

        # 7. PayU Format
        elif v == "payu" or "payuMoneyId" in merged or "mihpayid" in merged:
            vendor_tx_id = merged.get("payuMoneyId") or merged.get("mihpayid")
            ref_id = merged.get("txnid")
            raw_status = merged.get("status")
            utr = merged.get("bank_ref_num") or merged.get("field9")
            message = merged.get("error_Message") or merged.get("unmappedstatus")

        # 8. SafeGold Format
        elif v == "safegold" or "gold_grams" in merged or "partner_txn_id" in merged:
            vendor_tx_id = merged.get("transaction_id") or merged.get("safegold_id")
            ref_id = merged.get("partner_txn_id") or merged.get("txnid")
            raw_status = merged.get("status")
            utr = merged.get("utr") or merged.get("bank_ref_num")
            message = merged.get("message")

        # 9. Generic / Fallback Heuristics
        else:
            ref_id = (
                merged.get("reference_number") or
                merged.get("reference_id") or
                merged.get("client_order_id") or
                merged.get("clientOrderId") or
                merged.get("order_id") or
                merged.get("orderId") or
                merged.get("txnid") or
                merged.get("transaction_number") or
                merged.get("transaction_id") or
                merged.get("transactionId") or
                merged.get("client_ref_id")
            )
            vendor_tx_id = (
                merged.get("vendor_tx_id") or
                merged.get("transfer_id") or
                merged.get("transferId") or
                merged.get("decentroTxnId") or
                merged.get("easepayid") or
                merged.get("payuMoneyId") or
                merged.get("partner_txn_id")
            )
            raw_status = (
                merged.get("status") or
                merged.get("statusCode") or
                merged.get("transaction_status") or
                merged.get("transactionStatus") or
                merged.get("event") or
                merged.get("result")
            )
            utr = (
                merged.get("utr") or
                merged.get("utr_number") or
                merged.get("rrn") or
                merged.get("bank_ref_num") or
                merged.get("bank_reference") or
                merged.get("bankReferenceNumber")
            )
            message = (
                merged.get("message") or
                merged.get("reason") or
                merged.get("error_desc") or
                merged.get("failure_reason")
            )

        # Normalize status string
        normalized_status = "PENDING"
        if raw_status:
            s_up = str(raw_status).upper().strip()
            if s_up in ("SUCCESS", "SUCCESSFUL", "PROCESSED", "PAID", "COMPLETED", "1", "TRUE", "ACCEPTED"):
                normalized_status = "SUCCESS"
            elif s_up in ("FAILED", "FAILURE", "REJECTED", "CANCELLED", "0", "4", "ERROR", "DECLINED"):
                normalized_status = "FAILED"
            elif s_up in ("REVERSED", "REFUNDED", "REVERSAL"):
                normalized_status = "REVERSED"
            elif s_up in ("PENDING", "PROCESSING", "IN_PROCESS", "QUEUED", "INITIATED"):
                normalized_status = "PENDING"

        return {
            "vendor_code": v or "universal",
            "reference_id": str(ref_id).strip() if ref_id is not None else None,
            "vendor_tx_id": str(vendor_tx_id).strip() if vendor_tx_id is not None else None,
            "status": normalized_status,
            "raw_status": raw_status,
            "utr": str(utr).strip() if utr is not None else None,
            "message": str(message) if message else None,
            "raw_payload": merged
        }

    @classmethod
    async def process_callback(
        cls,
        db: AsyncSession,
        vendor_hint: Optional[str],
        payload: Dict[str, Any],
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main processor for incoming payout callbacks:
        1. Normalizes vendor payload
        2. Queries database for matching transaction
        3. Updates transaction state (SUCCESS, FAILED, REVERSED)
        4. Triggers automatic retailer wallet reversal/refund if failed
        5. Writes audit log & commits transaction safely
        """
        normalized = cls.normalize_vendor_payload(vendor_hint, payload, query_params)
        ref_id = normalized["reference_id"]
        vendor_tx_id = normalized["vendor_tx_id"]
        new_status = normalized["status"]
        utr = normalized["utr"]
        message = normalized["message"]
        vendor_code = normalized["vendor_code"]

        logger.info(
            f"[PAYOUT CALLBACK] Vendor: '{vendor_code}' | Ref: '{ref_id}' | VendorTx: '{vendor_tx_id}' | Status: {new_status} | UTR: {utr}"
        )

        if not ref_id and not vendor_tx_id:
            logger.warning("[PAYOUT CALLBACK] Ignored: Neither reference_id nor vendor_tx_id found in callback payload.")
            return {
                "status": "ACK",
                "code": 200,
                "message": "Callback received but ignored (no reference or vendor tx id found)",
                "normalized": normalized
            }

        matched_record_type = None
        matched_tx = None

        # 1. Search in PayoutWorkflowTransactionModel
        query_conditions_pw = []
        if ref_id:
            query_conditions_pw.append(PayoutWorkflowTransactionModel.reference_number == ref_id)
            query_conditions_pw.append(PayoutWorkflowTransactionModel.transaction_number == ref_id)
        if vendor_tx_id:
            query_conditions_pw.append(PayoutWorkflowTransactionModel.cashfree_transfer_id == vendor_tx_id)

        stmt_pw = select(PayoutWorkflowTransactionModel).where(or_(*query_conditions_pw))
        tx_pw = (await db.execute(stmt_pw)).scalars().first()

        if tx_pw:
            matched_record_type = "payout_workflow"
            matched_tx = tx_pw
        else:
            # 2. Search in EnterprisePayoutTransactionModel
            query_conditions_ep = []
            if ref_id:
                query_conditions_ep.append(EnterprisePayoutTransactionModel.transaction_number == ref_id)
                query_conditions_ep.append(EnterprisePayoutTransactionModel.idempotency_key == ref_id)
                query_conditions_ep.append(EnterprisePayoutTransactionModel.vendor_ref == ref_id)
                query_conditions_ep.append(EnterprisePayoutTransactionModel.vendor_order_id == ref_id)
                try:
                    query_conditions_ep.append(EnterprisePayoutTransactionModel.public_id == uuid.UUID(ref_id))
                except Exception:
                    pass
            if vendor_tx_id:
                query_conditions_ep.append(EnterprisePayoutTransactionModel.vendor_ref == vendor_tx_id)
                query_conditions_ep.append(EnterprisePayoutTransactionModel.vendor_order_id == vendor_tx_id)
                query_conditions_ep.append(EnterprisePayoutTransactionModel.rrn == vendor_tx_id)

            stmt_ep = select(EnterprisePayoutTransactionModel).where(or_(*query_conditions_ep))
            tx_ep = (await db.execute(stmt_ep)).scalars().first()
            if tx_ep:
                matched_record_type = "enterprise_payout"
                matched_tx = tx_ep

        if not matched_tx:
            logger.warning(f"[PAYOUT CALLBACK] No database transaction matched for ref: '{ref_id}' / vendor_tx: '{vendor_tx_id}'.")
            return {
                "status": "ACK",
                "code": 200,
                "message": "Callback acknowledged. Transaction not found in local database.",
                "normalized": normalized
            }

        # Handle PayoutWorkflowTransactionModel update
        if matched_record_type == "payout_workflow":
            old_status = matched_tx.status
            if new_status == "SUCCESS":
                matched_tx.status = "SUCCESS"
                if utr:
                    matched_tx.utr_number = utr
                matched_tx.completed_at = datetime.now(timezone.utc)

            elif new_status in ("FAILED", "REVERSED") and old_status not in ("FAILED", "REVERSED"):
                matched_tx.status = new_status
                matched_tx.failure_reason = message or f"Callback status {new_status} from vendor {vendor_code}"
                matched_tx.completed_at = datetime.now(timezone.utc)

                # Execute automatic wallet reversal refund via Stored Procedure: public.wallet_balance_update
                adj_dto = WalletAdjustmentDTO(
                    user_id=str(matched_tx.retailer_id),
                    entry_type="CREDIT",
                    amount=float(matched_tx.net_debit),
                    service_name="PAYOUT_REFUND",
                    wallet_type="MAIN",
                    user_type="RETAILER",
                    txn_id=f"REF-CB-{uuid.uuid4().hex[:6].upper()}",
                    ref_id=str(matched_tx.public_id),
                    narration=f"Callback Auto Refund [{new_status}] for Payout {matched_tx.public_id}"
                )
                sp_res = await WalletBalanceAdjustmentService.execute_wallet_balance_update(db=db, dto=adj_dto)
                if sp_res.success:
                    audit = PayoutAuditModel(
                        public_id=uuid.uuid4(),
                        transaction_id=matched_tx.public_id,
                        customer_id=matched_tx.customer_id,
                        beneficiary_id=matched_tx.beneficiary_id,
                        retailer_id=matched_tx.retailer_id,
                        tenant_id=matched_tx.tenant_id,
                        action=f"CALLBACK_AUTO_REFUND_{new_status}",
                        wallet_before=sp_res.balance_before,
                        wallet_after=sp_res.balance_after,
                        timestamp=datetime.now(timezone.utc),
                        is_active=True,
                        is_deleted=False
                    )
                    db.add(audit)
                    logger.info(
                        f"[PAYOUT CALLBACK] Wallet refunded via SP for retailer {matched_tx.retailer_id}: ₹{matched_tx.net_debit}"
                    )

            await db.commit()

        # Handle EnterprisePayoutTransactionModel update
        elif matched_record_type == "enterprise_payout":
            old_status = str(matched_tx.status)
            if new_status == "SUCCESS":
                matched_tx.status = PayoutTransactionStatus.SUCCESS
                if utr:
                    matched_tx.utr_number = utr
                matched_tx.completed_at = datetime.now(timezone.utc)

            elif new_status in ("FAILED", "REVERSED") and old_status not in ("FAILED", "REVERSED"):
                matched_tx.status = PayoutTransactionStatus.FAILED if new_status == "FAILED" else PayoutTransactionStatus.REVERSED
                matched_tx.status_description = message or f"Callback status {new_status} from vendor {vendor_code}"
                matched_tx.completed_at = datetime.now(timezone.utc)

                # Reversal via Stored Procedure: public.wallet_balance_update
                adj_dto = WalletAdjustmentDTO(
                    user_id=str(matched_tx.retailer_id),
                    entry_type="CREDIT",
                    amount=float(matched_tx.net_debit),
                    service_name="PAYOUT_REFUND",
                    wallet_type="MAIN",
                    user_type="RETAILER",
                    txn_id=f"REV-CB-{uuid.uuid4().hex[:6].upper()}",
                    ref_id=str(matched_tx.public_id),
                    narration=f"Automatic Callback Reversal for {new_status} payout {matched_tx.transaction_number}"
                )
                sp_res = await WalletBalanceAdjustmentService.execute_wallet_balance_update(db=db, dto=adj_dto)

            audit_log = PayoutAuditLogModel(
                public_id=uuid.uuid4(),
                transaction_id=matched_tx.public_id,
                action="VENDOR_WEBHOOK_CALLBACK_PROCESSED",
                previous_status=old_status,
                new_status=new_status,
                actor_type="VENDOR_WEBHOOK",
                actor_id=vendor_code,
                timestamp=datetime.now(timezone.utc),
                details={
                    "vendor": vendor_code,
                    "utr": utr,
                    "message": message,
                    "status": new_status
                }
            )
            db.add(audit_log)
            await db.commit()

        return {
            "status": "SUCCESS",
            "code": 200,
            "message": f"Payout callback processed successfully for vendor '{vendor_code}'.",
            "transaction_number": getattr(matched_tx, "transaction_number", None),
            "reference_number": getattr(matched_tx, "reference_number", None),
            "new_status": new_status,
            "utr": utr
        }
