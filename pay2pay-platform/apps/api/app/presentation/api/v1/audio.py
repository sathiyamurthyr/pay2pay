"""EPIC-026 — Enterprise Audio Notification & Voice Feedback Platform — API Router"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dependencies import get_db, get_current_user
from app.infrastructure.db.models import AdminUserModel
from app.application.dtos import APIResponse
from app.application.audio_service import AudioService
from app.application.audio_dtos import (
    AudioThemeCreateRequest, UserAudioPreferenceRequest
)

router = APIRouter(prefix="/audio", tags=["Audio Notification & Voice Feedback Platform"])


# ── Telemetry & Dashboard ─────────────────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def get_audio_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Get audio platform telemetry metrics (latency SLA <100ms, event counts, language breakdown)."""
    metrics = await AudioService.get_dashboard_metrics(db)
    return APIResponse(data=metrics.model_dump())


# ── Playback Payload Engine (<100ms SLA) ──────────────────────────────────────

@router.get("/events/{event_code}/play-payload", response_model=APIResponse)
async def get_event_playback_payload(
    event_code: str,
    user_id: Optional[uuid.UUID] = Query(default=None),
    amount: float = Query(default=0.0),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Returns Web Audio API & SpeechSynthesis payload specs for client-side playback."""
    payload = await AudioService.get_playback_payload(db, event_code, user_id, amount)
    return APIResponse(data=payload.model_dump())


# ── Themes & Languages ────────────────────────────────────────────────────────

@router.get("/themes", response_model=APIResponse)
async def list_themes(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List supported audio sound themes (Enterprise Banking, POS, Minimal, Accessibility)."""
    themes = await AudioService.list_themes(db)
    return APIResponse(data=[t.model_dump(mode="json") for t in themes])


@router.get("/languages", response_model=APIResponse)
async def list_languages(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """List supported multi-lingual voice packs (English, Tamil, Hindi, Telugu, Kannada, Malayalam)."""
    langs = await AudioService.list_languages(db)
    return APIResponse(data=[l.model_dump(mode="json") for l in langs])


# ── User Audio Preferences ───────────────────────────────────────────────────

@router.post("/preferences", response_model=APIResponse)
async def save_user_preference(
    req: UserAudioPreferenceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUserModel = Depends(get_current_user)
):
    """Save user/retailer audio & voice feedback preferences."""
    pref = await AudioService.save_user_preference(db, req)
    return APIResponse(message="Audio preferences updated", data=pref.model_dump(mode="json"))
