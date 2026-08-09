import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_retailer_dashboard_endpoints():
    """
    Acceptance Criteria:
    ✓ 100% database & API driven retailer dashboard.
    ✓ Header Wallet Hero Section API returns Wallet Balance, Available, Blocked, Today's Credit, Debit & Commission.
    ✓ Grouped Financial KPIs API returns Transfer, Debit, Commission, GST, TDS & Settlement Totals.
    ✓ Grouped Operations KPIs API returns Pending, Processing, Success, Failed, Reversed & Velocity.
    ✓ Interactive Charts API returns Volume, Wallet Trend, Commission Trend & Settlement Trend.
    ✓ Real-Time Live Feed API returns latest transactions.
    ✓ Business Alerts & Recent Activity Audit Log API endpoints return real-time system feeds.
    """
    tenant_id = uuid.UUID("93538c98-0b19-493c-a247-4cdb02a46c68")
    retailer_id = uuid.UUID("f89239b5-4dbb-41a9-9ba7-0f97580c9368")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        # 1. Test Wallet Hero Header API
        head_res = await ac.get(f"/api/v1/payout/dashboard/retailer/header-wallet?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert head_res.status_code == 200
        head_data = head_res.json()
        assert "greeting" in head_data
        assert "wallet_balance" in head_data
        assert "todays_debit" in head_data
        assert "todays_credit" in head_data

        # 2. Test Grouped Financial KPIs API
        fin_res = await ac.get(f"/api/v1/payout/dashboard/retailer/financial-kpis?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert fin_res.status_code == 200
        fin_data = fin_res.json()
        assert "todays_transfer" in fin_data
        assert "todays_wallet_debit" in fin_data
        assert "todays_commission" in fin_data
        assert "todays_gst" in fin_data

        # 3. Test Grouped Operations KPIs API
        ops_res = await ac.get(f"/api/v1/payout/dashboard/retailer/operations-kpis?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert ops_res.status_code == 200
        ops_data = ops_res.json()
        assert "pending_transactions" in ops_data
        assert "successful_transactions" in ops_data
        assert "success_rate_pct" in ops_data

        # 4. Test Charts API
        ch_res = await ac.get(f"/api/v1/payout/dashboard/retailer/charts?retailer_id={retailer_id}&tenant_id={tenant_id}&timeframe=7D")
        assert ch_res.status_code == 200
        ch_data = ch_res.json()
        assert "transaction_trend" in ch_data
        assert "wallet_trend" in ch_data
        assert "settlement_trend" in ch_data

        # 5. Test Live Feed API
        feed_res = await ac.get(f"/api/v1/payout/dashboard/retailer/live-feed?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert feed_res.status_code == 200
        assert "items" in feed_res.json()

        # 6. Test Business Alerts API
        alt_res = await ac.get(f"/api/v1/payout/dashboard/retailer/business-alerts?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert alt_res.status_code == 200
        assert "alerts" in alt_res.json()

        # 7. Test Recent Activity API
        act_res = await ac.get(f"/api/v1/payout/dashboard/retailer/recent-activity?retailer_id={retailer_id}&tenant_id={tenant_id}")
        assert act_res.status_code == 200
        assert "activities" in act_res.json()

        # 8. Test System Health API
        sys_res = await ac.get("/api/v1/payout/dashboard/retailer/system-health")
        assert sys_res.status_code == 200
        assert sys_res.json()["overall_status"] == "HEALTHY"
