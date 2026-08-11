"""Enterprise Bitwarden Secrets Management Platform — API Router"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.application.dependencies import get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.core.secrets.health import SecretHealthCheck
from app.core.secrets.rotation import SecretRotator
from app.core.secrets.audit import SecretAuditor

router = APIRouter(prefix="/secrets", tags=["Bitwarden Secrets Management Platform"])
rotator = SecretRotator()
auditor = SecretAuditor()


class RotateSecretRequest(BaseModel):
    key: str = Field(..., min_length=2)
    new_value: str = Field(..., min_length=8)


# ── Health Check ─────────────────────────────────────────────────────────────

@router.get("/health", response_model=APIResponse)
async def get_secrets_health(
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get real-time health status of Bitwarden vault, CLI connection, and memory cache."""
    health = SecretHealthCheck.check_health()
    return APIResponse(data=health.model_dump())


# ── Zero-Downtime Secret Rotation ─────────────────────────────────────────────

@router.post("/rotate", response_model=APIResponse)
async def rotate_secret(
    req: RotateSecretRequest,
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Perform zero-downtime secret rotation in Bitwarden vault and memory cache."""
    try:
        event = rotator.rotate_secret(req.key, req.new_value, rotated_by=current_user.email)
        auditor.log_access("ROTATED", req.key, actor=current_user.email, success=True)
        return APIResponse(
            message=f"Secret '{req.key}' rotated successfully to version {event.new_version}",
            data={
                "rotation_id": event.rotation_id,
                "key": event.key,
                "old_version": event.old_version,
                "new_version": event.new_version,
                "status": event.status,
            }
        )
    except Exception as e:
        auditor.log_access("ROTATION_FAILED", req.key, actor=current_user.email, success=False, details=str(e))
        raise HTTPException(status_code=400, detail=str(e))


# ── Masked Audit Trail ────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=APIResponse)
async def get_secrets_audit_logs(
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get audit trail of all secret access, rotation, and validation events (masked)."""
    logs = auditor.get_audit_trail()
    return APIResponse(data=[
        {
            "audit_id": l.audit_id,
            "action": l.action,
            "key": l.key,
            "masked_value": l.masked_value,
            "actor": l.actor,
            "timestamp": l.timestamp.isoformat(),
            "success": l.success,
        }
        for l in logs
    ])
