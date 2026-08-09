from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.application.verification_service import VerificationService

async def verify_retailer_transaction_permission(
    x_retailer_id: str = Header(..., description="Retailer ID or Mobile Number"),
    db: AsyncSession = Depends(get_db)
):
    """Enforces transaction restriction until Admin approval."""
    res = await VerificationService.get_retailer_status(db, x_retailer_id)
    if not res.get("can_transact"):
        raise HTTPException(
            status_code=403,
            detail="Your account verification is not yet complete. Transactions will be enabled after approval."
        )
    return res
