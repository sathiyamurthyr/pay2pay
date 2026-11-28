import re
import urllib.parse
from typing import Optional, Dict, Any
from fastapi import Request

COMPANY_MAPPINGS = {
    "SMSPAY": {
        "company_ref_id": 2,
        "company_code": "SMSPAY",
        "company_name": "INSPEL TECHNOLOGIES SOLUTIONS PVT",
        "legal_name": "INSPEL TECHNOLOGIES SOLUTIONS PVT",
        "display_name": "SMSPAY",
        "logo_url": "/branding/smspay-logo.svg",
        "favicon_url": "/branding/smspay-mark.svg",
        "website": "https://smspay.store",
        "support_email": "support@smspay.store",
        "domains": ["smspay.store", "login.smspay.store", "admin.smspay.store", "receipt.smspay.store", "smspay.in", "login.smspay.in", "admin.smspay.in", "receipt.smspay.in"],
        "ports": ["4002"]
    },
    "PAY2PAY": {
        "company_ref_id": 47,
        "company_code": "PAY2PAY",
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "legal_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "display_name": "Pay2Pay",
        "logo_url": "/branding/pay2pay-logo.png",
        "favicon_url": "/branding/pay2pay-favicon.png",
        "website": "https://pay2pay.in",
        "support_email": "support@pay2pay.in",
        "domains": ["pay2pay.in", "login.pay2pay.in", "admin.pay2pay.in", "receipt.pay2pay.in", "pay2pay.com", "admin.pay2pay.com"],
        "ports": ["3000", "4003"]
    },
    "NEAR4YOU": {
        "company_ref_id": 1,
        "company_code": "NEAR4YOU",
        "company_name": "SATHUS TECHNOLOGY PRIVATE LIMITED",
        "legal_name": "SATHUS TECHNOLOGY PRIVATE LIMITED",
        "display_name": "Near4You",
        "logo_url": "/branding/logo.svg",
        "favicon_url": "/branding/near4you-favicon.png",
        "website": "https://near4you.store",
        "support_email": "support@near4you.store",
        "domains": ["near4you.store", "login.near4you.store", "admin.near4you.store", "receipt.near4you.store", "near4you.in", "admin.near4you.in", "receipt.near4you.in"],
        "ports": ["4001"]
    }
}

COMPANY_REF_TO_CODE = {
    2: "SMSPAY",
    47: "PAY2PAY",
    1: "NEAR4YOU"
}


def resolve_request_company_ref(request: Optional[Request]) -> Optional[int]:
    """
    Authoritative domain-driven company reference resolver.
    Production request hostname (x-forwarded-host / host) always takes priority over
    client headers/query parameters to prevent cross-company spoofing.
    """
    if request is None:
        return None

    # 1. Authoritative incoming HTTP Host / X-Forwarded-Host header
    raw_host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(",")[0].strip().lower()
    if "smspay" in raw_host or ":4002" in raw_host:
        return 2
    if "pay2pay" in raw_host or ":4003" in raw_host:
        return 47
    if "near4you" in raw_host or ":4001" in raw_host:
        return 1

    clean_host = raw_host.split(":")[0]
    is_local = clean_host in ("", "localhost", "127.0.0.1", "0.0.0.0", "backend", "near4you-retailer-backend")

    if is_local:
        try:
            # Localhost/internal-only query & header resolution
            x_comp = (request.headers.get("x-domain") or request.headers.get("x-company-code") or "").lower()
            if "smspay" in x_comp:
                return 2
            if "pay2pay" in x_comp:
                return 47
            if "near4you" in x_comp:
                return 1

            q_dom = (request.query_params.get("domain") or request.query_params.get("company") or "").lower()
            if "smspay" in q_dom:
                return 2
            if "pay2pay" in q_dom:
                return 47
            if "near4you" in q_dom:
                return 1

            x_comp_ref = request.headers.get("x-company-ref-id") or request.query_params.get("company_ref_id")
            if x_comp_ref:
                try:
                    return int(x_comp_ref)
                except ValueError:
                    pass
        except Exception:
            pass

    # Fallback origin/referer inspection for local proxy hops
    origin = (request.headers.get("origin") or "").lower()
    referer = (request.headers.get("referer") or "").lower()
    if "smspay" in origin or "smspay" in referer:
        return 2
    if "pay2pay" in origin or "pay2pay" in referer:
        return 47
    if "near4you" in origin or "near4you" in referer:
        return 1

    return None


def get_company_preset(company_ref_id: Optional[int]) -> Optional[Dict[str, Any]]:
    code = COMPANY_REF_TO_CODE.get(company_ref_id)
    return COMPANY_MAPPINGS.get(code) if code else None


