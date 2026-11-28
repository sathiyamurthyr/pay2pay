"""
Retailer Credit Card Management Router.

Strictly scoped to the authenticated Retailer & Company/Tenant (never trusts client retailer_id/company_id):
- GET    /retailer/cards/metadata            -> Card Types ("Credit Card") & Supported Banks
- GET    /retailer/cards                     -> Dashboard summary, billing sections, filters, pagination
- POST   /retailer/cards                     -> Register new credit card with duplicate prevention
- GET    /retailer/cards/{card_ref_id}       -> View single card details
- PUT    /retailer/cards/{card_ref_id}       -> Update card details
- POST   /retailer/cards/{card_ref_id}/mark-paid -> Mark current billing cycle paid
- DELETE /retailer/cards/{card_ref_id}       -> Soft-delete card + audit log
"""

from typing import Any, Optional, Union
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import (
    get_current_token_payload,
    get_optional_current_user,
)
from app.application.menu_favorite_service import MenuFavoriteService
from app.application.retailer_card_service import RetailerCardService
from app.core.database import get_db

router = APIRouter(prefix="/retailer/cards", tags=["Retailer Credit Card Management"])


class CreateRetailerCardRequest(BaseModel):
    card_name: str = Field(..., min_length=2, max_length=150)
    mobile_no: str = Field(..., min_length=10, max_length=20)
    card_number: str = Field(..., min_length=13, max_length=25)
    card_type: str = Field("Credit Card", min_length=2, max_length=100)
    bank_name: str = Field(..., min_length=2, max_length=200)
    bank_id: Optional[int] = None
    bill_gen_day: Union[int, str] = Field(..., description="Day of month (1-31) or YYYY-MM-DD")
    bill_due_day: Union[int, str] = Field(..., description="Day of month (1-31) or YYYY-MM-DD")


class UpdateRetailerCardRequest(BaseModel):
    card_name: Optional[str] = Field(None, min_length=2, max_length=150)
    mobile_no: Optional[str] = Field(None, min_length=10, max_length=20)
    bank_name: Optional[str] = Field(None, min_length=2, max_length=200)
    bank_id: Optional[int] = None
    bill_gen_day: Optional[Union[int, str]] = None
    bill_due_day: Optional[Union[int, str]] = None


@router.get("/metadata", summary="Get Card Types and Supported Banks")
async def get_card_metadata(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await RetailerCardService.get_metadata(db)


@router.get("", summary="Retailer Credit Card Management Dashboard")
@router.get("/", summary="Retailer Credit Card Management Dashboard (Slash Alias)")
async def list_retailer_cards(
    request: Request,
    range_filter: str = Query("all", description="all | today | 7d | 15d | 30d | custom"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    bank_name: Optional[str] = Query(None),
    card_status: Optional[str] = Query(None, description="ALL | OVERDUE | DUE_TODAY | UPCOMING | GENERATED_TODAY"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await RetailerCardService.list_cards_dashboard(
        db,
        identity,
        range_filter=range_filter,
        from_date=from_date,
        to_date=to_date,
        bank_name=bank_name,
        card_status=card_status,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post("", summary="Register New Credit Card")
@router.post("/", summary="Register New Credit Card (Slash Alias)")
async def create_retailer_card(
    payload: CreateRetailerCardRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await RetailerCardService.create_card(
        db,
        identity,
        card_name=payload.card_name,
        mobile_no=payload.mobile_no,
        card_number=payload.card_number,
        card_type=payload.card_type,
        bank_name=payload.bank_name,
        bank_id=payload.bank_id,
        bill_gen_day=payload.bill_gen_day,
        bill_due_day=payload.bill_due_day,
    )


@router.get("/{card_ref_id}", summary="Get Single Saved Credit Card")
async def get_retailer_card(
    card_ref_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await RetailerCardService.get_card(db, identity, card_ref_id=card_ref_id)


@router.put("/{card_ref_id}", summary="Update Saved Credit Card")
async def update_retailer_card(
    card_ref_id: int,
    payload: UpdateRetailerCardRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await RetailerCardService.update_card(
        db,
        identity,
        card_ref_id=card_ref_id,
        card_name=payload.card_name,
        mobile_no=payload.mobile_no,
        bank_name=payload.bank_name,
        bank_id=payload.bank_id,
        bill_gen_day=payload.bill_gen_day,
        bill_due_day=payload.bill_due_day,
    )


@router.post("/{card_ref_id}/mark-paid", summary="Mark Current Cycle Bill Paid")
async def mark_retailer_card_paid(
    card_ref_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await RetailerCardService.mark_cycle_paid(db, identity, card_ref_id=card_ref_id)


@router.delete("/{card_ref_id}", summary="Remove Saved Credit Card")
async def delete_retailer_card(
    card_ref_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_current_token_payload),
    current_user: Optional[Any] = Depends(get_optional_current_user),
):
    identity = await MenuFavoriteService.resolve_authenticated_identity(
        db=db,
        request=request,
        token_payload=token_payload,
        current_user=current_user,
    )
    return await RetailerCardService.delete_card(db, identity, card_ref_id=card_ref_id)
