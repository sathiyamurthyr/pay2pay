"""
EPIC — Cashfree Reverse Penny Drop (VRS v2) API Router
"""
import uuid
import time
from fastapi import APIRouter, HTTPException, Depends
from app.application.reverse_penny_drop_dtos import (
    ReversePennyDropCreateRequest, ReversePennyDropCreateResponse, ReversePennyDropStatusResponse
)
from app.infrastructure.adapters.reverse_penny_drop_adapter import CashfreeReversePennyDropAdapter

router = APIRouter(prefix="/beneficiaries/reverse-penny-drop", tags=["Reverse Penny Drop Verification"])
adapter = CashfreeReversePennyDropAdapter()


@router.post("/create", response_model=ReversePennyDropCreateResponse)
async def create_reverse_penny_drop_request(req: ReversePennyDropCreateRequest):
    """Generate Reverse Penny Drop UPI QR & Deep Link via Cashfree VRS v2 API."""
    verification_id = f"RPD-VERIFY-{uuid.uuid4().hex[:12].upper()}"
    return await adapter.create_reverse_penny_drop_request(
        verification_id=verification_id,
        name=req.name,
        phone=req.phone,
        amount=req.amount
    )


@router.get("/status/{verification_id}", response_model=ReversePennyDropStatusResponse)
async def get_reverse_penny_drop_status(verification_id: str):
    """Poll status of Reverse Penny Drop payment and retrieve verified bank account details."""
    return await adapter.get_reverse_penny_drop_status(verification_id)
