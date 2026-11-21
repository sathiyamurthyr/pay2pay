"""
Unit & Integration Test Suite for Enterprise Service-Wise GST Reporting Module
Tests financial accuracy, Place of Supply CGST/SGST/IGST split, reconciliation,
multi-service aggregation, role scoping, and PDF/Excel/CSV exports.
"""

import pytest
import io
import csv
import openpyxl
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.application.gst_reporting_service import (
    parse_financial_month,
    split_gst_place_of_supply,
    round_cur,
    GstReportingService,
    DEFAULT_COMPANY_LEGAL_NAME,
    DEFAULT_COMPANY_GSTIN,
)
from app.presentation.api.v1.gst_report_router import (
    get_gst_filters,
    get_gst_report_summary,
    get_gst_transactions,
    export_gst_csv,
    export_gst_excel,
    export_gst_pdf,
)


class MockRequest:
    def __init__(self, headers=None, query_params=None, cookies=None):
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.cookies = cookies or {}


# =============================================================================
# 1. FINANCIAL YEAR & MONTH PARSER TESTS
# =============================================================================

def test_parse_financial_month_full_year():
    start_utc, end_utc, fy_label, month_label = parse_financial_month("FY 2026-27", "ALL")
    assert fy_label == "FY 2026-27"
    assert month_label == "All Months (Full Financial Year)"
    # IST to UTC: 2026-04-01 00:00:00 IST is 2026-03-31 18:30:00 UTC
    assert start_utc.year == 2026
    assert start_utc.month == 3
    assert start_utc.day == 31
    # End IST: 2027-03-31 23:59:59.999999 IST is 2027-03-31 18:29:59 UTC
    assert end_utc.year == 2027
    assert end_utc.month == 3
    assert end_utc.day == 31


def test_parse_financial_month_specific_months():
    # April (month in start_year)
    start_utc, end_utc, fy_label, m_label = parse_financial_month("FY 2026-27", "04")
    assert "April 2026" in m_label
    assert start_utc.year == 2026
    assert start_utc.month == 3

    # January (month in end_year)
    start_utc, end_utc, fy_label, m_label = parse_financial_month("FY 2026-27", "01")
    assert "January 2027" in m_label
    assert start_utc.year == 2026
    assert start_utc.month == 12  # Dec 31 UTC is Jan 1 IST

    # February in leap year
    start_utc, end_utc, fy_label, m_label = parse_financial_month("FY 2027-28", "02")
    assert "February 2028" in m_label


# =============================================================================
# 2. PLACE OF SUPPLY CGST/SGST/IGST SPLIT TESTS
# =============================================================================

def test_split_gst_place_of_supply_intra_state():
    # Tamil Nadu to Tamil Nadu (State Code 33)
    cgst, sgst, igst = split_gst_place_of_supply(180.00, company_state_code="33", recipient_state="Tamil Nadu")
    assert cgst == 90.00
    assert sgst == 90.00
    assert igst == 0.00
    assert round_cur(cgst + sgst + igst) == 180.00


def test_split_gst_place_of_supply_odd_paisa_reconciliation():
    # 0.05 total GST split: 0.03 CGST + 0.02 SGST = 0.05
    cgst, sgst, igst = split_gst_place_of_supply(0.05, company_state_code="33", recipient_state="TN")
    assert round_cur(cgst + sgst + igst) == 0.05
    assert igst == 0.00


def test_split_gst_place_of_supply_inter_state():
    # Tamil Nadu to Karnataka (State Code 29)
    cgst, sgst, igst = split_gst_place_of_supply(180.00, company_state_code="33", recipient_state="29 Karnataka")
    assert cgst == 0.00
    assert sgst == 0.00
    assert igst == 180.00
    assert round_cur(cgst + sgst + igst) == 180.00


def test_split_gst_zero_value():
    cgst, sgst, igst = split_gst_place_of_supply(0.00)
    assert cgst == 0.0
    assert sgst == 0.0
    assert igst == 0.0


