import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_enterprise_bpm_operations_platform_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Super Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email_or_username": "admin@pay2pay.com",
            "password": "AivioSathus!321"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. BPM Dashboard Metrics
        metrics_res = await ac.get("/api/v1/bpm/dashboard/metrics", headers=headers)
        assert metrics_res.status_code == 200
        assert metrics_res.json()["active_workflows"] >= 0

        # 3. Create Workflow Definition
        wf_res = await ac.post("/api/v1/bpm/workflows", headers=headers, json={
            "workflow_name": "Tier 2 Merchant Payout Approval Workflow",
            "entity_type": "PAYOUT"
        })
        assert wf_res.status_code == 200
        assert wf_res.json()["status"] == "ACTIVE"

        # 4. List Tasks
        tasks_res = await ac.get("/api/v1/bpm/tasks", headers=headers)
        assert tasks_res.status_code == 200
        tasks = tasks_res.json()
        assert len(tasks) >= 1
        task_id = tasks[0]["public_id"]

        # 5. Complete Task
        comp_res = await ac.post(f"/api/v1/bpm/tasks/{task_id}/complete", headers=headers)
        assert comp_res.status_code == 200
        assert comp_res.json()["status"] == "COMPLETED"

        # 6. List Approvals
        appr_res = await ac.get("/api/v1/bpm/approvals", headers=headers)
        assert appr_res.status_code == 200
        approvals = appr_res.json()
        assert len(approvals) >= 1
        approval_id = approvals[0]["public_id"]

        # 7. Process Approval Action
        act_res = await ac.post(f"/api/v1/bpm/approvals/{approval_id}/action", headers=headers, json={
            "action": "APPROVED",
            "comments": "Verified compliance documentation and risk score."
        })
        assert act_res.status_code == 200
        assert act_res.json()["status"] == "APPROVED"

        # 8. List Operational Queues
        q_res = await ac.get("/api/v1/bpm/queues", headers=headers)
        assert q_res.status_code == 200
        assert len(q_res.json()) >= 1
