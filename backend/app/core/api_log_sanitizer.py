import re
import json
from typing import Any, Dict, List, Union, Tuple, Optional

# Max body size in bytes to store in DB (256 KB)
MAX_LOG_PAYLOAD_BYTES = 256 * 1024

SENSITIVE_HEADER_KEYS = {
    "authorization",
    "x-api-key",
    "api-key",
    "apikey",
    "x-auth-token",
    "cookie",
    "set-cookie",
    "secret",
    "client-secret",
    "x-client-secret",
    "signature",
    "x-signature",
    "token",
    "refresh-token",
    "x-refresh-token"
}

SENSITIVE_FIELD_PATTERNS = [
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"^pin$", re.IGNORECASE),
    re.compile(r"^mpin$", re.IGNORECASE),
    re.compile(r"^tpin$", re.IGNORECASE),
    re.compile(r"^otp$", re.IGNORECASE),
    re.compile(r"cvv", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"private_key", re.IGNORECASE),
    re.compile(r"access_token", re.IGNORECASE),
    re.compile(r"refresh_token", re.IGNORECASE),
    re.compile(r"auth_token", re.IGNORECASE),
    re.compile(r"bearer", re.IGNORECASE),
    re.compile(r"encryption_key", re.IGNORECASE),
    re.compile(r"webhook_secret", re.IGNORECASE),
]

PII_FIELD_PATTERNS = {
    "aadhaar": re.compile(r"^(aadhaar|aadhaar_number|uid|aadhaar_no)$", re.IGNORECASE),
    "pan": re.compile(r"^(pan|pan_number|pan_no)$", re.IGNORECASE),
    "account": re.compile(r"^(account_number|account_no|bank_account|bank_acc_no|acc_num|acc_no)$", re.IGNORECASE),
    "card": re.compile(r"^(card_number|card_no|debit_card|credit_card)$", re.IGNORECASE),
}


def mask_sensitive_headers(headers: Union[Dict[str, Any], List[Tuple[str, str]], None]) -> Dict[str, str]:
    """Sanitizes and masks sensitive request/response HTTP headers."""
    if not headers:
        return {}
    
    clean_headers: Dict[str, str] = {}
    if isinstance(headers, dict):
        items = headers.items()
    elif isinstance(headers, list):
        items = headers
    else:
        return {}

    for k, v in items:
        key_str = str(k).strip()
        val_str = str(v).strip()
        lower_k = key_str.lower()
        if lower_k in SENSITIVE_HEADER_KEYS or any(p.search(lower_k) for p in SENSITIVE_FIELD_PATTERNS):
            if lower_k == "authorization" and val_str.lower().startswith("bearer "):
                clean_headers[key_str] = "Bearer **************"
            elif lower_k == "authorization" and val_str.lower().startswith("basic "):
                clean_headers[key_str] = "Basic **************"
            else:
                clean_headers[key_str] = "**************"
        else:
            clean_headers[key_str] = val_str

    return clean_headers


def mask_aadhaar(val: str) -> str:
    digits = re.sub(r"\D", "", str(val))
    if len(digits) == 12:
        return f"XXXX XXXX {digits[-4:]}"
    return "XXXX XXXX " + (digits[-4:] if len(digits) >= 4 else "****")


def mask_pan(val: str) -> str:
    s = str(val).strip().upper()
    if len(s) == 10:
        return f"XXXXX{s[5:9]}X"
    return "XXXXX" + (s[-4:] if len(s) >= 4 else "****")


def mask_bank_account(val: str) -> str:
    s = re.sub(r"\s+", "", str(val))
    if len(s) >= 8:
        return f"XXXX XXXX {s[-4:]}"
    return "XXXX " + (s[-4:] if len(s) >= 4 else "****")


def mask_card(val: str) -> str:
    digits = re.sub(r"\D", "", str(val))
    if len(digits) >= 12:
        return f"XXXX XXXX XXXX {digits[-4:]}"
    return "XXXX XXXX " + (digits[-4:] if len(digits) >= 4 else "****")


def sanitize_payload_obj(obj: Any) -> Any:
    """Recursively sanitizes and masks sensitive fields in dicts and lists."""
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            k_str = str(k)
            # 1. Exact sensitive secret check
            if any(p.search(k_str) for p in SENSITIVE_FIELD_PATTERNS):
                sanitized[k] = "******"
            # 2. PII fields check
            elif PII_FIELD_PATTERNS["aadhaar"].search(k_str) and isinstance(v, (str, int)):
                sanitized[k] = mask_aadhaar(str(v))
            elif PII_FIELD_PATTERNS["pan"].search(k_str) and isinstance(v, str):
                sanitized[k] = mask_pan(v)
            elif PII_FIELD_PATTERNS["account"].search(k_str) and isinstance(v, (str, int)):
                sanitized[k] = mask_bank_account(str(v))
            elif PII_FIELD_PATTERNS["card"].search(k_str) and isinstance(v, (str, int)):
                sanitized[k] = mask_card(str(v))
            else:
                sanitized[k] = sanitize_payload_obj(v)
        return sanitized
    elif isinstance(obj, list):
        return [sanitize_payload_obj(item) for item in obj]
    elif isinstance(obj, str):
        # Check inline string tokens like Bearer JWTs or passwords in query strings
        if obj.startswith("eyJhbGciOi") and len(obj) > 30:
            return "eyJhbGci...[JWT_TOKEN_MASKED]"
        return obj
    return obj


def process_and_truncate_payload(
    body_data: Union[dict, list, str, bytes, None],
    max_bytes: int = MAX_LOG_PAYLOAD_BYTES
) -> Tuple[Optional[Union[dict, list]], Optional[str], bool, int, int]:
    """
    Sanitizes, serializes, and truncates request/response body.
    Returns: (parsed_json_or_none, raw_text_or_none, is_truncated, original_size, stored_size)
    """
    if body_data is None:
        return None, None, False, 0, 0

    parsed_obj: Optional[Union[dict, list]] = None
    raw_str: str = ""

    if isinstance(body_data, (dict, list)):
        sanitized = sanitize_payload_obj(body_data)
        parsed_obj = sanitized
        try:
            raw_str = json.dumps(sanitized)
        except Exception:
            raw_str = str(sanitized)
    elif isinstance(body_data, (bytes, bytearray)):
        try:
            decoded = body_data.decode("utf-8", errors="replace")
        except Exception:
            decoded = str(body_data)
        try:
            loaded = json.loads(decoded)
            sanitized = sanitize_payload_obj(loaded)
            parsed_obj = sanitized
            raw_str = json.dumps(sanitized)
        except Exception:
            raw_str = decoded
    elif isinstance(body_data, str):
        try:
            loaded = json.loads(body_data)
            sanitized = sanitize_payload_obj(loaded)
            parsed_obj = sanitized
            raw_str = json.dumps(sanitized)
        except Exception:
            raw_str = body_data
    else:
        raw_str = str(body_data)

    original_size = len(raw_str.encode("utf-8", errors="replace"))
    is_truncated = False

    if original_size > max_bytes:
        is_truncated = True
        # Truncate raw_str
        raw_str = raw_str[:max_bytes] + "\n...[TRUNCATED: Exceeded Max Size]..."
        parsed_obj = None  # JSON might no longer be valid after string truncation

    stored_size = len(raw_str.encode("utf-8", errors="replace"))
    return parsed_obj, raw_str, is_truncated, original_size, stored_size
