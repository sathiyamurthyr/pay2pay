# EXISTING SINGLE LOGIN PRESERVATION
## Unified Authentication Engine Across Multiple Companies

**Architecture:** Single Login, Single Unified Application, Multiple Companies  
**Frontend Component:** `frontend/src/components/auth/AuthPanel.tsx`  
**Backend API:** `backend/app/presentation/api/v1/enterprise_auth_router.py`  
**Status:** Preserved and Verified  

---

## 1. Single Login Architecture

The platform preserves a single, unified login entry point for all companies and all roles:
- Single canonical route: `/login` (supporting aliases `/retailer/login`, `/dist/login`, `/sd/login`, `/admin/login`).
- Supports three secure authentication mechanisms:
  1. **Password Authentication** (Argon2id cryptographic hash verification via `dynamic_verify_password()`).
  2. **WhatsApp OTP Verification** (Secure OTP delivery with DB-level verification and zero master bypass).
  3. **WebAuthn Biometrics** (Touch ID, Face ID, Windows Hello).
- Single form adapts dynamically based on domain and context:
  - Visiting `login.near4you.store` renders Near4You branding and burgundy/gold accents.
  - Visiting `login.pay2pay.in` renders Pay2Pay branding and blue accents.
  - Visiting `login.smspay.in` renders SMSPAY branding and emerald accents.
  - An authenticated user is routed to their authoritative role-based workspace.

---

## 2. Token & Session Preservation

All existing session cookies and JWT payload claims are preserved without breaking changes:

### Preserved JWT Claims
- `sub`: User ID (`auth_users_ref_id` or public UUID).
- `tenant_ref_id`: Platform tenant reference (1 for Sathus Technology).
- `company_ref_id`: Company reference (1 for Near4You, 47 for Pay2Pay, 2 for SMSPAY).
- `user_type_ref_id`: Authoritative user type (1: Admin, 2: Retailer, 3: Distributor, 4: SD).
- `retailer_ref_id`: Authoritative retailer identifier for retailer accounts.
- `role`: Role string (`RETAILER`, `DISTRIBUTOR`, `SUPER_DISTRIBUTOR`, `ADMIN`, `SUPER_ADMIN`).

### Preserved Client Cookies & Local Storage
- `pay2pay_access_token` / `p2p_access_token`
- `pay2pay_user_role` / `p2p_user_role`
- `pay2pay_user_type_ref_id` / `p2p_user_type_ref_id`
- `p2p_active_retailer_id`
- `p2p_active_distributor_id`

---

## 3. Cross-Company Authentication Scoping

1. When a user logs in, their credentials are authenticated against `public.auth_users` and role master tables (`retailer`, `distributor`, `super_distributor`, `admin_user`).
2. The user's account carries an authoritative `company_ref_id`.
3. If an account is registered strictly for Company A, access to Company B's confidential workflows is blocked by backend company scoping.
4. Central Super Admin (`pay2pay@pay2pay.in`) possesses platform-wide authorization under `tenant_ref_id: 1` (`SATHUS TECHNOLOGY PVT LTD`), allowing authorized cross-company administration and audit logging.

