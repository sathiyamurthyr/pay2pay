# SMSPAY PayIn — Inbound Callback Security & Multi-Tenant Audit Report

**Date:** 2026-11-15  
**Service:** Inbound Webhook / Callback Handler (`/api/v1/payin/bankme/webhook`)  
**Tenant Protection:** SMSPAY Multi-Tenant Core (`company_ref_id=2`)  
**Security Classification:** Highly Critical (Financial Settlement Ingress)  
**Audited Engine:** `app.application.payin_service.PayInService.process_bankme_webhook`  

---

## 1. Threat Modeling & Security Scope

Inbound payment callbacks represent the highest-risk attack surface in fintech architectures. A compromised or poorly defended callback endpoint can lead to:
1. **Unauthorized Wallet Inflation (Double-Credit / Spoofed Top-Up):** Attackers synthesizing fake payment approvals.
2. **Replay Attacks:** Sending the same valid callback multiple times to trigger duplicate wallet top-ups.
3. **Parameter Tampering (Amount Manipulation):** Initiating a transaction for ₹10 and tampering with the callback payload to claim ₹10,000 was paid.
4. **Cross-Tenant Contamination:** A callback destined for one tenant (e.g. Near4You) mistakenly crediting or altering state in another tenant (SMSPAY).
5. **Race Conditions / Concurrency Attacks:** Rapid concurrent submission of duplicate webhooks before database row state commits.

This audit report verifies each defensive layer implemented in the SMSPAY backend.

---

## 2. Cryptographic Signature Verification (HMAC-SHA256)

### Specification
In compliance with the official BankMe Developer Documentation (`https://bankme.co.in/developers.html`), all inbound webhooks are signed using HMAC-SHA256:

$$\text{Signature} = \text{HMAC-SHA256}_{\text{WebhookSecret}}\left(\text{Header}[\text{"x-bankme-timestamp"}] + "." + \text{RawBody}\right)$$

### Implementation Audit (`BankMePayInAdapter.verify_webhook`)
```python
# Location: backend/app/application/bankme_payin_adapter.py
if sig_header and timestamp and raw_body:
    import hmac
    import hashlib
    computed_hex = hmac.new(
        webhook_secret.encode("utf-8"),
        f"{timestamp}.{raw_body}".encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    expected_sig = f"sha256={computed_hex}"
    if hmac.compare_digest(sig_header, expected_sig):
        return True
```

### Verification Findings
- **Constant-Time Comparison:** Uses `hmac.compare_digest()` to eliminate timing attack vulnerabilities.
- **Strict Rejection:** If the signature header is missing, corrupted, or computes to a mismatch, the webhook is immediately rejected (`status: REJECTED`, `message: "Invalid signature"`).
- **Test Confirmation:** Verified via test cases `PI-104` and `PI-105`.

---

## 3. Strict Multi-Tenant Isolation (`company_ref_id = 2`)

### Threat Scenario
In a shared enterprise platform serving multiple fintech brands (e.g., Near4You `company_ref_id=1`, SMSPAY `company_ref_id=2`, Pay2Pay `company_ref_id=3`), a webhook from a vendor specific to SMSPAY must never touch transactions or wallets belonging to another company.

### Defensive Code in PayInService
```python
# Location: backend/app/application/payin_service.py:440-448
if txn.company_ref_id != SMSPAY_COMPANY_REF_ID:
    logger.critical(
        "SECURITY VIOLATION: BankMe webhook received for non-SMSPay company_ref_id=%s (TID=%s)",
        txn.company_ref_id, tid
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Security Violation: BankMe callbacks are strictly restricted to SMSPay."
    )
```

### Verification Findings
- **Test Case PI-107:** Dispatched a webhook with a TID belonging to `company_ref_id=1`.
- **System Action:** Raised `HTTP 403 Forbidden` with a critical audit log.
- **Result:** Zero data leakage or cross-tenant execution.

---

## 4. Concurrency Defense & Atomic Row Locking

### Threat Scenario
Payment gateways often deliver duplicate webhooks within milliseconds due to retries or distributed webhook dispatchers. If processed concurrently in separate database sessions, both sessions could observe `txn_status == 'PENDING'` simultaneously and execute the wallet credit routine twice.

### Implementation Audit
```python
# Location: backend/app/application/payin_service.py:410-412
stmt = select(PayinTransactionModel).where(
    PayinTransactionModel.tid == tid
).with_for_update()
```

### Verification Findings
- **Row-Level Lock:** The `SELECT ... FOR UPDATE` acquires an exclusive row lock on PostgreSQL table `payin_transactions`.
- **Serialization:** Any parallel worker thread or gunicorn worker attempting to access the same TID is blocked until the first transaction commits its state and releases the lock.
- **Idempotency Execution:** The second worker unblocks, observes `txn.txn_status == 'SUCCESS'`, and returns:
  ```json
  {
    "status": "ALREADY_PROCESSED",
    "tid": "BPAY_TEST_...",
    "txn_status": "SUCCESS",
    "message": "Duplicate webhook safely ignored (already final)"
  }
  ```
- **Result:** Concurrency attacks and double-spend attempts are completely neutralized (Verified in `PI-108`).

---

## 5. Parameter Tampering & Amount Immunity

### Threat Scenario
An external adversary intercepts or spoofs a webhook request, replacing `"amount": 100` with `"amount": 50000`.

### Defense Mechanism
The backend **completely ignores** the `amount` field in the webhook body for ledger credit calculations:
```python
# Location: backend/app/application/payin_service.py:559-568
credit_amount = float(txn.retailer_credit)
adj_dto = WalletAdjustmentDTO(
    user_ref_id=txn.retailer_ref_id,
    company_ref_id=txn.company_ref_id,
    entry_type="CREDIT",
    amount=credit_amount,
    payout_amount=credit_amount,
    ...
)
```

### Verification Findings
- Credit amount is derived exclusively from the immutable, system-calculated `payin_transactions.retailer_credit` column recorded at order initiation.
- Any modification of the inbound payload's `amount` attribute has zero impact on the wallet credit value (Verified in `PI-111`).

---

## 6. Callback Audit Trail & Logging

Every inbound callback attempt is persisted in `payin_callback_logs`:
- Unique Log ID and timestamp.
- Full raw payload JSON and sanitized headers.
- IP address of the sender.
- Processing outcome (`COMPLETED`, `ALREADY_PROCESSED`, `REJECTED`, `WALLET_CREDIT_FAILED`).
- Latency and database error message if applicable.

---

## 7. Security Certification

| Security Dimension | Defensive Control | Status |
|---|---|---|
| Ingress Authentication | HMAC-SHA256 Signature Verification | **VERIFIED & SECURE** |
| Tenant Boundary | `company_ref_id == 2` Enforcement | **VERIFIED & SECURE** |
| Replay Protection | State Machine Idempotency (`ALREADY_PROCESSED`) | **VERIFIED & SECURE** |
| Race Conditions | PostgreSQL `SELECT ... FOR UPDATE` | **VERIFIED & SECURE** |
| Financial Tampering | Authoritative DB Ledger Resolution | **VERIFIED & SECURE** |
| Auditability | Persistent Inbound Callback Table | **VERIFIED & SECURE** |
