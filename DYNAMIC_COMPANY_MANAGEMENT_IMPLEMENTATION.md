# DYNAMIC COMPANY MANAGEMENT IMPLEMENTATION
## Central Multi-Company Management for Sathus Technology Platform

**Module:** Super Admin Dynamic Company Management  
**Implementation Status:** Active & Deployed  
**Zero Code Change Support:** Fully Verified  

---

## 1. Overview & Architecture

The Dynamic Company Management module allows the Central Super Admin (`SATHUS TECHNOLOGY PVT LTD`, `tenant_ref_id: 1`) to register, configure, activate, and manage multiple client companies on the shared platform without requiring source-code changes, application rebuilds, or server downtime.

### Core Registered Companies
1. **Near4You** (`company_ref_id: 1`):
   - Primary domain: `near4you.store`
   - Additional domain: `login.near4you.store`
   - Brand Palette: Primary Burgundy (`#A20A3A`), Secondary Gold Yellow (`#EDC11E`)
   - Logo Asset: `/branding/logo.svg`
2. **Pay2Pay** (`company_ref_id: 47`):
   - Primary domain: `pay2pay.in`
   - Additional domain: `login.pay2pay.in`
   - Brand Palette: Primary Blue (`#2563EB`), Secondary Navy (`#1E40AF`)
   - Logo Asset: `/branding/pay2pay-logo.png`
3. **SMSPAY** (`company_ref_id: 2`):
   - Primary domain: `smspay.in`
   - Additional domain: `login.smspay.in`
   - Brand Palette: Primary Emerald (`#059669`), Secondary Deep Green (`#047857`)
   - Logo Asset: `/branding/smspay-logo.svg`

---

## 2. Database Schema & Multi-Tenant Entities

The module leverages existing production tables to guarantee schema stability:
- **`public.company`**: Stores core company profile, code, legal name, display name, website, and tenant association (`tenant_ref_id: 1`).
- **`public.company_branding`**: Stores brand styling tokens (`logo_url`, `favicon_url`, `primary_colour`, `secondary_colour`).
- **`public.company_configuration`**: Stores assigned hostnames and subdomains as `config_key = 'domains'` with a `JSONB` array of hostnames.

---

## 3. Backend REST APIs

All management endpoints reside in `backend/app/presentation/api/v1/company_branding_router.py`:

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/companies` | Lists all active registered companies with branding and domains | Public / Super Admin |
| `GET` | `/api/v1/companies/branding` | Resolves branding via domain, JWT token claims, or company ID | Public / Authenticated |
| `GET` | `/api/v1/companies/resolve-by-domain` | Explicitly queries company branding matching incoming domain | Public |
| `POST` | `/api/v1/companies` | Onboards a new future company with domains and branding | Super Admin |
| `PUT` | `/api/v1/companies/{company_ref_id}/branding` | Dynamically updates brand colors, logos, and names | Super Admin |
| `PUT` | `/api/v1/companies/{company_ref_id}/domains` | Dynamically updates assigned domains/subdomains | Super Admin |

---

## 4. Super Admin User Interface

The Super Admin UI is located at `/companies` (`frontend/src/app/(dashboard)/companies/page.tsx`):
- **Live Directory Table**: Displays company code, name, legal entity, domains, status badge, and brand color swatches.
- **Onboarding Drawer/Modal**: Supports inputs for company name, unique company code, legal name, primary domain, additional domains, brand hex colors, and contact info.
- **Instant Activation**: Newly registered companies immediately become discoverable and resolve by domain without requiring a frontend or backend restart.

