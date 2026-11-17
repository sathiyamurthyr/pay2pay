# SMSPAY — PayIn Sandbox E2E Test Plan & Specification

**Date:** 2026-11-15T08:56:00+05:30  
**Target:** SMSPAY PayIn Integration (BankMe Gateway)  
**Company Ref ID:** 2 (SMSPAY)  
**Execution Environment:** Sandbox / UAT  
**Document Version:** 1.0.0-PROD-READY  

---

## 1. Test Scope & Strategy

This test plan defines the end-to-end verification strategy for SMSPAY PayIn via the BankMe sandbox gateway.
Testing covers:
1. **API Validation & Edge Cases (PI-001 to PI-010):** Input schemas, boundaries, limits, validation errors, and auth guards.
2. **Asynchronous Webhook & Callback Verification (PI-101 to PI-108):** Cryptographic signatures, replay prevention, terminal status transitions, idempotency, and tenant isolation.
3. **Double-Entry Wallet Ledger Consistency (PI-109 to PI-112):** Atomic wallet credit, exact fee deduction, zero double-credit verification.
4. **Regression Safeguards (PI-113 to PI-114):** Zero regressions on DMT, Payouts, Reports, and System Auth.

---

## 2. Test Case Matrix

### 2.1 Payment Initiation & Validation (PI-001 to PI-010)

| Test ID | Test Scenario | Input Parameters | Expected Response Code | Expected Outcome |
|---|---|---|---|---|
| **PI-001** | Valid PayIn Initiation | Amount: ₹500, Mobile: `9876543210`, Vendor: `BANKME` | `200 OK` | TID generated (`BPAY...`), BankMe order created, status `PENDING`, payment URL returned. |
| **PI-002** | Zero Amount Rejection | Amount: ₹0.00, Mobile: `9876543210` | `422 Unprocessable` / `400 Bad Request` | Transaction rejected with descriptive error message. |
| **PI-003** | Negative Amount Rejection | Amount: ₹-250.00, Mobile: `9876543210` | `422 Unprocessable` / `400 Bad Request` | Transaction rejected, no TID persisted. |
| **PI-004** | Amount Exceeds Limit | Amount: ₹1,50,000.00 (Max: ₹1,00,000) | `400 Bad Request` | Limit check enforced, transaction rejected. |
| **PI-005** | Missing Mandatory Fields | Missing `customer_mobile` or `amount` | `422 Unprocessable` | FastAPI validation error with missing field path. |
| **PI-006** | Invalid Customer Mobile | Mobile: `12345` or `ABCDE12345` | `422 Unprocessable` / `400 Bad Request` | Mobile number validation enforced (10-digit Indian mobile). |
| **PI-007** | Duplicate Client Reference ID | Same `idempotency_key` twice within 60s | `200 OK` / `409 Conflict` | Idempotent replay: returns original transaction without duplicate initiation. |
| **PI-008** | Unauthorized Request | No `Authorization` header | `401 Unauthorized` | Rejected immediately at authentication middleware. |
| **PI-009** | Invalid Bearer Token | Corrupted / expired JWT | `401 Unauthorized` | Token rejected, no backend access granted. |
| **PI-010** | 120s Session Timeout Boundary | Initiated order with no customer completion | Frontend state transition | UI transitions to `TIMED_OUT` at 120s; backend maintains pending state for async bank confirmation. |

---

### 2.2 Callback Processing & Webhook Security (PI-101 to PI-108)

| Test ID | Test Scenario | Trigger | Expected Outcome | Security Verification |
|---|---|---|---|---|
| **PI-101** | Valid SUCCESS Callback | Inbound webhook with status `SUCCESS` and valid HMAC signature | Transaction status transitions from `PENDING` to `SUCCESS`. Retailer wallet credited exactly once. | Verified against BankMe secret. |
| **PI-102** | Duplicate Callback Idempotency | Identical SUCCESS webhook sent a second time for same TID | HTTP 200 returned with `ALREADY_PROCESSED`. Wallet balance remains unchanged. Zero double-credit. | Idempotency guard protected via row-level lock. |
| **PI-103** | FAILED Callback Handling | Inbound webhook with status `FAILED` | Transaction status transitions to `FAILED`. Zero wallet credit. Failure reason recorded. | Error audit trail recorded. |
| **PI-104** | Invalid Webhook Signature | Tampered payload or wrong signature header | Webhook rejected with HTTP 400 / 401. Transaction status unchanged. | HMAC-SHA256 signature verification. |
| **PI-105** | Missing Webhook Signature | Webhook request without signature or auth key | Webhook rejected. No processing performed. | Signature required guard. |
| **PI-106** | Unknown TID Callback | Callback referencing non-existent TID | Webhook returns HTTP 404 / REJECTED. No database corruption. | Relational integrity maintained. |
| **PI-107** | Multi-Tenant Cross-Company Guard | Callback attempting to update a Pay2Pay TID via BankMe webhook | Webhook rejected with HTTP 403 Forbidden. Critical audit logged. | Tenant isolation strictly enforced. |
| **PI-108** | Concurrent Callback Race Conditions | Two identical webhooks received simultaneously | Row-level `FOR UPDATE` lock forces serial processing; first succeeds, second triggers idempotency. | Zero race-condition double-crediting. |

---

### 2.3 Wallet Reconciliation & Ledger Integrity (PI-109 to PI-112)

| Test ID | Scenario | Checkpoints | Expected Result |
|---|---|---|---|
| **PI-109** | Status Inquiry Verification | Query `GET /api/v1/payin/{tid}/status` | Returns authoritative status, TID, amounts, and UTR. |
| **PI-110** | Wallet Balance Audit | Compare pre-transaction vs post-transaction wallet balances | Balance increases by exact `retailer_credit` amount. |
| **PI-111** | Parameter Tampering Resilience | Payload tampered with different amount in callback | System credits authoritative `txn.retailer_credit`, NOT tampered callback amount. |
| **PI-112** | Stored Procedure Execution | Verify `public.wallet_balance_update` call | Ledger entry generated in `retailer_wallet_txns` with `PAYIN_TOPUP` service tag. |

---

### 2.4 Regression Verification (PI-113 to PI-114)

| Test ID | Domain | Target | Verification Criteria |
|---|---|---|---|
| **PI-113** | Domestic Money Transfer (DMT) | `/api/v1/dmt/*` | DMT remitter search, beneficiary list, and transfer flows unaffected. |
| **PI-114** | Payout & Wallet Core | `/api/v1/payout/*`, `/api/v1/retailer/wallet` | Payout processing, main/commission balance queries, and transaction history unaffected. |