# =============================================================================
# 3. SERVICE RECONCILIATION & DATA GATHERING TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_gst_reporting_service_reconciliation():
    mock_db = AsyncMock()

    # Mock payin rows
    mock_payin = [
        {
            "id": "1",
            "txn_id": "PAYIN-1001",
            "ref_id": "ORDER-1001",
            "retailer_ref_id": 10928,
            "retailer_code": "SMSP-R902523",
            "retailer_name": "Inspel Solutions",
            "company_ref_id": 1,
            "company_name": DEFAULT_COMPANY_LEGAL_NAME,
            "service_name": "PayIn",
            "sac_code": "997159",
            "txn_date": datetime(2026, 4, 15, 10, 0, 0, tzinfo=timezone.utc),
            "txn_amount": 50000.00,
            "taxable_value": 500.00,
            "gst_rate": 18.00,
            "total_gst": 90.00,
            "service_charges": 590.00,
            "txn_status": "SUCCESS",
            "recipient_state": "Tamil Nadu",
        },
        {
            "id": "2",
            "txn_id": "PAYIN-1002",
            "ref_id": "ORDER-1002",
            "retailer_ref_id": 10928,
            "retailer_code": "SMSP-R902523",
            "retailer_name": "Inspel Solutions",
            "company_ref_id": 1,
            "company_name": DEFAULT_COMPANY_LEGAL_NAME,
            "service_name": "PayIn",
            "sac_code": "997159",
            "txn_date": datetime(2026, 4, 16, 11, 0, 0, tzinfo=timezone.utc),
            "txn_amount": 20000.00,
            "taxable_value": 200.00,
            "gst_rate": 18.00,
            "total_gst": 36.00,
            "service_charges": 236.00,
            "txn_status": "FAILED",  # Excluded from taxable totals
            "recipient_state": "Tamil Nadu",
        }
    ]

    # Mock payout rows
    mock_payout = [
        {
            "id": "3",
            "txn_id": "PAYOUT-2001",
            "ref_id": "UTR-2001",
            "retailer_ref_id": 10928,
            "retailer_code": "SMSP-R902523",
            "retailer_name": "Inspel Solutions",
            "company_ref_id": 1,
            "company_name": DEFAULT_COMPANY_LEGAL_NAME,
            "service_name": "PayOut",
            "sac_code": "997159",
            "txn_date": datetime(2026, 4, 20, 14, 0, 0, tzinfo=timezone.utc),
            "txn_amount": 100000.00,
            "taxable_value": 1000.00,
            "gst_rate": 18.00,
            "total_gst": 180.00,
            "service_charges": 1180.00,
            "txn_status": "SUCCESS",
            "recipient_state": "Karnataka",  # Inter-state (IGST)
        }
    ]

    # Configure mock responses for execute() calls
    res_payin = MagicMock()
    res_payin.mappings.return_value.fetchall.return_value = mock_payin

    res_payout = MagicMock()
    res_payout.mappings.return_value.fetchall.return_value = mock_payout

    res_empty = MagicMock()
    res_empty.mappings.return_value.fetchall.return_value = []

    mock_db.execute.side_effect = [res_payin, res_payout, res_empty, res_empty, res_empty]

    filters = {"financial_year": "FY 2026-27", "month": "04"}
    auth_ctx = {"is_admin": True, "company_ref_id": 1}

    result = await GstReportingService.fetch_gst_data(mock_db, filters, auth_ctx)
    summary = result["summary"]
    services = result["service_breakdown"]

    # Assertions
    assert summary["financial_year"] == "FY 2026-27"
    assert summary["total_transactions"] == 3
    # Taxable total: 500 (PayIn success) + 1000 (PayOut success) = 1500 (Failed 200 excluded)
    assert summary["total_taxable_value"] == 1500.00
    # PayIn CGST 45 + SGST 45; PayOut IGST 180
    assert summary["total_cgst"] == 45.00
    assert summary["total_sgst"] == 45.00
    assert summary["total_igst"] == 180.00
    assert summary["total_gst"] == 270.00
    # Reconciliation check
    assert round_cur(summary["total_cgst"] + summary["total_sgst"] + summary["total_igst"]) == summary["total_gst"]
    # Reversals/failed count: 1
    assert summary["total_reversals_count"] == 1


# =============================================================================
# 4. EXPORT ENGINE TESTS (CSV, EXCEL, PDF)
# =============================================================================

