import uuid
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, text

from app.core.database import get_db
from app.core.company_resolver import resolve_request_company_ref
from app.application.dependencies import get_optional_tenant_id, get_optional_current_user, get_optional_token_payload
from app.infrastructure.db.models import UserFavoriteMenuModel, AdminFavoriteMenuModel
from app.infrastructure.db.customer_models import CustomerServiceConfigurationModel
from app.presentation.api.v1.services_router import SERVICE_SUBMENU_MAPPINGS

router = APIRouter(prefix="/favorites", tags=["User Favorite Navigation Menus (SPs & APIs)"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class SaveFavoriteRequest(BaseModel):
    user_ref_id: Optional[str] = Field(None, description="User or Retailer Identifier (e.g. mobile number or public_id)")
    menu_href: str = Field(..., description="Navigation route (e.g. /retailer/dmt)")
    menu_label: str = Field(..., description="Display label (e.g. Money Transfer)")
    menu_category: Optional[str] = Field("General", description="Category grouping")
    icon_name: Optional[str] = Field(None, description="Icon identifier (e.g. Send, Wallet)")
    display_order: Optional[int] = Field(0, description="Display order sequence")
    user_role: Optional[str] = Field("RETAILER", description="User role (RETAILER, ADMIN, etc.)")


class ToggleFavoriteRequest(BaseModel):
    user_ref_id: Optional[str] = Field(None, description="User or Retailer Identifier")
    menu_href: str = Field(..., description="Navigation route to toggle")
    menu_label: Optional[str] = Field(None, description="Display label")
    menu_category: Optional[str] = Field("General", description="Category grouping")
    icon_name: Optional[str] = Field(None, description="Icon identifier")
    user_role: Optional[str] = Field("RETAILER", description="User role")


class RemoveFavoriteRequest(BaseModel):
    user_ref_id: Optional[str] = Field(None, description="User or Retailer Identifier")
    menu_href: str = Field(..., description="Navigation route to remove")


class ReorderFavoritesRequest(BaseModel):
    user_ref_id: Optional[str] = Field(None, description="User or Retailer Identifier")
    menu_hrefs: List[str] = Field(..., description="Ordered list of menu routes")


def _resolve_user_ref(user_ref_id: Optional[str], current_user: Optional[Any], token_payload: Optional[dict] = None) -> str:
    """
    Helper to resolve a robust string user_ref_id.
    Prioritizes authenticated identity from token or current_user over client query parameters.
    """
    if current_user:
        if hasattr(current_user, "retailer_code") and current_user.retailer_code:
            return str(current_user.retailer_code).strip()
        if hasattr(current_user, "mobile_number") and current_user.mobile_number:
            return str(current_user.mobile_number).strip()
        if hasattr(current_user, "phone") and current_user.phone:
            return str(current_user.phone).strip()
        if hasattr(current_user, "username") and current_user.username:
            return str(current_user.username).strip()
        if hasattr(current_user, "public_id") and current_user.public_id:
            return str(current_user.public_id).strip()
        if hasattr(current_user, "email") and current_user.email:
            return str(current_user.email).strip()

    if token_payload:
        if token_payload.get("retailer_code"):
            return str(token_payload["retailer_code"]).strip()
        if token_payload.get("mobile"):
            return str(token_payload["mobile"]).strip()
        if token_payload.get("sub"):
            return str(token_payload["sub"]).strip()

    if user_ref_id and str(user_ref_id).strip():
        return str(user_ref_id).strip()

    return ""


def _resolve_company_ref_id(current_user: Optional[Any], token_payload: Optional[dict], request: Optional[Request] = None) -> Optional[int]:
    """Resolves authenticated company_ref_id strictly."""
    if current_user and hasattr(current_user, "company_ref_id") and current_user.company_ref_id:
        return current_user.company_ref_id
    if token_payload and token_payload.get("company_ref_id"):
        try:
            return int(token_payload["company_ref_id"])
        except (ValueError, TypeError):
            pass
    if request:
        comp_ref = resolve_request_company_ref(request)
        if comp_ref:
            return comp_ref
    return 47  # Default Pay2Pay


async def _is_menu_enabled_for_company(db: AsyncSession, company_ref_id: Optional[int], menu_href: str) -> bool:
    """
    Determines if a menu_href or its parent service is enabled for the specified company.
    If parent service is disabled in customer_service_configuration, returns False.
    """
    clean_href = menu_href.strip().lower()

    # Identify governing parent service
    parent_service = None
    for svc, paths in SERVICE_SUBMENU_MAPPINGS.items():
        for p in paths:
            if clean_href == p.lower() or (p != "/retailer/dashboard" and clean_href.startswith(p.lower())):
                parent_service = svc
                break
        if parent_service:
            break

    # Non-service core pages (dashboard, profile, settings, logout) are always enabled
    if not parent_service:
        return True

    # 1. Check company-scoped service row
    if company_ref_id is not None:
        comp_stmt = select(CustomerServiceConfigurationModel.is_enabled).where(
            CustomerServiceConfigurationModel.service_code == parent_service,
            CustomerServiceConfigurationModel.company_ref_id == company_ref_id,
            CustomerServiceConfigurationModel.is_deleted == False
        )
        comp_res = (await db.execute(comp_stmt)).scalar_one_or_none()
        if comp_res is not None:
            return bool(comp_res)

    # 2. Check global row fallback
    global_stmt = select(CustomerServiceConfigurationModel.is_enabled).where(
        CustomerServiceConfigurationModel.service_code == parent_service,
        CustomerServiceConfigurationModel.company_ref_id == None,
        CustomerServiceConfigurationModel.is_deleted == False
    )
    global_res = (await db.execute(global_stmt)).scalar_one_or_none()
    if global_res is not None:
        return bool(global_res)

    # Default to enabled if not explicitly disabled
    return True


# ─── 1. GET FAVORITE MENUS (PostgreSQL Stored Procedure sp_get_user_favorite_menus) ───

@router.get("/menus", summary="Get User Favorite Menus via Stored Procedure")
@router.get("", summary="Get User Favorite Menus (Root Alias)")
@router.get("/list", summary="Get User Favorite Menus (List Alias)")
async def get_user_favorite_menus(
    request: Request,
    user_ref_id: Optional[str] = Query(None, description="User reference ID (mobile/uuid/username)"),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_optional_tenant_id),
    current_user: Optional[Any] = Depends(get_optional_current_user),
    token_payload: dict = Depends(get_optional_token_payload),
):
    """
    Returns the list of favorite navigation menus configured for the authenticated retailer,
    filtered strictly by company-enabled services. If an Admin disables a service, it automatically
    disappears from the Retailer's favourites.
    """
    ref_id = _resolve_user_ref(user_ref_id, current_user, token_payload)
    comp_ref_id = _resolve_company_ref_id(current_user, token_payload, request)

    # 1. Primary: PostgreSQL Stored Procedure
    sp_items = None
    try:
        sp_query = text("SELECT public.sp_get_user_favorite_menus(:tenant_id, :user_ref_id);")
        result = await db.execute(sp_query, {"tenant_id": tenant_id, "user_ref_id": ref_id})
        sp_data = result.scalar()
        if sp_data and isinstance(sp_data, dict):
            sp_items = sp_data.get("favorites", [])
    except Exception:
        await db.rollback()

    raw_items = []
    source = "STORED_PROCEDURE" if sp_items is not None else "ORM_FALLBACK"

    if sp_items is not None:
        raw_items = sp_items
    else:
        # 2. Resilient Fallback: SQLAlchemy ORM Query scoped by company_ref_id
        stmt = (
            select(UserFavoriteMenuModel)
            .where(
                and_(
                    UserFavoriteMenuModel.tenant_id == tenant_id,
                    UserFavoriteMenuModel.user_ref_id == ref_id,
                    or_(
                        UserFavoriteMenuModel.company_ref_id == comp_ref_id,
                        UserFavoriteMenuModel.company_ref_id == None
                    ),
                    UserFavoriteMenuModel.is_active == True,
                    UserFavoriteMenuModel.is_deleted == False,
                )
            )
            .order_by(UserFavoriteMenuModel.display_order.asc(), UserFavoriteMenuModel.created_date.asc())
        )
        orm_records = (await db.execute(stmt)).scalars().all()
        raw_items = [
            {
                "id": rec.id,
                "public_id": str(rec.public_id),
                "user_ref_id": rec.user_ref_id,
                "company_ref_id": rec.company_ref_id,
                "user_role": rec.user_role,
                "menu_id": rec.menu_id,
                "menu_href": rec.menu_href,
                "menu_label": rec.menu_label,
                "menu_category": rec.menu_category,
                "icon_name": rec.icon_name,
                "badge_text": rec.badge_text,
                "display_order": rec.display_order,
                "is_active": rec.is_active,
                "created_date": rec.created_date.isoformat() if rec.created_date else None,
                "updated_date": rec.updated_date.isoformat() if rec.updated_date else None,
            }
            for rec in orm_records
        ]

    # Filter out any favorites whose corresponding service or parent submenu is disabled for this company
    filtered_items = []
    for item in raw_items:
        href = item.get("menu_href") or item.get("path") or ""
        if await _is_menu_enabled_for_company(db, comp_ref_id, href):
            filtered_items.append(item)

    return {
        "status": "SUCCESS",
        "message": "Favorite menus retrieved successfully",
        "source": source,
        "user_ref_id": ref_id,
        "company_ref_id": comp_ref_id,
        "count": len(filtered_items),
        "data": filtered_items,
        "favorites": filtered_items,
    }


# ─── 2. POST SAVE / ADD FAVORITE MENU (PostgreSQL Stored Procedure sp_save_user_favorite_menu) ───

@router.post("/menus", summary="Save / Add Favorite Menu via Stored Procedure")
@router.post("", summary="Save / Add Favorite Menu (Root Alias)")
@router.post("/save", summary="Save / Add Favorite Menu (Save Alias)")
async def save_user_favorite_menu(
    request: Request,
    payload: SaveFavoriteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_optional_tenant_id),
    current_user: Optional[Any] = Depends(get_optional_current_user),
    token_payload: dict = Depends(get_optional_token_payload),
):
    """
    Saves or updates a favorite menu for authenticated retailer.
    Rejects favouriting if the service is disabled for the retailer's company.
    """
    ref_id = _resolve_user_ref(payload.user_ref_id, current_user, token_payload)
    comp_ref_id = _resolve_company_ref_id(current_user, token_payload, request)
    actor_email = getattr(current_user, "email", "SYSTEM")

    # Validate that the menu is enabled for the retailer's company
    is_enabled = await _is_menu_enabled_for_company(db, comp_ref_id, payload.menu_href)
    if not is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot favourite '{payload.menu_label}' because this service is currently disabled for your company."
        )

    # 1. Primary: PostgreSQL Stored Procedure
    try:
        sp_query = text(
            "SELECT public.sp_save_user_favorite_menu(:tenant_id, :user_ref_id, :menu_href, :menu_label, :menu_category, :icon_name, :display_order, :user_role, :actor_email);"
        )
        result = await db.execute(
            sp_query,
            {
                "tenant_id": tenant_id,
                "user_ref_id": ref_id,
                "menu_href": payload.menu_href,
                "menu_label": payload.menu_label,
                "menu_category": payload.menu_category or "General",
                "icon_name": payload.icon_name,
                "display_order": payload.display_order or 0,
                "user_role": payload.user_role or "RETAILER",
                "actor_email": actor_email,
            },
        )
        await db.commit()
        sp_data = result.scalar()
        if sp_data and isinstance(sp_data, dict):
            return {
                "status": "SUCCESS",
                "message": f"Favorite menu '{payload.menu_label}' saved successfully",
                "source": "STORED_PROCEDURE",
                "user_ref_id": ref_id,
                "company_ref_id": comp_ref_id,
                "data": sp_data.get("data", {}),
                "favorites": sp_data.get("data", {}).get("favorites", []),
            }
    except Exception:
        await db.rollback()

    # 2. Resilient Fallback: SQLAlchemy ORM
    stmt = select(UserFavoriteMenuModel).where(
        and_(
            UserFavoriteMenuModel.tenant_id == tenant_id,
            UserFavoriteMenuModel.user_ref_id == ref_id,
            or_(
                UserFavoriteMenuModel.company_ref_id == comp_ref_id,
                UserFavoriteMenuModel.company_ref_id == None
            ),
            UserFavoriteMenuModel.menu_href == payload.menu_href,
        )
    )
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        existing.menu_label = payload.menu_label
        existing.menu_category = payload.menu_category or "General"
        existing.icon_name = payload.icon_name
        existing.display_order = payload.display_order or 0
        existing.user_role = payload.user_role or "RETAILER"
        existing.company_ref_id = comp_ref_id
        existing.is_active = True
        existing.is_deleted = False
        existing.updated_by = actor_email
    else:
        new_fav = UserFavoriteMenuModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_ref_id=comp_ref_id,
            user_ref_id=ref_id,
            user_role=payload.user_role or "RETAILER",
            menu_href=payload.menu_href,
            menu_label=payload.menu_label,
            menu_category=payload.menu_category or "General",
            icon_name=payload.icon_name,
            display_order=payload.display_order or 0,
            is_active=True,
            is_deleted=False,
            created_by=actor_email,
            updated_by=actor_email,
        )
        db.add(new_fav)
    await db.commit()

    # Fetch updated active list
    list_stmt = (
        select(UserFavoriteMenuModel)
        .where(
            and_(
                UserFavoriteMenuModel.tenant_id == tenant_id,
                UserFavoriteMenuModel.user_ref_id == ref_id,
                or_(
                    UserFavoriteMenuModel.company_ref_id == comp_ref_id,
                    UserFavoriteMenuModel.company_ref_id == None
                ),
                UserFavoriteMenuModel.is_active == True,
                UserFavoriteMenuModel.is_deleted == False,
            )
        )
        .order_by(UserFavoriteMenuModel.display_order.asc(), UserFavoriteMenuModel.created_date.asc())
    )
    active_records = (await db.execute(list_stmt)).scalars().all()
    fav_list = [
        {
            "id": r.id,
            "public_id": str(r.public_id),
            "user_ref_id": r.user_ref_id,
            "company_ref_id": r.company_ref_id,
            "user_role": r.user_role,
            "menu_href": r.menu_href,
            "menu_label": r.menu_label,
            "menu_category": r.menu_category,
            "icon_name": r.icon_name,
            "display_order": r.display_order,
            "is_active": r.is_active,
        }
        for r in active_records
    ]

    return {
        "status": "SUCCESS",
        "message": f"Favorite menu '{payload.menu_label}' saved successfully",
        "source": "ORM_FALLBACK",
        "user_ref_id": ref_id,
        "company_ref_id": comp_ref_id,
        "favorites": fav_list,
        "data": fav_list,
    }


