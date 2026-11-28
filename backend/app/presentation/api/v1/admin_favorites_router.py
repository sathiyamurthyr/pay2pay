from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import (
    get_current_token_payload,
    get_current_user,
    require_admin_user,
)
from app.application.menu_favorite_service import MenuFavoriteService
from app.core.database import get_db
from app.infrastructure.db.models import AdminUserModel

router = APIRouter(prefix="/admin/favorites", tags=["Admin Favorite Navigation Menus"])


class AdminFavoriteRequest(BaseModel):
    menu_ref_id: Optional[int] = Field(None, description="Authoritative database menu_ref_id")
    menu_href: Optional[str] = Field(None, description="Menu route href (fallback resolution)")
    menu_label: Optional[str] = Field(None, description="Menu display label for disambiguation")
    menu_category: Optional[str] = Field(None, description="Category grouping")
    icon_name: Optional[str] = Field(None, description="Icon identifier")
    display_order: Optional[int] = Field(None, description="Optional display sequence")


class AdminReorderFavoritesRequest(BaseModel):
    menu_ref_ids: Optional[List[int]] = Field(None, description="Ordered menu_ref_id list")
    menu_hrefs: Optional[List[str]] = Field(None, description="Ordered menu_href list")


async def _resolve_admin_identity(
    request: Request,
    db: AsyncSession,
    token_payload: dict,
    current_user: AdminUserModel,
):
    return await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
        portal_hint="ADMIN",
    )


@router.get("/permitted-menus")
async def get_admin_permitted_menus(
    request: Request,
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns authorized Admin portal menus from public.menu & role_menu_permission with favorite flags."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    return await MenuFavoriteService.get_authorized_menus_payload(db, identity)


@router.get("")
@router.get("/menus")
async def get_admin_favorites(
    request: Request,
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns favorite navigation menus strictly scoped to authenticated admin user, role, and company."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    favorites = await MenuFavoriteService.list_favorites(db, identity)
    return {
        "status": "SUCCESS",
        "success": True,
        "company_ref_id": identity.company_ref_id,
        "user_ref_id": identity.user_ref_id,
        "user_type_ref_id": identity.user_type_ref_id,
        "role_ref_id": identity.role_ref_id,
        "count": len(favorites),
        "favorites": favorites,
        "data": favorites,
    }


@router.get("/check")
async def check_admin_favorite_status(
    request: Request,
    menu_ref_id: Optional[int] = Query(None),
    menu_href: Optional[str] = Query(None),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Checks whether a specific menu is currently favorited and permitted for the authenticated admin."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    return await MenuFavoriteService.check_favorite(
        db, identity, menu_ref_id=menu_ref_id, menu_href=menu_href
    )


@router.post("")
@router.post("/menus")
@router.post("/save")
async def add_admin_favorite(
    request: Request,
    payload: AdminFavoriteRequest = Body(...),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Adds a permitted menu to the authenticated admin user's favorites (idempotent, duplicate-safe)."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    return await MenuFavoriteService.add_favorite(
        db,
        identity,
        menu_ref_id=payload.menu_ref_id,
        menu_href=payload.menu_href,
        menu_label=payload.menu_label,
        display_order=payload.display_order,
    )


@router.post("/toggle")
@router.post("/menus/toggle")
async def toggle_admin_favorite(
    request: Request,
    payload: AdminFavoriteRequest = Body(...),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Atomically adds or removes a permitted menu favorite for the authenticated admin user."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    return await MenuFavoriteService.toggle_favorite(
        db,
        identity,
        menu_ref_id=payload.menu_ref_id,
        menu_href=payload.menu_href,
        menu_label=payload.menu_label,
    )


@router.post("/remove")
@router.post("/menus/remove")
async def remove_admin_favorite(
    request: Request,
    payload: AdminFavoriteRequest = Body(...),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Removes a favorite menu item for the authenticated admin user."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    return await MenuFavoriteService.remove_favorite(
        db,
        identity,
        menu_ref_id=payload.menu_ref_id,
        menu_href=payload.menu_href,
        menu_label=payload.menu_label,
    )


@router.delete("/{menu_ref_id}")
@router.delete("/menus/{menu_ref_id}")
async def delete_admin_favorite_by_id(
    menu_ref_id: int,
    request: Request,
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes a favorite menu item by menu_ref_id for the authenticated admin user."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    return await MenuFavoriteService.remove_favorite(db, identity, menu_ref_id=menu_ref_id)


@router.post("/reorder")
async def reorder_admin_favorites(
    request: Request,
    payload: AdminReorderFavoritesRequest = Body(...),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: AdminUserModel = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates display order of the authenticated admin user's favorite menus."""
    identity = await _resolve_admin_identity(request, db, token_payload, current_user)
    return await MenuFavoriteService.reorder_favorites(
        db,
        identity,
        menu_ref_ids=payload.menu_ref_ids,
        menu_hrefs=payload.menu_hrefs,
    )
