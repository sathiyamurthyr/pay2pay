import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import DashboardWidgetsResponse
from app.application.services import DashboardService
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/dashboard", tags=["Admin Dashboard"])


@router.get("/widgets", response_model=DashboardWidgetsResponse)
async def get_dashboard_widgets(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """
    Returns real-time refreshable KPI metrics for all 10 Admin Dashboard widgets:
    1. Total Companies
    2. Active Retailers
    3. Total Machines
    4. Today's Settlement
    5. Wallet Liability
    6. Pending Payouts
    7. Today's Profit
    8. Failed Settlement
    9. Pending Approvals
    10. Recent Activities Feed
    """
    return await DashboardService.get_dashboard_metrics(db, tenant_id)
