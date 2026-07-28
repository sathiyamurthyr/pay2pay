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
