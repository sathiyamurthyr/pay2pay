"""
Recharge Application Service.

Encapsulates all business workflows for the Pay2Pay Mobile Recharge module:
- Plan & Operator Discovery (via Stored Procedures)
- Pre-execution Validation (via Stored Procedures)
- Transaction Orchestration & 3-Step Wallet Accounting (via Stored Procedures)
- Vendor Integration & Automatic Atomic Reversal (via Stored Procedures)
- Retailer & Admin Reporting (via Stored Procedures)

MANDATORY ARCHITECTURE RULE:
Frontend -> Dedicated API -> Service Layer -> Stored Procedure (SP) -> Database.
No direct table SQL queries from page or route layers.
"""

import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.application.recharge_vendor_client import get_recharge_vendor_adapter, VendorRechargeResult

logger = logging.getLogger("pay2pay.recharge.service")


class RechargeService:
    """
    Authoritative Service for Mobile Recharge Module.
    """

    @staticmethod
    async def get_operators(session: AsyncSession) -> List[Dict[str, Any]]:
        """
        Fetch active telecom operators with logos and supported circles via SP.
        """
        query = text("SELECT * FROM public.sp_recharge_get_operators()")
        res = await session.execute(query)
        rows = res.mappings().all()
        return [dict(r) for r in rows]

    @staticmethod
    async def get_plans(
        session: AsyncSession,
        operator_code: str,
        circle: Optional[str] = None,
        plan_type: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch dynamic recharge plans via SP.
        """
        query = text("""
            SELECT * FROM public.sp_recharge_get_plans(
                :p_op, :p_circle, :p_type, :p_query
            )
        """)
        res = await session.execute(query, {
            "p_op": operator_code,
            "p_circle": circle,
            "p_type": plan_type,
            "p_query": search_query
        })
        rows = res.mappings().all()
        return [dict(r) for r in rows]

    @staticmethod
    async def validate_request(
        session: AsyncSession,
        retailer_id: uuid.UUID,
        mobile_number: str,
        operator_code: str,
        recharge_amount: float
    ) -> Dict[str, Any]:
        """
        Pre-execution validation via Stored Procedure sp_recharge_validate_request.
        Checks mobile format, operator status, retailer status, wallet sufficiency, and computes commission & tax.
        """
        query = text("""
            SELECT * FROM public.sp_recharge_validate_request(
                :ret_id, :mob, :op, :amt
            )
        """)
        res = await session.execute(query, {
            "ret_id": retailer_id,
            "mob": mobile_number,
            "op": operator_code,
            "amt": recharge_amount
        })
        row = res.mappings().first()
        if not row:
            return {
                "is_valid": False,
                "error_code": "SYSTEM_ERROR",
                "error_message": "Validation procedure returned no response."
            }
        return dict(row)

    @staticmethod
    async def execute_recharge(
        session: AsyncSession,
        retailer_id: uuid.UUID,
        mobile_number: str,
        operator_code: str,
        circle: str,
        recharge_amount: float,
        plan_id: Optional[uuid.UUID] = None,
        plan_type: Optional[str] = "CUSTOM",
        plan_description: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full End-to-End Orchestrated Mobile Recharge:
        1. SP: sp_recharge_create_transaction (Idempotent initialization)
        2. SP: sp_recharge_execute_accounting (Atomic 3-step wallet movements)
        3. Vendor: Telecom API dispatch
        4. SP: sp_recharge_finalize_transaction OR sp_recharge_reverse_transaction
        """
        logger.info(f"Initiating Recharge: Retailer={retailer_id}, Mobile={mobile_number}, Op={operator_code}, Amt={recharge_amount}")

        # -------------------------------------------------------------
        # 1. Initialize Transaction via SP
        # -------------------------------------------------------------
        sp_create = text("""
            SELECT * FROM public.sp_recharge_create_transaction(
                :ret_id, :mob, :op, :circle, :amt, :plan_id, :plan_type, :plan_desc, :idemp, :ip, :ua
            )
        """)
        create_res = await session.execute(sp_create, {
            "ret_id": retailer_id,
            "mob": mobile_number,
            "op": operator_code,
            "circle": circle,
            "amt": recharge_amount,
            "plan_id": plan_id,
            "plan_type": plan_type,
            "plan_desc": plan_description,
            "idemp": idempotency_key,
            "ip": ip_address,
            "ua": user_agent
        })
        init_data = dict(create_res.mappings().first())

        if not init_data.get("success"):
            logger.warning(f"Recharge initialization failed: {init_data.get('error_message')}")
            return {
                "success": False,
                "status": "FAILED",
                "error_message": init_data.get("error_message"),
                "details": init_data
            }

        recharge_id = init_data["recharge_public_id"]
        transaction_id = init_data["transaction_id"]
        reference_id = init_data["reference_id"]

        # If already completed via idempotency
        if init_data.get("is_idempotent") and init_data.get("status") in ("SUCCESS", "FAILED", "REVERSED"):
            logger.info(f"Returning cached idempotent transaction {transaction_id}")
            return {
                "success": init_data.get("status") == "SUCCESS",
                "status": init_data.get("status"),
                "transaction_id": transaction_id,
                "reference_id": reference_id,
                "details": init_data
            }

        # -------------------------------------------------------------
        # 2. Execute 3-Step Wallet Movement via SP
        # -------------------------------------------------------------
        sp_acc = text("SELECT * FROM public.sp_recharge_execute_accounting(:p_id)")
        acc_res = await session.execute(sp_acc, {"p_id": recharge_id})
        acc_data = dict(acc_res.mappings().first())

        if not acc_data.get("success"):
            logger.error(f"Wallet accounting failed for {transaction_id}: {acc_data.get('error_message')}")
            await session.commit()
            return {
                "success": False,
                "status": "FAILED",
                "transaction_id": transaction_id,
                "reference_id": reference_id,
                "error_message": acc_data.get("error_message") or "Wallet deduction failed."
            }

        # Commit wallet debit before calling external vendor to guarantee DB consistency
        await session.commit()

        # -------------------------------------------------------------
        # 3. Call Vendor API Adapter
        # -------------------------------------------------------------
        vendor_adapter = get_recharge_vendor_adapter()
        vendor_result: VendorRechargeResult = await vendor_adapter.process_recharge(
            mobile_number=mobile_number,
            operator_code=operator_code,
            circle=circle,
            amount=recharge_amount,
            reference_id=reference_id,
            client_ip=ip_address
        )

        # -------------------------------------------------------------
        # 4. Finalize or Reverse via SP
        # -------------------------------------------------------------
        if vendor_result.success and vendor_result.status == "SUCCESS":
            # Finalize SUCCESS
            sp_fin = text("""
                SELECT * FROM public.sp_recharge_finalize_transaction(
                    :p_id, 'SUCCESS', :v_name, :v_ref, :v_txnid, :op_ref, NULL
                )
            """)
            fin_res = await session.execute(sp_fin, {
                "p_id": recharge_id,
                "v_name": vendor_result.vendor_name,
                "v_ref": vendor_result.vendor_reference,
                "v_txnid": vendor_result.vendor_transaction_id,
                "op_ref": vendor_result.operator_ref
            })
            fin_data = dict(fin_res.mappings().first())
            await session.commit()

            return {
                "success": True,
                "status": "SUCCESS",
                "transaction_id": transaction_id,
                "reference_id": reference_id,
                "operator_ref": vendor_result.operator_ref,
                "vendor_reference": vendor_result.vendor_reference,
                "opening_balance": float(acc_data.get("opening_balance", 0)),
                "closing_balance": float(acc_data.get("final_balance", 0)),
                "commission_amount": float(init_data.get("commission_amount", 1.00)),
                "tax_amount": float(init_data.get("tax_amount", 0.00)),
                "recharge_amount": recharge_amount,
                "message": "Mobile recharge processed successfully."
            }
        else:
            # Vendor Failed -> Automatic Atomic Rollback / Refund
            failure_reason = vendor_result.error_message or "Telecom operator network declined request."
            logger.warning(f"Vendor recharge failed for {transaction_id}. Executing atomic reversal...")

            sp_rev = text("""
                SELECT * FROM public.sp_recharge_reverse_transaction(
                    :p_id, :reason
                )
            """)
            rev_res = await session.execute(sp_rev, {
                "p_id": recharge_id,
                "reason": failure_reason
            })
            rev_data = dict(rev_res.mappings().first())
            await session.commit()

            return {
                "success": False,
                "status": "FAILED",
                "transaction_id": transaction_id,
                "reference_id": reference_id,
                "reversal_txn_id": rev_data.get("reversal_txn_id"),
                "refunded_amount": float(rev_data.get("refunded_amount", 0)),
                "closing_balance": float(rev_data.get("final_balance", 0)),
                "error_message": failure_reason,
                "message": f"Recharge failed: {failure_reason}. Wallet balance has been automatically refunded."
            }

    @staticmethod
    async def get_retailer_report(
        session: AsyncSession,
        retailer_id: uuid.UUID,
        status: Optional[str] = None,
        mobile_number: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Fetch retailer recharge statement with running balances and totals via SP.
        """
        offset = max(0, (page - 1) * page_size)
        sp_rep = text("""
            SELECT * FROM public.sp_recharge_get_retailer_report(
                :ret_id, :status, :mob, :start_d, :end_d, :limit, :offset
            )
        """)
        res = await session.execute(sp_rep, {
            "ret_id": retailer_id,
            "status": status,
            "mob": mobile_number,
            "start_d": start_date,
            "end_d": end_date,
            "limit": page_size,
            "offset": offset
        })
        rows = [dict(r) for r in res.mappings().all()]

        total_count = rows[0]["total_count"] if rows else 0
        total_volume = float(rows[0]["total_volume"]) if rows else 0.0
        total_commission = float(rows[0]["total_commission"]) if rows else 0.0
        total_tax = float(rows[0]["total_tax"]) if rows else 0.0

        return {
            "transactions": rows,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size if page_size > 0 else 1
            },
            "summary": {
                "total_volume": total_volume,
                "total_commission": total_commission,
                "total_tax": total_tax
            }
        }

    @staticmethod
    async def get_admin_report(
        session: AsyncSession,
        status: Optional[str] = None,
        operator_code: Optional[str] = None,
        retailer_code: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Fetch admin enterprise recharge ledger with operator breakdowns via SP.
        """
        offset = max(0, (page - 1) * page_size)
        sp_adm = text("""
            SELECT * FROM public.sp_recharge_get_admin_report(
                :status, :op, :ret_code, :start_d, :end_d, :limit, :offset
            )
        """)
        res = await session.execute(sp_adm, {
            "status": status,
            "op": operator_code,
            "ret_code": retailer_code,
            "start_d": start_date,
            "end_d": end_date,
            "limit": page_size,
            "offset": offset
        })
        rows = [dict(r) for r in res.mappings().all()]

        total_count = rows[0]["total_count"] if rows else 0
        total_volume = float(rows[0]["total_volume"]) if rows else 0.0
        total_commission = float(rows[0]["total_commission"]) if rows else 0.0
        total_tax = float(rows[0]["total_tax"]) if rows else 0.0
        total_success = rows[0]["total_success"] if rows else 0
        total_failed = rows[0]["total_failed"] if rows else 0

        return {
            "transactions": rows,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size if page_size > 0 else 1
            },
            "summary": {
                "total_volume": total_volume,
                "total_commission": total_commission,
                "total_tax": total_tax,
                "total_success": total_success,
                "total_failed": total_failed
            }
        }

    @staticmethod
    async def get_transaction(
        session: AsyncSession,
        reference: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch full transaction and ledger details by transaction_id, reference_id, or operator_ref.
        """
        query = text("""
            SELECT t.*, r.owner_name, r.store_name, r.mobile_number as retailer_mobile
            FROM public.recharge_transactions t
            LEFT JOIN public.retailer r ON t.retailer_id = r.public_id
            WHERE t.transaction_id = :ref OR t.reference_id = :ref OR t.operator_ref = :ref
            LIMIT 1
        """)
        res = await session.execute(query, {"ref": reference})
        row = res.mappings().first()
        if not row:
            return None
        return dict(row)

    @staticmethod
    async def reverse_transaction(
        session: AsyncSession,
        transaction_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Refund / reverse a recharge transaction via SP sp_recharge_reverse_transaction.
        """
        # Find transaction ID or public ID
        query = text("SELECT public_id FROM public.recharge_transactions WHERE transaction_id = :txn_id OR reference_id = :txn_id LIMIT 1")
        res = await session.execute(query, {"txn_id": transaction_id})
        pub_id = res.scalar()
        if not pub_id:
            return {"success": False, "error_message": "Transaction not found."}

        sp_rev = text("SELECT * FROM public.sp_recharge_reverse_transaction(:p_id, :reason)")
        rev_res = await session.execute(sp_rev, {"p_id": pub_id, "reason": reason})
        data = dict(rev_res.mappings().first())
        await session.commit()
        return data

    @staticmethod
    async def process_vendor_callback(
        session: AsyncSession,
        request_id: Optional[str],
        vendor_trans_id: Optional[str],
        status_str: str,
        op_ref_id: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process asynchronous telecom vendor callback (e.g. Utkal Digital POST callback).
        Finds transaction by request_id (reference_id/transaction_id) or vendor_trans_id.
        """
        query = text("""
            SELECT public_id, transaction_id, reference_id, status, recharge_amount, vendor_name
            FROM public.recharge_transactions
            WHERE (:req_id IS NOT NULL AND (reference_id = :req_id OR transaction_id = :req_id))
               OR (:v_id IS NOT NULL AND vendor_transaction_id = :v_id)
            LIMIT 1
        """)
        res = await session.execute(query, {"req_id": request_id, "v_id": vendor_trans_id})
        txn = res.mappings().first()
        if not txn:
            logger.warning(f"Recharge callback received for unknown transaction. RequestId={request_id}, TransId={vendor_trans_id}")
            return {"success": False, "message": "Transaction not found."}

        current_status = txn["status"]
        pub_id = txn["public_id"]
        v_name = txn["vendor_name"] or "TELECOM_VENDOR"
        normalized_status = status_str.strip().lower()

        if normalized_status in ("success", "1", "ok"):
            if current_status not in ("SUCCESS", "REVERSED", "REFUNDED"):
                sp_fin = text("""
                    SELECT * FROM public.sp_recharge_finalize_transaction(
                        :p_id, 'SUCCESS', :v_name, :v_ref, :v_txnid, :op_ref, NULL
                    )
                """)
                await session.execute(sp_fin, {
                    "p_id": pub_id,
                    "v_name": v_name,
                    "v_ref": request_id or txn["reference_id"],
                    "v_txnid": vendor_trans_id or "",
                    "op_ref": op_ref_id or "",
                })
                await session.commit()
                return {"success": True, "message": "Transaction finalized as SUCCESS via callback."}
            else:
                return {"success": True, "message": f"Transaction already in state {current_status}."}

        elif normalized_status in ("reverse", "failed", "reversed", "failure", "0"):
            if current_status not in ("REVERSED", "REFUNDED", "FAILED"):
                sp_rev = text("""
                    SELECT * FROM public.sp_recharge_reverse_transaction(
                        :p_id, :reason
                    )
                """)
                await session.execute(sp_rev, {
                    "p_id": pub_id,
                    "reason": description or "Reversed by vendor callback notification."
                })
                await session.commit()
                return {"success": True, "message": "Transaction reversed & refunded via callback."}
            else:
                return {"success": True, "message": f"Transaction already in state {current_status}."}

        return {"success": True, "message": f"Unhandled callback status: {status_str}"}

    @staticmethod
    async def get_receipt(
        session: AsyncSession,
        transaction_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch full receipt metadata for PDF/Print and WhatsApp sharing.
        """
        return await RechargeService.get_transaction(session, transaction_id)
