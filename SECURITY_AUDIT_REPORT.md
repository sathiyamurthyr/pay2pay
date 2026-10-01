# ENTERPRISE SECURITY AUDIT REPORT
**Target System:** Pay2Pay Enterprise Financial & Multi-Tenant Retailer Platform  
**Target Architecture:** Next.js Monorepo (Apps) & FastAPI Async Microservices (Backend)  
**Database:** PostgreSQL 16 (Supabase Managed Engine with Transaction SPs)  
**Audit Scope:** `d:\pay2pay`  
**Classification:** STRICTLY CONFIDENTIAL — PRODUCTION HARDENING  

---

## 1. Executive Summary

An exhaustive security audit was executed across the Pay2Pay codebase covering configuration, authentication, authorization, role-based access controls (RBAC), multi-tenant isolation, session management, file uploads, API endpoints, error handling, CORS, and dependency structures. 

The audit identified critical security vulnerabilities that could allow unauthorized wallet adjustments, identity spoofing, unrestricted document exposure, credential theft via cross-origin requests, and administrative privilege bypass.

This document records each identified vulnerability with technical evidence, real-world attack scenarios, risk impact, required remediation, and verification tests.

---

## 2. Vulnerability Findings Matrix

| Finding ID | Severity | Component | Summary | Status |
|---|---|---|---|---|
| **PAY2PAY-CRIT-01** | CRITICAL | Financial Ledger / Wallet Adjustment | Unauthenticated Wallet Balance Adjustment (`/wallet/adjust`) | NEEDS_REMEDIATION |
| **PAY2PAY-CRIT-02** | CRITICAL | Core Middleware / CORS | Overly Permissive CORS with Credentials Allowed (`https?://.*`) | NEEDS_REMEDIATION |
| **PAY2PAY-CRIT-03** | CRITICAL | Admin Retailer Control Router | Unauthenticated Retailer Admin Controller & Impersonation Engine | NEEDS_REMEDIATION |
| **PAY2PAY-CRIT-04** | CRITICAL | Configuration & Environment | Hardcoded DB Passwords, JWT Keys, & Third-Party Secrets in Fallback Configs | NEEDS_REMEDIATION |
| **PAY2PAY-HIGH-01** | HIGH | Topup Router / Identity Resolution | Identity Spoofing & IDOR via Query/Header Retailer Fallback | NEEDS_REMEDIATION |
| **PAY2PAY-HIGH-02** | HIGH | Document Upload & Storage | Unauthenticated KYC Document Streaming & Potential Path Traversal | NEEDS_REMEDIATION |
| **PAY2PAY-HIGH-03** | HIGH | Topup Workflow / Approval Engine | Missing Role & Permission Verification on Topup Approval & Rejection | NEEDS_REMEDIATION |
| **PAY2PAY-HIGH-04** | HIGH | Admin Verification Router | Unauthenticated Admin KYC Verification & Client-Supplied Identity Trust | NEEDS_REMEDIATION |
| **PAY2PAY-HIGH-05** | HIGH | Retailer Management Directory | Public Information Disclosure of Approved Retailers & Balances | NEEDS_REMEDIATION |
| **PAY2PAY-HIGH-06** | HIGH | Customer Lifecycle Service | Multi-Tenant Data Leakage in Customer Search & Profile Inspection | NEEDS_REMEDIATION |
| **PAY2PAY-MED-01** | MEDIUM | Enterprise Auth / OTP Service | Missing Rate Limiting and Attempt Lockout on OTP Verification | NEEDS_REMEDIATION |
| **PAY2PAY-MED-02** | MEDIUM | Core Security & Crypto | Plaintext Password Fallback in Verification Handler | NEEDS_REMEDIATION |
| **PAY2PAY-MED-03** | MEDIUM | HTTP Middleware / Headers | Incomplete Security Headers (Missing CSP, Referrer, Permissions Policies) | NEEDS_REMEDIATION |
| **PAY2PAY-MED-04** | MEDIUM | Error Handling Middleware | Missing Global Uncaught Exception Masking (Risk of Stack Trace Leakage) | NEEDS_REMEDIATION |
| **PAY2PAY-LOW-01** | LOW | Docker Infrastructure | Plaintext Credentials Stored in `docker-compose.yml` | NEEDS_REMEDIATION |
| **PAY2PAY-INFO-01** | INFORMATIONAL | Git Version History | Historical `.env` Commits and Credentials in Repository History | NEEDS_REMEDIATION |