# ─── 3. POST TOGGLE FAVORITE MENU (PostgreSQL Stored Procedure sp_toggle_user_favorite_menu) ───

@router.post("/toggle", summary="Toggle Favorite Menu Item (Add/Remove) via Stored Procedure")
@router.post("/menus/toggle", summary="Toggle Favorite Menu Item (Alias)")
async def toggle_user_favorite_menu(
    request: Request,
    payload: ToggleFavoriteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_optional_tenant_id),
    current_user: Optional[Any] = Depends(get_optional_current_user),
    token_payload: dict = Depends(get_optional_token_payload),
):
    """
    Toggles a navigation menu as favorite (adds if missing/inactive, removes if currently active).
    Enforces that only services enabled for the retailer's company can be favourited.
    """
    ref_id = _resolve_user_ref(payload.user_ref_id, current_user, token_payload)
    comp_ref_id = _resolve_company_ref_id(current_user, token_payload, request)
    actor_email = getattr(current_user, "email", "SYSTEM")

    # Check if existing record is currently active
    check_stmt = select(UserFavoriteMenuModel).where(
        and_(
            UserFavoriteMenuModel.tenant_id == tenant_id,
            UserFavoriteMenuModel.user_ref_id == ref_id,
            or_(
                UserFavoriteMenuModel.company_ref_id == comp_ref_id,
                UserFavoriteMenuModel.company_ref_id == None
            ),
            UserFavoriteMenuModel.menu_href == payload.menu_href,
        )
    )
    existing = (await db.execute(check_stmt)).scalars().first()

    # If adding (not already active), validate company service enabled state
    is_activating = not (existing and existing.is_active and not existing.is_deleted)
    if is_activating:
        is_enabled = await _is_menu_enabled_for_company(db, comp_ref_id, payload.menu_href)
        if not is_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot favourite '{payload.menu_label or payload.menu_href}' because this service is currently disabled for your company."
            )

    # 1. Primary: PostgreSQL Stored Procedure
    try:
        sp_query = text(
            "SELECT public.sp_toggle_user_favorite_menu(:tenant_id, :user_ref_id, :menu_href, :menu_label, :menu_category, :icon_name, :user_role, :actor_email);"
        )
        result = await db.execute(
            sp_query,
            {
                "tenant_id": tenant_id,
                "user_ref_id": ref_id,
                "menu_href": payload.menu_href,
                "menu_label": payload.menu_label or payload.menu_href,
                "menu_category": payload.menu_category or "General",
                "icon_name": payload.icon_name,
                "user_role": payload.user_role or "RETAILER",
                "actor_email": actor_email,
            },
        )
        await db.commit()
        sp_data = result.scalar()
        if sp_data and isinstance(sp_data, dict):
            action = sp_data.get("action", "TOGGLED")
            return {
                "status": "SUCCESS",
                "action": action,
                "message": f"Menu {action.lower()} successfully",
                "source": "STORED_PROCEDURE",
                "user_ref_id": ref_id,
                "company_ref_id": comp_ref_id,
                "menu_href": payload.menu_href,
                "data": sp_data.get("data", {}),
                "favorites": sp_data.get("data", {}).get("favorites", []),
            }
    except Exception:
        await db.rollback()

    # 2. Resilient Fallback: SQLAlchemy ORM
    action = "ADDED"
    if existing:
        if existing.is_active and not existing.is_deleted:
            existing.is_active = False
            existing.is_deleted = True
            action = "REMOVED"
        else:
            existing.is_active = True
            existing.is_deleted = False
            existing.company_ref_id = comp_ref_id
            if payload.menu_label:
                existing.menu_label = payload.menu_label
            if payload.menu_category:
                existing.menu_category = payload.menu_category
            if payload.icon_name:
                existing.icon_name = payload.icon_name
            action = "ADDED"
        existing.updated_by = actor_email
    else:
        new_fav = UserFavoriteMenuModel(
            public_id=uuid.uuid4(),
            tenant_id=tenant_id,
            company_ref_id=comp_ref_id,
            user_ref_id=ref_id,
            user_role=payload.user_role or "RETAILER",
            menu_href=payload.menu_href,
            menu_label=payload.menu_label or payload.menu_href,
            menu_category=payload.menu_category or "General",
            icon_name=payload.icon_name,
            display_order=0,
            is_active=True,
            is_deleted=False,
            created_by=actor_email,
            updated_by=actor_email,
        )
        db.add(new_fav)
        action = "ADDED"
    await db.commit()

    # Re-fetch active favorites
    list_stmt = (
        select(UserFavoriteMenuModel)
        .where(
            and_(
                UserFavoriteMenuModel.tenant_id == tenant_id,
                UserFavoriteMenuModel.user_ref_id == ref_id,
                or_(
                    UserFavoriteMenuModel.company_ref_id == comp_ref_id,
                    UserFavoriteMenuModel.company_ref_id == None
                ),
                UserFavoriteMenuModel.is_active == True,
                UserFavoriteMenuModel.is_deleted == False,
            )
        )
        .order_by(UserFavoriteMenuModel.display_order.asc(), UserFavoriteMenuModel.created_date.asc())
    )
    active_records = (await db.execute(list_stmt)).scalars().all()
    fav_list = [
        {
            "id": r.id,
            "public_id": str(r.public_id),
            "user_ref_id": r.user_ref_id,
            "company_ref_id": r.company_ref_id,
            "user_role": r.user_role,
            "menu_href": r.menu_href,
            "menu_label": r.menu_label,
            "menu_category": r.menu_category,
            "icon_name": r.icon_name,
            "display_order": r.display_order,
            "is_active": r.is_active,
        }
        for r in active_records
    ]

    return {
        "status": "SUCCESS",
        "action": action,
        "message": f"Menu {action.lower()} successfully",
        "source": "ORM_FALLBACK",
        "user_ref_id": ref_id,
        "company_ref_id": comp_ref_id,
        "menu_href": payload.menu_href,
        "favorites": fav_list,
        "data": fav_list,
    }


