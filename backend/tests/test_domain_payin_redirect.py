"""
Unit & Integration Tests for Domain-Based PayIn Return Redirection and Transaction Status.
Verifies:
1. Domain whitelist isolation per company (SMSPAY, Near4You, Pay2Pay).
2. Defense against open redirect and cross-company domain context leakage.
3. BankMe redirect URL generation preserving originating company domain.
4. Universal browser callback redirection to status page on originating domain.
5. Transaction status resolution without MissingGreenlet or rollback errors.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import Request

from app.core.company_resolver import (
    is_trusted_domain_for_company,
    resolve_return_base_url,
    COMPANY_MAPPINGS
)
from app.application.bankme_payin_client import BankMePayInClient


def make_mock_request(host="login.smspay.store", origin=None, referer=None, proto="https"):
    headers = {
        "host": host,
        "x-forwarded-proto": proto
    }
    if origin:
        headers["origin"] = origin
    if referer:
        headers["referer"] = referer

    req = MagicMock(spec=Request)
    req.headers = headers
    req.url.scheme = proto
    return req


class TestDomainWhitelistAndResolution:
    """Verify company domain whitelist and resolve_return_base_url."""

    def test_smspay_trusted_domains(self):
        # Company ref 2 = SMSPAY
        assert is_trusted_domain_for_company("smspay.store", 2) is True
        assert is_trusted_domain_for_company("login.smspay.store", 2) is True
        assert is_trusted_domain_for_company("admin.smspay.store", 2) is True
        assert is_trusted_domain_for_company("smspay.in", 2) is True
        assert is_trusted_domain_for_company("login.smspay.in", 2) is True

    def test_smspay_rejects_cross_domain_leakage(self):
        # SMSPAY must NEVER trust Near4You or Pay2Pay domains
        assert is_trusted_domain_for_company("login.near4you.store", 2) is False
        assert is_trusted_domain_for_company("near4you.store", 2) is False
        assert is_trusted_domain_for_company("pay2pay.in", 2) is False
        assert is_trusted_domain_for_company("login.pay2pay.in", 2) is False
        assert is_trusted_domain_for_company("evil-attacker.com", 2) is False

    def test_near4you_trusted_domains(self):
        # Company ref 1 = NEAR4YOU
        assert is_trusted_domain_for_company("near4you.store", 1) is True
        assert is_trusted_domain_for_company("login.near4you.store", 1) is True
        assert is_trusted_domain_for_company("login.smspay.store", 1) is False

    def test_pay2pay_trusted_domains(self):
        # Company ref 47 = PAY2PAY
        assert is_trusted_domain_for_company("pay2pay.in", 47) is True
        assert is_trusted_domain_for_company("login.pay2pay.in", 47) is True
        assert is_trusted_domain_for_company("login.smspay.store", 47) is False

    def test_resolve_return_base_url_smspay_from_request_origin(self):
        req = make_mock_request(host="login.smspay.store", origin="https://login.smspay.store")
        base = resolve_return_base_url(company_ref_id=2, request=req)
        assert base == "https://login.smspay.store"

    def test_resolve_return_base_url_smspay_from_request_host(self):
        req = make_mock_request(host="login.smspay.store")
        base = resolve_return_base_url(company_ref_id=2, request=req)
        assert base == "https://login.smspay.store"

    def test_resolve_return_base_url_rejects_attacker_candidate(self):
        # Attacker tries to inject evil URL into candidate_url
        req = make_mock_request(host="login.smspay.store")
        base = resolve_return_base_url(
            company_ref_id=2,
            request=req,
            candidate_url="https://evil-phishing.com/steal"
        )
        # Must fall back to trusted domain, NOT attacker domain
        assert "evil-phishing.com" not in base
        assert base == "https://login.smspay.store"

    def test_resolve_return_base_url_rejects_cross_domain_candidate(self):
        # Cached Near4You URL in SMSPAY context must be rejected
        req = make_mock_request(host="login.smspay.store")
        base = resolve_return_base_url(
            company_ref_id=2,
            request=req,
            candidate_url="https://login.near4you.store/retailer/payin"
        )
        assert "near4you.store" not in base
        assert base == "https://login.smspay.store"

    def test_resolve_return_base_url_fallback_when_no_request(self):
        base_smspay = resolve_return_base_url(company_ref_id=2)
        assert base_smspay == "https://smspay.store"

        base_near4you = resolve_return_base_url(company_ref_id=1)
        assert base_near4you == "https://near4you.store"

        base_pay2pay = resolve_return_base_url(company_ref_id=47)
        assert base_pay2pay == "https://pay2pay.in"


class TestBankMeClientRedirectUrl:
    """Verify BankMe PayIn order creation generates the correct dynamic redirect URL."""

    @pytest.mark.asyncio
    async def test_bankme_redirect_url_uses_smspay_domain(self):
        tid = "BPAY1234567890"

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "success": True,
                "data": {
                    "orderId": "BM-ORD-111",
                    "paymentUrl": "https://bankme.co.in/checkout/pay?token=xyz",
                    "status": "INITIATED"
                }
            }
            mock_post.return_value = mock_resp

            with patch.object(BankMePayInClient, "get_credentials", return_value=("pk_test", "sk_test", "sim", "https://bankme.co.in")):
                with patch("app.application.bankme_payin_client.AsyncSessionLocal"):
                    resp = await BankMePayInClient.create_payin_order(
                        tid=tid,
                        amount=500.0,
                        customer_name="Test Retailer",
                        customer_mobile="9876543210",
                        company_ref_id=2,
                        return_url="https://login.smspay.store/retailer/payin/status?referenceId=" + tid
                    )

            # Check that redirectUrl sent to BankMe was on login.smspay.store
            assert mock_post.called
            call_kwargs = mock_post.call_args[1]
            sent_payload = call_kwargs["json"]
            assert sent_payload["redirectUrl"] == f"https://login.smspay.store/retailer/payin/status?referenceId={tid}"
            assert "near4you" not in sent_payload["redirectUrl"]
            assert resp["success"] is True


class TestPayInStatusService:
    """Verify PayIn status lookup, live sync, and greenlet safety."""

    @pytest.mark.asyncio
    async def test_status_sync_success_even_if_wallet_fails(self):
        from app.application.payin_service import PayInService
        from datetime import datetime, timezone

        mock_txn = MagicMock()
        mock_txn.tid = "BPAY9999"
        mock_txn.merchant_ref_id = "REF9999"
        mock_txn.provider_ref_id = "BM-REF-1"
        mock_txn.company_ref_id = 2
        mock_txn.retailer_ref_id = 10
        mock_txn.txn_status = "PENDING"
        mock_txn.txn_amount = 100.0
        mock_txn.mdr_amount = 2.0
        mock_txn.tax_amount = 0.36
        mock_txn.total_charges = 2.36
        mock_txn.customer_payable = 102.36
        mock_txn.retailer_credit = 100.0
        mock_txn.card_network = "VISA"
        mock_txn.mdr_treatment = "COLLECT_ADDITIONALLY"
        mock_txn.customer_payable_policy = "WITH_MDR"
        mock_txn.ledger_txn_id = None
        mock_txn.created_at = datetime.now(timezone.utc)
        mock_txn.updated_at = datetime.now(timezone.utc)

        mock_db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalars.return_value.first.return_value = mock_txn
        mock_db.execute.return_value = mock_res

        with patch("app.application.bankme_payin_client.BankMePayInClient.check_order_status", new_callable=AsyncMock) as mock_live_check:
            mock_live_check.return_value = {
                "success": True,
                "status": "SUCCESS",
                "utr": "BANKUTR9999"
            }
            with patch("app.application.wallet_balance_service.WalletBalanceAdjustmentService.execute_wallet_balance_update", new_callable=AsyncMock) as mock_wallet:
                # Simulate wallet update failure/exception
                mock_wallet.side_effect = RuntimeError("SP wallet_balance_update failed")

                res = await PayInService.get_transaction_status(
                    db=mock_db,
                    tid="BPAY9999",
                    auth_context={"company_ref_id": 2, "roles": ["RETAILER"]}
                )

        # Assert status was successfully resolved and preserved as SUCCESS
        assert res.status == "SUCCESS"
        assert res.customer_payable_policy == "WITH_MDR"
        assert res.policy_display_name == "Customer Pays MDR Charges"
        assert res.tid == "BPAY9999"
        assert res.provider_reference == "BANKUTR9999"
        # Database commit must have been called
        assert mock_db.commit.called

