import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_terminal_lock_and_unlock_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        # 1. Check unauthenticated access rejected
        res_lock_unauth = await ac.post("/api/v1/session/lock", json={"reason": "Test lock"})
        assert res_lock_unauth.status_code in (401, 403)

        res_status_unauth = await ac.get("/api/v1/session/status")
        assert res_status_unauth.status_code in (401, 403)
