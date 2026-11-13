# ROLE AND DASHBOARD MAPPING
## Role Preservation & Dashboard Routing Architecture

**Audited Systems:** Next.js 14 App Router, Middleware Prefix Routing, PostgreSQL `user_type` Master  
**Status:** Verified & Preserved  

---

## 1. Authoritative User Type Master (`public.user_type`)

The platform's 10 standard enterprise roles map directly to numerical and textual codes:

| `user_type_ref_id` | `user_type_code` | `user_type_name` | Canonical Dashboard Route | Left Sidebar Scope |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `ADMIN` | Administrator | `/admin/dashboard` | Platform Operations, Settlements, Reports, Verification |
| **2** | `RETAILER` | Retailer | `/retailer/dashboard` | Banking Services, Wallets, DMT, AEPS, Reports, Topup |
| **3** | `DISTRIBUTOR` | Distributor | `/dist/dashboard` | Network Retailers, Commission, Fund Transfers |
| **4** | `SD` | Super Distributor | `/sd/dashboard` | Network Distributors & Retailers, Channel Settlements |
| **5** | `CRM` | Customer Rel. Mgr | `/crm-dashboard` | Customer 360, Retailer 360, Tickets, Knowledge Base |
| **6** | `RM` | Regional Manager | `/organization-dashboard` | Regional Network Scoping, POS & Performance Metrics |
| **7** | `AUDIT` | Auditor | `/compliance-dashboard` | Audit Logs, Compliance Explorer, Security Ledgers |
| **8** | `OPERATIONS` | Operations | `/ops-dashboard` | Transaction Status Updates, Queues, Alerts |
| **9** | `FINANCE` | Finance | `/finance-dashboard` | Trial Balance, Statements, Bank Reconciliation |
| **10** | `SUPPORT` | Support | `/crm/tickets` | Ticket Resolution, Contact Support Modals |

---

## 2. Left Sidebar Preservation Rules

In accordance with strict P0 project rules:
1. **Sidebar Layout & Design**: Left sidebar remains completely untouched.
   - Preserved: width, background, logo alignment, navigation menu groups, ordering, hover states, and profile footer.
   - Reused identically across all company contexts.
2. **Dynamic Identity Inside Sidebar**:
   - Company name and logo in header adapt dynamically via `useCompanyBranding()`.
   - All menu links and routes remain identical.

---

## 3. Middleware Prefix Boundary Enforcement

The Next.js Edge Middleware (`frontend/src/middleware.ts`) enforces fail-closed boundary isolation:
- An authenticated Retailer visiting `/dist/*`, `/sd/*`, or `/admin/*` is immediately redirected back to `/retailer/dashboard`.
- An authenticated Distributor visiting `/retailer/*` or `/admin/*` is redirected to `/dist/dashboard`.
- An unauthenticated user attempting to access any protected route is redirected to `/login?redirect=<path>`.
- Root path `/` redirects authenticated users to their authoritative dashboard.

