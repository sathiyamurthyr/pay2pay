# MULTI-COMPANY INITIAL ARCHITECTURE AUDIT
## Sathus Technology – Single Application, Single Login, Multiple Companies Platform

**Audit Status:** Completed & Verified  
**Target Environment:** Pay2Pay / Near4You Worktree  
**Database Schema:** PostgreSQL (`public` schema, 647 production tables)  
**Primary Entity:** Sathus Technology Pvt. Ltd. (Platform Master Tenant)

---

## 1. Executive Summary

This audit assesses the current codebase and PostgreSQL database structure to enable the **P0 – Dynamic Multi-Company Architecture** for Sathus Technology. The platform hosts multiple companies:
1. **Near4You** (`near4you.store`, `login.near4you.store`)
2. **Pay2Pay** (`pay2pay.in`, `login.pay2pay.in`)
3. **SMSPAY** (`smspay.in`, `login.smspay.in`)
4. **Future Onboarded Companies** (dynamically configurable without code changes)

Under this architecture, the platform maintains:
- **ONE** shared web application (Next.js 14 App Router).
- **ONE** unified authentication engine (`enterprise_auth_router.py` + `AuthPanel.tsx`).
- **ONE** authorized Central Super Admin identity (`SATHUS TECHNOLOGY PVT LTD`).
- **ZERO** modification to existing stored procedures, financial calculations, or reference ID conventions (`tenant_ref_id`, `company_ref_id`, `usertype_ref_id`, `user_ref_id`).
- **STRICT** company-level data and transaction isolation.

---

## 2. Actual Database Schema & Identifiers

### 2.1 Database Reference Conventions (Preserved Exactly)
| Reference Identifier | SQL Type | Description | Database Column Usage |
| :--- | :--- | :--- | :--- |
| `tenant_ref_id` | `BIGINT` | Primary identifier for Tenant entity | `tenant.tenant_ref_id`, `company.tenant_ref_id`, `transactions.tenant_ref_id` |
| `company_ref_id` | `BIGINT` | Primary identifier for Company entity | `company.company_ref_id`, `retailer.company_ref_id`, `transactions.company_ref_id` |
| `usertype_ref_id` | `BIGINT` | Primary identifier for User Type | `user_type.user_type_ref_id`, `transactions.user_type_ref_id` |
| `user_ref_id` | `BIGINT` | Primary identifier for User/Actor | `auth_users.auth_users_ref_id`, `transactions.user_ref_id` |

### 2.2 Tenant Master (`public.tenant`)
Existing verified records in production:
- **`tenant_ref_id = 1`**: `code: 'SATHUS'`, `name: 'SATHUS TECHNOLOGY PVT LTD'` (`status: 'ACTIVE'`, `is_active: true`) → **Platform Master Tenant**
- **`tenant_ref_id = 39`**: `code: 'SUPERREX'`, `name: 'SUPER REX PRODUCTS PVT LTD'` (`status: 'ACTIVE'`, `is_active: true`)

### 2.3 Company Master (`public.company`) & `public.company_branding`
The `company` table contains all enterprise organization attributes:
- Keys: `id` (bigint), `public_id` (uuid), `company_ref_id` (bigint), `tenant_ref_id` (bigint)
- Descriptive fields: `company_code`, `company_name`, `legal_name`, `display_name`, `short_name`, `website`, `logo_path`, `seal_path`
- Status fields: `status`, `is_active`, `is_deleted`

The `company_branding` table stores dynamic brand styling metadata:
- `company_branding_ref_id` (bigint), `company_ref_id` (bigint), `tenant_ref_id` (bigint), `company_id` (uuid)
- `logo_url` (varchar), `favicon_url` (varchar)
- `primary_colour` (varchar), `secondary_colour` (varchar)
- Templates: `email_template`, `sms_template`, `invoice_header`, `receipt_footer`

The `company_configuration` table stores JSONB configurations:
- Keys: `config_key` ('domains', 'features', etc.), `config_value` (jsonb), `company_ref_id`, `tenant_ref_id`

