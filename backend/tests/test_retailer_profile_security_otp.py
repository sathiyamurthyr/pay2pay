import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.presentation.api.v1.retailer_profile_router import (
    DEFAULT_TENANT_ID,
    RetailerProfileContext,
    SecurityWhatsAppOtpRequest,
    send_security_whatsapp_otp,
)


class _DummyRequest:
    def __init__(self, host: str = "login.smspay.store"):
        self.headers = {"host": host}
        self.cookies = {}


@pytest.mark.asyncio
@patch("app.presentation.api.v1.retailer_profile_router.whatsapp_service.send_otp", new_callable=AsyncMock)
@patch("app.presentation.api.v1.retailer_profile_router.resolve_retailer_context", new_callable=AsyncMock)
async def test_send_security_whatsapp_otp_creates_draft_without_name_error(mock_ctx, mock_send_otp):
    mock_ctx.return_value = RetailerProfileContext(
        target_ident="SMSP-R902523",
        clean_mobile="9025232475",
        r_uuid=uuid.uuid4(),
        session_user_id=str(uuid.uuid4()),
        session_email="sathya@smspay.store",
        session_company_ref_id=2,
        session_tenant_ref_id=1,
    )
    mock_send_otp.return_value = {"status": "SUCCESS", "delivered": True}

    mock_db = AsyncMock()
    empty_scalars = MagicMock()
    empty_scalars.first.return_value = None
    empty_result = MagicMock()
    empty_result.scalars.return_value = empty_scalars
    mock_db.execute.return_value = empty_result

    req = _DummyRequest()
    payload = SecurityWhatsAppOtpRequest(action="MPIN")

    res = await send_security_whatsapp_otp(req=payload, request=req, retailer_id=None, db=mock_db)

    assert res["success"] is True
    assert res["action"] == "MPIN"
    assert res["masked_mobile"].endswith("2475")
    mock_db.add.assert_called_once()
    added_draft = mock_db.add.call_args[0][0]
    assert added_draft.tenant_id == DEFAULT_TENANT_ID
    assert added_draft.draft_data["pending_security_whatsapp_otp"]["action"] == "MPIN"
    mock_send_otp.assert_awaited_once()
    assert mock_send_otp.call_args.kwargs["company_context"] == 2
