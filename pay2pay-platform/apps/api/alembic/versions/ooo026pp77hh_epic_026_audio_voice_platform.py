"""EPIC-026 — Enterprise Audio Notification & Voice Feedback Platform Schema

Revision ID: ooo026pp77hh
Revises: nnn025oo66gg
Create Date: 2026-07-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'ooo026pp77hh'
down_revision = 'nnn025oo66gg'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. notification_sound_master
    op.create_table(
        'notification_sound_master',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('sound_code', sa.String(length=100), nullable=False),
        sa.Column('sound_name', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False, server_default='SUCCESS'),  # SUCCESS, WARNING, ERROR, CRITICAL, INFO, SECURITY, SETTLEMENT
        sa.Column('frequency_hz', sa.Integer(), nullable=False, server_default='880'),
        sa.Column('duration_ms', sa.Integer(), nullable=False, server_default='250'),
        sa.Column('file_url', sa.String(length=500), nullable=True),
        sa.Column('synth_pattern', sa.String(length=100), nullable=False, server_default='SINGLE_BEEP'),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'sound_code', name='uq_sound_master_tenant_code'),
    )

    # 2. notification_sound_theme
    op.create_table(
        'notification_sound_theme',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('theme_code', sa.String(length=50), nullable=False),
        sa.Column('theme_name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'theme_code', name='uq_sound_theme_tenant_code'),
    )

    # 3. notification_event
    op.create_table(
        'notification_event',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_code', sa.String(length=100), nullable=False),
        sa.Column('event_name', sa.String(length=200), nullable=False),
        sa.Column('module_name', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=30), nullable=False, server_default='INFO'),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'event_code', name='uq_notification_event_tenant_code'),
    )

    # 4. notification_event_mapping
    op.create_table(
        'notification_event_mapping',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sound_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('voice_message_code', sa.String(length=100), nullable=True),
        sa.Column('priority_level', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['notification_event.public_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sound_id'], ['notification_sound_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 5. notification_voice
    op.create_table(
        'notification_voice',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('voice_code', sa.String(length=50), nullable=False),
        sa.Column('voice_name', sa.String(length=100), nullable=False),
        sa.Column('gender', sa.String(length=20), nullable=False, server_default='FEMALE'),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'voice_code', name='uq_notification_voice_tenant_code'),
    )

    # 6. notification_voice_language
    op.create_table(
        'notification_voice_language',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('language_code', sa.String(length=10), nullable=False),  # en, ta, hi, te, kn, ml
        sa.Column('language_name', sa.String(length=100), nullable=False),
        sa.Column('native_name', sa.String(length=100), nullable=False),
        sa.Column('is_supported', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'language_code', name='uq_voice_lang_tenant_code'),
    )

    # 7. notification_voice_message
    op.create_table(
        'notification_voice_message',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('message_code', sa.String(length=100), nullable=False),
        sa.Column('language_code', sa.String(length=10), nullable=False),
        sa.Column('text_template', sa.Text(), nullable=False),
        sa.Column('audio_url', sa.String(length=500), nullable=True),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'message_code', 'language_code', name='uq_voice_msg_tenant_code_lang'),
    )

    # 8. notification_user_preference
    op.create_table(
        'notification_user_preference',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sound_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('voice_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('preferred_theme_code', sa.String(length=50), nullable=False, server_default='BANKING'),
        sa.Column('preferred_language_code', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('volume_level_pct', sa.Integer(), nullable=False, server_default='80'),
        sa.Column('mute_mode', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('night_mode', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'user_id', name='uq_user_audio_pref_tenant_user'),
    )

    # 9. notification_retailer_preference
    op.create_table(
        'notification_retailer_preference',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('retailer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sound_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('voice_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('preferred_language_code', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('pos_chime_volume_pct', sa.Integer(), nullable=False, server_default='90'),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'retailer_id', name='uq_retailer_audio_pref_tenant_retailer'),
    )

    # 10. notification_admin_configuration
    op.create_table(
        'notification_admin_configuration',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('global_sounds_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('global_voice_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('default_theme_code', sa.String(length=50), nullable=False, server_default='BANKING'),
        sa.Column('default_language_code', sa.String(length=10), nullable=False, server_default='en'),
        sa.Column('voice_speech_rate', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 11. notification_audio_log
    op.create_table(
        'notification_audio_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_code', sa.String(length=100), nullable=False),
        sa.Column('played_to_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('playback_type', sa.String(length=30), nullable=False, server_default='SOUND_AND_VOICE'),
        sa.Column('latency_ms', sa.Float(), nullable=False, server_default='45.0'),
        sa.Column('played_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 12. notification_audio_audit
    op.create_table(
        'notification_audio_audit',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('actor', sa.String(length=100), nullable=False),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version_no', sa.Integer(), server_default='1', nullable=False),
        sa.Column('record_status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )


def downgrade() -> None:
    op.drop_table('notification_audio_audit')
    op.drop_table('notification_audio_log')
    op.drop_table('notification_admin_configuration')
    op.drop_table('notification_retailer_preference')
    op.drop_table('notification_user_preference')
    op.drop_table('notification_voice_message')
    op.drop_table('notification_voice_language')
    op.drop_table('notification_voice')
    op.drop_table('notification_event_mapping')
    op.drop_table('notification_event')
    op.drop_table('notification_sound_theme')
    op.drop_table('notification_sound_master')
