# NOTIFICATION EVENT COVERAGE
## Enterprise Business Event Taxonomy and Mapping Specification

---

### 1. Overview
The Sathus Notification Platform uses an extensible, event-driven taxonomy. Business applications publish domain events rather than managing granular notification templates. The platform dynamically maps the event to appropriate channel templates, security policies, and attachments.

---

### 2. Supported Event Taxonomy

| Event Category | Event Code | Purpose | Primary Channel | Fallback Channel | Attachments Allowed |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FINANCIAL** | `ACCOUNT_STATEMENT` | Daily/Monthly reconciled account statements | Email | None | **Yes (Password-Protected PDF)** |
| **AUTH** | `AUTH_OTP` | Two-factor authentication & login verification | Email / SMS | WhatsApp | No |
| **AUTH** | `PASSWORD_RESET` | Secure account recovery & password change links | Email | None | No |
| **FINANCIAL** | `TOPUP_STATUS` | Retailer wallet top-up request approval/rejection | Email | SMS | Optional (Receipt PDF) |
| **PAYMENT** | `TRANSACTION_STATUS`| Real-time transaction success, pending, or failure | SMS / Email | WhatsApp | Optional (Invoice PDF) |
| **WALLET** | `WALLET_ALERT` | Real-time wallet credit/debit alerts | SMS | WhatsApp | No |
| **PAYMENT** | `PAYOUT_STATUS` | Vendor & retailer settlement payouts | Email / SMS | None | Optional (Bank Advice) |
| **KYC** | `KYC_VERIFIED` | Retailer identity verification confirmation | Email / SMS | WhatsApp | No |
| **SECURITY** | `SECURITY_ALERT` | New device login or suspicious session alert | Email / SMS | None | No |

---

### 3. Detailed Event Specifications

#### 3.1 `ACCOUNT_STATEMENT`
- **Category:** `FINANCIAL`
- **Description:** Dispatched daily at 03:00 AM IST by the automated scheduler or triggered manually by Admin.
- **Required Data Fields:**
  - `statement_date`: String (e.g. `"15 November 2026"`)
  - `opening_balance`: Float (e.g. `50000.00`)
  - `total_credit`: Float (e.g. `125000.00`)
  - `total_debit`: Float (e.g. `85000.00`)
  - `closing_balance`: Float (e.g. `90000.00`)
  - `password_hint`: String (e.g. `"First 4 characters of PAN (CAPS) + Last 4 digits of Mobile"`)
- **Attachments:** Mandates `Pay2Pay_Statement_{Date}.pdf` encoded as Base64.
- **Idempotency Pattern:** `stmt_{recipient_email}_{statement_date}_{role}`

#### 3.2 `AUTH_OTP`
- **Category:** `AUTH`
- **Description:** Real-time verification code for retailer onboarding, login, or sensitive operations.
- **Required Data Fields:**
  - `otp_code`: String (6-digit numeric)
  - `expiry_minutes`: Integer (default: 10)
- **Security Notice:** Automatically injects anti-fraud warning reminding the user never to share codes.
- **Idempotency Pattern:** `otp_{recipient_email}_{otp_code}`

#### 3.3 `PASSWORD_RESET`
- **Category:** `AUTH`
- **Description:** Delivers password reset link with single-use authentication token.
- **Required Data Fields:**
  - `reset_link`: String (fully-qualified HTTPS URL)
- **Branded Card:** Styled CTA button using `project.primary_color`.

#### 3.4 `TOPUP_STATUS`
- **Category:** `FINANCIAL`
- **Description:** Instant confirmation when an Admin approves a wallet top-up request.
- **Required Data Fields:**
  - `topup_request_id`: String
  - `approved_amount`: Float
  - `retailer_code`: String
  - `retailer_name`: String
  - `payment_mode`: String (e.g. `"BANK_TRANSFER"`)
  - `utr_number`: String

---

### 4. Zero Business Logic Disruption
New business events can be ingested immediately by sending the event code in `POST /api/v1/notifications/events`. The platform dynamically formats the event payload into branded enterprise cards without requiring code deployment or database migrations.
