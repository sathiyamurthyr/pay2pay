"""
Centralized Domain-to-Company & Multi-Tenant Resolution Core.
Resolves incoming HTTP request hostnames to authoritative database `public.company`
and `public.company_configuration` records with strict multi-domain isolation.
Never falls back to a default company for unmapped public domains.
"""

import time
import json
import logging
from typing import Optional, Dict, Any, Tuple
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
    legal_name: Optional[str] = None
    display_name: Optional[str] = None
    tenant_id: Optional[str] = None
    company_id: Optional[str] = None


# Short-lived TTL cache (seconds) keyed by normalized hostname -> (timestamp, DomainCompanyContext)
_DOMAIN_CACHE: Dict[str, Tuple[float, DomainCompanyContext]] = {}
_CACHE_TTL_SECONDS = 60.0

# Known local dev ports -> company_ref_id (queried from DB, never hardcoded names)
_LOCAL_DEV_PORT_TO_CMP_REF: Dict[str, int] = {
    "4001": 1,
    "4002": 2,
    "4003": 47,
}


def clear_domain_cache() -> None:
    """Clears cached domain-to-company mappings (call after domain/company updates)."""
    _DOMAIN_CACHE.clear()


def extract_host_and_port(request: Request) -> Tuple[str, str]:
    """Extracts normalized (hostname, port) from forwarded/host headers."""
    raw_host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("x-original-host")
        or request.headers.get("host")
        or ""
    )
    if "," in raw_host:
        raw_host = raw_host.split(",")[0].strip()

    port = ""
    if ":" in raw_host:
        parts = raw_host.split(":", 1)
        raw_host = parts[0].strip()
        port = parts[1].strip()

    return raw_host.lower(), port


def extract_host(request: Request) -> str:
    """Extracts and normalizes hostname from headers, stripping port numbers."""
    host, _ = extract_host_and_port(request)
    return host


def _row_to_context(host: str, row: Any) -> DomainCompanyContext:
    m = row._mapping
    c_code = (m.get("company_code") or "").upper().strip()
    c_name = m.get("company_name") or m.get("legal_name") or m.get("display_name") or c_code
    return DomainCompanyContext(
        domain=host,
        cmp_ref_id=int(m["company_ref_id"]),
        tenant_ref_id=int(m.get("tenant_ref_id") or 1),
        app_id=c_code,
        company_code=c_code,
        company_name=c_name,
        legal_name=m.get("legal_name") or c_name,
        display_name=m.get("display_name") or c_name,
        tenant_id=str(m["tenant_id"]) if m.get("tenant_id") else None,
        company_id=str(m["company_id"]) if m.get("company_id") else None,
    )


def _host_matches_domain_list(host: str, domains_list: Any, website: Optional[str]) -> bool:
    candidates = []
    if isinstance(domains_list, list):
        candidates.extend(domains_list)
    elif isinstance(domains_list, str):
        try:
            parsed = json.loads(domains_list)
            if isinstance(parsed, list):
                candidates.extend(parsed)
        except Exception:
            candidates.append(domains_list)

    if website:
        w = website.strip().lower()
        if "://" in w:
            w = w.split("://", 1)[1]
        w = w.split("/", 1)[0].split(":", 1)[0]
        if w:
            candidates.append(w)

    for dom in candidates:
        d = str(dom or "").strip().lower()
        if "://" in d:
            d = d.split("://", 1)[1]
        d = d.split("/", 1)[0].split(":", 1)[0]
        if not d:
            continue
        if host == d or host.endswith(f".{d}"):
            return True
    return False


async def _lookup_company_in_db_by_host(db: AsyncSession, host: str, port: str = "", explicit_cmp_ref: Optional[int] = None) -> Optional[DomainCompanyContext]:
    stmt = text("""
        SELECT
            c.company_ref_id,
            c.company_code,
            c.company_name,
            c.legal_name,
            c.display_name,
            c.tenant_ref_id,
            c.public_id AS company_id,
            c.tenant_id,
            c.website,
            cc.config_value AS configured_domains
        FROM public.company c
        LEFT JOIN public.company_configuration cc
            ON cc.company_id = c.public_id AND cc.config_key = 'domains' AND cc.is_deleted = FALSE
        WHERE c.is_active = TRUE AND c.is_deleted = FALSE
        ORDER BY c.company_ref_id ASC;
    """)
    res = await db.execute(stmt)
    rows = res.fetchall()

    # 1. Exact or subdomain match against configured_domains / website
    for row in rows:
        m = row._mapping
        if _host_matches_domain_list(host, m.get("configured_domains"), m.get("website")):
            return _row_to_context(host, row)

    # 2. Localhost/internal container resolution ONLY when explicitly requested via dev port or explicit cmp_ref
    if host in ("localhost", "127.0.0.1", "0.0.0.0", "backend", "near4you-retailer-backend"):
        target_ref = explicit_cmp_ref or _LOCAL_DEV_PORT_TO_CMP_REF.get(port)
        if target_ref is not None:
            for row in rows:
                if int(row._mapping["company_ref_id"]) == int(target_ref):
                    return _row_to_context(host, row)

    return None


async def resolve_domain_context(request: Request, db: Optional[AsyncSession] = None) -> DomainCompanyContext:
    """
    Authoritative DB-driven domain resolution.
    Reads `public.company` + `public.company_configuration` by incoming request hostname.
    Fails closed (404 UNMAPPED_DOMAIN) on unmapped hosts — never defaults silently to another company.
    """
    host, port = extract_host_and_port(request)
    is_local = host in ("localhost", "127.0.0.1", "0.0.0.0", "backend", "near4you-retailer-backend")

    # On local/internal test calls only, allow explicit ?domain= / ?company= / x-domain / x-company-ref-id
    effective_host = host
    explicit_cmp_ref: Optional[int] = None
    if is_local:
        hdr_dom = (request.headers.get("x-domain") or request.query_params.get("domain") or "").strip().lower()
        if hdr_dom:
            effective_host = hdr_dom.split("://")[-1].split("/")[0].split(":")[0]
        else:
            x_ref = request.headers.get("x-company-ref-id") or request.query_params.get("company_ref_id")
            if x_ref and str(x_ref).isdigit():
                explicit_cmp_ref = int(x_ref)

    cache_key = f"{effective_host}:{port}:{explicit_cmp_ref or ''}"
    now = time.monotonic()
    cached = _DOMAIN_CACHE.get(cache_key)
    if cached and (now - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    if db is None:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as temp_db:
            ctx = await _lookup_company_in_db_by_host(temp_db, effective_host, port, explicit_cmp_ref)
    else:
        ctx = await _lookup_company_in_db_by_host(db, effective_host, port, explicit_cmp_ref)

    if ctx:
        _DOMAIN_CACHE[cache_key] = (now, ctx)
        return ctx

    logger.warning(f"[resolve_domain_context] Unmapped host '{host}' (effective='{effective_host}', port='{port}')")
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "UNMAPPED_DOMAIN",
            "message": f"Domain '{host}' is not mapped to any registered company in public.company.",
            "domain": host,
        },
    )


async def get_domain_context(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> DomainCompanyContext:
    """FastAPI dependency for endpoints requiring verified domain and company context."""
    return await resolve_domain_context(request, db)