### 2.4 User Type Master (`public.user_type`)
Verified authoritative mapping in database:
1. `user_type_ref_id = 1`: **ADMIN** (`user_type_code: 'ADMIN'`, `user_type_name: 'Administrator'`)
2. `user_type_ref_id = 2`: **RETAILER** (`user_type_code: 'RETAILER'`, `user_type_name: 'Retailer'`)
3. `user_type_ref_id = 3`: **DISTRIBUTOR** (`user_type_code: 'DISTRIBUTOR'`, `user_type_name: 'Distributor'`)
4. `user_type_ref_id = 4`: **SD** (`user_type_code: 'SD'`, `user_type_name: 'Super Distributor'`)
5. `user_type_ref_id = 5`: **CRM** (`user_type_code: 'CRM'`, `user_type_name: 'Customer Relationship Manager'`)
6. `user_type_ref_id = 6`: **RM** (`user_type_code: 'RM'`, `user_type_name: 'Regional Manager'`)
7. `user_type_ref_id = 7`: **AUDIT** (`user_type_code: 'AUDIT'`, `user_type_name: 'Auditor'`)
8. `user_type_ref_id = 8`: **OPERATIONS** (`user_type_code: 'OPERATIONS'`, `user_type_name: 'Operations'`)
9. `user_type_ref_id = 9`: **FINANCE** (`user_type_code: 'FINANCE'`, `user_type_name: 'Finance'`)
10. `user_type_ref_id = 10`: **SUPPORT** (`user_type_code: 'SUPPORT'`, `user_type_name: 'Support'`)

### 2.5 User Master (`public.auth_users` & `public.admin_user`)
- Platform Super Admin: `mobile_number: 'PAY2PAY'`, `email: 'pay2pay@pay2pay.in'`, `role: 'SUPER_ADMIN'`, `auth_users_ref_id: 49`
- Platform Admin: `mobile_number: '1234512345'`, `email: 'admin@pay2pay.in'`, `role: 'ADMIN'`, `auth_users_ref_id: 4`
- Existing Retailers: 134 active retailers associated with `company_ref_id = 47`, 4 with `company_ref_id = 2`, 1 with `company_ref_id = 1`.

### 2.6 Historical Transactions by Company (`public.transactions`)
Total transactions verified in database: **8,256**
- `company_ref_id = 1`: **3,525 transactions** (Sathus Tech / Near4You ecosystem)
- `company_ref_id = 2`: **3,890 transactions** (Sathus Digital Store ecosystem)
- `company_ref_id = 47`: **717 transactions** (Pay2Pay active transactions through Nov 2026)
- `company_ref_id = None`: 124 transactions

---

## 3. Frontend Architecture & Domain Resolution

### 3.1 Next.js 14 Middleware (`frontend/src/middleware.ts`)
- The middleware inspects incoming requests and evaluates the `Host` header.
- Current routing:
  - Resolves role-based prefixes: `/retailer/dashboard`, `/dist/dashboard`, `/sd/dashboard`, `/admin/dashboard`, `/super-admin/dashboard`.
  - Enforces session protection via JWT claims and cookies (`p2p_token`, `p2p_user_role`, `p2p_user_type_ref_id`).
  - Currently has minimal domain-aware branching (`receipt.near4you.store`).

### 3.2 Dynamic Branding Hook (`frontend/src/hooks/useCompanyBranding.ts`)
- Calls `/api/v1/companies/branding` with JWT Bearer token.
- Defect identified: When unauthenticated (on the `/login` page), the hook fell back to hardcoded static values.
- Solution: Update hook and endpoint to accept `?domain=<hostname>` or extract Host header so that unauthenticated visitors to `login.near4you.store`, `login.pay2pay.in`, or `login.smspay.in` immediately receive their designated brand identity, logo, favicon, and colors.

### 3.3 Auth Panel & Login Flow (`frontend/src/components/auth/AuthPanel.tsx`)
- Provides unified Single Login supporting Password, WhatsApp OTP, and Biometrics.
- Displays dynamic company name, logo mark, and regulatory footer based on resolved domain context.
- Upon successful authentication, user session cookies and tokens bind to the user's authoritative `company_ref_id` and role.

---

## 4. Backend Architecture & API Layer

### 4.1 FastAPI Services (`backend/app/`)
- Main application: `backend/app/main.py`.
- Authentication router: `backend/app/presentation/api/v1/enterprise_auth_router.py`.
  - Implements `/auth/login-password`, `/auth/password-login`, `/auth/login-otp/send`, `/auth/login-otp/verify`.
  - Sets cookies: `pay2pay_access_token`, `pay2pay_user_role`, `pay2pay_user_type_ref_id`.
  - Encodes claims: `tenant_ref_id`, `company_ref_id`, `user_type_ref_id`, `retailer_ref_id`.