# ─── 4. POST REMOVE FAVORITE MENU (PostgreSQL Stored Procedure sp_remove_user_favorite_menu) ───

@router.post("/remove", summary="Remove Favorite Menu Item via Stored Procedure")
@router.post("/menus/remove", summary="Remove Favorite Menu Item (Alias)")
async def remove_user_favorite_menu(
    request: Request,
    payload: RemoveFavoriteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_optional_tenant_id),
    current_user: Optional[Any] = Depends(get_optional_current_user),
    token_payload: dict = Depends(get_optional_token_payload),
):
    """
    Removes / deactivates a favorite menu item for the authenticated retailer.
    """
    ref_id = _resolve_user_ref(payload.user_ref_id, current_user, token_payload)
    comp_ref_id = _resolve_company_ref_id(current_user, token_payload, request)
    actor_email = getattr(current_user, "email", "SYSTEM")

    try:
        sp_query = text(
            "SELECT public.sp_remove_user_favorite_menu(:tenant_id, :user_ref_id, :menu_href, :actor_email);"
        )
        result = await db.execute(
            sp_query,
            {
                "tenant_id": tenant_id,
                "user_ref_id": ref_id,
                "menu_href": payload.menu_href,
                "actor_email": actor_email,
            },
        )
        await db.commit()
        sp_data = result.scalar()
        if sp_data and isinstance(sp_data, dict):
            return {
                "status": "SUCCESS",
                "message": "Favorite menu removed successfully",
                "source": "STORED_PROCEDURE",
                "user_ref_id": ref_id,
                "company_ref_id": comp_ref_id,
                "menu_href": payload.menu_href,
                "data": sp_data.get("data", {}),
                "favorites": sp_data.get("data", {}).get("favorites", []),
            }
    except Exception:
        await db.rollback()

    stmt = select(UserFavoriteMenuModel).where(
        and_(
            UserFavoriteMenuModel.tenant_id == tenant_id,
            UserFavoriteMenuModel.user_ref_id == ref_id,
            or_(
                UserFavoriteMenuModel.company_ref_id == comp_ref_id,
                UserFavoriteMenuModel.company_ref_id == None
            ),
            UserFavoriteMenuModel.menu_href == payload.menu_href,
        )
    )
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        existing.is_active = False
        existing.is_deleted = True
        existing.updated_by = actor_email
        await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Favorite menu removed successfully",
        "source": "ORM_FALLBACK",
        "user_ref_id": ref_id,
        "company_ref_id": comp_ref_id,
        "menu_href": payload.menu_href,
    }


