# SUPER ADMIN SECURITY AUDIT
## Sathus Technology Central Platform Administrator Security Model

**Audited User:** `pay2pay@pay2pay.in` (Platform Master Admin)  
**Tenant Reference:** `tenant_ref_id: 1` (`SATHUS TECHNOLOGY PVT LTD`)  
**Status:** PASSED (Least Privilege & Anti-Escalation Verified)  

---

## 1. Authoritative Super Admin Identity

The platform enforces **EXACTLY ONE** Central Platform Administrator identity:
- **Email**: `pay2pay@pay2pay.in`
- **Mobile Identifier**: `PAY2PAY`
- **Role Claim**: `SUPER_ADMIN`
- **Database Record**: `auth_users` (`id: 51`, `auth_users_ref_id: 49`)
- **Parent Tenant**: `tenant_ref_id: 1` (`SATHUS TECHNOLOGY PVT LTD`)

### Capabilities Restricted Exclusively to Central Super Admin
1. Registering future client companies without source-code deployment.
2. Editing company master details and activating/deactivating companies.
3. Configuring primary and additional domains per company.
4. Uploading company logos and customizing brand color hex codes.
5. Monitoring platform-level aggregated metrics across all companies.
6. Switching administrative view context between registered companies with audit trails.

---

## 2. Prevention of Privilege Escalation

- **Delegated Company Administrators**: Users assigned role `ADMIN` or `COMPANY_ADMIN` within Company 1, 2, or 47 only possess authority within their own `company_ref_id`.
- **Zero Cross-Company Access for Ordinary Admins**: Company admins cannot access Central Super Admin modules (`/companies`, platform configuration, cross-company settlement ledgers).
- **Audit Logging**: Any administrative action (company creation, status update, branding change) generates an audit record in `public.audit_logs` logging `actor_id`, `actor_role`, `company_ref_id`, `action`, and timestamp.

