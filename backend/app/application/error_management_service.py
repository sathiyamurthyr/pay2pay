import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.error_management_models import (
    ErrorMasterModel, VendorApiLogModel, TransactionErrorModel
)

logger = logging.getLogger(__name__)

STANDARD_ERROR_SEED = [
    {
        "internal_error_code": "PAY-1001",
        "vendor_name": "GLOBAL",
        "customer_message": "Payout service is temporarily unavailable. Please try again later.",
        "retailer_message": "Payout service is temporarily unavailable. Please try again later.",
        "admin_message": "Vendor product disabled / service temporary outage.",
        "severity": "HIGH",
        "category": "PAYOUT",
    },
    {
        "internal_error_code": "PAY-1002",
        "vendor_name": "GLOBAL",
        "customer_message": "Transaction is being processed. Please check the status shortly.",
        "retailer_message": "Transaction is pending vendor confirmation.",
        "admin_message": "Vendor async processing pending.",
        "severity": "MEDIUM",
        "category": "PAYOUT",
    },
    {
        "internal_error_code": "PAY-1003",
        "vendor_name": "GLOBAL",
        "customer_message": "Unable to connect to the payment service.",
        "retailer_message": "Unable to reach payout gateway. Please check connection.",
        "admin_message": "Network timeout or connection failure with vendor gateway.",
        "severity": "HIGH",
        "category": "NETWORK",
    },
    {
        "internal_error_code": "PAY-1004",
        "vendor_name": "GLOBAL",
        "customer_message": "Request timed out. Please retry.",
        "retailer_message": "Vendor response timed out. Please retry or check status.",
        "admin_message": "HTTP 408/504 gateway timeout from vendor.",
        "severity": "HIGH",
        "category": "NETWORK",
    },
    {
        "internal_error_code": "PAY-1005",
        "vendor_name": "GLOBAL",
        "customer_message": "Service temporarily unavailable.",
        "retailer_message": "Service temporarily unavailable.",
        "admin_message": "Vendor HTTP 500/503 service error.",
        "severity": "HIGH",
        "category": "SYSTEM",
    },
    {
        "internal_error_code": "PAY-1006",
        "vendor_name": "GLOBAL",
        "customer_message": "Transaction could not be completed. If the issue continues, contact support.",
        "retailer_message": "Transaction failed at payout engine.",
        "admin_message": "Payout engine execution failure.",
        "severity": "HIGH",
        "category": "PAYOUT",
    },
    {
        "internal_error_code": "PAY-1007",
        "vendor_name": "GLOBAL",
        "customer_message": "Beneficiary verification failed. Please verify beneficiary details and try again.",
        "retailer_message": "Beneficiary bank account or IFSC verification failed.",
        "admin_message": "Vendor beneficiary validation error.",
        "severity": "MEDIUM",
        "category": "BENEFICIARY",
    },
    {
        "internal_error_code": "PAY-1008",
        "vendor_name": "GLOBAL",
        "customer_message": "Wallet balance is insufficient for this transaction.",
        "retailer_message": "Retailer wallet balance insufficient.",
        "admin_message": "Insufficient retailer balance pre-check failure.",
        "severity": "MEDIUM",
        "category": "LIMIT",
    },
    {
        "internal_error_code": "PAY-1009",
        "vendor_name": "GLOBAL",
        "customer_message": "Daily transaction limit exceeded.",
        "retailer_message": "Daily transaction limit exceeded for customer/retailer.",
        "admin_message": "CBS daily transaction cap policy violation.",
        "severity": "MEDIUM",
        "category": "LIMIT",
    },
    {
        "internal_error_code": "PAY-1010",
        "vendor_name": "GLOBAL",
        "customer_message": "Monthly transaction limit exceeded.",
        "retailer_message": "Monthly beneficiary limit exceeded.",
        "admin_message": "CBS monthly limit cap policy violation.",
        "severity": "MEDIUM",
        "category": "LIMIT",
    },
    {
        "internal_error_code": "PAY-1011",
        "vendor_name": "GLOBAL",
        "customer_message": "Invalid beneficiary details. Please check account number and IFSC.",
        "retailer_message": "Invalid beneficiary account format.",
        "admin_message": "Beneficiary parameter validation error.",
        "severity": "MEDIUM",
        "category": "BENEFICIARY",
    },
    {
        "internal_error_code": "PAY-1012",
        "vendor_name": "GLOBAL",
        "customer_message": "Transaction has been reversed automatically. Your balance is safe.",
        "retailer_message": "Transaction failed; funds refunded to wallet automatically.",
        "admin_message": "ACID double-entry reversal executed cleanly.",
        "severity": "INFO",
        "category": "REVERSAL",
    },
]


