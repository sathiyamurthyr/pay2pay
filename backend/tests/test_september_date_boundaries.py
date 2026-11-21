from datetime import datetime, timezone
import pytest
from app.presentation.api.v1.admin_reports_router import parse_date_range as parse_admin_date_range
from app.presentation.api.v1.payin_report_router import parse_date_range as parse_payin_date_range


def test_admin_september_month_bounds():
    start_dt, end_dt = parse_admin_date_range(month="September")
    # September 1 00:00:00 IST is 2026-08-31 18:30:00 UTC
    assert start_dt == datetime(2026, 8, 31, 18, 30, 0, tzinfo=timezone.utc)
    # September 30 23:59:59.999999 IST is 2026-09-30 18:29:59.999999 UTC
    assert end_dt == datetime(2026, 9, 30, 18, 29, 59, 999999, tzinfo=timezone.utc)


def test_admin_september_date_string():
    start_dt, end_dt = parse_admin_date_range(from_date="2026-09-01", to_date="2026-09-30")
    assert start_dt == datetime(2026, 8, 31, 18, 30, 0, tzinfo=timezone.utc)
    assert end_dt == datetime(2026, 9, 30, 18, 29, 59, 999999, tzinfo=timezone.utc)


def test_admin_single_september_date():
    # from_date in September should NOT default end_dt to current month (November)
    start_dt, end_dt = parse_admin_date_range(from_date="2026-09-01")
    assert start_dt == datetime(2026, 8, 31, 18, 30, 0, tzinfo=timezone.utc)
    assert end_dt == datetime(2026, 9, 30, 18, 29, 59, 999999, tzinfo=timezone.utc)


def test_payin_september_month_bounds():
    start_dt, end_dt = parse_payin_date_range(month="September")
    assert start_dt == datetime(2026, 8, 31, 18, 30, 0, tzinfo=timezone.utc)
    assert end_dt == datetime(2026, 9, 30, 18, 29, 59, 999999, tzinfo=timezone.utc)


def test_payin_september_yyyy_mm():
    start_dt, end_dt = parse_payin_date_range(from_date="2026-09")
    assert start_dt == datetime(2026, 8, 31, 18, 30, 0, tzinfo=timezone.utc)
    assert end_dt == datetime(2026, 9, 30, 18, 29, 59, 999999, tzinfo=timezone.utc)
