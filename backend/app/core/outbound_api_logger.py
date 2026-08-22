import uuid
import datetime
import asyncio
import logging
from typing import Optional, Dict, Any, Union

from app.core.database import AsyncSessionLocal
from app.infrastructure.db.enterprise_api_log_model import EnterpriseApiLogModel
from app.core.api_log_sanitizer import (
    mask_sensitive_headers,
    process_and_truncate_payload
)

logger = logging.getLogger("enterprise_api_logger")

DEFAULT_TENANT_ID = uuid.UUID("547aa7bb-a790-4fe2-bd5b-27214ed176c8")
DEFAULT_COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


async def log_outbound_api_call(
    provider_name: str,
    service_name: str,
    endpoint: str,
    http_method: str = "POST",
    base_url_reference: Optional[str] = None,
    api_name: Optional[str] = None,
    transaction_id: Optional[str] = None,
    request_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    client_reference_id: Optional[str] = None,
    provider_reference_id: Optional[str] = None,
    parent_request_id: Optional[str] = None,
    request_headers: Optional[Dict[str, Any]] = None,
    request_body: Optional[Union[dict, list, str, bytes]] = None,
    request_query: Optional[Dict[str, Any]] = None,
    response_headers: Optional[Dict[str, Any]] = None,
    response_body: Optional[Union[dict, list, str, bytes]] = None,
    http_status_code: int = 200,
    duration_ms: float = 0.0,
    response_status: str = "SUCCESS",
    provider_response_code: Optional[str] = None,
    provider_response_message: Optional[str] = None,
    error_code: Optional[str] = None,
    error_type: Optional[str] = None,
    error_message: Optional[str] = None,
    stack_trace: Optional[str] = None,
    retailer_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    performed_by: Optional[str] = "System Gateway",
    tenant_id: Optional[uuid.UUID] = None,
    company_id: Optional[uuid.UUID] = None,
    environment: str = "PRODUCTION",
) -> Optional[str]:
    """
    Persists an OUTBOUND vendor/provider API call to the enterprise_api_log table.
    Ensures PII & secret masking, size truncation, and zero disruption to the calling flow.
    Returns: log_code string
    """
    log_code = f"LOG-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    
    try:
        # Mask headers
        clean_req_headers = mask_sensitive_headers(request_headers)
        clean_res_headers = mask_sensitive_headers(response_headers)

        # Process and mask payloads
        req_json, req_raw, req_trunc, req_orig_size, req_stored_size = process_and_truncate_payload(request_body)
        res_json, res_raw, res_trunc, res_orig_size, res_stored_size = process_and_truncate_payload(response_body)

        is_truncated = req_trunc or res_trunc
        total_orig_size = req_orig_size + res_orig_size
        total_stored_size = req_stored_size + res_stored_size

        if not api_name:
            api_name = f"{provider_name} {service_name} API Call"

        now = datetime.datetime.now(datetime.timezone.utc)
        req_time = now - datetime.timedelta(milliseconds=duration_ms) if duration_ms > 0 else now

        log_record = EnterpriseApiLogModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id or DEFAULT_TENANT_ID,
            company_id=company_id or DEFAULT_COMPANY_ID,
            log_code=log_code,
            transaction_id=str(transaction_id) if transaction_id else None,
            request_id=str(request_id) if request_id else f"REQ-{uuid.uuid4().hex[:8].upper()}",
            correlation_id=str(correlation_id) if correlation_id else None,
            client_reference_id=str(client_reference_id) if client_reference_id else None,
            provider_reference_id=str(provider_reference_id) if provider_reference_id else None,
            parent_request_id=str(parent_request_id) if parent_request_id else None,
            service_name=service_name.upper(),
            api_name=api_name,
            direction="OUTBOUND",
            http_method=http_method.upper(),
            endpoint=endpoint,
            base_url_reference=base_url_reference,
            environment=environment,
            client_name="Enterprise Platform Backend",
            client_ip="127.0.0.1",
            provider_name=provider_name,
            retailer_id=str(retailer_id) if retailer_id else None,
            customer_id=str(customer_id) if customer_id else None,
            performed_by=performed_by,
            request_timestamp=req_time,
            response_timestamp=now,
            duration_ms=round(duration_ms, 2),
            http_status_code=http_status_code,
            response_status=response_status.upper(),
            provider_response_code=provider_response_code,
            provider_response_message=provider_response_message,
            error_code=error_code,
            error_type=error_type,
            error_message=error_message,
            stack_trace=stack_trace,
            request_headers=clean_req_headers,
            request_query=request_query,
            request_body=req_json,
            request_body_raw=req_raw,
            response_headers=clean_res_headers,
            response_body=res_json,
            response_body_raw=res_raw,
            payload_truncated=is_truncated,
            original_size_bytes=total_orig_size,
            stored_size_bytes=total_stored_size,
            is_active=True,
            record_status="ACTIVE",
            created_date=now,
            updated_date=now,
        )

        async with AsyncSessionLocal() as db:
            db.add(log_record)
            await db.commit()

        return log_code
    except Exception as e:
        logger.warning(f"Failed to persist outbound API log: {e}")
        return None
