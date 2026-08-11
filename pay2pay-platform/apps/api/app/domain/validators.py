import re
from app.core.exceptions import BadRequestException


GST_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")
PINCODE_REGEX = re.compile(r"^\d{6}$")
EMP_CODE_REGEX = re.compile(r"^[A-Z0-9_-]{3,50}$")
TID_REGEX = re.compile(r"^[A-Z0-9_-]{8,20}$")
MID_REGEX = re.compile(r"^[A-Z0-9_-]{8,30}$")
SERIAL_REGEX = re.compile(r"^[A-Z0-9_-]{5,100}$")
RRN_REGEX = re.compile(r"^[A-Z0-9_-]{12,30}$")
UTR_REGEX = re.compile(r"^[A-Z0-9_-]{12,30}$")
URL_REGEX = re.compile(r"^https?://[^\s/$.?#].[^\s]*$")
CHARGEBACK_REGEX = re.compile(r"^[A-Z0-9_-]{8,30}$")
TAX_PERIOD_REGEX = re.compile(r"^\d{4}-\d{2}$")
REPORT_NUM_REGEX = re.compile(r"^[A-Z0-9_-]{8,50}$")


def validate_gst(gst: str) -> bool:
    if not gst:
        return True
    if not GST_REGEX.match(gst.upper()):
        raise BadRequestException(f"Invalid GST format: '{gst}'. Example valid GST: '22AAAAA0000A1Z5'")
    return True


def validate_pan(pan: str) -> bool:
    if not pan:
        return True
    if not PAN_REGEX.match(pan.upper()):
        raise BadRequestException(f"Invalid PAN format: '{pan}'. Example valid PAN: 'ABCDE1234F'")
    return True


def validate_ifsc(ifsc: str) -> bool:
    if not ifsc:
        return True
    if not IFSC_REGEX.match(ifsc.upper()):
        raise BadRequestException(f"Invalid IFSC format: '{ifsc}'. Example valid IFSC: 'HDFC0001234'")
    return True


def validate_mobile(mobile: str) -> bool:
    if not mobile:
        return True
    clean_mobile = mobile.replace("+91", "").replace(" ", "").replace("-", "")
    if not MOBILE_REGEX.match(clean_mobile):
        raise BadRequestException(f"Invalid Indian Mobile number: '{mobile}'. Must be a 10-digit number.")
    return True


def validate_pincode(pincode: str) -> bool:
    if not pincode:
        return True
    if not PINCODE_REGEX.match(pincode):
        raise BadRequestException(f"Invalid Pincode format: '{pincode}'. Must be a 6-digit number.")
    return True


def validate_employee_code(emp_code: str) -> bool:
    if not emp_code:
        return True
    if not EMP_CODE_REGEX.match(emp_code.upper()):
        raise BadRequestException(f"Invalid Employee Code format: '{emp_code}'. Must be 3-50 alphanumeric characters.")
    return True


def validate_tid(tid: str) -> bool:
    if not tid:
        return True
    if not TID_REGEX.match(tid.upper()):
        raise BadRequestException(f"Invalid Terminal ID (TID) format: '{tid}'. Must be 8-20 alphanumeric characters.")
    return True


def validate_mid(mid: str) -> bool:
    if not mid:
        return True
    if not MID_REGEX.match(mid.upper()):
        raise BadRequestException(f"Invalid Merchant ID (MID) format: '{mid}'. Must be 8-30 alphanumeric characters.")
    return True


def validate_serial_number(serial: str) -> bool:
    if not serial:
        return True
    if not SERIAL_REGEX.match(serial.upper()):
        raise BadRequestException(f"Invalid Serial Number format: '{serial}'. Must be 5-100 alphanumeric characters.")
    return True


def validate_rrn(rrn: str) -> bool:
    if not rrn:
        return True
    if not RRN_REGEX.match(rrn.upper()):
        raise BadRequestException(f"Invalid RRN format: '{rrn}'. Must be 12-30 alphanumeric characters.")
    return True


def validate_utr(utr: str) -> bool:
    if not utr:
        return True
    if not UTR_REGEX.match(utr.upper()):
        raise BadRequestException(f"Invalid UTR format: '{utr}'. Must be 12-30 alphanumeric characters.")
    return True


def validate_webhook_url(url: str) -> bool:
    if not url:
        return True
    if not URL_REGEX.match(url):
        raise BadRequestException(f"Invalid Webhook URL format: '{url}'. Must start with http:// or https://")
    return True


def validate_chargeback_ref(cb_ref: str) -> bool:
    if not cb_ref:
        return True
    if not CHARGEBACK_REGEX.match(cb_ref.upper()):
        raise BadRequestException(f"Invalid Chargeback Case Reference format: '{cb_ref}'. Must be 8-30 alphanumeric characters.")
    return True


def validate_tax_period(tax_period: str) -> bool:
    if not tax_period:
        return True
    if not TAX_PERIOD_REGEX.match(tax_period):
        raise BadRequestException(f"Invalid Tax Period format: '{tax_period}'. Example valid Tax Period: '2026-07'")
    return True


def validate_report_number(rep_num: str) -> bool:
    if not rep_num:
        return True
    if not REPORT_NUM_REGEX.match(rep_num.upper()):
        raise BadRequestException(f"Invalid Report Number format: '{rep_num}'. Must be 8-50 alphanumeric characters.")
    return True