---

## 3. Detailed Technical Findings

### Finding: PAY2PAY-CRIT-01
- **Severity:** CRITICAL (CVSS v3.1 Score: 10.0)
- **Affected Component:** `backend/app/presentation/api/v1/wallet_adjustment_router.py`
- **Evidence:**
  Lines 36–55 of `wallet_adjustment_router.py`:
  ```python
  @router.post("/wallet/adjust", response_model=WalletAdjustmentResult)
  @router.post("/wallet/balance-update", response_model=WalletAdjustmentResult)
  @router.post("/admin/wallet/adjust", response_model=WalletAdjustmentResult)
  async def adjust_wallet_balance_endpoint(
      req: WalletAdjustmentDTO,
      request: Request,
      db: AsyncSession = Depends(get_db)
  ):
  ```
  The endpoint lacks `Depends(get_current_user)` or any authentication/permission dependency.
- **Attack Scenario:**
  An unauthenticated remote attacker issues a simple POST request to `http://api.pay2pay.in/wallet/adjust` or `/admin/wallet/adjust` with payload:
  ```json
  {
    "user_ref_id": 105,
    "amount": 500000.00,
    "adjustment_type": "CREDIT",
    "remarks": "Free money"
  }
  ```
  The server invokes the stored procedure `public.wallet_balance_update` and credits ₹500,000 to the wallet without verifying the identity or authorization of the requester.
- **Risk:** Catastrophic financial theft, fraudulent wallet inflation, balance manipulation.
- **Recommended Remediation:**
  Enforce authentication dependency `current_admin: AdminUserModel = Depends(get_current_user)` and require explicit permission `_: bool = require_permission("manage:wallet")` or platform admin role check.
- **Files Affected:**
  - `backend/app/presentation/api/v1/wallet_adjustment_router.py`
  - `pay2pay-platform/apps/api/app/presentation/api/v1/wallet_adjustment_router.py`
- **Test Required:**
  Automated HTTP test attempting unauthenticated POST to `/wallet/adjust` verifying `401 Unauthorized` or `403 Forbidden`.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-CRIT-02
- **Severity:** CRITICAL (CVSS v3.1 Score: 9.3)
- **Affected Component:** `backend/app/main.py`
- **Evidence:**
  Lines 63–70 of `backend/app/main.py`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.BACKEND_CORS_ORIGINS,
      allow_origin_regex=r"https?://.*",
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **Attack Scenario:**
  Because `allow_origin_regex=r"https?://.*"` matches all HTTP and HTTPS origins and `allow_credentials=True` is enabled, any malicious website (e.g., `https://attacker-site.com`) visited by a logged-in Pay2Pay user can send cross-origin fetch requests with credentials (cookies or Authorization headers) to the API and read response data (such as wallet balances, personal customer KYC data, or transaction ledgers).
- **Risk:** Total cross-origin credential hijacking and confidential financial data exfiltration.
- **Recommended Remediation:**
  Remove `allow_origin_regex=r"https?://.*"`. Restrict allowed origins strictly to the explicit list in `settings.BACKEND_CORS_ORIGINS` (including production domains and trusted development localhost ports).
- **Files Affected:**
  - `backend/app/main.py`
  - `pay2pay-platform/apps/api/app/main.py`
- **Test Required:**
  Automated test verifying preflight CORS request with `Origin: https://evil-attacker.com` is rejected or does not return `Access-Control-Allow-Origin: https://evil-attacker.com`.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-CRIT-03
- **Severity:** CRITICAL (CVSS v3.1 Score: 9.8)
- **Affected Component:** `backend/app/presentation/api/v1/admin_retailer_controller.py`
- **Evidence:**
  In `admin_retailer_controller.py`, routes including:
  - `GET /admin/retailer-control/list` (Line 62)
  - `GET /admin/retailer-control/{retailer_id}/overview` (Line 164)
  - `POST /admin/retailer-control/{retailer_id}/status` (Line 333)
  - `POST /admin/retailer-control/{retailer_id}/services` (Line 483)
  - `POST /admin/retailer-control/{retailer_id}/limits` (Line 508)
  - `POST /admin/retailer-control/{retailer_id}/reset-credentials` (Line 530)
  - `POST /admin/retailer-control/{retailer_id}/revoke-sessions` (Line 549)
  - `POST /admin/retailer-control/{retailer_id}/impersonate` (Line 565)
  - `POST /admin/retailer-control/{retailer_id}/wallet-adjust` (Line 584)
  have no authentication dependencies (`Depends(get_current_user)` is missing from every function signature).
