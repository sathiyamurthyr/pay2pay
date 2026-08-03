import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.application.audio_dtos import (
    UserAudioPreferenceRequest
)
from app.application.audio_service import AudioService, VOICE_TEMPLATES


def test_voice_templates_exist():
    assert "TRANSACTION_SUCCESS" in VOICE_TEMPLATES
    assert "en" in VOICE_TEMPLATES["TRANSACTION_SUCCESS"]
    assert "ta" in VOICE_TEMPLATES["TRANSACTION_SUCCESS"]
    assert "hi" in VOICE_TEMPLATES["TRANSACTION_SUCCESS"]


@pytest.mark.asyncio
async def test_get_playback_payload_success():
    db = AsyncMock()
    user_id = uuid.uuid4()

    res = await AudioService.get_playback_payload(db, "TRANSACTION_SUCCESS", user_id=user_id, amount=2500.0)

    assert res.event_code == "TRANSACTION_SUCCESS"
    assert res.synth_pattern == "SUCCESS_FANFARE"
    assert res.frequency_hz == 1046
    assert res.voice_enabled is True
    assert "2500.0" in res.voice_text_template or "1,000" in res.voice_text_template


@pytest.mark.asyncio
async def test_get_playback_payload_error():
    db = AsyncMock()

    res = await AudioService.get_playback_payload(db, "TRANSACTION_FAILED", amount=0.0)

    assert res.event_code == "TRANSACTION_FAILED"
    assert res.synth_pattern == "ERROR_ALERT"
    assert res.frequency_hz == 300


@pytest.mark.asyncio
async def test_save_user_preference():
    db = AsyncMock()
    user_id = uuid.uuid4()

    db.execute.return_value.scalar_one_or_none.return_value = None

    req = UserAudioPreferenceRequest(
        user_id=user_id,
        sound_enabled=True,
        voice_enabled=True,
        preferred_theme_code="POS_SOUNDBOX",
        preferred_language_code="ta",
        volume_level_pct=95,
        mute_mode=False,
        night_mode=False
    )

    res = await AudioService.save_user_preference(db, req)

    assert res.user_id == user_id
    assert res.preferred_theme_code == "POS_SOUNDBOX"
    assert res.preferred_language_code == "ta"
    assert res.volume_level_pct == 95
    db.add.assert_called()
    db.commit.assert_called_once()