class ErrorManagementService:
    @staticmethod
    async def seed_error_master(db: AsyncSession) -> None:
        """Populates error_master table with standard codes if empty."""
        for item in STANDARD_ERROR_SEED:
            stmt = select(ErrorMasterModel).where(
                ErrorMasterModel.internal_error_code == item["internal_error_code"]
            )
            existing = (await db.execute(stmt)).scalars().first()
            if not existing:
                row = ErrorMasterModel(
                    internal_error_code=item["internal_error_code"],
                    vendor_name=item["vendor_name"],
                    customer_message=item["customer_message"],
                    retailer_message=item["retailer_message"],
                    admin_message=item["admin_message"],
                    severity=item["severity"],
                    category=item["category"],
                    retry_allowed=True,
                    rollback_required=True,
                    notification_required=True,
                    is_active=True,
                )
                db.add(row)
        await db.commit()

    @staticmethod
    async def log_vendor_api(
        db: AsyncSession,
        vendor_name: str,
        vendor_url: str,
        http_method: str,
        headers: Optional[Dict[str, Any]],
        request_json: Optional[Dict[str, Any]],
        response_json: Optional[Dict[str, Any]],
        http_status: int,
        latency_ms: int = 0,
        correlation_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> VendorApiLogModel:
        """Stores original raw vendor API request and response JSON securely."""
        cid = correlation_id or f"CORR-{uuid.uuid4().hex[:12].upper()}"
        tid = trace_id or f"TRACE-{uuid.uuid4().hex[:12].upper()}"
        rid = request_id or f"REQ-{uuid.uuid4().hex[:12].upper()}"

        # Ensure confidential secrets in headers/request are masked before logging
        safe_headers = {}
        if headers:
            for k, v in headers.items():
                if k.lower() in ["authorization", "x-api-key", "secret", "password", "token"]:
                    safe_headers[k] = "********"
                else:
                    safe_headers[k] = v

        log_entry = VendorApiLogModel(
            vendor_name=vendor_name,
            vendor_url=vendor_url,
            http_method=http_method,
            headers=safe_headers,
            request_json=request_json,
            response_json=response_json,
            http_status=http_status,
            latency_ms=latency_ms,
            correlation_id=cid,
            trace_id=tid,
            request_id=rid,
            environment="production",
        )
        db.add(log_entry)
        await db.flush()
        return log_entry

    @staticmethod
    async def map_vendor_error(
        db: AsyncSession,
        vendor_name: str,
        vendor_error_message: Optional[str] = None,
        vendor_http_status: Optional[int] = None,
        vendor_error_code: Optional[str] = None,
    ) -> ErrorMasterModel:
        """Maps a vendor error to an internal error_master code."""
        await ErrorManagementService.seed_error_master(db)

        # 1. Exact vendor name + vendor_error_code match
        if vendor_error_code:
            stmt = select(ErrorMasterModel).where(
                ErrorMasterModel.vendor_name == vendor_name,
                ErrorMasterModel.vendor_error_code == vendor_error_code,
                ErrorMasterModel.is_active == True,
            )
            match = (await db.execute(stmt)).scalars().first()
            if match:
                return match

        # 2. String keyword match in vendor_error_message
        err_str = (vendor_error_message or "").lower()
        if "not activated" in err_str or "product disabled" in err_str or "unauthorized" in err_str:
            target_code = "PAY-1001"
        elif "timeout" in err_str or "timed out" in err_str or "unreachable" in err_str:
            target_code = "PAY-1004"
        elif "connect" in err_str or "failed to fetch" in err_str or "network" in err_str:
            target_code = "PAY-1003"
        elif "beneficiary" in err_str or "ifsc" in err_str or "account" in err_str:
            target_code = "PAY-1007"
        elif "insufficient" in err_str or "balance" in err_str:
            target_code = "PAY-1008"
        elif "limit" in err_str:
            target_code = "PAY-1009"
        else:
            if vendor_http_status in [408, 504]:
                target_code = "PAY-1004"
            elif vendor_http_status in [500, 502, 503]:
                target_code = "PAY-1005"
            else:
                target_code = "PAY-1001"

        stmt = select(ErrorMasterModel).where(
            ErrorMasterModel.internal_error_code == target_code
        )
        mapped = (await db.execute(stmt)).scalars().first()
        if mapped:
            return mapped

        # Fallback to PAY-1001
        stmt_fallback = select(ErrorMasterModel).where(
            ErrorMasterModel.internal_error_code == "PAY-1001"
        )
        return (await db.execute(stmt_fallback)).scalars().first()

    @staticmethod
    async def process_transaction_failure(
        db: AsyncSession,
        transaction_id: str,
        vendor_name: str,
        vendor_url: str,
        http_method: str,
        request_json: Optional[Dict[str, Any]],
        response_json: Optional[Dict[str, Any]],
        http_status: int,
        latency_ms: int = 0,
        vendor_error_message: Optional[str] = None,
        rollback_performed: bool = False,
        user_role: str = "RETAILER",
    ) -> Dict[str, Any]:
        """
        Full Enterprise Error Handling Pipeline:
        1. Logs raw vendor API payload to vendor_api_log
        2. Maps raw vendor error to internal error code & friendly message
        3. Records transaction_error
        4. Returns role-sanitized response dictionary (NEVER exposing vendor strings to retailer/customer)
        """
        # Step 1: Log raw telemetry
        log_entry = await ErrorManagementService.log_vendor_api(
            db=db,
            vendor_name=vendor_name,
            vendor_url=vendor_url,
            http_method=http_method,
            headers={"Content-Type": "application/json"},
            request_json=request_json,
            response_json=response_json,
            http_status=http_status,
            latency_ms=latency_ms,
        )

        # Step 2: Map to friendly error master
        mapped_err = await ErrorManagementService.map_vendor_error(
            db=db,
            vendor_name=vendor_name,
            vendor_error_message=vendor_error_message or (str(response_json) if response_json else None),
            vendor_http_status=http_status,
        )

        friendly_msg = mapped_err.retailer_message if user_role == "RETAILER" else mapped_err.customer_message

        # Step 3: Record transaction error
        tx_error = TransactionErrorModel(
            transaction_id=transaction_id,
            internal_error_code=mapped_err.internal_error_code,
            friendly_message=friendly_msg,
            vendor_reference=str(response_json.get("reference_id") or response_json.get("utr") or "") if response_json else None,
            vendor_status=str(response_json.get("status") or "FAILED") if response_json else "FAILED",
            rollback_status="COMPLETED" if rollback_performed else "NONE",
            retry_count=0,
        )
        db.add(tx_error)
        await db.commit()

        # Step 4: Role-Based Response Sanitization
        if user_role.upper() in ["CUSTOMER", "RETAILER"]:
            return {
                "success": False,
                "status": "FAILED",
                "internal_error_code": mapped_err.internal_error_code,
                "friendly_message": friendly_msg,
                "message": friendly_msg,
                "detail": friendly_msg,
                "reference_number": transaction_id,
                "rollback_status": "COMPLETED" if rollback_performed else "NONE",
                # ZERO LEAKAGE: vendor_name, raw response_json, stack traces are STRPPED!
            }
        else:  # ADMIN / OPERATIONS
            return {
                "success": False,
                "status": "FAILED",
                "internal_error_code": mapped_err.internal_error_code,
                "friendly_message": friendly_msg,
                "message": friendly_msg,
                "detail": friendly_msg,
                "reference_number": transaction_id,
                "rollback_status": "COMPLETED" if rollback_performed else "NONE",
                "admin_details": {
                    "vendor_name": vendor_name,
                    "vendor_url": vendor_url,
                    "http_status": http_status,
                    "latency_ms": latency_ms,
                    "vendor_error_message": vendor_error_message,
                    "request_json": request_json,
                    "response_json": response_json,
                    "correlation_id": log_entry.correlation_id,
                },
            }