def test_generate_gst_csv():
    mock_data = {
        "summary": {
            "financial_year": "FY 2026-27",
            "period": "April 2026",
            "company_name": DEFAULT_COMPANY_LEGAL_NAME,
            "company_gstin": DEFAULT_COMPANY_GSTIN,
            "total_transactions": 1,
            "total_taxable_value": 1000.00,
            "total_cgst": 90.00,
            "total_sgst": 90.00,
            "total_igst": 0.00,
            "total_gst": 180.00,
            "total_volume": 50000.00,
        },
        "metadata": {"generated_at": "2026-04-30 18:00:00 IST"},
        "transactions": [
            {
                "s_no": 1,
                "transaction_id": "TXN-101",
                "reference_id": "REF-101",
                "retailer_id": 10928,
                "retailer_code": "SMSP-R902523",
                "retailer_name": "Inspel Solutions",
                "company_name": DEFAULT_COMPANY_LEGAL_NAME,
                "service_name": "PayIn",
                "sac_code": "997159",
                "transaction_date": "2026-04-15 10:30:00",
                "transaction_amount": 50000.00,
                "taxable_value": 1000.00,
                "gst_rate": 18.00,
                "cgst": 90.00,
                "sgst": 90.00,
                "igst": 0.00,
                "total_gst": 180.00,
                "service_charges": 1180.00,
                "status": "SUCCESS",
            }
        ]
    }
    csv_str = GstReportingService.generate_gst_csv(mock_data)
    assert DEFAULT_COMPANY_LEGAL_NAME in csv_str
    assert DEFAULT_COMPANY_GSTIN in csv_str
    assert "TXN-101" in csv_str
    assert "997159" in csv_str


def test_generate_gst_excel():
    mock_data = {
        "summary": {
            "financial_year": "FY 2026-27",
            "period": "April 2026",
            "company_name": DEFAULT_COMPANY_LEGAL_NAME,
            "company_gstin": DEFAULT_COMPANY_GSTIN,
            "total_transactions": 1,
            "total_taxable_value": 1000.00,
            "total_cgst": 90.00,
            "total_sgst": 90.00,
            "total_igst": 0.00,
            "total_gst": 180.00,
            "total_volume": 50000.00,
            "total_service_charges": 1180.00,
            "total_reversals_count": 0,
            "total_reversals_amount": 0.0,
        },
        "metadata": {"generated_at": "2026-04-30 18:00:00 IST"},
        "service_breakdown": [
            {
                "service_name": "PayIn (Payment Gateway)",
                "sac_code": "997159",
                "count": 1,
                "total_amount": 50000.00,
                "taxable_value": 1000.00,
                "gst_rate": 18.00,
                "cgst": 90.00,
                "sgst": 90.00,
                "igst": 0.00,
                "total_gst": 180.00,
                "service_charges": 1180.00,
            }
        ],
        "transactions": [],
        "reversals": []
    }
    excel_stream = GstReportingService.generate_gst_excel(mock_data)
    assert isinstance(excel_stream, io.BytesIO)

    # Load workbook and verify sheets
    wb = openpyxl.load_workbook(excel_stream)
    assert "GST Summary" in wb.sheetnames
    assert "Service-wise GST" in wb.sheetnames
    assert "Transaction Details" in wb.sheetnames
    assert "Reversals & Adjustments" in wb.sheetnames

    # Check Summary Sheet contents
    ws_sum = wb["GST Summary"]
    assert DEFAULT_COMPANY_LEGAL_NAME.upper() in ws_sum["A1"].value


def test_generate_gst_pdf():
    mock_data = {
        "summary": {
            "financial_year": "FY 2026-27",
            "period": "April 2026",
            "company_name": DEFAULT_COMPANY_LEGAL_NAME,
            "company_gstin": DEFAULT_COMPANY_GSTIN,
            "total_transactions": 5,
            "total_taxable_value": 5000.00,
            "total_cgst": 450.00,
            "total_sgst": 450.00,
            "total_igst": 0.00,
            "total_gst": 900.00,
            "total_volume": 250000.00,
            "total_service_charges": 5900.00,
        },
        "metadata": {"generated_at": "2026-04-30 18:00:00 IST"},
        "service_breakdown": [
            {
                "service_name": "PayIn (Payment Gateway)",
                "sac_code": "997159",
                "count": 5,
                "total_amount": 250000.00,
                "taxable_value": 5000.00,
                "gst_rate": 18.00,
                "cgst": 450.00,
                "sgst": 450.00,
                "igst": 0.00,
                "total_gst": 900.00,
                "service_charges": 5900.00,
            }
        ],
        "transactions": [],
        "reversals": []
    }
    pdf_stream = GstReportingService.generate_gst_pdf(mock_data)
    assert isinstance(pdf_stream, io.BytesIO)
    content = pdf_stream.getvalue()
    assert len(content) > 1000
    assert content.startswith(b"%PDF")
