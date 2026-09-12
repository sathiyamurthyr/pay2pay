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
from sqlalchemy import select, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.payout_workflow_models import (
    PayoutWorkflowTransactionModel,
    PayoutAuditModel,
    PayoutReceiptModel
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
        if v in ("urbanrupee", "urban_rupee", "ur") or "client_txn_id" in merged or ("transaction_id" in merged and ("orderid" in merged or str(merged.get("transaction_id", "")).startswith("TXN"))):
            v = "URBANRUPEE"
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

        # Extract amount if present in merged
        amount = None
        amount_raw = merged.get("amount") or merged.get("payout_amount") or merged.get("transfer_amount")
        if isinstance(amount_raw, dict):
            amount_raw = amount_raw.get("value") or amount_raw.get("amount")
        if amount_raw is not None:
            try:
                amount = float(str(amount_raw).replace(",", "").strip())
            except Exception:
                amount = None

        return {
            "vendor_code": v or "universal",
            "reference_id": str(ref_id).strip() if ref_id is not None else None,
            "vendor_tx_id": str(vendor_tx_id).strip() if vendor_tx_id is not None else None,
            "status": normalized_status,
            "raw_status": raw_status,
            "amount": amount,
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
        Universal processor for all payout callbacks and webhooks.
        Uses Stored Procedure public.sp_process_payout_webhook to:
        1. Persist audit log in public.payout_webhook
        2. Match transaction across payout_transaction, payout_workflow_transactions, and transactions
        3. Atomically update transaction status, UTR, bank reference, vendor name, and API response
        4. Execute wallet reversal/refund automatically via wallet_balance_update if status is FAILED
        5. Return standardized HTTP 200 payload
        """
        normalized = cls.normalize_vendor_payload(vendor_hint, payload, query_params)
        ref_id = normalized["reference_id"]
        vendor_tx_id = normalized["vendor_tx_id"]
        new_status = normalized["status"]
        utr = normalized["utr"]
        message = normalized["message"]
        amount = normalized["amount"]
        vendor_code = normalized["vendor_code"]
        raw_payload = normalized["raw_payload"]

        logger.info(
            f"[PAYOUT WEBHOOK/CALLBACK] Gateway: '{vendor_code}' | Ref: '{ref_id}' | VendorTx: '{vendor_tx_id}' | Status: {new_status} | Amount: {amount} | UTR: {utr}"
        )

        signature = (
            query_params.get("signature") or
            payload.get("signature") or
            payload.get("sign") or
            payload.get("checksum") or
            "NONE"
        )

        initial_response = {
            "status": "SUCCESS",
            "code": 200,
            "message": f"Webhook acknowledged for vendor {vendor_code}",
            "vendor": vendor_code,
            "client_txn_id": ref_id,
            "vendor_tx_id": vendor_tx_id,
            "payout_status": new_status,
            "amount": amount,
            "utr": utr
        }

        # Execute Stored Procedure: public.sp_process_payout_webhook
        sp_result = None
        try:
            sp_query = text("""
                SELECT 
                    success,
                    status,
                    transaction_number,
                    is_reversed,
                    is_matched,
                    message
                FROM public.sp_process_payout_webhook(
                    p_gateway_code      => :p_gateway_code,
                    p_client_txn_id     => :p_client_txn_id,
                    p_vendor_tx_id      => :p_vendor_tx_id,
                    p_status            => :p_status,
                    p_amount            => :p_amount,
                    p_utr               => :p_utr,
                    p_message           => :p_message,
                    p_raw_payload       => :p_raw_payload,
                    p_response_payload  => :p_response_payload,
                    p_signature         => :p_signature
                );
            """)

            cursor = await db.execute(
                sp_query,
                {
                    "p_gateway_code": vendor_code,
                    "p_client_txn_id": ref_id,
                    "p_vendor_tx_id": vendor_tx_id,
                    "p_status": new_status,
                    "p_amount": amount,
                    "p_utr": utr,
                    "p_message": message,
                    "p_raw_payload": json.dumps(raw_payload, default=str),
                    "p_response_payload": json.dumps(initial_response, default=str),
                    "p_signature": str(signature)
                }
            )
            row = cursor.mappings().first()
            await db.commit()

            if row:
                sp_result = dict(row)
                logger.info(f"[PAYOUT WEBHOOK SP RESULT] {sp_result}")
        except Exception as ex_sp:
            logger.error(f"[PAYOUT WEBHOOK SP EXECUTION ERROR] {ex_sp}", exc_info=True)
            await db.rollback()

        # Build final response payload
        final_response = {
            "status": "SUCCESS",
            "code": 200,
            "message": (sp_result.get("message") if sp_result else "Webhook received and logged"),
            "vendor": vendor_code,
            "transaction_number": (sp_result.get("transaction_number") if sp_result else ref_id),
            "client_txn_id": ref_id,
            "vendor_tx_id": vendor_tx_id,
            "payout_status": (sp_result.get("status") if sp_result else new_status),
            "is_matched": (sp_result.get("is_matched") if sp_result else False),
            "is_reversed": (sp_result.get("is_reversed") if sp_result else False),
            "utr": utr,
            "amount": amount
        }

        # Dispatch real-time WhatsApp receipt update if matched and customer mobile exists
        if sp_result and sp_result.get("is_matched"):
            matched_txn = sp_result.get("transaction_number")
            try:
                stmt_rc = select(PayoutReceiptModel).where(
                    PayoutReceiptModel.transaction_number == matched_txn
                )
                rc_obj = (await db.execute(stmt_rc)).scalars().first()
                if rc_obj and rc_obj.customer_mobile and rc_obj.whatsapp_status != "DELIVERED":
                    from app.application.payout_workflow_service import PayoutWorkflowService
                    wa_info = await PayoutWorkflowService.dispatch_payout_whatsapp_notification(
                        db=db,
                        tenant_id=rc_obj.tenant_id,
                        company_id=rc_obj.company_id,
                        transaction_id=rc_obj.transaction_id,
                        transaction_number=rc_obj.transaction_number,
                        customer_id=rc_obj.customer_id,
                        customer_name=rc_obj.customer_name or "Customer",
                        customer_mobile=rc_obj.customer_mobile,
                        amount=float(amount or rc_obj.amount or 0),
                        status=new_status,
                        receipt_token=rc_obj.receipt_token,
                        utr_number=utr or rc_obj.utr_number
                    )
                    rc_obj.whatsapp_message_id = wa_info.get("message_id")
                    rc_obj.whatsapp_status = wa_info.get("status")
                    await db.commit()
            except Exception as ex_rc:
                logger.warning(f"[PAYOUT WEBHOOK WHATSAPP NOTICE] {ex_rc}")

        return final_response

    @classmethod
    async def get_webhook_logs(
        cls,
        db: AsyncSession,
        gateway: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Queries incoming webhook logs directly from public.view_payout_webhook_logs.
        Supports pagination, filtering by gateway/status, and search across client_txn_id,
        vendor_tx_id, transaction_number, and retailer name.
        """
        where_clauses = ["1=1"]
        params: Dict[str, Any] = {"limit": limit, "offset": offset}

        if gateway:
            where_clauses.append("UPPER(gateway_code) = UPPER(:gateway)")
            params["gateway"] = gateway.strip()
        if status:
            where_clauses.append("UPPER(webhook_status) = UPPER(:status)")
            params["status"] = status.strip()
        if search:
            where_clauses.append(
                "(client_txn_id ILIKE :search OR vendor_tx_id ILIKE :search OR transaction_number ILIKE :search OR retailer_name ILIKE :search OR retailer_code ILIKE :search)"
            )
            params["search"] = f"%{search.strip()}%"

        where_sql = " AND ".join(where_clauses)

        count_sql = f"SELECT COUNT(*) FROM public.view_payout_webhook_logs WHERE {where_sql}"
        total = (await db.execute(text(count_sql), params)).scalar() or 0

        query_sql = f"""
            SELECT 
                webhook_id,
                received_at,
                gateway_code,
                client_txn_id,
                vendor_tx_id,
                webhook_status,
                amount,
                utr,
                transaction_number,
                current_txn_status,
                retailer_name,
                retailer_code,
                request_payload,
                response_payload,
                validation_result
            FROM public.view_payout_webhook_logs
            WHERE {where_sql}
            ORDER BY received_at DESC
            LIMIT :limit OFFSET :offset
        """
        rows = (await db.execute(text(query_sql), params)).mappings().all()

        items = []
        for r in rows:
            d = dict(r)
            if isinstance(d.get("received_at"), datetime):
                d["received_at"] = d["received_at"].isoformat()
            if d.get("amount") is not None:
                d["amount"] = float(d["amount"])
            items.append(d)

        return {
            "status": "SUCCESS",
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": items
        }

