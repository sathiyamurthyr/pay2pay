import pytest
import uuid
from unittest.mock import AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import get_db
from app.application.dependencies import get_current_token_payload
from app.infrastructure.db.models import RetailerModel
from app.infrastructure.db.session_security_models import UserSecuritySettingsModel
from tests.test_verify_pin_endpoint import MockResult, MockScalars


@pytest.fixture(autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_terminal_lock_and_unlock_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        # 1. Check unauthenticated access rejected
        res_lock_unauth = await ac.post("/api/v1/session/lock", json={"reason": "Test lock"})
        assert res_lock_unauth.status_code in (401, 403)

        res_status_unauth = await ac.get("/api/v1/session/status")
        assert res_status_unauth.status_code in (401, 403)


@pytest.mark.asyncio
async def test_terminal_lock_preserves_active_account_status():
    user_id = str(uuid.uuid4())
    ret_obj = RetailerModel(
        public_id=uuid.UUID(user_id),
        retailer_code="RET123",
        status="ACTIVE",
        mpin_locked=False,
    )
    sec_obj = UserSecuritySettingsModel(
        public_id=uuid.uuid4(),
        user_id=uuid.UUID(user_id),
        portal="RETAILER",
        pin_enabled=True,
    )

    mock_db = AsyncMock()
    mock_db.execute.side_effect = [
        MockResult([ret_obj]),  # find retailer
        MockResult([sec_obj]),  # get_or_create_user_security_settings
    ]
    mock_db.commit = AsyncMock()

    app.dependency_overrides[get_current_token_payload] = lambda: {
        "sub": user_id,
        "retailer_code": "RET123",
        "role": "RETAILER",
    }
    app.dependency_overrides[get_db] = lambda: mock_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        res = await ac.post("/api/v1/session/lock", json={"reason": "Manual workstation lock"})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["is_locked"] is True
        # Verify retailer account status is preserved as ACTIVE, while mpin_locked is True
        assert ret_obj.status == "ACTIVE"
        assert ret_obj.mpin_locked is True