- Company Branding router: `backend/app/presentation/api/v1/company_branding_router.py`.
  - Implements `GET /companies/branding`.
  - Resolved context currently prioritizes JWT token claims (`company_ref_id`, `company_id`), with fallback to first record.
  - Improvement: Add domain-based lookup (`domain` query parameter or `X-Forwarded-Host` / `Host` header) to query `company` and `company_branding` by configured domains.

### 4.2 Company Management Service (`backend/app/application/services/company_service.py`)
- Full enterprise CRUD and onboarding service for companies, tenants, contacts, addresses, banks, branding, and configurations.
- Enforces uniqueness on `company_code`, `gst_number`, `pan_number`.
- Pre-built support for updating branding colors, logo paths, and configuration settings.

---

## 5. Caching, WebSockets, and Background Jobs

- **Redis Cache Key Scoping**: Cache keys must include the company identifier namespace: `p2p:{company_code}:{entity}:{id}` (e.g. `p2p:NEAR4YOU:wallet:101`, `p2p:PAY2PAY:wallet:101`).
- **WebSocket Broadcast Isolation**: Real-time channels and transaction updates must be partitioned by `company_ref_id` to guarantee zero cross-company event bleeding.
- **Audit Logging**: All administrative actions logged to `audit_logs` capturing `company_ref_id`, `tenant_ref_id`, and `actor_id`.

---

## 6. Identified Gaps & Minimal Proposed Changes

| Component | Existing State | Required Multi-Company Capability | Minimal Safe Fix |
| :--- | :--- | :--- | :--- |
| `company` table | Only 1 inactive record exists (`CMP-BHARAT-02`). Near4You, Pay2Pay, and SMSPAY not yet registered in `company` table. | Near4You (`NEAR4YOU`), Pay2Pay (`PAY2PAY`), and SMSPAY (`SMSPAY`) must be active registered companies under Sathus Technology (`tenant_ref_id: 1`). | Seed/register the 3 core companies with their matching `company_ref_id` (1: Near4You, 47: Pay2Pay, 2: SMSPAY) and respective domains. |
| `company_branding` table | 0 rows in database. | Near4You, Pay2Pay, and SMSPAY branding records with official logos, favicons, and hex palettes. | Insert branding records into existing `company_branding` table. No schema change needed. |
| Domain Resolution Endpoint | `/api/v1/companies/branding` only checks JWT claims. | Must resolve branding before login by incoming domain (`near4you.store`, `pay2pay.in`, `smspay.in`). | Add domain resolution parameter to `/api/v1/companies/branding` and add `/api/v1/companies/resolve-by-domain`. |
| Login Page UI | Hardcoded "Near 4 You" text and logo in `HeroSection.tsx` and `AuthPanel.tsx`. | Dynamic logo, company name, and color theme derived from resolved domain before login, and user company after login. | Bind `HeroSection` and `AuthPanel` to `useCompanyBranding()`. |
| Super Admin Company Management | `/companies` page in dashboard already exists with full table, stats, and drawer. | Ensure Super Admin can register new companies, assign domains, and set branding colors dynamically. | Wire existing `/companies` UI directly to backend `CompanyManagementService`. |
| Multi-Company Isolation | `transactions` table already has `company_ref_id` column with 8,256 transactions. | Verify queries strictly filter by `company_ref_id` for each company context. | Audit and verify API queries in reports, wallets, and transactions enforce `company_ref_id`. |

---

## 7. Approval & Implementation Plan

1. **Phase 1 Audit Deliverable**: Completed (this document).
2. **Phase 2 & 3 Company & Domain Setup**: Register Near4You, Pay2Pay, SMSPAY in database under `tenant_ref_id = 1` (Sathus Technology) with their respective brandings and domains.
3. **Phase 4 & 6 Dynamic Branding & Single Login**: Update backend domain-resolution endpoint and frontend `useCompanyBranding` + `AuthPanel` to reflect domain branding seamlessly.
4. **Phase 7 & 8 Backend Isolation & Cache Scoping**: Verify and enforce data isolation across all company boundaries.
5. **Phase 9 Playwright Verification**: Execute end-to-end tests validating multi-company domain resolution, login, and data isolation.
6. **Phase 10 Production Evidence & Reporting**: Generate all required documentation and capture transaction evidence screenshots.

