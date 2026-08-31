import json
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Body, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_user, get_current_tenant_id
from app.infrastructure.db.models import AdminUserModel, AdminFavoriteMenuModel

router = APIRouter(prefix="/admin/favorites", tags=["Admin Favorite Navigation Menus"])


class ToggleFavoriteRequest(BaseModel):
    menu_href: str = Field(..., min_length=1, description="Unique route/href of the menu item (e.g., /machines)")
    menu_label: Optional[str] = Field(None, description="Display label for the menu item")
    menu_category: Optional[str] = Field(None, description="Category name (e.g., Administration)")
    icon_name: Optional[str] = Field(None, description="Lucide icon name representation")


@router.get("")
async def get_admin_favorites(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the list of favorite navigation menus configured by the authenticated admin user.
    Leverages PostgreSQL Stored Procedure sp_get_admin_favorite_menus with ORM fallback.
    """
    user_id = current_user.public_id

    # 1. Execute Stored Procedure
    try:
        sp_query = text("SELECT public.sp_get_admin_favorite_menus(:tenant_id, :user_id);")
        sp_result = await db.execute(sp_query, {"tenant_id": tenant_id, "user_id": user_id})
        raw_json = sp_result.scalar()
        if raw_json is not None:
            if isinstance(raw_json, str):
                parsed = json.loads(raw_json)
            else:
                parsed = raw_json
            return parsed
    except Exception as sp_err:
        print(f"[FAVORITES ROUTER WARNING] SP execution error: {sp_err}. Falling back to ORM query.")

    # 2. ORM Fallback
    stmt = select(AdminFavoriteMenuModel).where(
        AdminFavoriteMenuModel.tenant_id == tenant_id,
        AdminFavoriteMenuModel.user_id == user_id,
        AdminFavoriteMenuModel.is_active == True,
        AdminFavoriteMenuModel.is_deleted == False
    ).order_by(AdminFavoriteMenuModel.display_order.asc(), AdminFavoriteMenuModel.created_date.asc())

    res = await db.execute(stmt)
    records = res.scalars().all()

    items = [
        {
            "public_id": str(r.public_id),
            "menu_href": r.menu_href,
            "menu_label": r.menu_label,
            "menu_category": r.menu_category,
            "icon_name": r.icon_name,
            "display_order": r.display_order,
            "created_date": r.created_date.isoformat() if r.created_date else None
        }
        for r in records
    ]

    return {
        "success": True,
        "favorites": items
    }


@router.post("/toggle")
async def toggle_admin_favorite(
    payload: ToggleFavoriteRequest = Body(...),
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    current_user: AdminUserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Toggles an admin navigation menu as favorite (adds if missing/inactive, removes if currently active).
    Executes PostgreSQL Stored Procedure sp_toggle_admin_favorite_menu atomically.
    """
    user_id = current_user.public_id
    actor_email = current_user.email or "admin@pay2pay.in"

    # 1. Execute Stored Procedure
    try:
        sp_query = text(
            "SELECT public.sp_toggle_admin_favorite_menu(:tenant_id, :user_id, :menu_href, :menu_label, :menu_category, :icon_name, :actor_email);"
        )
        sp_result = await db.execute(sp_query, {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "menu_href": payload.menu_href,
            "menu_label": payload.menu_label,
            "menu_category": payload.menu_category,
            "icon_name": payload.icon_name,
            "actor_email": actor_email
        })
        await db.commit()
        raw_json = sp_result.scalar()
        if raw_json is not None:
            if isinstance(raw_json, str):
                parsed = json.loads(raw_json)
            else:
                parsed = raw_json
            return parsed
    except Exception as sp_err:
        await db.rollback()
        print(f"[FAVORITES ROUTER WARNING] Toggle SP error: {sp_err}. Falling back to ORM toggle.")

    # 2. ORM Fallback
    stmt = select(AdminFavoriteMenuModel).where(
        AdminFavoriteMenuModel.tenant_id == tenant_id,
        AdminFavoriteMenuModel.user_id == user_id,
        AdminFavoriteMenuModel.menu_href == payload.menu_href
    ).order_by(AdminFavoriteMenuModel.created_date.desc())

    res = await db.execute(stmt)
    existing = res.scalars().first()

    action = "ADDED"
    if existing:
        if existing.is_active and not existing.is_deleted:
            existing.is_active = False
            existing.is_deleted = True
            action = "REMOVED"
        else:
            existing.is_active = True
            existing.is_deleted = False
            if payload.menu_label:
                existing.menu_label = payload.menu_label
            if payload.menu_category:
                existing.menu_category = payload.menu_category
            if payload.icon_name:
                existing.icon_name = payload.icon_name
            action = "ADDED"
    else:
        new_fav = AdminFavoriteMenuModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            menu_href=payload.menu_href,
            menu_label=payload.menu_label or payload.menu_href,
            menu_category=payload.menu_category or "General",
            icon_name=payload.icon_name,
            display_order=0,
            is_active=True,
            is_deleted=False,
            created_by=actor_email
        )
        db.add(new_fav)

    await db.commit()

    # Re-fetch active favorites
    list_stmt = select(AdminFavoriteMenuModel).where(
        AdminFavoriteMenuModel.tenant_id == tenant_id,
        AdminFavoriteMenuModel.user_id == user_id,
        AdminFavoriteMenuModel.is_active == True,
        AdminFavoriteMenuModel.is_deleted == False
    ).order_by(AdminFavoriteMenuModel.display_order.asc(), AdminFavoriteMenuModel.created_date.asc())
    
    list_res = await db.execute(list_stmt)
    active_records = list_res.scalars().all()

    return {
        "success": True,
        "action": action,
        "menu_href": payload.menu_href,
        "favorites": [
            {
                "public_id": str(r.public_id),
                "menu_href": r.menu_href,
                "menu_label": r.menu_label,
                "menu_category": r.menu_category,
                "icon_name": r.icon_name,
                "display_order": r.display_order,
                "created_date": r.created_date.isoformat() if r.created_date else None
            }
            for r in active_records
        ]
    }
