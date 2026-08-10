"""EPIC-026 — Enterprise Audio Notification & Voice Feedback Platform — ORM Models"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Date, Float, JSON
)
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB, UUID
JSONB = JSON().with_variant(PG_JSONB(), 'postgresql')
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.entities.base import BaseEntity, EnterpriseBaseMixin


class NotificationSoundMasterModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_sound_master"

    sound_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sound_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="SUCCESS")
    frequency_hz: Mapped[int] = mapped_column(Integer, nullable=False, default=880)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=250)
    file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    synth_pattern: Mapped[str] = mapped_column(String(100), nullable=False, default="SINGLE_BEEP")

    mappings: Mapped[List["NotificationEventMappingModel"]] = relationship("NotificationEventMappingModel", back_populates="sound", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "sound_code", name="uq_sound_master_tenant_code"),
    )


class NotificationSoundThemeModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_sound_theme"

    theme_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    theme_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "theme_code", name="uq_sound_theme_tenant_code"),
    )


class NotificationEventModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_event"

    event_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_name: Mapped[str] = mapped_column(String(200), nullable=False)
    module_name: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(30), nullable=False, default="INFO")

    mappings: Mapped[List["NotificationEventMappingModel"]] = relationship("NotificationEventMappingModel", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("tenant_id", "event_code", name="uq_notification_event_tenant_code"),
    )


class NotificationEventMappingModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_event_mapping"

    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification_event.public_id", ondelete="CASCADE"), nullable=False, index=True)
    sound_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notification_sound_master.public_id", ondelete="CASCADE"), nullable=False, index=True)
    voice_message_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    priority_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    event: Mapped["NotificationEventModel"] = relationship("NotificationEventModel", back_populates="mappings")
    sound: Mapped["NotificationSoundMasterModel"] = relationship("NotificationSoundMasterModel", back_populates="mappings")


class NotificationVoiceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_voice"

    voice_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    voice_name: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False, default="FEMALE")

    __table_args__ = (
        UniqueConstraint("tenant_id", "voice_code", name="uq_notification_voice_tenant_code"),
    )


class NotificationVoiceLanguageModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_voice_language"

    language_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    language_name: Mapped[str] = mapped_column(String(100), nullable=False)
    native_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_supported: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "language_code", name="uq_voice_lang_tenant_code"),
    )


class NotificationVoiceMessageModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_voice_message"

    message_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    language_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    text_template: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "message_code", "language_code", name="uq_voice_msg_tenant_code_lang"),
    )


class NotificationUserPreferenceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_user_preference"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    voice_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    preferred_theme_code: Mapped[str] = mapped_column(String(50), nullable=False, default="BANKING")
    preferred_language_code: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    volume_level_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    mute_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    night_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_user_audio_pref_tenant_user"),
    )


class NotificationRetailerPreferenceModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_retailer_preference"

    retailer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    voice_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    preferred_language_code: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    pos_chime_volume_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=90)

    __table_args__ = (
        UniqueConstraint("tenant_id", "retailer_id", name="uq_retailer_audio_pref_tenant_retailer"),
    )


class NotificationAdminConfigurationModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_admin_configuration"

    global_sounds_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    global_voice_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    default_theme_code: Mapped[str] = mapped_column(String(50), nullable=False, default="BANKING")
    default_language_code: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    voice_speech_rate: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)


class NotificationAudioLogModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_audio_log"

    event_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    played_to_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    playback_type: Mapped[str] = mapped_column(String(30), nullable=False, default="SOUND_AND_VOICE")
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=45.0)
    played_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class NotificationAudioAuditModel(BaseEntity, EnterpriseBaseMixin):
    __tablename__ = "notification_audio_audit"

    action: Mapped[str] = mapped_column(String(100), nullable=False)
    actor: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
