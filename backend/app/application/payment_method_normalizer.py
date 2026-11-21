"""
Authoritative Payment Method Detection & Normalization Layer.

Normalizes payment methods returned by diverse payment gateways (BankMe, Airpay, Easebuzz, etc.)
into standardized system classifications:
- Mode: UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET, UNKNOWN
- Network / Scheme: VISA, MASTERCARD, RUPAY, AMEX, CORP, UPI, NONE
- Display Name: "Visa", "Mastercard", "RuPay", "UPI", "AMEX", "Corporate Card", "Net Banking", "Wallet", "Pending Classification"

Rules:
- Never default unrecognised or missing methods to UPI.
- Correctly distinguish Visa, Mastercard, RuPay, AMEX, Corporate Cards, and UPI.
"""

from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass(frozen=True)
class NormalizedPaymentMethod:
    pay_mode_code: str          # UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET, UNKNOWN
    card_network: Optional[str] # VISA, MASTERCARD, RUPAY, AMEX, CORP, None
    display_name: str           # Visa, Mastercard, RuPay, UPI, AMEX, Corporate Card, Net Banking, Wallet, Pending Classification
    raw_detected: Optional[str] # Original string extracted from gateway


class PaymentMethodNormalizer:
    """Central normalizer for all inbound payment gateway responses."""

    @classmethod
    def normalize_gateway_method(
        cls,
        raw_method: Optional[str] = None,
        raw_payload: Optional[Dict[str, Any]] = None
    ) -> NormalizedPaymentMethod:
        """
        Extracts and normalizes the payment method from raw strings or gateway response payloads.
        Supports:
        - BankMe response: order.paymentMethod (e.g. cc_visa, dc_visa, cc_master, cc_rupay, cc_corp, cc_amex, upi)
        - Webhook payload fields: paymentMethod, payment_method, method, paymentMode, card_network, cardScheme
        - Generic gateway payloads: Airpay (CHMOD, CARDTYPE), Easebuzz (mode, card_type), etc.
        """
        candidate_strings = []

        if raw_method and str(raw_method).strip():
            candidate_strings.append(str(raw_method).strip())

        if isinstance(raw_payload, dict):
            # 1. Check order object if nested (BankMe standard response)
            order_dict = raw_payload.get("order") if isinstance(raw_payload.get("order"), dict) else {}
            for k in ["paymentMethod", "payment_method", "method", "paymentMode", "payment_mode", "card_network", "cardNetwork", "cardScheme", "cardType"]:
                val = order_dict.get(k)
                if val and isinstance(val, str) and val.strip():
                    candidate_strings.append(val.strip())

            # 2. Check top-level payload keys
            for k in ["paymentMethod", "payment_method", "method", "paymentMode", "payment_mode", "card_network", "cardNetwork", "cardScheme", "card_category", "cardType", "channel", "mode", "CHMOD", "CARDTYPE"]:
                val = raw_payload.get(k)
                if val and isinstance(val, str) and val.strip():
                    candidate_strings.append(val.strip())

            # 3. Check raw_payload nested dict if present
            nested_raw = raw_payload.get("raw_payload") if isinstance(raw_payload.get("raw_payload"), dict) else {}
            for k in ["paymentMethod", "payment_method", "method", "card_network", "cardScheme", "card_category"]:
                val = nested_raw.get(k)
                if val and isinstance(val, str) and val.strip():
                    candidate_strings.append(val.strip())

            # 4. Check raw_response nested dict if present
            nested_resp = raw_payload.get("raw_response") if isinstance(raw_payload.get("raw_response"), dict) else {}
            if isinstance(nested_resp, dict):
                resp_order = nested_resp.get("order") if isinstance(nested_resp.get("order"), dict) else {}
                for k in ["paymentMethod", "payment_method", "method", "card_network"]:
                    val = resp_order.get(k) or nested_resp.get(k)
                    if val and isinstance(val, str) and val.strip():
                        candidate_strings.append(val.strip())

        if not candidate_strings:
            return NormalizedPaymentMethod(
                pay_mode_code="UNKNOWN",
                card_network=None,
                display_name="Pending Classification",
                raw_detected=None
            )

        # Inspect candidate strings in order of specificity
        for raw in candidate_strings:
            res = cls._parse_single_string(raw)
            if res.pay_mode_code != "UNKNOWN" or res.card_network is not None:
                return res

        # If none matched known patterns, return Unknown with the raw string
        return NormalizedPaymentMethod(
            pay_mode_code="UNKNOWN",
            card_network=None,
            display_name=candidate_strings[0].strip().title() if len(candidate_strings[0].strip()) <= 30 else "Pending Classification",
            raw_detected=candidate_strings[0]
        )

    @classmethod
    def _parse_single_string(cls, raw: str) -> NormalizedPaymentMethod:
        clean = raw.strip().upper().replace(" ", "_").replace("-", "_")

        # -------------------------------------------------------------
        # 1. UPI / QR / VPA
        # -------------------------------------------------------------
        if clean in ("UPI", "UPI_INTENT", "UPI_COLLECT", "UPI_QR", "QR", "BHIM", "VPA") or clean.startswith("UPI_"):
            return NormalizedPaymentMethod(
                pay_mode_code="UPI",
                card_network="UPI",
                display_name="UPI",
                raw_detected=raw
            )

        # -------------------------------------------------------------
        # 2. Debit Card Schemes (dc_*, debit_*)
        # -------------------------------------------------------------
        is_debit = (
            clean.startswith("DC_") or
            clean.startswith("DEBIT_") or
            "_DC_" in clean or
            clean.endswith("_DC") or
            clean == "DEBIT_CARD" or
            clean == "DEBIT"
        )

        is_credit = (
            clean.startswith("CC_") or
            clean.startswith("CREDIT_") or
            "_CC_" in clean or
            clean.endswith("_CC") or
            clean == "CREDIT_CARD" or
            clean == "CREDIT"
        )

        # Determine card network if present in string
        network = None
        if "VISA" in clean:
            network = "VISA"
        elif "MASTER" in clean or clean.endswith("_MC") or clean.startswith("MC_") or clean in ("MC", "MASTERCARD"):
            network = "MASTERCARD"
        elif "RUPAY" in clean:
            network = "RUPAY"
        elif "AMEX" in clean or "AMERICAN_EXPRESS" in clean or "DINERS" in clean:
            network = "AMEX"
        elif "CORP" in clean or "CORPORATE" in clean or "BUSINESS" in clean:
            network = "CORP"

        if network:
            mode = "DEBIT_CARD" if is_debit else ("CREDIT_CARD" if is_credit else "CREDIT_CARD")
            display_map = {
                "VISA": "Visa",
                "MASTERCARD": "Mastercard",
                "RUPAY": "RuPay",
                "AMEX": "AMEX",
                "CORP": "Corporate Card"
            }
            return NormalizedPaymentMethod(
                pay_mode_code=mode,
                card_network=network,
                display_name=display_map.get(network, network.title()),
                raw_detected=raw
            )

        # General card without explicit network
        if is_debit:
            return NormalizedPaymentMethod(
                pay_mode_code="DEBIT_CARD",
                card_network=None,
                display_name="Debit Card",
                raw_detected=raw
            )
        if is_credit:
            return NormalizedPaymentMethod(
                pay_mode_code="CREDIT_CARD",
                card_network=None,
                display_name="Credit Card",
                raw_detected=raw
            )

        # -------------------------------------------------------------
        # 3. Net Banking
        # -------------------------------------------------------------
        if clean in ("NETBANKING", "NET_BANKING", "NB") or clean.startswith("NB_") or "NETBANK" in clean:
            return NormalizedPaymentMethod(
                pay_mode_code="NET_BANKING",
                card_network=None,
                display_name="Net Banking",
                raw_detected=raw
            )

        # -------------------------------------------------------------
        # 4. Wallet / PPI
        # -------------------------------------------------------------
        if clean in ("WALLET", "PPI") or clean.startswith("WALLET_") or "WALLET" in clean:
            return NormalizedPaymentMethod(
                pay_mode_code="WALLET",
                card_network=None,
                display_name="Wallet",
                raw_detected=raw
            )

        return NormalizedPaymentMethod(
            pay_mode_code="UNKNOWN",
            card_network=None,
            display_name="Pending Classification",
            raw_detected=raw
        )

    @classmethod
    def get_clean_method_display(
        cls,
        card_network: Optional[str] = None,
        pay_mode_code: Optional[str] = None,
        fallback_str: Optional[str] = None
    ) -> str:
        """
        Returns clean, high-contrast, standardized display string for PayIn Report,
        Receipts, CSV exports, and UI components.
        """
        if card_network and card_network.strip():
            cnet = card_network.strip().upper()
            if cnet == "VISA":
                return "Visa"
            elif cnet in ("MASTERCARD", "MC"):
                return "Mastercard"
            elif cnet == "RUPAY":
                return "RuPay"
            elif cnet == "AMEX":
                return "AMEX"
            elif cnet in ("CORP", "CORPORATE"):
                return "Corporate Card"
            elif cnet == "UPI":
                return "UPI"

        if pay_mode_code and pay_mode_code.strip():
            pm = pay_mode_code.strip().upper()
            if pm == "UPI":
                return "UPI"
            elif pm == "CREDIT_CARD":
                return "Credit Card"
            elif pm == "DEBIT_CARD":
                return "Debit Card"
            elif pm == "NET_BANKING":
                return "Net Banking"
            elif pm == "WALLET":
                return "Wallet"
            elif pm == "UNKNOWN":
                return "Pending Classification"

        if fallback_str and fallback_str.strip():
            norm = cls.normalize_gateway_method(fallback_str)
            if norm.display_name != "Pending Classification":
                return norm.display_name
            return fallback_str.strip().title()

        return "Pending Classification"
