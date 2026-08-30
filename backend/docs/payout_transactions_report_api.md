# Pay2Pay Payout Transaction Report REST API Specification

**Version:** 1.0.0  
**Base URL:** `/api/v1/payout`  
**Endpoint:** `GET /api/v1/payout/transactions`  
**Protocol:** HTTPS / JSON  

---

## 1. Overview & Architectural Principles

The Pay2Pay Payout Transaction Report REST API is a unified, high-volume reporting engine designed for enterprise fintech operations. It serves all user personas (**ADMIN**, **RETAILER**, **RM**, **CRM**) through a single authoritative endpoint with server-side role-based column visibility and query scoping.

### Core Guarantees:
1. **Single Source of Truth**: Primary records query `payout_transaction` joined with the append-only `transactions` ledger for financial breakdowns (`Payout Amount`, `Payout Charge`, `GST`).
2. **Standardized Identity**: Internal joins utilize `BIGINT *_ref_id`, while external interfaces expose `public_id (UUID)` and `txn_id (VARCHAR)`.
3. **Strict Column & Data Protection**:
   - Bank account numbers are masked (`XXXXXX1234`).
   - Outbound API responses are sanitized to strip any secrets, tokens, private keys, or internal stack traces.
   - Retailers and Regional Managers are never exposed vendor internal information (`vendor`, `api_status`, `api_response`).
4. **Backend-Enforced Authorization**: Client-supplied scope parameters are never trusted. All tenant, company, retailer, and RM constraints are resolved directly from the authenticated JWT session.
5. **Invariant Transaction Lifecycle**: Reversals use the original `TxnID` (no synthetic `REV-XXXX` transaction IDs).

---

## 2. Authentication & Authorization

### Authentication Method
- **Header:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Cookie Fallback:** `p2p_access_token` / `pay2pay_access_token`

### Role Authorization Matrix

| Persona / Role | Scoping Rules | Visible Columns |
| :--- | :--- | :--- |
| **`ADMIN`**<br/>*(PLATFORM_ADMIN, SUPER_ADMIN, COMPANY_ADMIN)* | Can view all authorized companies, retailers, and vendors across the tenant. | **All 20 Columns**:<br/>`txn_id`, `date_time`, `company`, `retailer`, `customer`, `beneficiary`, `account`, `bank`, `ifsc`, `amount`, `charge`, `gst`, `debit`, `mode`, `utr`, `status`, `vendor`, `api_status`, `api_response`, `comments` |
| **`RETAILER`**<br/>*(RETAILER, STORE_OWNER, AGENT)* | Strictly restricted to their own `retailer_ref_id`. Client-supplied retailer IDs are ignored. | **16 Columns**:<br/>`txn_id`, `date_time`, `retailer`, `customer`, `beneficiary`, `account`, `bank`, `ifsc`, `amount`, `charge`, `gst`, `debit`, `mode`, `utr`, `status`, `comments`<br/>*(Excluded: `vendor`, `api_status`, `api_response`, `company`)* |
| **`RM`**<br/>*(REGIONAL_MANAGER, RM)* | Strictly restricted to retailers mapped to their `regional_manager_ref_id`. | **17 Columns**:<br/>`txn_id`, `date_time`, `company`, `retailer`, `customer`, `beneficiary`, `account`, `bank`, `ifsc`, `amount`, `charge`, `gst`, `debit`, `mode`, `utr`, `status`, `comments`<br/>*(Excluded: `vendor`, `api_status`, `api_response`)* |
| **`CRM`**<br/>*(CRM, SUPPORT, OPS_ADMIN)* | Restricted to company/retailer scopes assigned to the CRM user. | **All 20 Columns** (with sanitized API response payloads) |

---

## 3. Query Parameters