# ─── 5. POST REORDER FAVORITE MENUS (PostgreSQL Stored Procedure sp_reorder_user_favorite_menus) ───

@router.post("/reorder", summary="Reorder Favorite Menu Items via Stored Procedure")
@router.post("/menus/reorder", summary="Reorder Favorite Menu Items (Alias)")
async def reorder_user_favorite_menus(
    request: Request,
    payload: ReorderFavoritesRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_optional_tenant_id),
    current_user: Optional[Any] = Depends(get_optional_current_user),
    token_payload: dict = Depends(get_optional_token_payload),
):
    """
    Updates the display order for an array of favorite menu hrefs.
    """
    ref_id = _resolve_user_ref(payload.user_ref_id, current_user, token_payload)
    comp_ref_id = _resolve_company_ref_id(current_user, token_payload, request)
    actor_email = getattr(current_user, "email", "SYSTEM")

    try:
        sp_query = text(
            "SELECT public.sp_reorder_user_favorite_menus(:tenant_id, :user_ref_id, CAST(:menu_hrefs AS jsonb), :actor_email);"
        )
        result = await db.execute(
            sp_query,
            {
                "tenant_id": tenant_id,
                "user_ref_id": ref_id,
                "menu_hrefs": json.dumps(payload.menu_hrefs),
                "actor_email": actor_email,
            },
        )
        await db.commit()
        sp_data = result.scalar()
        if sp_data and isinstance(sp_data, dict):
            return {
                "status": "SUCCESS",
                "message": "Favorite menus reordered successfully",
                "source": "STORED_PROCEDURE",
                "user_ref_id": ref_id,
                "company_ref_id": comp_ref_id,
                "data": sp_data.get("data", {}),
                "favorites": sp_data.get("data", {}).get("favorites", []),
            }
    except Exception:
        await db.rollback()

    for idx, href in enumerate(payload.menu_hrefs):
        stmt = select(UserFavoriteMenuModel).where(
            and_(
                UserFavoriteMenuModel.tenant_id == tenant_id,
                UserFavoriteMenuModel.user_ref_id == ref_id,
                or_(
                    UserFavoriteMenuModel.company_ref_id == comp_ref_id,
                    UserFavoriteMenuModel.company_ref_id == None
                ),
                UserFavoriteMenuModel.menu_href == href,
            )
        )
        rec = (await db.execute(stmt)).scalars().first()
        if rec:
            rec.display_order = idx
            rec.updated_by = actor_email
    await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Favorite menus reordered successfully",
        "source": "ORM_FALLBACK",
        "user_ref_id": ref_id,
        "company_ref_id": comp_ref_id,
    }
