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


@pytest.mark.asyncio
@patch("app.presentation.api.v1.retailer_profile_router.flag_modified")
@patch("app.presentation.api.v1.retailer_profile_router.AuditLogger.log_action", new_callable=AsyncMock)
@patch("app.presentation.api.v1.retailer_profile_router.resolve_retailer_context", new_callable=AsyncMock)
async def test_change_mpin_survives_missing_stored_proc_via_savepoint(mock_ctx, mock_audit, mock_flag):
    from datetime import datetime, timedelta, timezone
    from types import SimpleNamespace
    from contextlib import asynccontextmanager
    from app.presentation.api.v1.retailer_profile_router import PinChangeRequest, change_mpin

    ret_uuid = uuid.uuid4()
    mock_ctx.return_value = RetailerProfileContext(
        target_ident="N4U-R669426",
        clean_mobile="9176669426",
        r_uuid=ret_uuid,
        session_user_id=str(ret_uuid),
        session_email="retailer@near4you.store",
        session_company_ref_id=1,
        session_tenant_ref_id=1,
    )

    draft_obj = SimpleNamespace(
        registration_id="N4U-R669426",
        mobile_number="9176669426",
        draft_data={
            "pending_security_whatsapp_otp": {
                "code": "244343",
                "action": "MPIN",
                "mobile": "9176669426",
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
                "attempts": 0,
            }
        },
    )
    ret_obj = SimpleNamespace(
        id=5,
        public_id=ret_uuid,
        mpin_hash=None,
        mpin_failed_attempts=2,
        mpin_locked=True,
        updated_date=None,
    )

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    savepoint_entered = False

    @asynccontextmanager
    async def fake_begin_nested():
        nonlocal savepoint_entered
        savepoint_entered = True
        try:
            yield
        except Exception:
            raise

    mock_db.begin_nested = fake_begin_nested

    draft_res = MagicMock()
    draft_res.scalars.return_value.first.return_value = draft_obj
    sec_res = MagicMock()
    sec_res.scalars.return_value.first.return_value = None
    cust_res = MagicMock()
    cust_res.scalars.return_value.first.return_value = None
    ret_res = MagicMock()
    ret_res.scalars.return_value.first.return_value = ret_obj

    call_count = 0

    async def execute_side_effect(stmt, params=None):
        nonlocal call_count
        call_count += 1
        sql_str = str(stmt)
        if "sp_update_retailer_mpin" in sql_str:
            raise RuntimeError("function public.sp_update_retailer_mpin does not exist")
        return [draft_res, sec_res, cust_res, ret_res][min(call_count - 1, 3)]

    mock_db.execute.side_effect = execute_side_effect

    payload = PinChangeRequest(
        current_pin=None,
        new_pin="2580",
        confirm_pin="2580",
        otp_code="244343",
    )
    res = await change_mpin(req=payload, request=_DummyRequest("login.near4you.store"), retailer_id=None, db=mock_db)

    assert res["success"] is True
    assert savepoint_entered is True
    assert ret_obj.mpin_hash is not None
    assert ret_obj.mpin_locked is False
    assert ret_obj.mpin_failed_attempts == 0
    assert "pending_security_whatsapp_otp" not in draft_obj.draft_data
    mock_db.commit.assert_awaited_once()