| Parameter | Type | Required | Default | Description | Validation Rule |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `page` | `integer` | No | `1` | Page number for pagination. | `page >= 1` (Throws `400 INVALID_PAGE` if invalid) |
| `limit` | `integer` | No | `25` | Number of records per page. | `1 <= limit <= 100` (Throws `400 INVALID_LIMIT` if invalid) |
| `from_date` | `string` | No | *Today 00:00:00 IST* | Start date for transaction lookup (`YYYY-MM-DD`). | Format `YYYY-MM-DD` (Throws `400 INVALID_DATE` if invalid) |
| `to_date` | `string` | No | *Today 23:59:59 IST* | End date for transaction lookup (`YYYY-MM-DD`). | Format `YYYY-MM-DD` (Throws `400 INVALID_DATE` if invalid) |
| `status` | `string` | No | `ALL` | Payout transaction business status. | Allowed: `INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `ALL` (Throws `400 INVALID_STATUS` if invalid) |
| `mode` | `string` | No | `ALL` | Payout payment mode. | Allowed: `IMPS`, `NEFT`, `RTGS`, `UPI`, `ALL` (Throws `400 INVALID_MODE` if invalid) |
| `search` | `string` | No | `None` | Whitelisted search string across Txn ID, UTR, Beneficiary Name, Customer Name/Mobile, Retailer Name, Company Name, Account last 4 digits. | Sanitized string |
| `company_name` | `string` | No | `None` | Filter by company name (*ADMIN / CRM / RM only*). | Sanitized string |
| `retailer_name` | `string` | No | `None` | Filter by retailer name (*ADMIN / CRM / RM only*). | Sanitized string |
| `vendor_name` | `string` | No | `None` | Filter by payout vendor name (*ADMIN / CRM only*). | Sanitized string |
| `sort_by` | `string` | No | `date_time` | Field to sort by. Whitelist: `date_time`, `amount`, `charge`, `debit`, `status`, `txn_id`, `mode`, `utr`, `retailer`, `customer`, `beneficiary`, `company`. | Whitelist check |
| `sort_order` | `string` | No | `DESC` | Sorting direction: `ASC` or `DESC`. | Whitelist check |

---

## 4. Response Schema & Examples

### A. Admin Response Example (All 20 Columns)

```http
GET /api/v1/payout/transactions?from_date=2026-08-29&to_date=2026-08-29&page=1&limit=25 HTTP/1.1
Host: api.pay2pay.com
Authorization: Bearer <ADMIN_JWT>
```

```json
{
  "success": true,
  "message": "Payout transactions retrieved successfully",
  "data": [
    {
      "txn_id": "CPAY290826100810007",
      "date_time": "2026-08-29T15:38:23.181602+05:30",
      "company": "Pay2Pay",
      "retailer": "sathus tech",
      "customer": "Sathiya Murthy",
      "beneficiary": "Sathiya Murthy",
      "account": "XXXXXX9426",
      "bank": "HDFC Bank",
      "ifsc": "HDFC0001234",
      "amount": 200.00,
      "charge": 2.00,
      "gst": 0.00,
      "debit": 202.00,
      "mode": "IMPS",
      "utr": "123456789012",
      "status": "FAILED",
      "vendor": "Commercial Bank",
      "api_status": "FAILED",
      "api_response": "{\"status\": \"FAILED\", \"reason\": \"Bank CBS Timeout\"}",
      "comments": "Payout failed - wallet reversed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total_records": 1,
    "total_pages": 1
  }
}
```

---

### B. Retailer Response Example (Restricted 16 Columns)

```http
GET /api/v1/payout/transactions HTTP/1.1
Host: api.pay2pay.com
Authorization: Bearer <RETAILER_JWT>
```

```json
{
  "success": true,
  "message": "Payout transactions retrieved successfully",
  "data": [
    {
      "txn_id": "CPAY290826100810007",
      "date_time": "2026-08-29T15:38:23.181602+05:30",
      "retailer": "sathus tech",
      "customer": "Sathiya Murthy",
      "beneficiary": "Sathiya Murthy",
      "account": "XXXXXX9426",
      "bank": "HDFC Bank",
      "ifsc": "HDFC0001234",
      "amount": 200.00,
      "charge": 2.00,
      "gst": 0.00,
      "debit": 202.00,
      "mode": "IMPS",
      "utr": "123456789012",
      "status": "FAILED",
      "comments": "Payout failed - wallet reversed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total_records": 1,
    "total_pages": 1
  }
}
```

---

### C. Empty Result (HTTP 200)

```json
{
  "success": true,
  "message": "No payout transactions found",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total_records": 0,
    "total_pages": 0
  }
}
```

---

## 5. Error Responses

| Status Code | Error Code | Example Response | Cause |
| :---: | :--- | :--- | :--- |
| **401** | `UNAUTHORIZED` | `{"detail": {"success": false, "error_code": "UNAUTHORIZED", "message": "Authentication token required"}}` | Missing, expired, or invalid JWT. |
| **403** | `ACCESS_DENIED` | `{"detail": {"success": false, "error_code": "ACCESS_DENIED", "message": "User does not have access to this resource"}}` | User lack required permissions. |
| **400** | `INVALID_DATE` | `{"detail": {"success": false, "error_code": "INVALID_DATE", "message": "Invalid from_date. Expected format: YYYY-MM-DD"}}` | Date string not matching `YYYY-MM-DD`. |
| **400** | `INVALID_STATUS` | `{"detail": {"success": false, "error_code": "INVALID_STATUS", "message": "Invalid status: 'UNKNOWN'. Allowed values: INITIATED, PENDING, SUCCESS, FAILED"}}` | Status not in allowed whitelist. |
| **400** | `INVALID_MODE` | `{"detail": {"success": false, "error_code": "INVALID_MODE", "message": "Invalid mode: 'WALLET'. Allowed values: IMPS, NEFT, RTGS, UPI"}}` | Payment mode not in allowed whitelist. |
| **400** | `INVALID_PAGE` | `{"detail": {"success": false, "error_code": "INVALID_PAGE", "message": "Page parameter must be greater than or equal to 1"}}` | `page < 1`. |
| **400** | `INVALID_LIMIT` | `{"detail": {"success": false, "error_code": "INVALID_LIMIT", "message": "Limit parameter must be between 1 and 100"}}` | `limit < 1` or `limit > 100`. |
| **500** | `INTERNAL_SERVER_ERROR` | `{"detail": {"success": false, "error_code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred while processing report"}}` | Unhandled database or server exception. |

---

## 6. OpenAPI 3.0 Specification (JSON)

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Pay2Pay Payout Transaction Report API",
    "version": "1.0.0",
    "description": "Unified, role-based Payout Transaction Report REST API for Admin, Retailer, RM, and CRM."
  },
  "paths": {
    "/api/v1/payout/transactions": {
      "get": {
        "summary": "Get Payout Transactions Report",
        "description": "Retrieves paginated, filtered payout transactions report with role-based column visibility.",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 25, "maximum": 100 } },
          { "name": "from_date", "in": "query", "schema": { "type": "string", "format": "date" }, "description": "YYYY-MM-DD" },
          { "name": "to_date", "in": "query", "schema": { "type": "string", "format": "date" }, "description": "YYYY-MM-DD" },
          { "name": "status", "in": "query", "schema": { "type": "string", "enum": ["INITIATED", "PENDING", "SUCCESS", "FAILED", "ALL"] } },
          { "name": "mode", "in": "query", "schema": { "type": "string", "enum": ["IMPS", "NEFT", "RTGS", "UPI", "ALL"] } },
          { "name": "search", "in": "query", "schema": { "type": "string" } },
          { "name": "company_name", "in": "query", "schema": { "type": "string" } },
          { "name": "retailer_name", "in": "query", "schema": { "type": "string" } },
          { "name": "vendor_name", "in": "query", "schema": { "type": "string" } },
          { "name": "sort_by", "in": "query", "schema": { "type": "string", "default": "date_time" } },
          { "name": "sort_order", "in": "query", "schema": { "type": "string", "enum": ["ASC", "DESC"], "default": "DESC" } }
        ],
        "responses": {
          "200": {
            "description": "Report dataset successfully retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "message": { "type": "string" },
                    "data": { "type": "array", "items": { "type": "object" } },
                    "pagination": {
                      "type": "object",
                      "properties": {
                        "page": { "type": "integer" },
                        "limit": { "type": "integer" },
                        "total_records": { "type": "integer" },
                        "total_pages": { "type": "integer" }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": { "description": "Invalid query parameters" },
          "401": { "description": "Unauthorized access" }
        }
      }
    }
  }
}
```
