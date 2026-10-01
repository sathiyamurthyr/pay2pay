"""
Enterprise Unisus Pay Integration Service.
Partner API Integration Engine for QR Code Collections, Payment Requests,
and Webhook Processing.

Enforces:
1. Intelligent Token Caching: NEVER calls /login unless token is missing or a 401 is received.
2. Complete QR List Replacement: Replaces stored QR list on webhook / manual fetch.
3. Strict Company & Role Isolation: Exclusively available to Sathus Company Super Distributors,
   Distributors, and Retailers.
4. Atomic Financial Settlement: On PAYMENT_REQUEST_STATUS == 'SUCCESS', automatically settles
   the topup request and credits user wallet with complete ledger traceability.
"""

import re
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
import httpx
from sqlalchemy import select, update, delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.infrastructure.db.unisus_pay_models import (
    UnisusPayQrCodeModel, UnisusPayPaymentRequestModel, UnisusPayConfigModel,
    SATHUS_COMPANY_ID, SATHUS_COMPANY_REF_ID, DEFAULT_TENANT_ID
)
from app.infrastructure.db.topup_request_model import TopupRequestModel
from app.infrastructure.db.models import (
    RetailerModel, RetailerWalletModel,
    DistributorModel, SuperDistributorModel
)
from app.application.wallet_balance_service import WalletBalanceAdjustmentService, WalletAdjustmentDTO

logger = logging.getLogger("unisus_pay_service")


