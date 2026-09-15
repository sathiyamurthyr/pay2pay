"""
Reconciliation File Ingestion & Parsing Service.
Supports CSV, XLSX, and XLS vendor transaction reports with:
- Dynamic column header resolution
- Robust delimiter and encoding auto-detection
- Row-level validations (missing fields, invalid amounts, invalid statuses)
- Intra-file duplicate transaction ID detection
- Vendor status normalization
"""

import io
import csv
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Tuple, Optional
import logging

logger = logging.getLogger("reconciliation_parser_service")


class ReconciliationValidationError(Exception):
    """Raised when file structure or required columns fail validation."""
    pass


class ReconciliationParserService:

    # Default header aliases for automatic resolution
    DEFAULT_COLUMN_ALIASES: Dict[str, List[str]] = {
        "transaction_id": [
            "transaction_id", "transaction id", "txnid", "txn id", "txn_id",
            "order_id", "order id", "orderid", "client_ref_id", "client reference id",
            "reference id", "ref no", "reference_id", "transferid", "transfer id"
        ],
        "vendor_txn_id": [
            "vendor_txn_id", "vendor txn id", "vendor ref", "vendor reference",
            "gateway_txn_id", "gateway ref", "provider_id", "cf_transfer_id",
            "ur_txn_id", "bulkpe_id", "operator_ref", "wowpe_id"
        ],
        "amount": [
            "amount", "amount (inr)", "amount(inr)", "amount inr", "amount (rs)", "amount (rs.)", "amount(rs)",
            "txn_amount", "txn amount (inr)", "txn amount(inr)", "transaction amount", "order amount",
            "order amount (inr)", "transfer amount", "transfer amount (inr)", "value", "net_amount",
            "net amount (inr)", "gross_amount", "deduct (inr)", "deduct", "debit (inr)", "debit"
        ],
        "status": [
            "status", "txn_status", "transaction status", "payment status", "transfer status",
            "state", "response_status", "order_status"
        ],
        "utr": [
            "utr", "utr number", "bank_rrn", "rrn", "bank reference", "bank ref",
            "bank_ref_no", "arn", "reference_number"
        ],
        "service": [
            "service", "service_name", "service type", "category", "product"
        ],
        "retailer_id": [
            "retailer_id", "retailer id", "retailer code", "merchant id", "agent_id", "store_id"
        ],
        "transaction_date": [
            "date", "transaction date", "txn date", "created at", "created_date",
            "addedon", "timestamp", "datetime", "date_time", "date & time"
        ],
        "payment_mode": [
            "type", "mode", "payment_mode", "payment mode", "txn_mode", "transfer_mode", "channel",
            "txn_type", "transfer_type", "payment_type"
        ],
        "beneficiary_name": [
            "beneficiary name", "beneficiary_name", "beneficiary", "bene name", "bene_name",
            "account holder name", "customer name", "name"
        ],
        "bank_name": [
            "bank name", "bank_name", "bank", "beneficiary bank"
        ],
        "ifsc": [
            "ifsc", "ifsc code", "ifsc_code", "bank ifsc"
        ],
        "account_number": [
            "account number", "account_number", "account no", "account_no", "account",
            "beneficiary account", "acc no"
        ],
        "fee": [
            "charge (inr)", "charge", "charges (inr)", "charges", "fee", "fees",
            "commission", "tax", "gst"
        ],
        "opening_balance": [
            "main balance (inr)", "main balance", "opening balance", "main_balance"
        ],
        "deduct_amount": [
            "deduct (inr)", "deduct", "deducted amount", "debit (inr)", "debit"
        ],
        "credit_amount": [
            "credit (inr)", "credit", "credited amount"
        ],
        "closing_balance": [
            "current balance (inr)", "current balance", "closing balance", "balance"
        ],
        "response_code": [
            "response_code", "status_code", "error_code", "code"
        ],
        "response_message": [
            "response_message", "message", "narration", "remarks", "error_message", "description"
        ]
    }

    # Default status normalization map
    DEFAULT_STATUS_MAP: Dict[str, List[str]] = {
        "SUCCESS": ["SUCCESS", "SUCCESSFUL", "APPROVED", "COMPLETED", "SETTLED", "PAID", "DONE", "TRANSFER_SUCCESS"],
        "FAILED": ["FAILED", "FAILURE", "DECLINED", "REJECTED", "ERROR", "CANCELLED", "TRANSFER_FAILED", "BOUNCED"],
        "PENDING": ["PENDING", "PROCESSING", "IN_PROGRESS", "QUEUED", "INITIATED", "SUBMITTED", "IN_PROCESS", "RECEIVED"]
    }

    @classmethod
    def parse_file(
        cls,
        file_bytes: bytes,
        filename: str,
        custom_column_mapping: Optional[Dict[str, Any]] = None,
        custom_status_mapping: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Parses uploaded file bytes (.csv, .xlsx, .xls) and produces normalized staging rows.
        Raises ReconciliationValidationError on unrecoverable validation failures.
        """
        if not file_bytes or len(file_bytes) == 0:
            raise ReconciliationValidationError("The uploaded file is empty.")

        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ["csv", "xlsx", "xls"]:
            raise ReconciliationValidationError(
                f"Unsupported file format '{ext}'. Only CSV, XLSX, and XLS files are supported."
            )

        # 1. Extract raw tabular data (headers + rows)
        headers, raw_rows = cls._read_raw_data(file_bytes, ext)

        if not headers or len(headers) == 0:
            raise ReconciliationValidationError("No header row could be found in the uploaded file.")
        if not raw_rows or len(raw_rows) == 0:
            raise ReconciliationValidationError("The uploaded file contains a header but has no data rows.")

        # 2. Resolve Column Mapping
        mapping = cls._resolve_column_mapping(headers, custom_column_mapping)
        logger.info(f"Resolved column mapping for {filename}: {mapping}")

        # Check required columns
        for required_col in ["transaction_id", "amount", "status"]:
            if required_col not in mapping or mapping[required_col] is None:
                raise ReconciliationValidationError(
                    f"Required column '{required_col}' could not be identified in the file. "
                    f"Found headers: {', '.join(headers)}. "
                    f"Please verify headers or configure column mapping."
                )

        # 3. Parse & Validate Rows
        status_map = custom_status_mapping or cls.DEFAULT_STATUS_MAP
        staging_rows: List[Dict[str, Any]] = []

        # Intra-file duplicate tracking
        seen_txn_ids: Dict[str, int] = {}
        for row in raw_rows:
            raw_id = row.get(mapping["transaction_id"])
            if raw_id is not None:
                clean_id = str(raw_id).strip()
                if clean_id:
                    seen_txn_ids[clean_id] = seen_txn_ids.get(clean_id, 0) + 1

        valid_count = 0
        invalid_count = 0
        duplicate_count = 0

        for idx, row in enumerate(raw_rows, start=1):
            # Check if row is completely empty
            if all(v is None or str(v).strip() == "" for v in row.values()):
                continue

            raw_txn_id = row.get(mapping["transaction_id"])
            clean_txn_id = str(raw_txn_id).strip() if raw_txn_id is not None else ""

            # Row-level validation
            validation_errors: List[str] = []
            if not clean_txn_id:
                validation_errors.append("Transaction ID is missing or empty.")

            # Amount validation
            raw_amount = row.get(mapping["amount"])
            parsed_amount = Decimal("0.00")
            if raw_amount is None or str(raw_amount).strip() == "":
                validation_errors.append("Amount is missing.")
            else:
                try:
                    cleaned_amt_str = re.sub(r"[^\d.-]", "", str(raw_amount).strip())
                    parsed_amount = Decimal(cleaned_amt_str)
                    if parsed_amount <= 0:
                        validation_errors.append(f"Invalid amount '{raw_amount}': amount must be positive.")
                except (InvalidOperation, ValueError):
                    validation_errors.append(f"Invalid amount format '{raw_amount}'.")

            # Status validation & normalization
            raw_status = row.get(mapping["status"])
            clean_status = str(raw_status).strip() if raw_status is not None else ""
            if not clean_status:
                validation_errors.append("Transaction status is missing.")
                normalized_status = "PENDING"
            else:
                normalized_status = cls._normalize_status(clean_status, status_map)

            # Check duplicate within file
            is_dup = False
            occurrences = 1
            if clean_txn_id and seen_txn_ids.get(clean_txn_id, 0) > 1:
                is_dup = True
                occurrences = seen_txn_ids[clean_txn_id]
                duplicate_count += 1

            # Parse optional fields
            vendor_txn_id = None
            if "vendor_txn_id" in mapping and mapping["vendor_txn_id"]:
                val = row.get(mapping["vendor_txn_id"])
                if val: vendor_txn_id = str(val).strip()

            utr = None
            if "utr" in mapping and mapping["utr"]:
                val = row.get(mapping["utr"])
                if val: utr = str(val).strip()

            service = None
            if "service" in mapping and mapping["service"]:
                val = row.get(mapping["service"])
                if val: service = str(val).strip()

            retailer_id = None
            if "retailer_id" in mapping and mapping["retailer_id"]:
                val = row.get(mapping["retailer_id"])
                if val: retailer_id = str(val).strip()

            txn_date = None
            if "transaction_date" in mapping and mapping["transaction_date"]:
                val = row.get(mapping["transaction_date"])
                if val:
                    txn_date = cls._parse_date(val)

            payment_mode = None
            if "payment_mode" in mapping and mapping["payment_mode"]:
                val = row.get(mapping["payment_mode"])
                if val: payment_mode = str(val).strip()

            response_code = None
            if "response_code" in mapping and mapping["response_code"]:
                val = row.get(mapping["response_code"])
                if val: response_code = str(val).strip()

            response_msg = None
            if "response_message" in mapping and mapping["response_message"]:
                val = row.get(mapping["response_message"])
                if val: response_msg = str(val).strip()

            val_err_str = "; ".join(validation_errors) if validation_errors else None
            if val_err_str:
                invalid_count += 1
            else:
                valid_count += 1

            staging_rows.append({
                "row_index": idx,
                "transaction_id": clean_txn_id or f"UNKNOWN_ROW_{idx}",
                "vendor_txn_id": vendor_txn_id,
                "amount": parsed_amount,
                "status": clean_status or "UNKNOWN",
                "normalized_status": normalized_status,
                "utr": utr,
                "service": service,
                "retailer_id": retailer_id,
                "transaction_date": txn_date,
                "payment_mode": payment_mode,
                "currency": "INR",
                "response_code": response_code,
                "response_message": response_msg,
                "raw_data": {k: str(v) if v is not None else "" for k, v in row.items()},
                "is_duplicate": is_dup,
                "occurrence_count": occurrences,
                "validation_error": val_err_str
            })

        summary = {
            "total_rows_parsed": len(staging_rows),
            "valid_rows": valid_count,
            "invalid_rows": invalid_count,
            "duplicate_rows": duplicate_count,
            "detected_headers": headers,
            "column_mapping": mapping
        }

        return staging_rows, summary

    @classmethod
    def _read_raw_data(cls, file_bytes: bytes, ext: str) -> Tuple[List[str], List[Dict[str, Any]]]:
        """Reads headers and rows as dictionaries from CSV, XLSX, or XLS."""
        if ext == "csv":
            return cls._read_csv(file_bytes)
        elif ext == "xlsx":
            return cls._read_xlsx(file_bytes)
        elif ext == "xls":
            return cls._read_xls(file_bytes)
        else:
            raise ReconciliationValidationError(f"Unsupported extension: {ext}")

    @classmethod
    def _read_csv(cls, file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
        """Auto-detects encoding, delimiter, and parses CSV."""
        text = None
        for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                text = file_bytes.decode(enc)
                break
            except (UnicodeDecodeError, LookupError):
                continue

        if text is None:
            text = file_bytes.decode("utf-8", errors="replace")

        # Auto-detect delimiter
        first_lines = "\n".join([line for line in text.splitlines()[:10] if line.strip()])
        delimiter = ","
        try:
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(first_lines, delimiters=",\t;|")
            delimiter = dialect.delimiter
        except Exception:
            # Fallback check
            if "\t" in first_lines and first_lines.count("\t") > first_lines.count(","):
                delimiter = "\t"
            elif ";" in first_lines and first_lines.count(";") > first_lines.count(","):
                delimiter = ";"

        reader = csv.reader(io.StringIO(text), delimiter=delimiter)
        raw_headers = []
        for row in reader:
            if any(cell.strip() for cell in row):
                raw_headers = [cell.strip() for cell in row]
                break

        if not raw_headers:
            return [], []

        rows: List[Dict[str, Any]] = []
        for row in reader:
            if not any(cell.strip() for cell in row):
                continue
            row_dict = {}
            for i, h in enumerate(raw_headers):
                val = row[i].strip() if i < len(row) else ""
                row_dict[h] = val
            rows.append(row_dict)

        return raw_headers, rows

    @classmethod
    def _read_xlsx(cls, file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
        """Parses Excel XLSX using openpyxl."""
        try:
            import openpyxl
        except ImportError:
            raise ReconciliationValidationError("openpyxl library is required to process .xlsx files.")

        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
        sheet = wb.active
        if sheet is None:
            return [], []

        rows_iter = sheet.iter_rows(values_only=True)
        raw_headers = []
        for row in rows_iter:
            if any(v is not None and str(v).strip() for v in row):
                raw_headers = [str(v).strip() if v is not None else "" for v in row]
                break

        if not raw_headers:
            return [], []

        rows: List[Dict[str, Any]] = []
        for row in rows_iter:
            if not any(v is not None and str(v).strip() for v in row):
                continue
            row_dict = {}
            for i, h in enumerate(raw_headers):
                if not h:
                    continue
                val = row[i] if i < len(row) else None
                row_dict[h] = val
            rows.append(row_dict)

        wb.close()
        return raw_headers, rows

    @classmethod
    def _read_xls(cls, file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
        """Parses legacy Excel XLS using xlrd."""
        try:
            import xlrd
        except ImportError:
            raise ReconciliationValidationError("xlrd library is required to process .xls files.")

        wb = xlrd.open_workbook(file_contents=file_bytes)
        sheet = wb.sheet_by_index(0)
        if sheet.nrows == 0:
            return [], []

        raw_headers = [str(sheet.cell_value(0, col)).strip() for col in range(sheet.ncols)]
        rows: List[Dict[str, Any]] = []

        for row_idx in range(1, sheet.nrows):
            row_dict = {}
            for col_idx in range(sheet.ncols):
                h = raw_headers[col_idx]
                if not h:
                    continue
                row_dict[h] = sheet.cell_value(row_idx, col_idx)
            rows.append(row_dict)

        return raw_headers, rows

    @staticmethod
    def _normalize_header_key(s: str) -> str:
        """
        Normalizes a column header or alias by:
        1. Stripping parenthesized or bracketed currency/unit annotations (e.g. '(INR)', '(Rs)', '[INR]', '/-')
        2. Stripping standalone currency words ('inr', 'rs', 'rupees', 'usd')
        3. Stripping all non-alphanumeric characters and converting to lowercase.
        """
        if not s:
            return ""
        cleaned = re.sub(r"\s*\([^)]*\)", "", str(s))
        cleaned = re.sub(r"\s*\([^)]*$", "", cleaned)
        cleaned = re.sub(r"\s*\[[^\]]*\]", "", cleaned)
        cleaned = re.sub(r"\s*\[[^\]]*$", "", cleaned)
        cleaned = re.sub(r"(?i)\b(inr|rs\.?|rupees|usd)\b", "", cleaned)
        return re.sub(r"[^a-z0-9]", "", cleaned.lower())

    @classmethod
    def _resolve_column_mapping(
        cls,
        headers: List[str],
        custom_mapping: Optional[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Maps normalized internal keys (e.g. 'transaction_id', 'amount', 'status') to specific column headers in the file.
        Prioritizes user-provided mapping, then pre-configured aliases, then fuzzy normalization,
        and finally intelligent semantic heuristics.
        """
        resolved: Dict[str, str] = {}
        headers_exact_lower = {h.strip().lower(): h for h in headers if h}
        headers_normalized = {cls._normalize_header_key(h): h for h in headers if h}
        headers_raw_normalized = {re.sub(r"[^a-z0-9]", "", h.lower()): h for h in headers if h}

        # 1. Apply explicit user/vendor mapping first
        if custom_mapping:
            for norm_key, header_cand in custom_mapping.items():
                cands = [header_cand] if isinstance(header_cand, str) else (header_cand if isinstance(header_cand, list) else [])
                for c in cands:
                    cand_str = str(c).strip()
                    if not cand_str:
                        continue
                    if cand_str in headers:
                        resolved[norm_key] = cand_str
                        break
                    elif cand_str.lower() in headers_exact_lower:
                        resolved[norm_key] = headers_exact_lower[cand_str.lower()]
                        break
                    cand_norm = cls._normalize_header_key(cand_str)
                    if cand_norm and cand_norm in headers_normalized:
                        resolved[norm_key] = headers_normalized[cand_norm]
                        break
                    raw_norm = re.sub(r"[^a-z0-9]", "", cand_str.lower())
                    if raw_norm and raw_norm in headers_raw_normalized:
                        resolved[norm_key] = headers_raw_normalized[raw_norm]
                        break

        # 2. Fill remaining keys from standard aliases
        for norm_key, alias_list in cls.DEFAULT_COLUMN_ALIASES.items():
            if norm_key in resolved and resolved[norm_key]:
                continue
            for alias in alias_list:
                alias_clean = alias.strip().lower()
                if alias_clean in headers_exact_lower:
                    resolved[norm_key] = headers_exact_lower[alias_clean]
                    break
                alias_norm = cls._normalize_header_key(alias)
                if alias_norm and alias_norm in headers_normalized:
                    resolved[norm_key] = headers_normalized[alias_norm]
                    break
                raw_norm = re.sub(r"[^a-z0-9]", "", alias_clean)
                if raw_norm and raw_norm in headers_raw_normalized:
                    resolved[norm_key] = headers_raw_normalized[raw_norm]
                    break

        # 3. Intelligent fallback for critical required columns: amount, transaction_id, status, utr
        if "amount" not in resolved or not resolved["amount"]:
            for h in headers:
                h_norm = cls._normalize_header_key(h)
                if "amount" in h_norm and not any(k in h_norm for k in ["charge", "fee", "tax", "gst", "balance"]):
                    resolved["amount"] = h
                    break
            if "amount" not in resolved or not resolved["amount"]:
                for h in headers:
                    h_norm = cls._normalize_header_key(h)
                    if any(k in h_norm for k in ["deduct", "debit", "walletdebit"]) and "balance" not in h_norm:
                        resolved["amount"] = h
                        break

        if "transaction_id" not in resolved or not resolved["transaction_id"]:
            for h in headers:
                h_norm = cls._normalize_header_key(h)
                if any(k in h_norm for k in ["transactionid", "txnid", "orderid", "referenceid", "clientref"]):
                    resolved["transaction_id"] = h
                    break

        if "status" not in resolved or not resolved["status"]:
            for h in headers:
                h_norm = cls._normalize_header_key(h)
                if "status" in h_norm or "state" in h_norm:
                    resolved["status"] = h
                    break

        if "utr" not in resolved or not resolved["utr"]:
            for h in headers:
                h_norm = cls._normalize_header_key(h)
                if any(k in h_norm for k in ["utr", "rrn", "bankref", "bankrrn"]):
                    resolved["utr"] = h
                    break

        return resolved

    @classmethod
    def _normalize_status(cls, raw_status: str, status_map: Dict[str, Any]) -> str:
        """Normalizes vendor-specific status string into SUCCESS, FAILED, or PENDING."""
        cleaned = re.sub(r"[^A-Z]", "", raw_status.upper())
        for norm_status, variants in status_map.items():
            norm_upper = norm_status.upper()
            variants_clean = [re.sub(r"[^A-Z]", "", str(v).upper()) for v in variants]
            if cleaned == norm_upper or cleaned in variants_clean:
                return norm_upper

        # Intelligent heuristic fallback
        if any(w in cleaned for w in ["SUCC", "PAID", "DONE", "SETTL", "COMPL", "APPR"]):
            return "SUCCESS"
        if any(w in cleaned for w in ["FAIL", "DECL", "REJ", "ERR", "CANC", "BOUN"]):
            return "FAILED"
        return "PENDING"

    @classmethod
    def _parse_date(cls, val: Any) -> Optional[datetime]:
        """Attempts to parse diverse date/time formats into UTC datetime."""
        if isinstance(val, datetime):
            return val
        if val is None:
            return None

        val_str = str(val).strip()
        if not val_str:
            return None

        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%d",
            "%d-%m-%Y %H:%M:%S",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d"
        ]

        for fmt in formats:
            try:
                return datetime.strptime(val_str, fmt)
            except ValueError:
                continue

        return None
