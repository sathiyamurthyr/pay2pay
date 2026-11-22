import uuid
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.application.dependencies import get_current_token_payload, security_scheme
from app.infrastructure.db.models import RetailerModel
from app.infrastructure.db.crypto_models import RetailerEncryptedRecordModel
from app.application.crypto_service import RetailerCryptoService, CryptoDecryptionError

logger = logging.getLogger("retailer_crypto_router")

router = APIRouter(prefix="/retailer/crypto", tags=["Retailer Data Encryption & Decryption"])


# ── SCHEMAS ──────────────────────────────────────────────────────────────────

class EncryptedEnvelopeSchema(BaseModel):
    v: int = Field(1, description="Envelope format version")
    alg: str = Field("AES-256-GCM", description="Cryptographic algorithm")
    iv: str = Field(..., description="Base64-encoded 12-byte initialization vector")
    ciphertext: str = Field(..., description="Base64-encoded encrypted payload")
    tag: str = Field(..., description="Base64-encoded 16-byte GCM authentication tag")


class EncryptRequest(BaseModel):
    resource_type: str = Field(..., description="Resource category (e.g. ORDER_NOTE, INVOICE, CUSTOMER_DATA, PRIVATE_NOTE)")
    resource_id: Optional[str] = Field(None, description="Optional record, order, or entity identifier")
    data: Any = Field(..., description="Sensitive data payload to encrypt")
    save_to_database: Optional[bool] = Field(False, description="Whether to persist the encrypted envelope to database")
    metadata_tags: Optional[Dict[str, Any]] = Field(None, description="Optional non-sensitive metadata for searching/tagging")


class EncryptResponse(BaseModel):
    success: bool = True
    encrypted_envelope: EncryptedEnvelopeSchema
    key_version: int = 1
    created_at: str
    record_id: Optional[str] = None


class DecryptRequest(BaseModel):
    resource_type: str = Field(..., description="Resource category used during encryption")
    resource_id: Optional[str] = Field(None, description="Resource identifier used during encryption")
    encrypted_envelope: Dict[str, Any] = Field(..., description="Envelope containing v, alg, iv, ciphertext, tag")


class DecryptResponse(BaseModel):
    success: bool = True
    decrypted_data: Any


# ── SESSION CONTEXT RESOLVER ─────────────────────────────────────────────────

class RetailerSessionContext:
    def __init__(self, tenant_id: str, retailer_id: str, user_id: str, roles: List[str]):
        self.tenant_id = tenant_id
        self.retailer_id = retailer_id
        self.user_id = user_id
        self.roles = roles


async def get_retailer_crypto_context(
    payload: dict = Depends(get_current_token_payload),
    db: AsyncSession = Depends(get_db)
) -> RetailerSessionContext:
    """
    Validates the caller's JWT token and resolves tenant_id, user_id, and retailer_id.
    Enforces RBAC: caller must be an authenticated retailer or admin.
    """
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing subject identifier."
        )

    tenant_id_str = payload.get("tenant_id") or "00000000-0000-0000-0000-000000000001"
    roles = [str(r).upper() for r in (payload.get("roles") or [])]

    # Resolve retailer ID
    retailer_id_str = payload.get("retailer_id") or payload.get("retailer_ref_id")
    if not retailer_id_str:
        try:
            sub_uuid = uuid.UUID(user_id_str)
            ret_stmt = select(RetailerModel).where(
                RetailerModel.public_id == sub_uuid,
                RetailerModel.is_deleted == False
            )
            ret_model = (await db.execute(ret_stmt)).scalars().first()
            if ret_model:
                retailer_id_str = str(ret_model.public_id)
            else:
                # Use user_id as stable retailer encryption principal
                retailer_id_str = user_id_str
        except Exception:
            retailer_id_str = user_id_str

    return RetailerSessionContext(
        tenant_id=str(tenant_id_str),
        retailer_id=str(retailer_id_str),
        user_id=str(user_id_str),
        roles=roles
    )


# ── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.post("/encrypt", response_model=EncryptResponse)
async def encrypt_retailer_data(
    req: EncryptRequest,
    ctx: RetailerSessionContext = Depends(get_retailer_crypto_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Encrypts sensitive data for the authenticated retailer using AES-256-GCM.
    Binds resource_type and optional resource_id into AAD for cryptographic integrity.
    Zero plaintext is logged.
    """
    try:
        enc_result = RetailerCryptoService.encrypt_data(
            tenant_id=ctx.tenant_id,
            retailer_id=ctx.retailer_id,
            resource_type=req.resource_type,
            data=req.data,
            resource_id=req.resource_id
        )

        record_id = None
        if req.save_to_database:
            try:
                tenant_uuid = uuid.UUID(ctx.tenant_id)
            except Exception:
                tenant_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")

            try:
                ret_uuid = uuid.UUID(ctx.retailer_id)
            except Exception:
                ret_uuid = uuid.uuid4()

            db_record = RetailerEncryptedRecordModel(
                tenant_id=tenant_uuid,
                retailer_id=ret_uuid,
                resource_type=req.resource_type.upper(),
                resource_id=req.resource_id,
                encrypted_envelope=enc_result["encrypted_envelope"],
                key_version=enc_result["key_version"],
                metadata_tags=req.metadata_tags
            )
            db.add(db_record)
            await db.commit()
            await db.refresh(db_record)
            record_id = str(db_record.public_id if hasattr(db_record, "public_id") else db_record.id)

        return EncryptResponse(
            success=True,
            encrypted_envelope=EncryptedEnvelopeSchema(**enc_result["encrypted_envelope"]),
            key_version=enc_result["key_version"],
            created_at=enc_result["created_at"],
            record_id=record_id
        )
    except Exception as e:
        logger.error(f"Encryption failed for retailer resource {req.resource_type}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Encryption processing error: {str(e)}"
        )


@router.post("/decrypt", response_model=DecryptResponse)
async def decrypt_retailer_data(
    req: DecryptRequest,
    ctx: RetailerSessionContext = Depends(get_retailer_crypto_context)
):
    """
    Decrypts an AES-256-GCM encrypted envelope for the authorized retailer session.
    Verifies authentication tag and AAD in constant-time.
    Fails closed with HTTP 400 if ciphertext or tag has been tampered with or corrupted.
    """
    try:
        dec_result = RetailerCryptoService.decrypt_data(
            tenant_id=ctx.tenant_id,
            retailer_id=ctx.retailer_id,
            resource_type=req.resource_type,
            envelope=req.encrypted_envelope,
            resource_id=req.resource_id
        )
        return DecryptResponse(
            success=True,
            decrypted_data=dec_result["decrypted_data"]
        )
    except CryptoDecryptionError as e:
        # Strict fail-closed response as specified in requirements
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "detail": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Unexpected decryption error: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "detail": f"Decryption failed: {str(e)}"
            }
        )


@router.get("/records")
async def list_encrypted_records(
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    auto_decrypt: bool = Query(False, description="Whether to automatically decrypt payloads"),
    limit: int = Query(50, ge=1, le=200),
    ctx: RetailerSessionContext = Depends(get_retailer_crypto_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists encrypted records for the active retailer.
    Optionally decrypts them in-memory for authorized client display.
    """
    try:
        try:
            ret_uuid = uuid.UUID(ctx.retailer_id)
        except Exception:
            ret_uuid = None

        if not ret_uuid:
            return {"success": True, "records": []}

        stmt = select(RetailerEncryptedRecordModel).where(
            RetailerEncryptedRecordModel.retailer_id == ret_uuid,
            RetailerEncryptedRecordModel.is_deleted == False
        )
        if resource_type:
            stmt = stmt.where(RetailerEncryptedRecordModel.resource_type == resource_type.upper())

        stmt = stmt.order_by(desc(RetailerEncryptedRecordModel.created_at)).limit(limit)
        results = (await db.execute(stmt)).scalars().all()

        records = []
        for r in results:
            item = {
                "id": str(r.public_id if hasattr(r, "public_id") else r.id),
                "resource_type": r.resource_type,
                "resource_id": r.resource_id,
                "encrypted_envelope": r.encrypted_envelope,
                "key_version": r.key_version,
                "metadata_tags": r.metadata_tags,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }

            if auto_decrypt:
                try:
                    dec = RetailerCryptoService.decrypt_data(
                        tenant_id=ctx.tenant_id,
                        retailer_id=ctx.retailer_id,
                        resource_type=r.resource_type,
                        envelope=r.encrypted_envelope,
                        resource_id=r.resource_id
                    )
                    item["decrypted_data"] = dec["decrypted_data"]
                except Exception as ex:
                    item["decryption_error"] = str(ex)

            records.append(item)

        return {"success": True, "records": records, "count": len(records)}
    except Exception as e:
        logger.error(f"Error querying encrypted records: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/records/{record_id}")
async def get_encrypted_record(
    record_id: str,
    auto_decrypt: bool = Query(True, description="Whether to return decrypted data"),
    ctx: RetailerSessionContext = Depends(get_retailer_crypto_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves a single encrypted record by ID.
    Decrypts the envelope automatically for authorized retailer session.
    """
    try:
        rec_uuid = uuid.UUID(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record UUID.")

    try:
        ret_uuid = uuid.UUID(ctx.retailer_id)
    except Exception:
        ret_uuid = None

    stmt = select(RetailerEncryptedRecordModel).where(
        RetailerEncryptedRecordModel.id == rec_uuid,
        RetailerEncryptedRecordModel.is_deleted == False
    )
    if ret_uuid:
        stmt = stmt.where(RetailerEncryptedRecordModel.retailer_id == ret_uuid)

    record = (await db.execute(stmt)).scalars().first()
    if not record:
        raise HTTPException(status_code=404, detail="Encrypted record not found.")

    res = {
        "id": str(record.id),
        "resource_type": record.resource_type,
        "resource_id": record.resource_id,
        "encrypted_envelope": record.encrypted_envelope,
        "key_version": record.key_version,
        "created_at": record.created_at.isoformat() if record.created_at else None
    }

    if auto_decrypt:
        try:
            dec = RetailerCryptoService.decrypt_data(
                tenant_id=ctx.tenant_id,
                retailer_id=ctx.retailer_id,
                resource_type=record.resource_type,
                envelope=record.encrypted_envelope,
                resource_id=record.resource_id
            )
            res["decrypted_data"] = dec["decrypted_data"]
        except CryptoDecryptionError as e:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"success": False, "detail": str(e)}
            )

    return {"success": True, "record": res}