- **Attack Scenario:**
  An anonymous attacker calls `POST /admin/retailer-control/{retailer_id}/impersonate` to receive a delegated support token and log in as that retailer, or calls `POST /admin/retailer-control/{retailer_id}/wallet-adjust` or `POST /admin/retailer-control/{retailer_id}/status` to approve or suspend accounts.
- **Risk:** Complete system compromise, account takeover, unauthorized financial balance adjustments.
- **Recommended Remediation:**
  Apply `current_user: AdminUserModel = Depends(get_current_user)` and `_: bool = require_permission("manage:retailer")` to all endpoints in this controller.
- **Files Affected:**
  - `backend/app/presentation/api/v1/admin_retailer_controller.py`
- **Test Required:**
  Automated tests for each administrative action ensuring unauthenticated requests receive HTTP 401.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-CRIT-04
- **Severity:** CRITICAL (CVSS v3.1 Score: 9.1)
- **Affected Component:** `backend/app/core/config.py` & `pay2pay-platform/apps/api/app/core/config.py`
- **Evidence:**
  `config.py` lines 36–95 contain hardcoded production credentials as defaults:
  - `DATABASE_URL`: Contains production Supabase password `AivioSathus!321`.
  - `ALEMBIC_DATABASE_URL`: Contains production Supabase password `AivioSathus!321`.
  - `SECRET_KEY`: Hardcoded JWT secret key.
  - `REFRESH_SECRET_KEY`: Hardcoded JWT refresh secret key.
  - `URBANRUPEE_API_TOKEN`: Hardcoded live bearer token `pk_6955bdbab906ece...`.
  - `B2_KEY_ID` & `B2_APP_KEY`: Hardcoded Backblaze storage keys.
  - `WHATSAPP_AUTH_TOKEN`: Hardcoded live Meta Graph API token `EAAHe8ickOaEBO5...`.
- **Attack Scenario:**
  If environment variables are omitted or an attacker accesses the repository code, they obtain direct root read/write access to the Supabase database, live UrbanRupee financial payouts, Meta WhatsApp messages, and B2 storage buckets.
- **Risk:** Total data breach, unauthorized financial debit, leak of all PII and KYC documents.
- **Recommended Remediation:**
  Remove all plaintext passwords, tokens, and secrets from default values in `config.py`. Enforce reading strictly from environment variables or secure secret managers, with clear validation in non-development environments.
- **Files Affected:**
  - `backend/app/core/config.py`
  - `pay2pay-platform/apps/api/app/core/config.py`
- **Test Required:**
  Configuration unit tests verifying settings instantiate correctly from environment variables without exposing sensitive defaults.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-HIGH-01
- **Severity:** HIGH (CVSS v3.1 Score: 8.5)
- **Affected Component:** `backend/app/presentation/api/v1/topup_router.py`
- **Evidence:**
  Lines 435–464 of `topup_router.py`:
  ```python
  # 3. Check query/header retailer identification (x-retailer-code, x-retailer-id, or query param)
  q_retailer_id = request.query_params.get("retailer_id") or request.query_params.get("retailer_code")
  h_retailer_id = request.headers.get("x-retailer-id") or request.headers.get("x-retailer-code")
  caller_cand = q_retailer_id or h_retailer_id
  if caller_cand and caller_cand != "00000000-0000-0000-0000-000000000000":
      # Queries database and assigns identity to this unverified caller_cand
  ```
- **Attack Scenario:**
  An attacker with any valid low-privilege JWT token appends `?retailer_code=RET-VICTIM` to topup requests. The dependency `get_authenticated_retailer` resolves and returns the victim retailer record, allowing the attacker to create requests or query private balances under the victim's account.
- **Risk:** Insecure Direct Object Reference (IDOR), identity impersonation, cross-account balance visibility.
- **Recommended Remediation:**
  Remove query parameter and custom header fallback for identity resolution. Identity must be resolved strictly and exclusively from verified cryptographic JWT claims (`sub`, verified claims). If an administrative user queries a retailer on their behalf, it must be explicitly restricted to authenticated admin users with proper permissions.
