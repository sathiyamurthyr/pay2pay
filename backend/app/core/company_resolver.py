import re
from typing import Optional, Dict, Any
from fastapi import Request

COMPANY_MAPPINGS = {
    "SMSPAY": {
        "company_ref_id": 2,
        "company_code": "SMSPAY",
        "company_name": "SMSPAY",
        "legal_name": "SMSPAY Technologies Pvt. Ltd.",
        "display_name": "SMSPAY",
        "logo_url": "/branding/smspay-logo.svg",
        "favicon_url": "/branding/smspay-mark.svg",
        "website": "https://smspay.store",
        "support_email": "support@smspay.store",
        "domains": ["smspay.store", "login.smspay.store", "admin.smspay.store", "smspay.in", "login.smspay.in", "admin.smspay.in"],
        "ports": ["4002"]
    },
    "PAY2PAY": {
        "company_ref_id": 47,
        "company_code": "PAY2PAY",
        "company_name": "Pay2Pay",
        "legal_name": "Pay2Pay FinTech Solutions Pvt. Ltd.",
        "display_name": "Pay2Pay",
        "logo_url": "/branding/pay2pay-logo.png",
        "favicon_url": "/branding/favicon.png",
        "website": "https://pay2pay.in",
        "support_email": "support@pay2pay.in",
        "domains": ["pay2pay.in", "login.pay2pay.in", "admin.pay2pay.in", "pay2pay.com", "admin.pay2pay.com"],
        "ports": ["3000", "4003"]
    },
    "NEAR4YOU": {
        "company_ref_id": 1,
        "company_code": "NEAR4YOU",
        "company_name": "Near4You",
        "legal_name": "Near4You Enterprise Technologies Pvt. Ltd.",
        "display_name": "Near4You",
        "logo_url": "/branding/logo.svg",
        "favicon_url": "/branding/favicon.png",
        "website": "https://near4you.store",
        "support_email": "support@near4you.store",
        "domains": ["near4you.store", "login.near4you.store", "admin.near4you.store", "near4you.in", "admin.near4you.in"],
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
    Returns:
      2 for SMSPAY
      47 for PAY2PAY
      1 for NEAR4YOU
      or None if unknown/unspecified
    """
    if not request:
        return None

    try:
        # 1. Custom domain / tenant isolation headers
        x_comp_ref = request.headers.get("x-company-ref-id")
        if x_comp_ref:
            try:
                return int(x_comp_ref)
            except ValueError:
                pass
        x_comp = (request.headers.get("x-domain") or request.headers.get("x-company-code") or "").lower()
        if "smspay" in x_comp:
            return 2
        if "pay2pay" in x_comp:
            return 47
        if "near4you" in x_comp:
            return 1

        # 2. Explicit query parameters (tested by E2E suites & direct API calls)
        q_dom = (request.query_params.get("domain") or request.query_params.get("company") or "").lower()
        if "smspay" in q_dom:
            return 2
        if "pay2pay" in q_dom:
            return 47
        if "near4you" in q_dom:
            return 1
        comp_ref_param = request.query_params.get("company_ref_id")
        if comp_ref_param:
            try:
                return int(comp_ref_param)
            except ValueError:
                pass
    except Exception:
        pass

    # 2. Host, X-Forwarded-Host, Origin, Referer headers
    host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").lower()
    origin = (request.headers.get("origin") or "").lower()
    referer = (request.headers.get("referer") or "").lower()
    all_headers_str = f"{host} {origin} {referer}"

    if "smspay" in all_headers_str or ":4002" in all_headers_str:
        return 2
    if "pay2pay" in all_headers_str or ":3000" in all_headers_str or ":4003" in all_headers_str:
        return 47
    if "near4you" in all_headers_str or ":4001" in all_headers_str:
        return 1

    return None


def get_company_preset(company_ref_id: Optional[int]) -> Optional[Dict[str, Any]]:
    code = COMPANY_REF_TO_CODE.get(company_ref_id)
    return COMPANY_MAPPINGS.get(code) if code else None
