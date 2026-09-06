"""
EPIC — Beneficiary Name Sanitizer
===================================
Utility to sanitize beneficiary names coming from:
  - Cashfree V2 Penny Drop API responses  (e.g. "MR.VARUKOLU DHINESH")
  - User form input                       (e.g. "MISS.VINOTHINI")
  - Any external gateway or bank feed

Rules:
  1. Replace every character that is NOT alphanumeric or a space with a single space.
     This handles dots (.), commas (,), hyphens (-), apostrophes ('), slashes (/), etc.
  2. Collapse consecutive whitespace (including newlines, tabs) into a single space.
  3. Strip leading and trailing spaces.
  4. Convert to UPPERCASE for consistent storage.

Before: "MR.VARUKOLU DHINESH"   → After: "MR VARUKOLU DHINESH"
Before: "MISS.VINOTHINI"        → After: "MISS VINOTHINI"
Before: "MR.MOHAMMED IMROZ KHAN"→ After: "MR MOHAMMED IMROZ KHAN"
Before: "MR.GIRIGI SURYANARAYANA"→ After: "MR GIRIGI SURYANARAYANA"
Before: "O'NEIL JOHN-PAUL"      → After: "O NEIL JOHN PAUL"
"""
import re
from typing import Optional


def sanitize_beneficiary_name(name: Optional[str] = None) -> str:
    """
    Clean a beneficiary name: remove special characters, collapse spaces,
    strip, and uppercase.  Safe to call on None / empty strings.
    """
    if not name:
        return name or ""

    # Step 1: Replace every non-alphanumeric, non-space char with a space
    cleaned = re.sub(r"[^A-Za-z0-9\s]", " ", name)

    # Step 2: Collapse multiple whitespace characters into a single space
    cleaned = re.sub(r"\s+", " ", cleaned)

    # Step 3: Strip + uppercase
    return cleaned.strip().upper()
