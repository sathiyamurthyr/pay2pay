# SMSPAY — PayIn Repository Audit Report

**Date & Time:** 2026-11-15T08:55:00+05:30  
**Environment:** UAT / Sandbox (`https://api.bankme.co.in`)  
**Target Entity:** SMSPAY Operations (Company Ref ID: 2)  
**Lead Auditor:** Antigravity Autonomous Security & Verification Core  

---

## 1. Executive Summary

This repository audit documents the implementation architecture, API routing, vendor gateway adapters, cryptographic signing, database structures, status mappings, and ledger integration for **SMSPAY PayIn** powered by **BankMe Payment Gateway**.

### Key Architectural Characteristics
- **Strict Multi-Tenant Isolation:** Requests are scoped strictly by `company_ref_id=2` (SMSPAY). Vendor mapping, credentials, MDR rates, and transaction ledgers are isolated from other companies (PAY2PAY `company_ref_id=1`, NEAR4YOU `company_ref_id=3`).
- **Idempotent Transaction Flow:** Authoritative Transaction IDs (`TID`) are generated *before* any provider invocation. The format is `<VENDOR_PREFIX>PAY<DDMMYYHHMI><RANDOM5>` (e.g. `BPAY151126085512345`).
- **Atomic Double-Entry Ledger:** Completed PayIn transactions credit the retailer's main wallet via stored procedure `public.wallet_balance_update` inside an atomic database transaction. Duplicate callbacks are checked with row-level locks (`SELECT ... FOR UPDATE`) and rejected idempotently.

---

## 2. API Routes & Entry Points

All PayIn routes are registered under `/api/v1/payin` in `backend/app/presentation/api/v1/payin_router.py`:

| Method | Endpoint | Description | Auth Required | Tenant Scoped |
|---|---|---|---|---|
| `GET` | `/api/v1/payin/options` | Returns enabled services, payment modes, card types, and vendors for company. | Yes (Bearer JWT) | Yes (`company_ref_id`) |
| `GET` | `/api/v1/payin/card-schemes` | Returns the 5 standard card schemes with Admin-configured MDR rates for display. | Yes (Bearer JWT) | Yes (`company_ref_id`) |
| `POST` | `/api/v1/payin/mdr/preview` | Live dynamic MDR calculation and financial breakdown preview. | Yes (Bearer JWT) | Yes (`company_ref_id`) |
| `POST` | `/api/v1/payin/collect` | Initiates payment order with BankMe gateway. | Yes (Bearer JWT) | Yes (`company_ref_id`) |
| `POST` | `/api/v1/payin/initiate` | Alias for `/collect` providing standard API entry point. | Yes (Bearer JWT) | Yes (`company_ref_id`) |
| `GET` | `/api/v1/payin/{tid}/status` | Checks real-time payment status from DB and polls vendor. | Yes (Bearer JWT) | Yes (`company_ref_id`) |
| `POST` | `/api/v1/payin/webhook/bankme` | Inbound asynchronous webhook from BankMe. | Signature / Auth Key | Enforced via TID Lookup |
| `POST` | `/api/v1/payin/callback` | Standard callback endpoint routing to vendor-specific handler. | Signature / Auth Key | Enforced via TID Lookup |

---

## 3. BankMe Client & Gateway Adapter Architecture

### 3.1 Client Implementation (`backend/app/application/bankme_payin_client.py`)
- **API Base URL:** `https://api.bankme.co.in` (Sandbox/Production switchable via `BANKME_PAYIN_BASE_URL`).
- **Credentials:**
  - `x-api-key`: Resolves from `SMSPAY_PAYIN_KEY` or `BANKME_PAYIN_API_KEY_ID` (Key ID: `pk_cb63940384567855`).
  - `x-api-secret` & `authkey`: Resolves from `SMSPAY_PAYIN_AUTHKEY` or `BANKME_PAYIN_API_SECRET`.
- **Order Creation Endpoint:** `POST /v1/payin/orders`
  - Sends `referenceId` = Authoritative `TID`
  - Sends `amount`, `customer` (`name`, `mobile`), `redirectUrl`, `note`
- **Status Inquiry Endpoint:** `GET /v1/payin/orders/{referenceId}`
  - Inquires order status by TID directly from BankMe gateway
