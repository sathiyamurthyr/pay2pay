# DYNAMIC PROJECT CONFIGURATION REPORT
## Multi-Project Domain, Sender Identity, and Isolation Specifications

---

### 1. Overview
The **Sathus Notification Platform** enables seamless onboarding of multi-domain enterprise applications without code releases. Each project maintains its own isolated domain configuration, verified sender identity, brand metadata, and channel permissions.

---

### 2. Project Registry Schema

#### Database Table: `projects`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | Primary Key | UUID v4 identifier |
| `project_code` | `VARCHAR(50)` | UNIQUE, Index | Unique uppercase project identifier (e.g., `PAY2PAY`, `SMSPAY`) |
| `name` | `VARCHAR(100)` | NOT NULL | Human-readable system name |
| `domain` | `VARCHAR(100)` | Nullable, Index | Clean lowercased domain (e.g., `pay2pay.in`) |
| `is_domain_verified` | `BOOLEAN` | Default: `FALSE` | Domain ownership and SPF/DKIM verification status |
| `sender_name` | `VARCHAR(100)` | Nullable | Sender display name for emails |
| `logo_url` | `VARCHAR(255)` | Nullable | Public URL to application logo |
| `primary_color` | `VARCHAR(20)` | Default: `#0284c7` | Hex code for primary branding color |
| `accent_color` | `VARCHAR(20)` | Default: `#38bdf8` | Hex code for secondary accent color |
| `support_email` | `VARCHAR(100)` | Nullable | Support helpdesk email |
| `support_phone` | `VARCHAR(50)` | Nullable | Support contact phone |
| `support_url` | `VARCHAR(255)` | Nullable | Support web portal URL |
| `api_key_hash` | `VARCHAR(64)` | UNIQUE, Index | SHA-256 hash of project API key |
| `is_active` | `BOOLEAN` | Default: `TRUE` | Administrative kill-switch |
| `allowed_channels` | `JSON` | Default: `["whatsapp", "sms", "email"]` | Enabled delivery channels |
| `rate_limit_per_minute`| `INTEGER` | Default: `600` | Throughput throttling ceiling |

---

### 3. Configured Project Matrix

The following projects have been registered into the central platform:

| Project Code | Application Name | Registered Domain | Verification Status | Computed Sender Address | Display Name | Enabled Channels |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`PAY2PAY`** | Pay2Pay Enterprise Platform | `pay2pay.in` | **VERIFIED** | `donotreply@pay2pay.in` | Pay2Pay Enterprise | Email, SMS, WhatsApp |
| **`SMSPAY`** | SMSPAY Digital Payments | `smspay.store` | **VERIFIED** | `donotreply@smspay.store` | SMSPAY | Email, SMS, WhatsApp |
| **`NEAR4YOU`** | Near4You Hyperlocal Retail | `near4you.store` | **VERIFIED** | `donotreply@near4you.store` | Near4You Platform | Email, SMS, WhatsApp |
| **`OH_ID`** | OH-ID Central Identity | `oh-id.in` | **VERIFIED** | `donotreply@oh-id.in` | OH-ID Identity | Email, SMS |
| **`VMAILA`** | Vmaila Cloud Collaboration | `vmaila.com` | **VERIFIED** | `donotreply@vmaila.com` | Vmaila Cloud | Email |

---

### 4. Domain Verification & Sender Policy Enforcement

#### Verification Rules:
1. **No Domain Configured:**
   - When an application attempts to trigger email notifications without a registered domain:
     ```json
     {
       "detail": "Project 'UNCONFIGURED_APP' has no configured domain. Sender identity cannot be resolved.",
       "error_code": "PROJECT_NOT_CONFIGURED"
     }
     ```
   - HTTP Status: `400 Bad Request`.

2. **Unverified Domain:**
   - When an application registers a domain but verification has not been completed (`is_domain_verified: false`):
     ```json
     {
       "detail": "Domain 'unverified-test.com' is not verified for project 'PENDING_APP'. Notification rejected.",
       "error_code": "DOMAIN_NOT_VERIFIED"
     }
     ```
   - HTTP Status: `403 Forbidden`.

3. **Dynamic Sender Generation:**
   - When `is_domain_verified: true`, the sender is dynamically computed as `donotreply@{domain}`.
   - For example:
     - `pay2pay.in` $\rightarrow$ `donotreply@pay2pay.in`
     - `smspay.store` $\rightarrow$ `donotreply@smspay.store`
     - `near4you.store` $\rightarrow$ `donotreply@near4you.store`

4. **Zero Code Changes for New Domains:**
   - Registering a new application (e.g. `POST /api/v1/projects` with domain `newfintech.com` and `is_domain_verified: true`) immediately enables delivery from `donotreply@newfintech.com` without rebuilding or redeploying the notification backend.
