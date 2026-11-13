# DOMAIN RESOLUTION SECURITY AUDIT
## Secure Dynamic Multi-Company Hostname Resolution

**Audited Systems:** Next.js 14 Middleware, FastAPI Company Branding Router, Supabase PostgreSQL  
**Audit Status:** PASSED (Zero Spoofing Vulnerabilities)  

---

## 1. Domain Resolution Architecture

The platform dynamically binds incoming web requests to company tenancies using server-side validated domain mapping:
1. **Request Intake**:
   - Next.js Edge Middleware receives incoming HTTP request.
   - Extracts authoritative `Host` and `X-Forwarded-Host` headers (set by edge reverse proxies such as Cloudflare/Nginx).
2. **Backend Domain Lookup**:
   - Backend queries `public.company` and `public.company_configuration` (`config_key = 'domains'`).
   - Domain strings are sanitized via `extract_clean_domain()`:
     - Strips protocols (`https://`, `http://`).
     - Strips ports (`:3000`, `:55002`).
     - Normalizes subdomains (`login.near4you.store` -> resolves to `near4you.store` / `NEAR4YOU`).
3. **Database Validation**:
   - Domains are stored exclusively in PostgreSQL.
   - Only Central Super Admin (`tenant_ref_id: 1`) can assign or modify domain configurations.
   - Duplicate domain registrations across distinct active companies are strictly prohibited by server-side validation.

---

## 2. Security Threat Model & Mitigations

| Threat Scenario | Vulnerability Risk | Implemented Mitigation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Host Header Spoofing** | Attacker injects fake `Host` header to impersonate another company or redirect auth tokens. | Domain resolution strictly queries pre-registered database records. Unknown or spoofed domains automatically fail-safe to the primary tenant default (`NEAR4YOU`). Tokens are never issued or routed to unregistered origins. | **VERIFIED** |
| **Cross-Company Session Hijacking** | A user authenticated under Company A accesses Company B domain using same cookie. | Tokens carry immutable `company_ref_id` and `tenant_ref_id` in cryptographically signed JWT payload (HS256). Middleware and API routers validate token company against resource company. | **VERIFIED** |
| **Subdomain Hijacking** | Subdomains like `login.*` or `admin.*` claiming unauthorized privileges. | Subdomains route to the single shared application container. Authorization is determined exclusively by database-verified roles, not domain names. | **VERIFIED** |
| **Open Redirects** | Post-login redirects manipulating company hostnames. | Redirect parameters are strictly checked against relative portal paths (`/retailer/dashboard`, `/dist/dashboard`, `/sd/dashboard`). Absolute external URLs in redirect parameters are rejected. | **VERIFIED** |

---

## 3. Verified Hostname Mappings

- `near4you.store` / `login.near4you.store` ➔ **Near4You** (`company_ref_id: 1`, Primary: `#A20A3A`, Accent: `#EDC11E`, Logo: `/branding/logo.svg`)
- `pay2pay.in` / `login.pay2pay.in` ➔ **Pay2Pay** (`company_ref_id: 47`, Primary: `#2563EB`, Accent: `#1E40AF`, Logo: `/branding/pay2pay-logo.png`)
- `smspay.in` / `login.smspay.in` ➔ **SMSPAY** (`company_ref_id: 2`, Primary: `#059669`, Accent: `#047857`, Logo: `/branding/smspay-logo.svg`)
- Future Domain (e.g. `apexpay.in`) ➔ **Dynamically resolved via database** without application restarts.