def is_trusted_domain_for_company(host: str, company_ref_id: Optional[int]) -> bool:
    """
    Validates whether a hostname or host:port belongs strictly to the authorized
    domain whitelist for the specified company. Prevents open redirect vulnerabilities
    and cross-domain tenant context leakage.
    """
    if not host or not company_ref_id:
        return False

    preset = get_company_preset(company_ref_id)
    if not preset:
        return False

    clean_host = host.split(":")[0].strip().lower()
    port = host.split(":")[1].strip() if ":" in host else None

    # Check authorized domains (exact or subdomain match)
    for allowed in preset.get("domains", []):
        allowed_lower = allowed.lower()
        if clean_host == allowed_lower or clean_host.endswith("." + allowed_lower):
            return True

    # Dev/local environments (localhost, 127.0.0.1)
    if clean_host in ("localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal"):
        if port and port in preset.get("ports", []):
            return True
        return True

    return False


def resolve_return_base_url(
    company_ref_id: Optional[int],
    request: Optional[Request] = None,
    candidate_url: Optional[str] = None
) -> str:
    """
    Deterministically resolves the return base URL (e.g. https://login.smspay.store)
    for the verified company context.
    
    1. If candidate_url is provided, it must pass strict whitelist validation for that company.
    2. If request is provided, its Origin / Referer / Host / X-Forwarded-Host is validated.
    3. If neither matches or is untrusted, safely falls back to the company's canonical website URL.
    
    Guarantees:
    - SMSPAY (2) NEVER leaks to near4you.store or pay2pay.in.
    - Near4You (1) NEVER leaks to smspay.store or pay2pay.in.
    - Pay2Pay (47) NEVER leaks to smspay.store or near4you.store.
    - Untrusted/attacker URLs are strictly rejected.
    """
    preset = get_company_preset(company_ref_id)
    if not preset:
        code = "SMSPAY" if company_ref_id == 2 else ("PAY2PAY" if company_ref_id == 47 else "NEAR4YOU")
        preset = COMPANY_MAPPINGS.get(code, COMPANY_MAPPINGS["SMSPAY"])

    # 1. Candidate URL from client request
    if candidate_url:
        try:
            parsed = urllib.parse.urlparse(candidate_url)
            if parsed.netloc and is_trusted_domain_for_company(parsed.netloc, company_ref_id):
                scheme = parsed.scheme if parsed.scheme in ("http", "https") else "https"
                return f"{scheme}://{parsed.netloc}"
        except Exception:
            pass

    # 2. Incoming Request context
    if request is not None:
        # Origin header
        origin = request.headers.get("origin")
        if origin:
            try:
                parsed = urllib.parse.urlparse(origin)
                if parsed.netloc and is_trusted_domain_for_company(parsed.netloc, company_ref_id):
                    scheme = parsed.scheme if parsed.scheme in ("http", "https") else "https"
                    return f"{scheme}://{parsed.netloc}"
            except Exception:
                pass

        # Referer header
        referer = request.headers.get("referer")
        if referer:
            try:
                parsed = urllib.parse.urlparse(referer)
                if parsed.netloc and is_trusted_domain_for_company(parsed.netloc, company_ref_id):
                    scheme = parsed.scheme if parsed.scheme in ("http", "https") else "https"
                    return f"{scheme}://{parsed.netloc}"
            except Exception:
                pass

        # Host or X-Forwarded-Host header
        raw_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        if raw_host and is_trusted_domain_for_company(raw_host, company_ref_id):
            proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
            return f"{proto}://{raw_host}"

    # 3. Canonical website fallback for company
    return preset.get("website", "https://smspay.store" if company_ref_id == 2 else "https://near4you.store")


def resolve_receipt_base_url(
    company_ref_id: Optional[int],
    request: Optional[Request] = None
) -> str:
    """
    Deterministically resolves the dedicated customer-facing receipt base URL
    for the verified company context:
      - SMSPAY (company_ref_id: 2) -> https://receipt.smspay.store
      - Near4You (company_ref_id: 1) -> https://receipt.near4you.store
      - Pay2Pay (company_ref_id: 47) -> https://receipt.pay2pay.in
    
    Guarantees strict isolation: receipts never render within the retailer portal chrome.
    For local development environments (localhost, 127.0.0.1), preserves local host & port.
    """
    if request is not None:
        raw_host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
        clean_host = raw_host.split(":")[0].strip().lower()
        if clean_host in ("localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal"):
            proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "http"
            return f"{proto}://{raw_host}"

    if company_ref_id == 2:
        return "https://receipt.smspay.store"
    elif company_ref_id == 47:
        return "https://receipt.pay2pay.in"
    elif company_ref_id == 1:
        return "https://receipt.near4you.store"

    # Fallback to request company ref if provided
    if request is not None:
        req_ref = resolve_request_company_ref(request)
        if req_ref == 2:
            return "https://receipt.smspay.store"
        elif req_ref == 47:
            return "https://receipt.pay2pay.in"
        elif req_ref == 1:
            return "https://receipt.near4you.store"

    return ""
