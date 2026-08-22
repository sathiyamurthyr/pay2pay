"""
Utkal Digital Payout Client Adapter.
Seamlessly forwards to official UtkalDigitalApiClient with validated endpoints & IPv4 transport.
"""

from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.application.utkaldigital_client import UtkalDigitalApiClient

class UtkalDigitalClient:
    """Official Utkal Digital Payout Adapter."""

    @classmethod
    async def get_bank_details(cls, *args, **kwargs) -> Dict[str, Any]:
        return {"status": "SUCCESS", "data": []}

    @classmethod
    async def initiate_payout(
        cls,
        merchant_ref: str,
        account_number: str,
        ifsc_code: str,
        account_holder: str,
        amount: float,
        bank_code: Optional[str] = None,
        bank_name: Optional[str] = None,
        mode: str = "IMPS",
        mobile: str = "9876543210",
        db: Optional[AsyncSession] = None,
        auth_code: Optional[str] = None,
        mpin: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Forwards to official UtkalDigitalApiClient with validated endpoints."""
        return await UtkalDigitalApiClient.initiate_payout(
            merchant_ref=merchant_ref,
            account_number=account_number,
            ifsc_code=ifsc_code,
            account_holder=account_holder,
            amount=amount,
            sender_mobile=mobile or "9876543210",
            sender_name=account_holder or "Customer",
            bank_name=bank_name or "Bank",
            bank_code=bank_code or ("SBIN" if "SBIN" in str(ifsc_code).upper() else "MAGNI"),
            service_id="27",
            authcode=auth_code,
            mpin=mpin
        )

    @classmethod
    async def status_check(
        cls,
        request_id: str,
        transaction_id: Optional[str] = None,
        auth_code: Optional[str] = None,
        mpin: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Forwards status check to official UtkalDigitalApiClient."""
        return await UtkalDigitalApiClient.check_payout_status(
            request_id=request_id,
            authcode=auth_code,
            mpin=mpin
        )

    @classmethod
    async def check_balance(
        cls,
        auth_code: Optional[str] = None,
        mpin: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Forwards balance check to official UtkalDigitalApiClient."""
        return await UtkalDigitalApiClient.check_balance(
            authcode=auth_code,
            mpin=mpin
        )
