"""
Retailer Platform API Endpoints
Unified FastAPI routes for DMT, AEPS, Card To Cash, UPI, Recharge, BBPS, Settlement & KYC.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
import time
import random

router = APIRouter(prefix="/retailer", tags=["Retailer Platform"])

# ── Dynamic Retailer Wallet State ──
RETAILER_WALLET_STATE = {
    "mainBalance": 0.00,
    "commissionBalance": 0.00,
    "todayMargin": 0.00,
    "todayTxnCount": 0,
    "todaySettlement": 0.00,
}

def get_current_wallet_balance() -> float:
    return RETAILER_WALLET_STATE["mainBalance"]

def debit_retailer_wallet(amount: float) -> float:
    new_bal = max(0.0, round(RETAILER_WALLET_STATE["mainBalance"] - amount, 2))
    RETAILER_WALLET_STATE["mainBalance"] = new_bal
    RETAILER_WALLET_STATE["todayTxnCount"] += 1
    return new_bal

# ── Schemas ──
class WalletDebitRequest(BaseModel):
    amount: float

class DmtRequest(BaseModel):
    customerMobile: str
    beneficiaryId: str
    accountNumber: str
    ifsc: str
    amount: float
    transferMode: str = "IMPS"

class AepsRequest(BaseModel):
    aadhaarNumber: str
    bankName: str
    serviceType: str
    amount: Optional[float] = 0.0

class UpiQrRequest(BaseModel):
    amount: float
    merchantRef: Optional[str] = None

class RechargeRequest(BaseModel):
    mobileOrConsumerNumber: str
    operatorCode: str
    amount: float
    rechargeType: str = "MOBILE_PREPAID"

class BbpsRequest(BaseModel):
    billerCategory: str
    billerId: str
    consumerNumber: str
    amount: float

class SettlementRequest(BaseModel):
    bankAccountId: str
    amount: float
    transferMode: str = "IMPS"

# ── Endpoints ──
@router.get("/wallet/balance")
async def get_wallet_balance(
    request: Request = None,
    retailer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        from app.presentation.api.v1.retailer_dashboard_router import resolve_retailer_context
        from app.infrastructure.db.models import RetailerWalletModel
        from sqlalchemy import select
        ctx = await resolve_retailer_context(request, retailer_id, db=db)
        pub_id = ctx.get("public_id")
        bal = 0.00
        if pub_id:
            wal_stmt = select(RetailerWalletModel.wallet_balance).where(RetailerWalletModel.retailer_id == pub_id)
            w_res = (await db.execute(wal_stmt)).scalar()
            if w_res is not None:
                bal = float(w_res)
        return {
            "success": True,
            "retailer_id": ctx.get("retailer_id"),
            "mainBalance": round(float(bal), 2),
            "wallet_balance": round(float(bal), 2),
            "available_balance": round(float(bal), 2),
            "commissionBalance": 0.00,
            "todayMargin": 0.00,
            "todayTxnCount": 0,
            "todaySettlement": 0.00,
        }
    except Exception:
        return {
            "success": True,
            "mainBalance": RETAILER_WALLET_STATE["mainBalance"],
            "wallet_balance": RETAILER_WALLET_STATE["mainBalance"],
            "available_balance": RETAILER_WALLET_STATE["mainBalance"],
            "commissionBalance": RETAILER_WALLET_STATE["commissionBalance"],
            "todayMargin": RETAILER_WALLET_STATE["todayMargin"],
            "todayTxnCount": RETAILER_WALLET_STATE["todayTxnCount"],
            "todaySettlement": RETAILER_WALLET_STATE["todaySettlement"],
        }

@router.post("/wallet/debit")
async def debit_wallet_endpoint(req: WalletDebitRequest):
    new_bal = debit_retailer_wallet(req.amount)
    return {
        "success": True,
        "mainBalance": new_bal,
        "debitedAmount": req.amount
    }

@router.post("/dmt/transfer")
async def execute_dmt(req: DmtRequest):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid transfer amount")
    charge = 10.0 if req.transferMode == "IMPS" else 5.0
    total_debit = req.amount + charge
    new_bal = debit_retailer_wallet(total_debit)
    return {
        "success": True,
        "transactionId": f"DMT{int(time.time()*1000)}",
        "utr": f"UTR{random.randint(1000000000, 9999999999)}",
        "status": "SUCCESS",
        "amount": req.amount,
        "charge": charge,
        "margin": round(req.amount * 0.005, 2),
        "walletBalanceAfter": new_bal,
        "timestamp": time.time(),
    }

@router.post("/aeps/transact")
async def execute_aeps(req: AepsRequest):
    return {
        "success": True,
        "transactionId": f"AEPS{int(time.time()*1000)}",
        "rrn": f"RRN{random.randint(100000000000, 999999999999)}",
        "status": "SUCCESS",
        "serviceType": req.serviceType,
        "amount": req.amount,
        "remainingBalance": 14250.00,
        "timestamp": time.time(),
    }

@router.post("/upi/generate-qr")
async def generate_upi_qr(req: UpiQrRequest):
    ref = f"PAY2PAY{int(time.time())}"
    vpa = "pay2pay.retailer@icici"
    qr_string = f"upi://pay?pa={vpa}&pn=Pay2PayStore&am={req.amount}&tr={ref}&mc=5411&cu=INR"
    return {
        "success": True,
        "qrCodeUrl": f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={qr_string}",
        "upiString": qr_string,
        "txnRef": ref,
        "amount": req.amount,
    }

@router.post("/recharge/process")
async def process_recharge(req: RechargeRequest):
    return {
        "success": True,
        "rechargeId": f"REC{int(time.time())}",
        "operatorTxnId": f"OP{random.randint(100000, 999999)}",
        "status": "SUCCESS",
        "amount": req.amount,
        "commission": round(req.amount * 0.025, 2),
    }

@router.post("/bbps/fetch-and-pay")
async def pay_bbps(req: BbpsRequest):
    return {
        "success": True,
        "billerName": req.billerId,
        "approvalRefNum": f"BBPS{int(time.time())}",
        "status": "SUCCESS",
        "amountPaid": req.amount,
    }

@router.post("/settlement/move-to-bank")
async def move_to_bank(req: SettlementRequest):
    return {
        "success": True,
        "settlementId": f"SETTL{int(time.time())}",
        "utr": f"BANKUTR{random.randint(10000000, 99999999)}",
        "status": "SETTLED",
        "amount": req.amount,
        "charge": 5.0 if req.transferMode == "IMPS" else 0.0,
    }