- **Files Affected:**
  - `backend/app/presentation/api/v1/topup_router.py`
  - `pay2pay-platform/apps/api/app/presentation/api/v1/topup_router.py`
- **Test Required:**
  Test calling retailer endpoints with a token for Retailer A and passing `retailer_code=Retailer B` in query/header, asserting that Retailer B's data is NOT accessed.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-HIGH-02
- **Severity:** HIGH (CVSS v3.1 Score: 8.6)
- **Affected Component:** `backend/app/presentation/api/v1/upload.py`
- **Evidence:**
  Lines 169–231 of `upload.py`:
  ```python
  @router.api_route("/document", methods=["GET", "HEAD"], summary="Proxy & Stream KYC Document / PDF with Auth")
  async def stream_document(
      path: str,
  ):
  ...
  @router.get("/signed-url", summary="Get Authenticated Backblaze B2 Download URL")
  async def get_signed_download_url(path: str):
  ```
  Neither `/document` nor `/signed-url` requires authentication. Furthermore, `local_candidates = [Path("uploads") / clean, ...]` concatenates untrusted user input without verifying that the resolved path stays within the base directory.
- **Attack Scenario:**
  1. An unauthenticated attacker enumerates paths like `GET /api/v1/upload/document?path=kyc/pan_12345.jpg` and downloads sensitive personal KYC records.
  2. An attacker attempts path traversal via `GET /api/v1/upload/document?path=../../etc/passwd`.
  3. An attacker calls `GET /api/v1/upload/signed-url?path=sensitive_doc.pdf` to generate pre-signed direct download URLs.
- **Risk:** Massive PII data breach, violation of DPDP / privacy regulations, path traversal.
- **Recommended Remediation:**
  1. Enforce authentication `current_user: AdminUserModel = Depends(get_current_user)` on both `/document` and `/signed-url`.
  2. Implement strict path normalization using `Path.resolve()` to ensure paths remain constrained within the allowed upload root directory.
- **Files Affected:**
  - `backend/app/presentation/api/v1/upload.py`
- **Test Required:**
  Automated tests verifying unauthenticated requests to `/upload/document` and `/upload/signed-url` return HTTP 401, and path traversal attempts return 400 or 404.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-HIGH-03
- **Severity:** HIGH (CVSS v3.1 Score: 8.8)
- **Affected Component:** `backend/app/presentation/api/v1/topup_router.py`
- **Evidence:**
  Lines 2616–2623 and 3094–3100 of `topup_router.py`:
  ```python
  @router.post("/requests/{request_id}/approve")
  async def approve_topup_request(
      request_id: str,
      req: TopupApprovalRequest,
      current_admin: AdminUserModel = Depends(get_current_user),
      db: AsyncSession = Depends(get_db)
  ):
  ```
  In `dependencies.py`, `get_current_user` also resolves non-admin users (such as Retailers) and maps them to an `AdminUserModel` instance with `user_type="RETAILER"`. There is no check verifying that `current_admin.user_type` is an admin or that the user possesses topup approval permissions.
- **Attack Scenario:**
  A retailer user obtains their own valid session token and issues `POST /api/v1/topup/requests/{my_request_id}/approve`. The request passes `get_current_user` and approves the topup, moving company funds to the retailer's wallet.
- **Risk:** Financial loss via unauthorized self-approval of topup requests.
- **Recommended Remediation:**
  Enforce explicit permission check or role check:
  `require_permission("approve:topup")` or verify `current_admin.user_type in ("ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN")`.
- **Files Affected:**
  - `backend/app/presentation/api/v1/topup_router.py`
  - `pay2pay-platform/apps/api/app/presentation/api/v1/topup_router.py`
- **Test Required:**
  Automated test asserting a retailer user token attempting to approve or reject a topup is rejected with HTTP 403 Forbidden.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-HIGH-04
- **Severity:** HIGH (CVSS v3.1 Score: 8.6)
- **Affected Component:** `backend/app/presentation/api/v1/admin_verification_router.py`
- **Evidence:**
  Lines 78–102 of `admin_verification_router.py`:
  - `GET /admin/verification/requests` has NO auth dependency.
  - `GET /admin/verification/requests/{verification_id}` has NO auth dependency.
  - `POST /admin/verification/requests/{verification_id}/action` takes:
    ```python
    class ActionPayload(BaseModel):
        action: str
        admin_id: str
        remarks: str
        admin_role: Optional[str] = "COMPLIANCE_OFFICER"
    ```
    and executes KYC status changes without validating the caller.