- **Audit Logging:** Every outbound and inbound request is persisted into `public.payin_api_logs` with execution duration, masked credentials, request headers/payloads, and response codes.

### 3.2 Adapter Implementation (`backend/app/application/bankme_payin_adapter.py`)
- Inherits from `BasePayInProviderAdapter`.
- `initiate_payin()`: Marshals payload, injects company context, calls `BankMePayInClient.create_payin_order()`.
- `check_status()`: Calls `BankMePayInClient.check_order_status()`.
- `verify_webhook()`: Validates webhook signatures using HMAC-SHA256 with `BANKME_PAYIN_WEBHOOK_SECRET` or auth key matching.

---

## 4. Database Models & Schema Specifications

The PayIn data model is defined in `backend/app/infrastructure/db/payin_models.py`:

```
┌─────────────────────────────────┐
│     payin_company_cfg           │ Company enablement & transaction limits
└────────────────┬────────────────┘
                 │ 1:N
┌────────────────▼────────────────┐
│     payin_company_vendors       │ Priority & vendor routing per company
└────────────────┬────────────────┘
                 │ N:1
┌────────────────▼────────────────┐
│     payin_vendors               │ Gateway credentials & endpoints
└────────────────┬────────────────┘
                 │ 1:N
┌────────────────▼────────────────┐
│     payin_transactions          │ Authoritative transaction ledger
├─────────────────────────────────┤
│ - payin_transactions_ref_id     │ Primary Key (BIGINT)
│ - tid                           │ Unique Transaction ID (VARCHAR 60)
│ - company_ref_id                │ Tenant isolation FK
│ - retailer_ref_id               │ Retailer FK
│ - txn_amount                    │ Principal top-up amount
│ - customer_payable              │ Total debited from cardholder
│ - retailer_credit               │ Net amount credited to wallet
│ - mdr_pct, mdr_amount, tax_amt  │ Financial snapshot at initiation
│ - txn_status                    │ INITIATED, PENDING, SUCCESS, FAILED
│ - idempotency_key               │ Unique constraint preventing replays
└────────────────┬────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│payin_api_logs│   │payin_cb_logs │
└──────────────┘   └──────────────┘
```

---

## 5. Status Transition & Lifecycle Mapping

```
[Retailer Enters Amount]
         │
         ▼
    /mdr/preview ─────────► Returns Dynamic MDR & Net Credit
         │
         ▼
  /payin/collect
         │
         ├─► Generates TID (BPAY...)
         ├─► Resolves MDR configuration snapshot
         ├─► Persists payin_transactions (status: INITIATED)
         ├─► Calls BankMe POST /v1/payin/orders
         │
         ▼
BankMe Returns Order (status: PENDING)
         │
         ├─► Updates payin_transactions (status: PENDING, payment_url)
         ├─► Redirects Retailer to BankMe Hosted Payment Gateway
         │
         ▼
Cardholder Authorizes / Declines on Gateway
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
BankMe Webhook (SUCCESS)     BankMe Webhook (FAILED)
    │                             │
    ├─► Signature Verified        ├─► Signature Verified
    ├─► Locks Row (FOR UPDATE)    ├─► Locks Row (FOR UPDATE)
    ├─► Idempotency Guard Checked ├─► Updates txn_status=FAILED
    ├─► Updates txn_status=SUCCESS├─► 0 Wallet Credit
    ├─► Credits Wallet via SP     └─► Terminal Failure
    └─► Terminal Success
```

---

## 6. Audit Verdict

| Component | Status | Findings |
|---|---|---|
| Routing & Endpoints | **VERIFIED** | Clean, RESTful, company-isolated routes under `/api/v1/payin`. |
| BankMe Client | **VERIFIED** | Adheres to official BankMe spec (`/v1/payin/orders`), passes TID as referenceId. |
| Credentials & Security | **VERIFIED** | API keys loaded from secure environment/settings, credentials masked in audit logs. |
| Database Models | **VERIFIED** | Strict relational integrity with foreign keys, indexes, and unique constraints. |
| Idempotency Protection | **VERIFIED** | Database-level unique constraint on `idempotency_key` and row-level locking on callbacks. |
| Wallet Credit Logic | **VERIFIED** | Single atomic credit using stored procedure `wallet_balance_update`. |
