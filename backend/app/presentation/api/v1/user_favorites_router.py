from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import (
    get_current_token_payload,
    get_optional_current_user,
)
from app.application.menu_favorite_service import MenuFavoriteService
from app.core.database import get_db

router = APIRouter(prefix="/favorites", tags=["User Favorite Navigation Menus"])


class SaveFavoriteRequest(BaseModel):
    menu_ref_id: Optional[int] = Field(None, description="Authoritative database menu_ref_id")
    menu_href: Optional[str] = Field(None, description="Navigation route (e.g. /retailer/dmt)")
    menu_label: Optional[str] = Field(None, description="Display label (e.g. DMT)")
    menu_category: Optional[str] = Field(None, description="Category grouping")
    icon_name: Optional[str] = Field(None, description="Icon identifier")
    display_order: Optional[int] = Field(None, description="Display order sequence")
    user_role: Optional[str] = Field(None, description="Ignored server-side; derived from JWT")


class ToggleFavoriteRequest(BaseModel):
    menu_ref_id: Optional[int] = Field(None, description="Authoritative database menu_ref_id")
    menu_href: Optional[str] = Field(None, description="Navigation route to toggle")
    menu_label: Optional[str] = Field(None, description="Display label")
    menu_category: Optional[str] = Field(None, description="Category grouping")
    icon_name: Optional[str] = Field(None, description="Icon identifier")
    user_role: Optional[str] = Field(None, description="Ignored server-side; derived from JWT")


class RemoveFavoriteRequest(BaseModel):
    menu_ref_id: Optional[int] = Field(None, description="Authoritative database menu_ref_id")
    menu_href: Optional[str] = Field(None, description="Navigation route to remove")
    menu_label: Optional[str] = Field(None, description="Display label")


class ReorderFavoritesRequest(BaseModel):
    menu_ref_ids: Optional[List[int]] = Field(None, description="Ordered list of menu_ref_id")
    menu_hrefs: Optional[List[str]] = Field(None, description="Ordered list of menu routes")


@router.get("/available-menus", summary="Get Authorized Portal Menus for Authenticated User")
async def get_available_menus(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """
    Returns database-driven permitted navigation menus for the authenticated user
    (filtered by user_type_ref_id, role_ref_id, and company service availability),
    annotated with each menu's `menu_ref_id` and `is_favorite` status.
    """
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await MenuFavoriteService.get_authorized_menus_payload(db, identity)


@router.get("/menus", summary="Get Authenticated User Favorite Menus")
@router.get("", summary="Get Authenticated User Favorite Menus (Root Alias)")
@router.get("/list", summary="Get Authenticated User Favorite Menus (List Alias)")
async def get_user_favorite_menus(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """
    Returns favorite navigation menus strictly scoped to the authenticated user's
    verified `company_ref_id`, `retailer_ref_id`, `user_ref_id`, and `user_type_ref_id`.
    Automatically filters out services disabled for the user's company.
    """
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    favorites = await MenuFavoriteService.list_favorites(db, identity)
    return {
        "status": "SUCCESS",
        "success": True,
        "message": "Favorite menus retrieved successfully",
        "company_ref_id": identity.company_ref_id,
        "retailer_ref_id": identity.retailer_ref_id,
        "user_ref_id": identity.user_ref_id,
        "user_type_ref_id": identity.user_type_ref_id,
        "role_ref_id": identity.role_ref_id,
        "count": len(favorites),
        "data": favorites,
        "favorites": favorites,
    }


@router.get("/check", summary="Check Favorite Status for a Menu")
async def check_user_favorite_status(
    request: Request,
    menu_ref_id: Optional[int] = Query(None),
    menu_href: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """Checks whether the specified menu_ref_id or menu_href is favorited by the authenticated user."""
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await MenuFavoriteService.check_favorite(
        db, identity, menu_ref_id=menu_ref_id, menu_href=menu_href
    )


@router.post("/menus", summary="Add Favorite Menu")
@router.post("", summary="Add Favorite Menu (Root Alias)")
@router.post("/save", summary="Add Favorite Menu (Save Alias)")
async def save_user_favorite_menu(
    request: Request,
    payload: SaveFavoriteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """Adds a permitted menu to favorites (validates company/service/role ownership, prevents duplicates)."""
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await MenuFavoriteService.add_favorite(
        db,
        identity,
        menu_ref_id=payload.menu_ref_id,
        menu_href=payload.menu_href,
        menu_label=payload.menu_label,
        display_order=payload.display_order,
    )


@router.post("/toggle", summary="Toggle Favorite Menu Item (Add/Remove)")
@router.post("/menus/toggle", summary="Toggle Favorite Menu Item (Alias)")
async def toggle_user_favorite_menu(
    request: Request,
    payload: ToggleFavoriteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """Atomically toggles a menu favorite for the authenticated user."""
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await MenuFavoriteService.toggle_favorite(
        db,
        identity,
        menu_ref_id=payload.menu_ref_id,
        menu_href=payload.menu_href,
        menu_label=payload.menu_label,
    )


@router.post("/remove", summary="Remove Favorite Menu Item")
@router.post("/menus/remove", summary="Remove Favorite Menu Item (Alias)")
async def remove_user_favorite_menu(
    request: Request,
    payload: RemoveFavoriteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """Removes a favorite menu item for the authenticated user."""
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await MenuFavoriteService.remove_favorite(
        db,
        identity,
        menu_ref_id=payload.menu_ref_id,
        menu_href=payload.menu_href,
        menu_label=payload.menu_label,
    )


@router.delete("/menus/{menu_ref_id}", summary="Delete Favorite Menu by menu_ref_id")
@router.delete("/{menu_ref_id}", summary="Delete Favorite Menu by menu_ref_id (Alias)")
async def delete_user_favorite_menu_by_id(
    menu_ref_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """Removes a favorite menu item by menu_ref_id for the authenticated user."""
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await MenuFavoriteService.remove_favorite(db, identity, menu_ref_id=menu_ref_id)


@router.post("/reorder", summary="Reorder Favorite Menu Items")
@router.post("/menus/reorder", summary="Reorder Favorite Menu Items (Alias)")
async def reorder_user_favorite_menus(
    request: Request,
    payload: ReorderFavoritesRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    """Updates display order for the authenticated user's favorite menus."""
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await MenuFavoriteService.reorder_favorites(
        db,
        identity,
        menu_ref_ids=payload.menu_ref_ids,
        menu_hrefs=payload.menu_hrefs,
    )