- **Attack Scenario:**
  An anonymous attacker calls `GET /admin/verification/requests` to harvest personal verification requests, then calls `POST /admin/verification/requests/{id}/action` with payload `{"action": "APPROVE", "admin_id": "spoofed_admin"}` to approve fraudulent KYC profiles.
- **Risk:** Complete KYC verification bypass, regulatory compliance failure, identity fraud.
- **Recommended Remediation:**
  Require `current_user: AdminUserModel = Depends(get_current_user)` and `_: bool = require_permission("verify:kyc")` on all verification routes. Derive `admin_id` and `admin_role` from the authenticated session, ignoring client-supplied payload values.
- **Files Affected:**
  - `backend/app/presentation/api/v1/admin_verification_router.py`
- **Test Required:**
  Automated test ensuring unauthenticated KYC listing or action calls return HTTP 401.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-HIGH-05
- **Severity:** HIGH (CVSS v3.1 Score: 7.5)
- **Affected Component:** `backend/app/presentation/api/v1/retailers.py`
- **Evidence:**
  Lines 123–168 of `retailers.py`:
  ```python
  @router.get("/approved")
  async def list_approved_retailers(
      search: Optional[str] = Query(None),
      company_id: Optional[str] = Query(None),
      db: AsyncSession = Depends(get_db)
  ):
  ```
  Unauthenticated endpoint returns `registered_mobile`, `email`, `wallet_balance`, `retailer_code`, and `owner_name`.
- **Attack Scenario:**
  Anyone on the public internet queries `GET /api/v1/retailers/approved` and downloads the complete database of approved retailers, their phone numbers, and live financial wallet balances.
- **Risk:** Severe privacy violation, competitive intelligence leakage, targeted phishing/social engineering.
- **Recommended Remediation:**
  Add `current_user: AdminUserModel = Depends(get_current_user)` and scope retailer listing strictly to the caller's tenant.
- **Files Affected:**
  - `backend/app/presentation/api/v1/retailers.py`
- **Test Required:**
  Automated test verifying unauthenticated `GET /api/v1/retailers/approved` returns HTTP 401.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-HIGH-06
- **Severity:** HIGH (CVSS v3.1 Score: 7.7)
- **Affected Component:** `backend/app/application/customer_service.py`
- **Evidence:**
  Lines 156–186 and 240–280 of `customer_service.py`:
  `CustomerService.list_customers` and `CustomerService.get_customer` do not filter by `CustomerModel.tenant_id` or `CustomerModel.company_id`.
- **Attack Scenario:**
  An authenticated user from Tenant A calls `GET /api/v1/customers` or `GET /api/v1/customers/{customer_id}` and accesses customer records (including masked Aadhaar, photos, and linked bank accounts) belonging to Tenant B.
- **Risk:** Multi-tenant boundary violation, DPDP cross-tenant data spill.
- **Recommended Remediation:**
  Pass `tenant_id` into `list_customers` and `get_customer`, and enforce `CustomerModel.tenant_id == tenant_id` for non-Super-Admin roles.
- **Files Affected:**
  - `backend/app/application/customer_service.py`
  - `backend/app/presentation/api/v1/customer.py`
- **Test Required:**
  Automated test verifying Tenant A cannot view Tenant B's customer records.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-MED-01
- **Severity:** MEDIUM (CVSS v3.1 Score: 6.5)
- **Affected Component:** `backend/app/presentation/api/v1/enterprise_auth_router.py`
- **Evidence:**
  Lines 1286 and 1415 of `enterprise_auth_router.py`:
  `/login-otp/send` and `/login-otp/verify` lack IP/mobile velocity rate-limiting and failed attempt counters.
- **Attack Scenario:**
  An attacker issues thousands of verification requests against `/login-otp/verify` within the 5-minute validity window to brute-force a 6-digit OTP.
- **Risk:** Account takeover, SMS/WhatsApp telephony cost exhaustion.
- **Recommended Remediation:**
  1. Implement failed attempt tracking (invalidate OTP after 5 consecutive failed attempts).
  2. Implement IP and mobile-based rate limiting on send and verify endpoints.
