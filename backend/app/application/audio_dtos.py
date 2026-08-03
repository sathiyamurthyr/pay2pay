"""EPIC-026 — Enterprise Audio Notification & Voice Feedback Platform — DTOs"""
import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Event Playback Payload Request/Response ──────────────────────────────────

class AudioPlaybackPayloadResponse(BaseModel):
    event_code: str
    event_name: str
    category: str
    severity: str
    sound_code: str
    frequency_hz: int
    duration_ms: int
    synth_pattern: str  # SINGLE_BEEP, DOUBLE_CHIME, SUCCESS_FANFARE, ERROR_ALERT, CRITICAL_ALARM
    voice_enabled: bool
    voice_language_code: str
    voice_text_template: str
    voice_speech_rate: float
    volume_level_pct: int


# ── Theme DTOs ────────────────────────────────────────────────────────────────

class AudioThemeCreateRequest(BaseModel):
    theme_code: str = Field(..., min_length=2, max_length=50)
    theme_name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_default: bool = False


class AudioThemeResponse(BaseModel):
    public_id: uuid.UUID
    theme_code: str
    theme_name: str
    description: Optional[str]
    is_default: bool


# ── Language DTOs ─────────────────────────────────────────────────────────────

class AudioLanguageResponse(BaseModel):
    public_id: uuid.UUID
    language_code: str
    language_name: str
    native_name: str
    is_supported: bool


# ── User & Retailer Preference DTOs ───────────────────────────────────────────

class UserAudioPreferenceRequest(BaseModel):
    user_id: uuid.UUID
    sound_enabled: bool = True
    voice_enabled: bool = True
    preferred_theme_code: str = "BANKING"
    preferred_language_code: str = "en"
    volume_level_pct: int = Field(default=80, ge=0, le=100)
    mute_mode: bool = False
    night_mode: bool = False


class UserAudioPreferenceResponse(BaseModel):
    user_id: uuid.UUID
    sound_enabled: bool
    voice_enabled: bool
    preferred_theme_code: str
    preferred_language_code: str
    volume_level_pct: int
    mute_mode: bool
    night_mode: bool


# ── Dashboard & Analytics DTOs ────────────────────────────────────────────────

class AudioDashboardMetricsResponse(BaseModel):
    total_audio_events_fired: int
    avg_playback_latency_ms: float
    active_themes_count: int
    supported_languages_count: int
    muted_users_count: int
    category_breakdown: Dict[str, int]
    language_breakdown: Dict[str, int]
