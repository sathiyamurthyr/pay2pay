"""
Enterprise UPI QR Code Reader, Decoder, and Payload Parser Service.
Module: UPI QR Vendor Management & Configuration.
"""

import io
import re
import urllib.parse
from typing import Dict, Any, Optional
from PIL import Image, ImageEnhance, ImageOps

try:
    import zxingcpp
    ZXING_AVAILABLE = True
except ImportError:
    ZXING_AVAILABLE = False


class UpiQrService:
    """Service to decode static UPI QR code images and extract UPI metadata."""

    @classmethod
    def decode_and_parse_upi_qr(cls, file_bytes: bytes) -> Dict[str, Any]:
        """
        Reads image bytes, locates and decodes QR code, validates UPI payload,
        and extracts UPI ID (VPA), Payee Name, Merchant Code, and full URI.
        """
        if not ZXING_AVAILABLE:
            raise RuntimeError("QR decoding engine (zxingcpp) is not installed on the server.")

        if not file_bytes:
            raise ValueError("Unable to read QR code. Please upload a valid UPI QR image.")

        try:
            image = Image.open(io.BytesIO(file_bytes))
        except Exception:
            raise ValueError("Invalid image file. Please upload a valid JPG, PNG, or WEBP image.")

        # Attempt decoding with progressive enhancements
        raw_text = cls._decode_image_with_fallbacks(image)
        if not raw_text:
            raise ValueError("Unable to read QR code. Please upload a valid UPI QR image.")

        # Validate & parse UPI payload
        return cls.parse_upi_payload(raw_text)

    @classmethod
    def _decode_image_with_fallbacks(cls, img: Image.Image) -> Optional[str]:
        """Tries decoding original image, then grayscale, then contrast enhanced."""
        # 1. Direct pass
        try:
            barcodes = zxingcpp.read_barcodes(img)
            if barcodes and len(barcodes) > 0 and barcodes[0].text:
                return barcodes[0].text.strip()
        except Exception:
            pass

        # 2. Convert to RGB / Grayscale
        try:
            gray = img.convert("L")
            barcodes = zxingcpp.read_barcodes(gray)
            if barcodes and len(barcodes) > 0 and barcodes[0].text:
                return barcodes[0].text.strip()
        except Exception:
            pass

        # 3. Enhance Contrast & Invert check
        try:
            gray = img.convert("L")
            enhancer = ImageEnhance.Contrast(gray)
            high_contrast = enhancer.enhance(2.0)
            barcodes = zxingcpp.read_barcodes(high_contrast)
            if barcodes and len(barcodes) > 0 and barcodes[0].text:
                return barcodes[0].text.strip()

            # Invert (for dark mode QRs or inverted colors)
            inverted = ImageOps.invert(gray)
            barcodes = zxingcpp.read_barcodes(inverted)
            if barcodes and len(barcodes) > 0 and barcodes[0].text:
                return barcodes[0].text.strip()
        except Exception:
            pass

        # 4. Scale up if small
        try:
            w, h = img.size
            if w < 500 or h < 500:
                scaled = img.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
                barcodes = zxingcpp.read_barcodes(scaled)
                if barcodes and len(barcodes) > 0 and barcodes[0].text:
                    return barcodes[0].text.strip()
        except Exception:
            pass

        return None

    @classmethod
    def parse_upi_payload(cls, raw_text: str) -> Dict[str, Any]:
        """
        Validates whether raw_text represents a UPI QR code or VPA,
        and extracts UPI parameters.
        """
        clean = raw_text.strip()

        # Case 1: Standard UPI URI (upi://pay?pa=... or contains pa=)
        if clean.lower().startswith("upi://pay") or "pa=" in clean.lower():
            query_str = clean
            if "?" in clean:
                query_str = clean.split("?", 1)[1]

            params = dict(urllib.parse.parse_qsl(query_str, keep_blank_values=True))
            # Case insensitive lookup
            pa = ""
            pn = ""
            mc = ""
            am = ""
            cu = "INR"
            tr = ""

            for k, v in params.items():
                k_lower = k.lower()
                if k_lower == "pa":
                    pa = v.strip()
                elif k_lower == "pn":
                    pn = v.strip()
                elif k_lower == "mc":
                    mc = v.strip()
                elif k_lower == "am":
                    am = v.strip()
                elif k_lower == "cu":
                    cu = v.strip()
                elif k_lower == "tr":
                    tr = v.strip()

            if not pa or "@" not in pa:
                # Attempt regex search for VPA inside payload
                vpa_match = re.search(r"\b[A-Za-z0-9._\-]{2,64}@[A-Za-z]{2,30}\b", clean)
                if vpa_match:
                    pa = vpa_match.group(0)
                else:
                    raise ValueError("Unable to read QR code. Please upload a valid UPI QR image.")

            # Validate VPA format
            if not re.match(r"^[A-Za-z0-9._\-]{2,64}@[A-Za-z]{2,30}$", pa):
                raise ValueError(f"Extracted UPI ID '{pa}' is not in a valid UPI VPA format (e.g. name@bank).")

            amount_val = None
            if am:
                try:
                    amount_val = float(am)
                except ValueError:
                    amount_val = None

            canonical_uri = clean if clean.lower().startswith("upi://pay") else f"upi://pay?pa={pa}&pn={urllib.parse.quote(pn)}&cu={cu}"

            return {
                "upi_id": pa,
                "payee_name": pn if pn else None,
                "merchant_code": mc if mc else None,
                "amount": amount_val,
                "currency": cu if cu else "INR",
                "transaction_ref": tr if tr else None,
                "upi_uri": canonical_uri,
                "qr_payload": clean
            }

        # Case 2: Raw UPI VPA string (e.g. merchant@icici)
        vpa_match = re.match(r"^[A-Za-z0-9._\-]{2,64}@[A-Za-z]{2,30}$", clean)
        if vpa_match:
            pa = clean
            return {
                "upi_id": pa,
                "payee_name": None,
                "merchant_code": None,
                "amount": None,
                "currency": "INR",
                "transaction_ref": None,
                "upi_uri": f"upi://pay?pa={pa}",
                "qr_payload": clean
            }

        raise ValueError("Unable to read QR code. Please upload a valid UPI QR image.")
