# Pay2Pay General Financial Transaction Report REST API Specification

**Version:** 1.0.0  
**Base URL:** `/api/v1/transactions`  
**Endpoint:** `GET /api/v1/transactions/report`  
**Protocol:** HTTPS / JSON  

---

## 1. Overview & Architectural Principles

The Pay2Pay General Financial Transaction Report REST API is the authoritative, append-only ledger reporting engine for all financial activities across the platform (Payout, DMT, AEPS, Recharge, BBPS, etc.). It serves **ADMIN**, **RETAILER**, **RM**, and **CRM** personas with server-side role scoping and returns the immutable 16-column business transaction ledger.

### Core Guarantees:
1. **Direct Ledger Truth**: Primary records query `public.transactions` directly, reflecting the atomic double-entry ledger state.
2. **Atomic Component Integrity**: Financial operations decompose into discrete ledger components (`Payout Amount`, `Payout Charge`, `GST`, etc.). The report never synthesizes artificial "Wallet Debit" consolidation rows.
3. **Immutable Running Balances**: Returns stored `opening_bal` (`balance_before`), `amount`, and `closing_bal` (`balance_after`) generated during atomic wallet debit/credit operations.
4. **Strict Role-Based Scoping**:
   - **`ADMIN`**: Sees all authorized transactions across the platform/tenant.
   - **`RETAILER`**: Strictly limited to transactions belonging to the authenticated retailer.
   - **`RM`**: Strictly limited to transactions of retailers assigned to the regional manager.
   - **`CRM`**: Scoped to transactions for authorized support/CRM companies and retailers.
5. **Backend Authorization**: Never trusts retailer/company/RM IDs provided by frontend query parameters.

---

## 2. 16-Column Report Contract

The endpoint returns items matching the exact 16-column sequence specified below:

| # | Field Name | Data Type | DB Source | Description | Example |
| :-: | :--- | :---: | :--- | :--- | :--- |
| **1** | `txn_id` | `string` | `t.txn_id` | Unique business transaction reference | `"CPAY290826100810007"` |
| **2** | `ref_id` | `string` | `t.ref_id` | Vendor/Bank reference or transaction ID | `"CPAY290826100810007"` |
| **3** | `service` | `string` | `t.service_name` | Financial product or service | `"PAYOUT"` |
| **4** | `wallet` | `string` | `t.wallet_type` | Wallet ledger bucket (`MAIN`, `COMMISSION`, `SETTLEMENT`) | `"MAIN"` |
| **5** | `entry` | `string` | `t.entry_type` | Entry accounting type (`DEBIT` / `CREDIT`) | `"DEBIT"` |
| **6** | `amount` | `number` | `t.amount` | Transaction component amount in INR | `200.00` |
| **7** | `opening_bal` | `number` | `t.balance_before` | Wallet balance immediately prior to this transaction | `49357.52` |
| **8** | `closing_bal` | `number` | `t.balance_after` | Wallet balance immediately after this transaction | `49157.52` |
| **9** | `description` | `string` | `t.narration` | Component narration (`Payout Amount`, `Payout Charge`, `GST`, etc.) | `"Payout Amount"` |
| **10**| `date_time` | `string` | `t.created_at` | ISO 8601 timestamp with IST offset (`+05:30`) | `"2026-08-29T15:38:23.181602+05:30"` |
| **11**| `status` | `string` | `t.status` | Transaction status (`SUCCESS`, `PENDING`, `FAILED`, `REVERSED`) | `"SUCCESS"` |
| **12**| `company` | `string` | `comp.company_name` | Company display / legal name | `"Pay2Pay"` |
| **13**| `retailer` | `string` | `ret.legal_name` | Retailer store / legal name | `"sathus tech"` |
| **14**| `distributor` | `string` | `d.business_name` | Distributor shop / business name | `"ABC Distributor"` |
| **15**| `sd` | `string` | `sd.business_name` | Super Distributor hub / business name | `"ABC Super Distribution"` |
| **16**| `rm` | `string` | `rm.full_name` | Regional Manager full name | `"Pay2Pay RM"` |

---

## 3. Query Parameters

| Parameter | Type | Required | Default | Description | Validation Rule |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `page` | `integer` | No | `1` | Page number for pagination. | `page >= 1` (Throws `400 INVALID_PAGE`) |
| `limit` | `integer` | No | `25` | Number of records per page. | `1 <= limit <= 100` (Throws `400 INVALID_LIMIT`) |
| `from_date` | `string` | No | *Today 00:00:00 IST* | Start date (`YYYY-MM-DD`). | `YYYY-MM-DD` (Throws `400 INVALID_DATE`) |
| `to_date` | `string` | No | *Today 23:59:59 IST* | End date (`YYYY-MM-DD`). | `YYYY-MM-DD` (Throws `400 INVALID_DATE`) |
| `service` | `string` | No | `ALL` | Service filter (`PAYOUT`, `DMT`, `AEPS`, `RECHARGE`, `ALL`). | Case-insensitive |
| `entry_type` | `string` | No | `ALL` | Accounting entry type (`CREDIT`, `DEBIT`, `ALL`). | Allowed: `CREDIT`, `DEBIT`, `ALL` (Throws `400 INVALID_ENTRY_TYPE`) |
| `status` | `string` | No | `ALL` | Transaction status (`SUCCESS`, `PENDING`, `FAILED`, `REVERSED`, `ALL`). | Allowed: `SUCCESS`, `PENDING`, `FAILED`, `REVERSED`, `ALL` (Throws `400 INVALID_STATUS`) |
| `wallet` | `string` | No | `ALL` | Wallet bucket filter (`MAIN`, `COMMISSION`, `SETTLEMENT`, `ALL`). | Case-insensitive |
| `search` | `string` | No | `None` | Whitelisted search string across `Txn ID`, `Ref ID`, `Service`, `Retailer`, and `Description`. | Sanitized string |
| `sort_by` | `string` | No | `date_time` | Field to sort by (`date_time`, `amount`, `opening_bal`, `closing_bal`, `status`, `txn_id`, `ref_id`, `service`, `entry`, `retailer`, `company`). | Whitelist check |
| `sort_order` | `string` | No | `DESC` | Sorting direction (`ASC`, `DESC`). | Whitelist check |

