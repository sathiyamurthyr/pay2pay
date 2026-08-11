from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dtos import PermissionResponse
from app.application.services import RolePermissionService
from app.application.dependencies import get_current_user
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("", response_model=List[PermissionResponse])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    perms = await RolePermissionService.list_permissions(db)
    return [
        PermissionResponse(
            public_id=p.public_id,
            code=p.code,
            name=p.name,
            module=p.module,
            action=p.action,
            description=p.description
        )
        for p in perms
    ]