- **Files Affected:**
  - `backend/app/presentation/api/v1/enterprise_auth_router.py`
- **Test Required:**
  Unit test validating failed attempt threshold locks the OTP transaction.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-MED-02
- **Severity:** MEDIUM (CVSS v3.1 Score: 6.2)
- **Affected Component:** `backend/app/core/security.py`
- **Evidence:**
  Lines 52–57 of `security.py`:
  ```python
  # 4. Fallback direct match (for development / mock records)
  try:
      if secrets.compare_digest(plain_password, hashed_password):
          return True
  except Exception:
      pass
  ```
- **Attack Scenario:**
  If a database column contains an unhashed password or development relic, the system accepts plaintext comparison rather than requiring cryptographically secure Argon2id/Bcrypt hashes.
- **Risk:** Insecure password storage tolerance, downgrade vulnerability.
- **Recommended Remediation:**
  Remove plaintext fallback in non-development environments, ensuring only Argon2id/Bcrypt hashes are accepted.
- **Files Affected:**
  - `backend/app/core/security.py`
- **Test Required:**
  Test verifying plaintext password matching is rejected when Argon2/Bcrypt hash format is absent.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-MED-03
- **Severity:** MEDIUM (CVSS v3.1 Score: 5.3)
- **Affected Component:** `backend/app/main.py`
- **Evidence:**
  `add_security_headers` middleware (Lines 84–91) includes HSTS, X-Frame-Options, and X-Content-Type-Options, but omits:
  - `Content-Security-Policy` (CSP)
  - `Referrer-Policy`
  - `Permissions-Policy`
- **Attack Scenario:**
  Missing CSP increases the impact of any potential DOM-XSS. Missing Referrer-Policy may leak URL parameters in outbound referrer headers.
- **Risk:** Inadequate browser defense-in-depth posture.
- **Recommended Remediation:**
  Add `Content-Security-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` to the security headers middleware.
- **Files Affected:**
  - `backend/app/main.py`
- **Test Required:**
  HTTP test verifying presence of all recommended security headers on API responses.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-MED-04
- **Severity:** MEDIUM (CVSS v3.1 Score: 5.3)
- **Affected Component:** `backend/app/main.py`
- **Evidence:**
  `main.py` lacks a global unhandled exception handler (`@app.exception_handler(Exception)`), leaving FastAPI default exception handling to return raw 500 error responses or stack traces when unexpected errors occur.
- **Attack Scenario:**
  An attacker sends malformed inputs causing unhandled database or runtime exceptions, extracting internal filesystem paths and database schema details from error responses.
- **Risk:** Information leakage aiding further targeted attacks.
- **Recommended Remediation:**
  Register a global 500 exception handler that logs detailed stack traces server-side and returns a sanitized JSON error response to clients.
- **Files Affected:**
  - `backend/app/main.py`
- **Test Required:**
  Test triggering an unhandled exception and verifying the response contains no internal stack trace or server path details.
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-LOW-01
- **Severity:** LOW (CVSS v3.1 Score: 3.8)
- **Affected Component:** `pay2pay-platform/docker/docker-compose.yml`
- **Evidence:**
  `POSTGRES_PASSWORD: pay2pay_secure_password` is hardcoded in the compose definition.
- **Risk:** Default credentials could be inadvertently used in deployments.
- **Recommended Remediation:**
  Reference environment variables (e.g. `${POSTGRES_PASSWORD}`) rather than committing hardcoded passwords.
- **Files Affected:**
  - `pay2pay-platform/docker/docker-compose.yml`
- **Status:** NEEDS_REMEDIATION

---

### Finding: PAY2PAY-INFO-01
- **Severity:** INFORMATIONAL
- **Affected Component:** Git Version Control History
- **Evidence:**
  Historical git commits (e.g., `1c03a3d4`, `7184c773`, `0c2c7b76`) contain past credential updates and references to `.env` modifications.
- **Risk:** Anyone with clone access to the historical git repository could inspect historical blobs.
- **Recommended Remediation:**
  Rotate all active credentials (Supabase database password, UrbanRupee token, Meta WhatsApp token, Backblaze B2 keys, Cashfree API secrets). If repository is public or shared externally, rewrite history using `git-filter-repo`.
- **Status:** NEEDS_REMEDIATION
