import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import ConfigCreateUpdate, ConfigResponse
from app.application.dependencies import get_current_user, get_current_tenant_id, require_permission
from app.infrastructure.db.models import AdminUserModel, SystemConfigurationModel

router = APIRouter(prefix="/settings", tags=["System Configurations"])


@router.get("", response_model=List[ConfigResponse])
async def list_configurations(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user),
    _: bool = require_permission("read:setting")
):
    stmt = select(SystemConfigurationModel).where(SystemConfigurationModel.tenant_id == tenant_id)
    res = await db.execute(stmt)
    configs = res.scalars().all()

    return [
        ConfigResponse(
            public_id=c.public_id,
            key=c.key,
            value=c.value,
            category=c.category,
            description=c.description,
            is_encrypted=c.is_encrypted,
            version=c.version
        )
        for c in configs
    ]