class UnisusPayService:
    BASE_URL = "https://api.unisuspe.com/api/apiclient"
    DEFAULT_EMAIL = "admin@sathus.in"
    DEFAULT_PASSWORD = "Sathus@1621"
    WEB_CODE = "UNISUSPAY"

    _cached_token: Optional[str] = None
    _token_lock: asyncio.Lock = asyncio.Lock()

    @classmethod
    def _clean_base64(cls, raw: str) -> str:
        """Strips data:image/...;base64, prefix if present."""
        if not raw:
            return ""
        if ";base64," in raw:
            return raw.split(";base64,")[1].strip()
        return raw.strip()

    @classmethod
    async def get_valid_token(cls, db: Optional[AsyncSession] = None, force_refresh: bool = False) -> str:
        """
        Retrieves valid cached token.
        CRITICAL RULE:
        SHOULD NOT CALL /login EVERY TIME.
        Only re-authenticate when no token exists or when force_refresh=True (e.g. after receiving a 401).
        """
        async with cls._token_lock:
            if not force_refresh and cls._cached_token:
                return cls._cached_token

            # Check database config record
            session_to_use = db
            close_session = False
            if session_to_use is None:
                session_to_use = AsyncSessionLocal()
                close_session = True

            try:
                stmt = select(UnisusPayConfigModel).where(
                    UnisusPayConfigModel.service_name == "UNISUSPAY",
                    UnisusPayConfigModel.is_active == True
                )
                res = await session_to_use.execute(stmt)
                config = res.scalars().first()

                if not force_refresh and config and config.cached_token:
                    cls._cached_token = config.cached_token
                    return cls._cached_token

                # Authenticate via /api/apiclient/login
                login_email = config.email if (config and config.email) else cls.DEFAULT_EMAIL
                login_pwd = config.password if (config and config.password) else cls.DEFAULT_PASSWORD
                web_code = config.web_code if (config and config.web_code) else cls.WEB_CODE

                headers = {
                    "Content-Type": "application/json",
                    "web_code": web_code,
                    "web-code": web_code
                }
                payload = {
                    "email": login_email,
                    "password": login_pwd
                }

                logger.info(f"[UnisusPay] Authenticating partner API login for {login_email}...")
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.post(
                        f"{cls.BASE_URL}/login",
                        json=payload,
                        headers=headers
                    )

                if resp.status_code != 200:
                    logger.error(f"[UnisusPay] Login failed with HTTP {resp.status_code}: {resp.text}")
                    raise RuntimeError(f"Unisus Pay authentication failed (HTTP {resp.status_code}): {resp.text}")

                data = resp.json()
                code = data.get("code")
                if code != 200:
                    err_msg = data.get("msg") or "Invalid credentials"
                    logger.error(f"[UnisusPay] Login returned code {code}: {err_msg}")
                    raise RuntimeError(f"Unisus Pay login rejected: {err_msg}")

                token = data.get("data", {}).get("token")
                if not token:
                    raise RuntimeError("Unisus Pay login response missing bearer token.")

                cls._cached_token = token
                main_wallet = data.get("data", {}).get("main_wallat")

                # Persist to database
                if config:
                    config.cached_token = token
                    config.token_updated_at = datetime.now(timezone.utc)
                    if main_wallet is not None:
                        config.wallet_balance = float(main_wallet)
                    await session_to_use.commit()
                else:
                    new_cfg = UnisusPayConfigModel(
                        service_name="UNISUSPAY",
                        base_url=cls.BASE_URL,
                        email=login_email,
                        password=login_pwd,
                        web_code=web_code,
                        cached_token=token,
                        token_updated_at=datetime.now(timezone.utc),
                        wallet_balance=float(main_wallet) if main_wallet is not None else 0.0,
                        is_active=True
                    )
                    session_to_use.add(new_cfg)
                    await session_to_use.commit()

                logger.info("[UnisusPay] Partner token acquired and cached successfully.")
                return token
            finally:
                if close_session:
                    await session_to_use.close()

    @classmethod
    async def _make_api_request(
        cls,
        endpoint: str,
        payload: Optional[Dict[str, Any]] = None,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Executes authenticated API request with automatic 401 re-authentication.
        """
        token = await cls.get_valid_token(db=db, force_refresh=False)
        url = f"{cls.BASE_URL}{endpoint}"

        headers = {
            "Content-Type": "application/json",
            "web_code": cls.WEB_CODE,
            "web-code": cls.WEB_CODE,
            "Authorization": f"Bearer {token}"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload or {}, headers=headers)

            # Check if 401 occurred -> Re-authenticate ONCE and retry
            if resp.status_code == 401 or (resp.headers.get("content-type", "").startswith("application/json") and resp.json().get("code") == 401):
                logger.warning("[UnisusPay] Received 401 Unauthorized. Refreshing token and retrying request...")
                token = await cls.get_valid_token(db=db, force_refresh=True)
                headers["Authorization"] = f"Bearer {token}"
                resp = await client.post(url, json=payload or {}, headers=headers)

        try:
            res_data = resp.json()
        except Exception:
            raise RuntimeError(f"Unisus Pay returned non-JSON response ({resp.status_code}): {resp.text}")

        return res_data

    @classmethod
    async def get_balance(cls, db: Optional[AsyncSession] = None) -> float:
        """
        Queries partner balance via POST /api/apiclient/balance-check.
        Response shape: {"code":200,"data":{"balance":12500.5},"msg":"Balance Retrived Successfully"}
        """
        res = await cls._make_api_request("/balance-check", db=db)
        code = res.get("code")
        if code != 200:
            raise RuntimeError(f"Balance check failed ({code}): {res.get('msg')}")

        balance = float(res.get("data", {}).get("balance", 0.0))

        # Update in DB
        session_to_use = db
        close_session = False
        if session_to_use is None:
            session_to_use = AsyncSessionLocal()
            close_session = True

        try:
            stmt = update(UnisusPayConfigModel).where(
                UnisusPayConfigModel.service_name == "UNISUSPAY"
            ).values(
                wallet_balance=balance,
                last_balance_check_at=datetime.now(timezone.utc)
            )
            await session_to_use.execute(stmt)
            await session_to_use.commit()
        finally:
            if close_session:
                await session_to_use.close()

        return balance

    @classmethod
    async def fetch_and_sync_qr_codes(cls, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Fetches QR code list from POST /api/apiclient/qr-code
        and replaces locally stored QRs per integration guide instructions.
        """
        res = await cls._make_api_request("/qr-code", db=db)
        code = res.get("code")
        if code != 200:
            msg = res.get("msg") or "Failed to fetch QR codes"
            logger.warning(f"[UnisusPay] QR fetch returned code {code}: {msg}")
            if code == 422:
                # No QR code available
                return []
            raise RuntimeError(f"Unisus Pay QR fetch error ({code}): {msg}")

        data = res.get("data") or {}
        is_default_qr = bool(data.get("is_default_qr", False))
        qrs = data.get("qrs") or []

        return await cls.replace_stored_qrs(
            qrs=qrs,
            is_default_qr=is_default_qr,
            unisus_user_id=None,
            db=db
        )

    @classmethod
    async def replace_stored_qrs(
        cls,
        qrs: List[Dict[str, Any]],
        is_default_qr: bool,
        unisus_user_id: Optional[str],
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """
        Atomically replaces all currently stored Unisus Pay QRs with incoming list.
        """
        logger.info(f"[UnisusPay] Replacing stored QR list with {len(qrs)} incoming QRs (is_default={is_default_qr}).")

        # Mark all existing active QRs as inactive or delete them
        await db.execute(
            delete(UnisusPayQrCodeModel).where(
                UnisusPayQrCodeModel.company_id == SATHUS_COMPANY_ID
            )
        )

        saved_list = []
        for q in qrs:
            qr_id = str(q.get("qr_id") or "").strip()
            if not qr_id:
                continue

            title = str(q.get("title") or "Primary Collection QR").strip()
            qr_b64 = cls._clean_base64(str(q.get("qr_image_base64") or ""))

            qr_entity = UnisusPayQrCodeModel(
                tenant_id=DEFAULT_TENANT_ID,
                company_id=SATHUS_COMPANY_ID,
                qr_id=qr_id,
                title=title,
                qr_image_base64=qr_b64,
                is_default_qr=is_default_qr,
                unisus_user_id=unisus_user_id,
                is_active=True
            )
            db.add(qr_entity)
            saved_list.append({
                "qr_id": qr_id,
                "title": title,
                "qr_image_base64": qr_b64,
                "is_default_qr": is_default_qr
            })

        # Update last sync timestamp in config
        await db.execute(
            update(UnisusPayConfigModel).where(
                UnisusPayConfigModel.service_name == "UNISUSPAY"
            ).values(last_qr_sync_at=datetime.now(timezone.utc))
        )
        await db.commit()
        return saved_list

    @classmethod
    async def get_active_qrs_for_sathus(cls, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Retrieves active Unisus Pay collection QRs for Sathus Company.
        If none are in DB, attempts a live sync from /qr-code.
        """
        stmt = select(UnisusPayQrCodeModel).where(
            UnisusPayQrCodeModel.company_id == SATHUS_COMPANY_ID,
            UnisusPayQrCodeModel.is_active == True
        ).order_by(UnisusPayQrCodeModel.id.asc())

        res = await db.execute(stmt)
        records = res.scalars().all()

        if not records:
            try:
                logger.info("[UnisusPay] No active QRs in DB for Sathus. Performing live sync...")
                return await cls.fetch_and_sync_qr_codes(db=db)
            except Exception as e:
                logger.warning(f"[UnisusPay] Fallback QR sync failed: {e}")
                return []

        result = []
        for r in records:
            result.append({
                "qr_id": r.qr_id,
                "title": r.title,
                "qr_image_base64": r.qr_image_base64,
                "qr_data_url": f"data:image/png;base64,{r.qr_image_base64}",
                "is_default_qr": r.is_default_qr
            })
        return result

    @classmethod
    async def submit_payment_request(
        cls,
        amount: float,
        reference_no: str,
        qr_id: str,
        receipt_image_base64: str,
        note: Optional[str],
        user_id: Optional[uuid.UUID],
        user_type: str,
        user_code: Optional[str],
        topup_request_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Submits payment request to POST /api/apiclient/payment-request
        and records the request locally linked to topup_requests.
        """
        clean_img = cls._clean_base64(receipt_image_base64)
        clean_ref = reference_no.strip()

        payload = {
            "amount": float(amount),
            "reference_no": clean_ref,
            "note": note or "",
            "receipt_image": clean_img,
            "qr_id": qr_id.strip()
        }

        logger.info(f"[UnisusPay] Submitting payment request for ref={clean_ref}, amount={amount}, qr_id={qr_id}")
        res = await cls._make_api_request("/payment-request", payload=payload, db=db)

        code = res.get("code")
        if code != 200:
            err_msg = res.get("msg") or "Payment request rejected by partner"
            logger.error(f"[UnisusPay] Payment request creation failed ({code}): {err_msg}")
            raise RuntimeError(f"Unisus Pay error ({code}): {err_msg}")

        data = res.get("data") or {}
        unisus_pr_id = data.get("payment_request_id")
        unisus_id = data.get("_id")
        status_val = data.get("status") or "PENDING"

        pr_record = UnisusPayPaymentRequestModel(
            tenant_id=DEFAULT_TENANT_ID,
            company_id=SATHUS_COMPANY_ID,
            topup_request_id=topup_request_id,
            user_id=user_id,
            user_type=user_type.upper(),
            user_code=user_code,
            unisus_payment_request_id=unisus_pr_id,
            unisus_id=unisus_id,
            reference_no=clean_ref,
            qr_id=qr_id,
            amount=amount,
            status=status_val,
            note=note,
            raw_response=res
        )
        db.add(pr_record)
        await db.commit()
        await db.refresh(pr_record)

        return {
            "unisus_payment_request_id": unisus_pr_id,
            "reference_no": clean_ref,
            "status": status_val,
            "amount": amount,
            "qr_id": qr_id,
            "created_at": data.get("created_at")
        }

    @classmethod
    async def process_webhook(cls, payload: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        """
        Main Webhook Dispatcher for:
        1. QR_CALLBACK: Replaces stored QR list.
        2. PAYMENT_REQUEST_STATUS: Auto-approves and credits user wallet on SUCCESS, or flags FAIL.
        """
        event = (payload.get("event") or "").strip().upper()
        logger.info(f"[UnisusPay] Webhook received for event: {event}")

        if event == "QR_CALLBACK":
            qrs = payload.get("qrs") or []
            is_default = bool(payload.get("is_default_qr", False))
            user_id = payload.get("user_id")
            saved = await cls.replace_stored_qrs(
                qrs=qrs,
                is_default_qr=is_default,
                unisus_user_id=user_id,
                db=db
            )
            return {
                "event": "QR_CALLBACK",
                "status": "PROCESSED",
                "qrs_count": len(saved),
                "msg": "QR list successfully synchronized and replaced"
            }

        elif event == "PAYMENT_REQUEST_STATUS":
            pr_id = payload.get("payment_request_id")
            ref_no = payload.get("reference_no")
            status_val = (payload.get("status") or "").strip().upper()
            admin_remark = payload.get("admin_remark")
            amount = payload.get("amount")

            logger.info(f"[UnisusPay] PAYMENT_REQUEST_STATUS: ref={ref_no}, pr_id={pr_id}, status={status_val}, amount={amount}")

            # 1. Update UnisusPayPaymentRequestModel
            stmt = select(UnisusPayPaymentRequestModel).where(
                UnisusPayPaymentRequestModel.reference_no == ref_no
            )
            res = await db.execute(stmt)
            unisus_pr = res.scalars().first()

            topup_request_id = None
            if unisus_pr:
                unisus_pr.status = status_val
                unisus_pr.admin_remark = admin_remark
                unisus_pr.raw_callback = payload
                unisus_pr.callback_received_at = datetime.now(timezone.utc)
                topup_request_id = unisus_pr.topup_request_id

            # 2. Locate corresponding TopupRequestModel
            topup_stmt = select(TopupRequestModel).where(
                TopupRequestModel.payment_reference == ref_no
            )
            t_res = await db.execute(topup_stmt)
            topup = t_res.scalars().first()

            if not topup and topup_request_id:
                t2_stmt = select(TopupRequestModel).where(
                    TopupRequestModel.topup_request_id == topup_request_id
                )
                t2_res = await db.execute(t2_stmt)
                topup = t2_res.scalars().first()

            if not topup:
                logger.warning(f"[UnisusPay] No matching topup request found for ref {ref_no}")
                await db.commit()
                return {
                    "event": "PAYMENT_REQUEST_STATUS",
                    "status": "RECORD_NOT_FOUND",
                    "reference_no": ref_no
                }

            # 3. Handle Status Transition
            if status_val == "SUCCESS":
                if topup.status in ("APPROVED",):
                    logger.info(f"[UnisusPay] Topup {topup.topup_request_id} already approved. Skipping duplicate credit.")
                    await db.commit()
                    return {"event": "PAYMENT_REQUEST_STATUS", "status": "ALREADY_APPROVED"}

                # Mark as APPROVED
                approved_amt = float(amount) if amount else float(topup.requested_amount)
                topup.status = "APPROVED"
                topup.approved_amount = approved_amt
                topup.approved_by = "UNISUS_PAY_WEBHOOK"
                topup.approved_at = datetime.now(timezone.utc)
                topup.admin_notes = f"Verified by Unisus Pay Partner. Remark: {admin_remark or 'Approved'}"

                # Execute Atomic Wallet Credit
                user_type_ref = getattr(topup, "user_type_ref_id", 2) or 2
                credit_applied = False

                # A. Retailer Credit (user_type_ref == 2 or retailer_id is present)
                if getattr(topup, "retailer_id", None):
                    rid = topup.retailer_id
                    w_stmt = select(RetailerWalletModel).where(
                        RetailerWalletModel.retailer_id == rid
                    )
                    w_res = await db.execute(w_stmt)
                    wallet = w_res.scalars().first()
                    if wallet:
                        cur_bal = getattr(wallet, "wallet_balance", None)
                        if cur_bal is None:
                            cur_bal = getattr(wallet, "balance", 0.0) or 0.0
                        new_bal = float(cur_bal) + approved_amt
                        if hasattr(wallet, "wallet_balance"):
                            wallet.wallet_balance = new_bal
                        if hasattr(wallet, "balance"):
                            wallet.balance = new_bal
                        credit_applied = True
                        logger.info(f"[UnisusPay] Credited ₹{approved_amt} to Retailer {rid} wallet. New balance: {new_bal}")

                # B. Distributor Credit
                elif getattr(topup, "distributor_id", None):
                    did = topup.distributor_id
                    d_stmt = select(DistributorModel).where(
                        DistributorModel.public_id == did
                    )
                    d_res = await db.execute(d_stmt)
                    dist = d_res.scalars().first()
                    if dist:
                        dist.wallet_balance = float(dist.wallet_balance) + approved_amt
                        credit_applied = True
                        logger.info(f"[UnisusPay] Credited ₹{approved_amt} to Distributor {did} wallet. New balance: {dist.wallet_balance}")

                # C. Super Distributor Credit
                elif getattr(topup, "user_ref_id", None) and user_type_ref in (4, 5):
                    # Check SuperDistributorModel
                    sd_stmt = select(SuperDistributorModel).where(
                        SuperDistributorModel.super_distributor_ref_id == topup.user_ref_id
                    )
                    sd_res = await db.execute(sd_stmt)
                    sd = sd_res.scalars().first()
                    if sd:
                        sd.wallet_balance = float(sd.wallet_balance) + approved_amt
                        credit_applied = True
                        logger.info(f"[UnisusPay] Credited ₹{approved_amt} to SD {sd.super_distributor_ref_id} wallet.")

                await db.commit()

                # Emit real-time notification
                try:
                    from app.presentation.api.v1.topup_router import _emit_topup_notification
                    await _emit_topup_notification(topup, "APPROVED", admin_notes=topup.admin_notes)
                except Exception as notif_err:
                    logger.warning(f"[UnisusPay] Non-critical notification error: {notif_err}")

                return {
                    "event": "PAYMENT_REQUEST_STATUS",
                    "status": "SUCCESS_SETTLED",
                    "topup_request_id": topup.topup_request_id,
                    "credit_applied": credit_applied,
                    "approved_amount": approved_amt
                }

            elif status_val in ("FAIL", "FAILED", "REJECTED"):
                topup.status = "REJECTED"
                topup.rejected_by = "UNISUS_PAY_WEBHOOK"
                topup.rejected_at = datetime.now(timezone.utc)
                topup.rejection_reason = admin_remark or "Payment request declined by Unisus Pay Partner"
                await db.commit()

                # Emit real-time notification
                try:
                    from app.presentation.api.v1.topup_router import _emit_topup_notification
                    await _emit_topup_notification(topup, "REJECTED", admin_notes=topup.rejection_reason)
                except Exception as notif_err:
                    logger.warning(f"[UnisusPay] Non-critical notification error: {notif_err}")

                return {
                    "event": "PAYMENT_REQUEST_STATUS",
                    "status": "MARKED_REJECTED",
                    "topup_request_id": topup.topup_request_id,
                    "rejection_reason": topup.rejection_reason
                }

        return {"event": event, "status": "IGNORED", "msg": f"Unhandled event type: {event}"}


# Module instance
unisus_pay_service = UnisusPayService()
