"""
Retailer Credit Card Management Router.

Provides endpoints strictly scoped to the authenticated Retailer & Company/Tenant:
- GET    /retailer/cards/metadata       -> Active Card Types & Credit Card Banks
- GET    /retailer/cards                -> Dashboard summary + Current Date Bills + Upcoming Days Bills + All Cards
- POST   /retailer/cards                -> Register a new credit card (Luhn, mobile, duplicate prevention)
- DELETE /retailer/cards/{card_ref_id}  -> Remove a saved card owned by the authenticated retailer
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

router = APIRouter(prefix="/retailer/cards", tags=["Retailer Card Management"])


class CreateRetailerCardRequest(BaseModel):
    cardholder_name: str = Field(..., min_length=2, max_length=150)
    mobile_number: str = Field(..., min_length=10, max_length=20)
    card_number: str = Field(..., min_length=13, max_length=25)
    card_type: str = Field(..., min_length=2, max_length=100)
    card_type_ref_id: Optional[int] = None
    bank_name: str = Field(..., min_length=2, max_length=200)
    bank_ifsc_ref_id: Optional[int] = None
    bill_generate_date: Union[int, str] = Field(..., description="Day of month (1-31) or YYYY-MM-DD")
    bill_due_date: Union[int, str] = Field(..., description="Day of month (1-31) or YYYY-MM-DD")


@router.get("/metadata", summary="Get Card Types and Credit Card Banks")
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


@router.get("", summary="List Retailer Saved Credit Cards & Bill Tracking")
@router.get("/", summary="List Retailer Saved Credit Cards & Bill Tracking (Slash Alias)")
async def list_retailer_cards(
    request: Request,
    search: Optional[str] = Query(None, description="Filter by name, mobile, bank, or last 4 digits"),
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
    return await RetailerCardService.list_cards_dashboard(db, identity, search=search)


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
        cardholder_name=payload.cardholder_name,
        mobile_number=payload.mobile_number,
        card_number=payload.card_number,
        card_type=payload.card_type,
        card_type_ref_id=payload.card_type_ref_id,
        bank_name=payload.bank_name,
        bank_ifsc_ref_id=payload.bank_ifsc_ref_id,
        bill_generate_date=payload.bill_generate_date,
        bill_due_date=payload.bill_due_date,
    )


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
