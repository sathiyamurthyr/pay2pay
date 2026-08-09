import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_session_security_unlock_and_audit_flow():
    retailer_id = str(uuid.uuid4())
    tenant_id = str(uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68"))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        # 1. Test Audit Event Logging
        audit_payload = {
            "retailer_id": retailer_id,
            "tenant_id": tenant_id,
            "event_type": "SESSION_LOCKED",
            "device_info": "Chrome / Windows 11",
            "browser": "Chrome 122",
            "os_name": "Windows",
            "ip_address": "127.0.0.1",
            "details": {"trigger": "IDLE_TIMEOUT", "idle_seconds": 60}
        }
        res_audit = await ac.post("/api/v1/session/audit", json=audit_payload)
        assert res_audit.status_code == 200
        assert res_audit.json()["status"] == "LOGGED"

        # 2. Test Get Default Security Settings
        res_sett = await ac.get(f"/api/v1/session/settings?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert res_sett.status_code == 200
        sett_data = res_sett.json()
        assert sett_data["auto_lock_enabled"] == True
        assert sett_data["idle_timeout_minutes"] == 1
        assert sett_data["warning_seconds"] == 30

        # 3. Test Update Security Settings
        update_payload = {
            "retailer_id": retailer_id,
            "tenant_id": tenant_id,
            "auto_lock_enabled": True,
            "idle_timeout_minutes": 5,
            "warning_seconds": 30,
            "lock_on_minimize": True,
            "lock_on_sleep": True,
            "biometric_enabled": True
        }
        res_upd = await ac.put("/api/v1/session/settings", json=update_payload)
        assert res_upd.status_code == 200
        assert res_upd.json()["status"] == "UPDATED"

        # 4. Verify Updated Settings
        res_sett2 = await ac.get(f"/api/v1/session/settings?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert res_sett2.json()["idle_timeout_minutes"] == 5

        # 5. Test MPIN Unlock with Valid MPIN (8520)
        unlock_payload = {
            "retailer_id": retailer_id,
            "tenant_id": tenant_id,
            "mpin": "8520",
            "device_info": "Chrome / Windows 11"
        }
        res_unlock = await ac.post("/api/v1/session/unlock", json=unlock_payload)
        assert res_unlock.status_code == 200
        assert res_unlock.json()["status"] == "UNLOCKED"

        # 6. Test Failed MPIN Attempt (9999 is wrong if not in list or let's use 0000)
        bad_unlock_payload = {
            "retailer_id": retailer_id,
            "tenant_id": tenant_id,
            "mpin": "0000"
        }
        res_bad = await ac.post("/api/v1/session/unlock", json=bad_unlock_payload)
        assert res_bad.status_code == 401
        assert "Incorrect MPIN" in res_bad.json()["detail"]