---

## 4. Request & Response Examples

### Request
```http
GET /api/v1/transactions/report?from_date=2026-08-29&to_date=2026-08-29&service=PAYOUT&page=1&limit=25 HTTP/1.1
Host: api.pay2pay.com
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Response (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Transaction report retrieved successfully",
  "data": [
    {
      "txn_id": "CPAY290826100810007",
      "ref_id": "CPAY290826100810007",
      "service": "PAYOUT",
      "wallet": "MAIN",
      "entry": "CREDIT",
      "amount": 2.00,
      "opening_bal": 49355.52,
      "closing_bal": 49357.52,
      "description": "Payout Charge Reversal",
      "date_time": "2026-08-29T15:38:36.129113+05:30",
      "status": "SUCCESS",
      "company": "Pay2Pay",
      "retailer": "sathus tech",
      "distributor": "",
      "sd": "",
      "rm": "Pay2Pay RM"
    },
    {
      "txn_id": "CPAY290826100810007",
      "ref_id": "CPAY290826100810007",
      "service": "PAYOUT",
      "wallet": "MAIN",
      "entry": "CREDIT",
      "amount": 200.00,
      "opening_bal": 49155.52,
      "closing_bal": 49355.52,
      "description": "Payout Amount Reversal",
      "date_time": "2026-08-29T15:38:36.129113+05:30",
      "status": "SUCCESS",
      "company": "Pay2Pay",
      "retailer": "sathus tech",
      "distributor": "",
      "sd": "",
      "rm": "Pay2Pay RM"
    },
    {
      "txn_id": "CPAY290826100810007",
      "ref_id": "CPAY290826100810007",
      "service": "PAYOUT",
      "wallet": "MAIN",
      "entry": "DEBIT",
      "amount": 2.00,
      "opening_bal": 49157.52,
      "closing_bal": 49155.52,
      "description": "Payout Charge",
      "date_time": "2026-08-29T15:38:23.181602+05:30",
      "status": "SUCCESS",
      "company": "Pay2Pay",
      "retailer": "sathus tech",
      "distributor": "",
      "sd": "",
      "rm": "Pay2Pay RM"
    },
    {
      "txn_id": "CPAY290826100810007",
      "ref_id": "CPAY290826100810007",
      "service": "PAYOUT",
      "wallet": "MAIN",
      "entry": "DEBIT",
      "amount": 200.00,
      "opening_bal": 49357.52,
      "closing_bal": 49157.52,
      "description": "Payout Amount",
      "date_time": "2026-08-29T15:38:23.181602+05:30",
      "status": "SUCCESS",
      "company": "Pay2Pay",
      "retailer": "sathus tech",
      "distributor": "",
      "sd": "",
      "rm": "Pay2Pay RM"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total_records": 4,
    "total_pages": 1
  }
}
```

---

## 5. Error Responses

| Status Code | Error Code | Detail Response |
| :---: | :--- | :--- |
| **401** | `UNAUTHORIZED` | `{"detail": {"success": false, "error_code": "UNAUTHORIZED", "message": "Authentication token required"}}` |
| **400** | `INVALID_DATE` | `{"detail": {"success": false, "error_code": "INVALID_DATE", "message": "Invalid from_date. Expected format: YYYY-MM-DD"}}` |
| **400** | `INVALID_ENTRY_TYPE` | `{"detail": {"success": false, "error_code": "INVALID_ENTRY_TYPE", "message": "Invalid entry_type: 'XYZ'. Allowed values: CREDIT, DEBIT, ALL"}}` |
| **400** | `INVALID_STATUS` | `{"detail": {"success": false, "error_code": "INVALID_STATUS", "message": "Invalid status: 'XYZ'. Allowed values: SUCCESS, PENDING, FAILED, REVERSED, ALL"}}` |
| **400** | `INVALID_PAGE` | `{"detail": {"success": false, "error_code": "INVALID_PAGE", "message": "Page parameter must be greater than or equal to 1"}}` |
| **400** | `INVALID_LIMIT` | `{"detail": {"success": false, "error_code": "INVALID_LIMIT", "message": "Limit parameter must be between 1 and 100"}}` |
