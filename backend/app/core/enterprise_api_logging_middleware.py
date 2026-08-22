import time
import uuid
import json
import logging
import datetime
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse
from starlette.concurrency import iterate_in_threadpool

from app.core.database import AsyncSessionLocal
from app.infrastructure.db.enterprise_api_log_model import EnterpriseApiLogModel
from app.core.api_log_sanitizer import (
    mask_sensitive_headers,
    process_and_truncate_payload
)

logger = logging.getLogger("enterprise_api_middleware")

DEFAULT_TENANT_ID = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")

# Paths that should NOT be logged to avoid log flooding
EXCLUDED_PATHS = {
    "/health",
    "/api/v1/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
    "/api/v1/payout-workflow/health",
}

def infer_service_name(path: str) -> str:
    p = path.lower()
    if "/payout" in p:
        return "PAYOUT"
    elif "/dmt" in p:
        return "DMT"
    elif "/wallet" in p:
        return "WALLET"
    elif "/recharge" in p:
        return "RECHARGE"
    elif "/bbps" in p:
        return "BBPS"
    elif "/beneficiar" in p:
        return "BENEFICIARY"
    elif "/ekyc" in p or "/verification" in p or "/onboarding" in p:
        return "KYC"
    elif "/auth" in p:
        return "AUTH"
    elif "/settlement" in p:
        return "SETTLEMENT"
    elif "/machine" in p:
        return "POS_MACHINE"
    elif "/retailer" in p:
        return "RETAILER"
    elif "/organization" in p:
        return "ORGANIZATION"
    elif "/compliance" in p or "/polic" in p:
        return "COMPLIANCE"
    elif "/report" in p:
        return "REPORTS"
    elif "/card" in p or "/swipe" in p:
        return "CARD_TO_CASH"
    return "GENERAL"


def infer_api_name(path: str, method: str) -> str:
    parts = [part for part in path.strip("/").split("/") if part and part not in ("api", "v1")]
    if not parts:
        return f"{method} API Root"
    clean_parts = [p.replace("-", " ").replace("_", " ").title() for p in parts]
    return f"{method} {' '.join(clean_parts)}"


async def _save_inbound_log_bg(log_data: dict):
    """Saves inbound log to database asynchronously without blocking request execution."""
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        record = EnterpriseApiLogModel(
            public_id=uuid.uuid4(),
            tenant_id=log_data.get("tenant_id") or DEFAULT_TENANT_ID,
            company_id=log_data.get("company_id") or DEFAULT_COMPANY_ID,
            log_code=log_data["log_code"],
            transaction_id=log_data.get("transaction_id"),
            request_id=log_data["request_id"],
            correlation_id=log_data.get("correlation_id"),
            client_reference_id=log_data.get("client_reference_id"),
            provider_reference_id=log_data.get("provider_reference_id"),
            parent_request_id=log_data.get("parent_request_id"),
            service_name=log_data["service_name"],
            api_name=log_data["api_name"],
            direction="INBOUND",
            http_method=log_data["http_method"],
            endpoint=log_data["endpoint"],
            base_url_reference=log_data.get("base_url_reference"),
            environment=log_data.get("environment", "PRODUCTION"),
            client_name=log_data.get("client_name"),
            client_ip=log_data.get("client_ip"),
            provider_name=log_data.get("provider_name"),
            retailer_id=log_data.get("retailer_id"),
            customer_id=log_data.get("customer_id"),
            performed_by=log_data.get("performed_by"),
            request_timestamp=log_data["request_timestamp"],
            response_timestamp=log_data["response_timestamp"],
            duration_ms=log_data["duration_ms"],
            http_status_code=log_data["http_status_code"],
            response_status=log_data["response_status"],
            provider_response_code=log_data.get("provider_response_code"),
            provider_response_message=log_data.get("provider_response_message"),
            error_code=log_data.get("error_code"),
            error_type=log_data.get("error_type"),
            error_message=log_data.get("error_message"),
            stack_trace=log_data.get("stack_trace"),
            request_headers=log_data.get("request_headers"),
            request_query=log_data.get("request_query"),
            request_body=log_data.get("request_body"),
            request_body_raw=log_data.get("request_body_raw"),
            response_headers=log_data.get("response_headers"),
            response_body=log_data.get("response_body"),
            response_body_raw=log_data.get("response_body_raw"),
            payload_truncated=log_data.get("payload_truncated", False),
            original_size_bytes=log_data.get("original_size_bytes", 0),
            stored_size_bytes=log_data.get("stored_size_bytes", 0),
            is_active=True,
            record_status="ACTIVE",
            created_date=now,
            updated_date=now,
        )
        async with AsyncSessionLocal() as db:
            db.add(record)
            await db.commit()
    except Exception as e:
        logger.warning(f"Failed to persist inbound API log in background: {e}")


class EnterpriseApiLoggingMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / ASGI Middleware to automatically intercept, sanitize,
    and persist all Inbound API requests and responses.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if path in EXCLUDED_PATHS or path.startswith("/uploads") or path.startswith("/static"):
            return await call_next(request)

        # Only log /api/v1/ requests or main application APIs
        if not path.startswith("/api/"):
            return await call_next(request)

        start_time = time.perf_counter()
        req_timestamp = datetime.datetime.now(datetime.timezone.utc)
        
        # 1. Capture and assign correlation IDs
        req_id = request.headers.get("x-request-id") or f"REQ-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        corr_id = request.headers.get("x-correlation-id") or f"CORR-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        log_code = f"LOG-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        # 2. Extract client information
        client_ip = request.client.host if request.client else "127.0.0.1"
        user_agent = request.headers.get("user-agent", "")
        client_name = "Retailer Portal Web" if "Mozilla" in user_agent else ("Enterprise Admin" if "Admin" in user_agent else "API Client")

        # 3. Read request body safely and re-stream
        req_body_bytes = b""
        try:
            req_body_bytes = await request.body()
        except Exception:
            pass

        # 4. Extract query parameters and headers
        query_dict = dict(request.query_params) if request.query_params else None
        clean_req_headers = mask_sensitive_headers(dict(request.headers))

        # 5. Extract transaction_id / reference_id if present in body or query
        transaction_id = request.headers.get("x-transaction-id") or (query_dict.get("transaction_id") if query_dict else None) or (query_dict.get("reference_id") if query_dict else None)
        retailer_id = request.headers.get("x-retailer-id") or (query_dict.get("retailer_id") if query_dict else None)

        req_json, req_raw, req_trunc, req_orig_size, req_stored_size = process_and_truncate_payload(req_body_bytes)

        if not transaction_id and isinstance(req_json, dict):
            transaction_id = req_json.get("transaction_id") or req_json.get("reference_id") or req_json.get("transaction_number") or req_json.get("txn_id")
        if not retailer_id and isinstance(req_json, dict):
            retailer_id = req_json.get("retailer_id") or req_json.get("retailer_code")

        # 6. Execute downstream endpoint handler
        res_body_bytes = b""
        res_status_code = 500
        clean_res_headers = {}
        error_msg = None
        error_type = None

        try:
            response = await call_next(request)
            res_status_code = response.status_code
            clean_res_headers = mask_sensitive_headers(dict(response.headers))

            # Consume response body to log it, then reconstruct response stream
            res_body = [section async for section in response.body_iterator]
            response.body_iterator = iterate_in_threadpool(iter(res_body))
            res_body_bytes = b"".join(res_body)
        except Exception as exc:
            res_status_code = 500
            error_msg = str(exc)
            error_type = type(exc).__name__
            raise exc
        finally:
            end_time = time.perf_counter()
            duration_ms = round((end_time - start_time) * 1000, 2)
            res_timestamp = datetime.datetime.now(datetime.timezone.utc)

            res_json, res_raw, res_trunc, res_orig_size, res_stored_size = process_and_truncate_payload(res_body_bytes)

            # Determine response business status
            if res_status_code < 400:
                resp_status = "SUCCESS"
            elif res_status_code in (400, 422):
                resp_status = "VALIDATION_ERROR"
            elif res_status_code in (401, 403):
                resp_status = "HTTP_ERROR"
            elif res_status_code == 408 or res_status_code == 504:
                resp_status = "TIMEOUT"
            else:
                resp_status = "FAILED"

            service_name = infer_service_name(path)
            api_name = infer_api_name(path, request.method)

            # Package log data
            log_data = {
                "log_code": log_code,
                "transaction_id": str(transaction_id) if transaction_id else None,
                "request_id": req_id,
                "correlation_id": corr_id,
                "service_name": service_name,
                "api_name": api_name,
                "http_method": request.method.upper(),
                "endpoint": path,
                "base_url_reference": str(request.base_url).rstrip("/"),
                "environment": "PRODUCTION",
                "client_name": client_name,
                "client_ip": client_ip,
                "retailer_id": str(retailer_id) if retailer_id else None,
                "request_timestamp": req_timestamp,
                "response_timestamp": res_timestamp,
                "duration_ms": duration_ms,
                "http_status_code": res_status_code,
                "response_status": resp_status,
                "error_type": error_type,
                "error_message": error_msg,
                "request_headers": clean_req_headers,
                "request_query": query_dict,
                "request_body": req_json,
                "request_body_raw": req_raw,
                "response_headers": clean_res_headers,
                "response_body": res_json,
                "response_body_raw": res_raw,
                "payload_truncated": req_trunc or res_trunc,
                "original_size_bytes": req_orig_size + res_orig_size,
                "stored_size_bytes": req_stored_size + res_stored_size,
            }

            # Asynchronously persist log in background without blocking response return
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(_save_inbound_log_bg(log_data))
            except Exception as bg_err:
                logger.warning(f"Failed to spawn background log task: {bg_err}")

        return response
