"""
Retailer Platform API Endpoints
Unified FastAPI routes for DMT, AEPS, Card To Cash, UPI, Recharge, BBPS, Settlement & KYC.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
import time
import random

router = APIRouter(prefix="/retailer", tags=["Retailer Platform"])

# ── Schemas ──
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
async def get_wallet_balance():
    return {
        "success": True,
        "mainBalance": 48250.75,
        "commissionBalance": 3420.50,
        "todayMargin": 1480.00,
        "todayTxnCount": 42,
        "todaySettlement": 25000.00,
    }

@router.post("/dmt/transfer")
async def execute_dmt(req: DmtRequest):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid transfer amount")
    return {
        "success": True,
        "transactionId": f"DMT{int(time.time()*1000)}",
        "utr": f"UTR{random.randint(1000000000, 9999999999)}",
        "status": "SUCCESS",
        "amount": req.amount,
        "charge": 10.0 if req.transferMode == "IMPS" else 5.0,
        "margin": round(req.amount * 0.005, 2),
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
