"""
Cashfree Offline Aadhaar eKYC Verification Adapter
Official API Endpoints:
  - Generate OTP: POST https://api.cashfree.com/verification/offline-aadhaar/otp
  - Verify OTP: POST https://api.cashfree.com/verification/offline-aadhaar/verify
"""

import os
import time
import json
import logging
import random
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("cashfree_aadhaar_adapter")

# In-memory OTP session store for testing & fallback
_cashfree_otp_sessions: Dict[str, Dict[str, Any]] = {}

ENABLE_LIVE_CASHFREE_AADHAAR = os.getenv("ENABLE_LIVE_CASHFREE_AADHAAR", "true").lower() == "true"

class CashfreeAadhaarAdapter:
    """Production Cashfree Offline Aadhaar eKYC Adapter."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None
    ):
        self.base_url = (
            base_url
            or os.getenv("CASHFREE_API_BASE_URL")
            or os.getenv("CASHFREE_BASE_URL")
            or "https://api.cashfree.com/verification"
        )
        self.client_id = client_id or os.getenv("CASHFREE_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("CASHFREE_CLIENT_SECRET", "")

    async def generate_aadhaar_otp(self, aadhaar_number: str) -> Dict[str, Any]:
        """Request 6-digit Aadhaar OTP from UIDAI via Cashfree Offline Aadhaar API."""
        clean_aadhaar = "".join(filter(str.isdigit, aadhaar_number))
        if len(clean_aadhaar) != 12:
            raise ValueError("Aadhaar number must be a valid 12-digit number")

        if not self.client_id or not self.client_secret:
            raise ValueError("Cashfree verification credentials are not configured on this server.")

        masked_aadhaar = f"XXXX-XXXX-{clean_aadhaar[-4:]}"
        ref_id = str(int(time.time() * 1000))

        headers = {
            "x-client-id": self.client_id,
            "x-client-secret": self.client_secret,
            "x-api-version": os.getenv("CASHFREE_API_VERSION", "2022-10-26"),
            "Content-Type": "application/json"
        }

        payload = {"aadhaar_number": clean_aadhaar}
        api_url = f"{self.base_url}/offline-aadhaar/otp"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(api_url, headers=headers, json=payload)
                data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}

                if resp.status_code in [200, 201] and (data.get("ref_id") or data.get("status") in ["SUCCESS", "OTP_SENT"]):
                    cf_ref_id = str(data.get("ref_id") or data.get("reference_id") or ref_id)
                    session = {
                        "ref_id": cf_ref_id,
                        "masked_aadhaar": masked_aadhaar,
                        "aadhaar_number": clean_aadhaar,
                        "created_at": time.time(),
                        "status": "OTP_SENT"
                    }
                    _cashfree_otp_sessions[cf_ref_id] = session
                    return {
                        "status": "SUCCESS",
                        "ref_id": cf_ref_id,
                        "masked_aadhaar": masked_aadhaar,
                        "message": data.get("message") or f"Aadhaar eKYC OTP dispatched to registered mobile for {masked_aadhaar}",
                        "provider": "CASHFREE_LIVE_OFFLINE_AADHAAR",
                        "raw_response": data
                    }
                elif resp.status_code == 502:
                    error_msg = data.get("message") or "UIDAI Aadhaar server is temporarily unavailable. Please try again in a few moments."
                    logger.warning(f"Cashfree OTP HTTP 502: {error_msg}")
                    raise ValueError(error_msg)
                else:
                    error_msg = data.get("message") or f"Cashfree Aadhaar service returned HTTP {resp.status_code}"
                    logger.warning(f"Cashfree OTP error: {error_msg}")
                    raise ValueError(error_msg)
        except ValueError:
            raise
        except Exception as ex:
            logger.error(f"Cashfree API connection exception: {ex}")
            raise ValueError(f"Unable to connect to Aadhaar verification provider: {str(ex)}")

    async def verify_aadhaar_otp(self, ref_id: str, otp_code: str) -> Dict[str, Any]:
        """Verify 6-digit Aadhaar OTP via Cashfree Offline Aadhaar API.
        Never falls back to dummy/demo profiles. Verification MUST be genuine from UIDAI.
        """
        clean_otp = otp_code.strip()
        if len(clean_otp) != 6 or not clean_otp.isdigit():
            raise ValueError("Invalid Aadhaar OTP entered. Please enter the valid 6-digit numeric OTP code received from UIDAI.")

        if not self.client_id or not self.client_secret:
            raise ValueError("Cashfree verification credentials are not configured on this server.")

        headers = {
            "x-client-id": self.client_id,
            "x-client-secret": self.client_secret,
            "x-api-version": os.getenv("CASHFREE_API_VERSION", "2022-10-26"),
            "Content-Type": "application/json"
        }

        payload = {
            "otp": clean_otp,
            "ref_id": str(ref_id)
        }
        api_url = f"{self.base_url}/offline-aadhaar/verify"

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(api_url, headers=headers, json=payload)
                data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}

                if resp.status_code in [200, 201]:
                    if data.get("status") in ["VALID", "SUCCESS"] or data.get("name") or data.get("full_name"):
                        return self._build_ekyc_profile(data, ref_id)
                    raise ValueError(data.get("message") or "Aadhaar verification could not be validated by UIDAI.")
                elif resp.status_code == 502:
                    error_msg = data.get("message") or "UIDAI Aadhaar verification gateway is temporarily unavailable. Please try again shortly."
                    logger.warning(f"Cashfree verify HTTP 502: {error_msg}")
                    raise ValueError(error_msg)
                else:
                    error_msg = data.get("message") or f"Invalid Aadhaar OTP code or verification failed (HTTP {resp.status_code})."
                    logger.warning(f"Cashfree verify error: {error_msg}")
                    raise ValueError(error_msg)
        except ValueError:
            raise
        except Exception as ex:
            logger.error(f"Cashfree verification API exception: {ex}")
            raise ValueError(f"Aadhaar OTP verification failed: {str(ex)}")

    def _build_ekyc_profile(self, data: Dict[str, Any], ref_id: str) -> Dict[str, Any]:
        # Handle Cashfree split_address dictionary & address string/dict
        split_addr = data.get("split_address") if isinstance(data.get("split_address"), dict) else {}
        addr_field = data.get("address")
        
        if isinstance(addr_field, dict):
            addr_dict = {**addr_field, **split_addr}
            full_address_str = ""
        elif isinstance(addr_field, str) and addr_field:
            full_address_str = addr_field
            addr_dict = split_addr
        else:
            full_address_str = ""
            addr_dict = split_addr

        photo_val = data.get("photo") or data.get("photo_link") or data.get("photo_url") or ""
        masked_val = data.get("aadhaar_number") or data.get("masked_aadhaar") or ""

        # All name/address values come ONLY from the API response
        full_name_val = data.get("name") or data.get("full_name") or ""
        name_parts = full_name_val.split()
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        middle_name = name_parts[1] if len(name_parts) > 2 else ""
        last_name = name_parts[-1] if len(name_parts) > 1 else ""

        care_of_val = addr_dict.get("care_of") or data.get("care_of") or data.get("careof") or ""
        house_val = addr_dict.get("house") or ""
        street_val = addr_dict.get("street") or ""
        landmark_val = addr_dict.get("landmark") or ""
        loc_val = addr_dict.get("locality") or addr_dict.get("loc") or ""
        vtc_val = addr_dict.get("village_town_city") or addr_dict.get("vtc") or addr_dict.get("po") or ""
        dist_val = addr_dict.get("district") or addr_dict.get("dist") or ""
        state_val = addr_dict.get("state") or ""
        country_val = addr_dict.get("country") or "India"
        pincode_val = str(addr_dict.get("pincode") or addr_dict.get("zip") or "")

        if not full_address_str:
            parts = [house_val, street_val, landmark_val, loc_val, vtc_val, dist_val, state_val, pincode_val]
            full_address_str = ", ".join([str(p).strip() for p in parts if p and str(p).strip()])

        return {
            "ref_id": str(data.get("reference_id") or data.get("ref_id", ref_id)),
            "status": "SUCCESS",
            "verification_status": "VERIFIED",
            "full_name": full_name_val,
            "first_name": first_name,
            "middle_name": middle_name,
            "last_name": last_name,
            "dob": data.get("dob") or data.get("date_of_birth") or "",
            "gender": data.get("gender") or "",
            "care_of": care_of_val,
            "house": house_val,
            "street": street_val,
            "landmark": landmark_val,
            "loc": loc_val,
            "locality": loc_val,
            "vtc": vtc_val,
            "city": vtc_val or dist_val,
            "district": dist_val or vtc_val,
            "state": state_val,
            "country": country_val,
            "pincode": pincode_val,
            "photo_base64": photo_val,
            "photo_url": photo_val,
            "photo_avatar": photo_val,
            "masked_aadhaar": masked_val,
            "aadhaar_masked": masked_val,
            "address": addr_dict,
            "full_address": full_address_str,
            "verified_at": data.get("verified_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "provider": "CASHFREE_OFFLINE_AADHAAR",
            "raw_response": data
        }

cashfree_aadhaar_adapter = CashfreeAadhaarAdapter()
