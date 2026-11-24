"""
Centralized Domain-to-Company & Multi-Tenant Resolution Core.
Resolves incoming HTTP request hostnames to authoritative database company records,
tenant contexts, and strict multi-domain tenant isolation parameters.
"""

import uuid
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

logger = logging.getLogger(__name__)


class DomainCompanyContext(BaseModel):
    domain: str
    cmp_ref_id: int
    tenant_ref_id: int
    app_id: str
    company_code: str
    company_name: str
    tenant_id: Optional[str] = None
    company_id: Optional[str] = None


# Known production root domains mapped to authoritative company & tenant configurations
KNOWN_DOMAIN_MAPPINGS: Dict[str, Dict[str, Any]] = {
    "near4you.store": {
        "domain": "near4you.store",
        "cmp_ref_id": 1,
        "tenant_ref_id": 1,
        "app_id": "NEAR4YOU",
        "company_code": "NEAR4YOU",
        "company_name": "SATHUS TECHNOLOGY PRIVATE LIMITED",
        "tenant_id": "93538c98-0b19-493c-a247-4cdb02a46c68",
        "company_id": None,
    },
    "smspay.store": {
        "domain": "smspay.store",
        "cmp_ref_id": 2,
        "tenant_ref_id": 39,
        "app_id": "SMSPAY",
        "company_code": "SMSPAY",
        "company_name": "INSPEL TECHNOLOGIES SOLUTIONS PVT",
        "tenant_id": "547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        "company_id": None,
    },
    "pay2pay.in": {
        "domain": "pay2pay.in",
        "cmp_ref_id": 47,
        "tenant_ref_id": 1,
        "app_id": "PAY2PAY",
        "company_code": "PAY2PAY",
        "company_name": "SUPER REX PRODUCTS PRIVATE LIMITED",
        "tenant_id": "547aa7bb-a790-4fe2-bd5b-27214ed176c8",
        "company_id": None,
    },
}


def extract_host(request: Request) -> str:
    """Extracts and normalizes hostname from headers, stripping port numbers."""
    raw_host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("x-original-host")
        or request.headers.get("host")
        or ""
    )
    # Split by comma if multiple forwarded hosts exist
    if "," in raw_host:
        raw_host = raw_host.split(",")[0].strip()

    # Strip port number
    if ":" in raw_host:
        raw_host = raw_host.split(":")[0].strip()

    return raw_host.lower()


def match_known_domain(host: str) -> Optional[Dict[str, Any]]:
    """Matches host or subdomain against allowlisted multi-domain definitions."""
    if not host:
        return None

    # 1. Exact or suffix match on production domains
    for root_domain, conf in KNOWN_DOMAIN_MAPPINGS.items():
        if host == root_domain or host.endswith(f".{root_domain}"):
            return conf

    # 2. Localhost development port & query heuristic
    if host in ("localhost", "127.0.0.1", "0.0.0.0"):
        return KNOWN_DOMAIN_MAPPINGS["pay2pay.in"]

    return None


async def resolve_domain_context(request: Request, db: Optional[AsyncSession] = None) -> DomainCompanyContext:
    """
    Authoritative domain resolution. Inspects incoming request headers,
    resolves against static definitions or dynamic database configuration.
    """
    host = extract_host(request)

    # 1. Static allowlist match
    conf = match_known_domain(host)
    if conf:
        return DomainCompanyContext(**conf)

    # 2. Database fallback lookup if db session is provided
    if db:
        try:
            # Query company table by website or company code
            stmt = text("""
                SELECT company_ref_id, company_code, company_name, tenant_ref_id, company_id, tenant_id, website
                FROM public.company
                WHERE is_active = TRUE
                  AND (
                    website ILIKE :host_pattern
                    OR :host ILIKE '%' || company_code || '%'
                  )
                ORDER BY company_ref_id ASC
                LIMIT 1;
            """)
            res = await db.execute(stmt, {"host_pattern": f"%{host}%", "host": host})
            row = res.fetchone()
            if row:
                c_ref, c_code, c_name, t_ref, c_id, t_id, website = row
                app_id = (c_code or "APP").upper()
                return DomainCompanyContext(
                    domain=host,
                    cmp_ref_id=c_ref,
                    tenant_ref_id=t_ref or 1,
                    app_id=app_id,
                    company_code=c_code,
                    company_name=c_name,
                    tenant_id=str(t_id) if t_id else None,
                    company_id=str(c_id) if c_id else None,
                )
        except Exception as err:
            logger.warning(f"[resolve_domain_context] DB lookup failed: {err}")

    # 3. Default fallback to pay2pay.in if unmapped
    logger.warning(f"[resolve_domain_context] Unmapped host '{host}', falling back to pay2pay.in")
    return DomainCompanyContext(**KNOWN_DOMAIN_MAPPINGS["pay2pay.in"])


async def get_domain_context(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> DomainCompanyContext:
    """FastAPI dependency for endpoints requiring verified domain and company context."""
    return await resolve_domain_context(request, db)
