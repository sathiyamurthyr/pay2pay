import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_crm_support_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. List Retailers to obtain retailer_id
        r_list = await ac.get("/api/v1/retailers/", headers=headers)
        assert r_list.status_code == 200
        retailers = r_list.json()
        assert len(retailers) >= 1
        retailer_id = retailers[0]["public_id"]

        # 3. Create Support Ticket
        create_t_res = await ac.post("/api/v1/crm/tickets", headers=headers, json={
            "retailer_id": retailer_id,
            "subject": "Delayed Settlement Credit Investigation Request",
            "category": "SETTLEMENT_ISSUE",
            "priority": "HIGH"
        })
        assert create_t_res.status_code == 200
        t_data = create_t_res.json()
        assert t_data["status"] == "NEW"
        ticket_id = t_data["public_id"]

        # 4. Assign Support Ticket
        assign_res = await ac.post(f"/api/v1/crm/tickets/{ticket_id}/assign", headers=headers, json={
            "agent_email": "support.l2@pay2pay.com"
        })
        assert assign_res.status_code == 200
        assert assign_res.json()["status"] == "IN_PROGRESS"
        assert assign_res.json()["assigned_agent"] == "support.l2@pay2pay.com"

        # 5. Resolve Support Ticket
        resolve_res = await ac.post(f"/api/v1/crm/tickets/{ticket_id}/resolve", headers=headers, json={
            "resolution_notes": "Verified bank settlement file. Merchant wallet credited with INR 45,000 via batch #9812."
        })
        assert resolve_res.status_code == 200
        assert resolve_res.json()["status"] == "RESOLVED"

        # 6. Retailer 360° Profile View
        r360_res = await ac.get(f"/api/v1/crm/retailer-360/{retailer_id}", headers=headers)
        assert r360_res.status_code == 200
        assert r360_res.json()["merchant_name"] is not None

        # 7. Knowledge Base Articles
        kb_res = await ac.get("/api/v1/crm/knowledge-base", headers=headers)
        assert kb_res.status_code == 200
        assert len(kb_res.json()) >= 3

        # 8. Active Announcements
        ann_res = await ac.get("/api/v1/crm/announcements", headers=headers)
        assert ann_res.status_code == 200
        assert len(ann_res.json()) >= 1

        # 9. CRM Telemetry Metrics
        crm_metrics = await ac.get("/api/v1/crm/dashboard/metrics", headers=headers)
        assert crm_metrics.status_code == 200
        assert crm_metrics.json()["total_retailers"] >= 1
