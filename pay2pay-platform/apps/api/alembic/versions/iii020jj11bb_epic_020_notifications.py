"""epic_020_notifications

Revision ID: iii020jj11bb
Revises: hhh019ii00aa
Create Date: 2026-07-30 09:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'iii020jj11bb'
down_revision: Union[str, None] = 'hhh019ii00aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BASE_COLS = [
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
    sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('day_key', sa.Integer(), nullable=True),
    sa.Column('week_key', sa.Integer(), nullable=True),
    sa.Column('month_key', sa.Integer(), nullable=True),
    sa.Column('quarter_key', sa.Integer(), nullable=True),
    sa.Column('year_key', sa.Integer(), nullable=True),
    sa.Column('financial_year_key', sa.Integer(), nullable=True),
    sa.Column('financial_quarter_key', sa.Integer(), nullable=True),
    sa.Column('financial_month_key', sa.Integer(), nullable=True),
    sa.Column('date_key', sa.Integer(), nullable=True),
    sa.Column('time_key', sa.Integer(), nullable=True),
    sa.Column('partition_year', sa.Integer(), nullable=True),
    sa.Column('partition_month', sa.Integer(), nullable=True),
    sa.Column('partition_day', sa.Integer(), nullable=True),
    sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('version_no', sa.Integer(), default=1, nullable=True),
    sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
    sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
]


def upgrade() -> None:
    # notification_provider table
    op.create_table(
        'notification_provider',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('version_no', sa.Integer(), default=1, nullable=True),
        sa.Column('provider_code', sa.String(50), nullable=False, index=True),
        sa.Column('provider_name', sa.String(255), nullable=False),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('provider_type', sa.String(50), nullable=False, default='SMTP'),
        sa.Column('priority', sa.Integer(), nullable=False, default=1),
        sa.Column('is_default', sa.Boolean(), default=False, nullable=False),
        sa.Column('daily_limit', sa.Integer(), nullable=True),
        sa.Column('rate_limit_per_min', sa.Integer(), nullable=True),
        sa.Column('health_status', sa.String(30), nullable=False, default='HEALTHY'),
        sa.Column('last_health_check', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_sent', sa.BigInteger(), default=0, nullable=False),
        sa.Column('total_failed', sa.BigInteger(), default=0, nullable=False),
        sa.Column('status', sa.String(30), default='ACTIVE', nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_provider_channel', 'notification_provider', ['channel'])

    # provider_configuration table
    op.create_table(
        'provider_configuration',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('version_no', sa.Integer(), default=1, nullable=True),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification_provider.public_id', ondelete='CASCADE'), nullable=False),
        sa.Column('config_key', sa.String(100), nullable=False),
        sa.Column('config_value', sa.Text(), nullable=True),
        sa.Column('is_secret', sa.Boolean(), default=False, nullable=False),
        sa.Column('config_group', sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_provider_configuration_provider_id', 'provider_configuration', ['provider_id'])

    # notification_template table
    op.create_table(
        'notification_template',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('version_no', sa.Integer(), default=1, nullable=True),
        sa.Column('template_code', sa.String(100), nullable=False, index=True),
        sa.Column('template_name', sa.String(255), nullable=False),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False, default='TRANSACTIONAL'),
        sa.Column('language', sa.String(10), nullable=False, default='en'),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('is_rich_html', sa.Boolean(), default=False, nullable=False),
        sa.Column('has_conditional_sections', sa.Boolean(), default=False, nullable=False),
        sa.Column('approval_status', sa.String(30), nullable=False, default='APPROVED'),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(30), default='ACTIVE', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'template_code', 'channel', 'language', name='uq_template_tenant_code_channel_lang'),
    )
    op.create_index('ix_notification_template_channel', 'notification_template', ['channel'])
    op.create_index('ix_notification_template_type', 'notification_template', ['notification_type'])

    # template_version table
    op.create_table(
        'template_version',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('version_no', sa.Integer(), default=1, nullable=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification_template.public_id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False, default=1),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('change_notes', sa.Text(), nullable=True),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_template_version_template_id', 'template_version', ['template_id'])

    # template_variable table
    op.create_table(
        'template_variable',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification_template.public_id', ondelete='CASCADE'), nullable=False),
        sa.Column('variable_name', sa.String(100), nullable=False),
        sa.Column('variable_type', sa.String(30), nullable=False, default='STRING'),
        sa.Column('default_value', sa.String(500), nullable=True),
        sa.Column('is_required', sa.Boolean(), default=True, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_template_variable_template_id', 'template_variable', ['template_id'])

    # notification table
    op.create_table(
        'notification',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('week_key', sa.Integer(), nullable=True),
        sa.Column('month_key', sa.Integer(), nullable=True),
        sa.Column('quarter_key', sa.Integer(), nullable=True),
        sa.Column('year_key', sa.Integer(), nullable=True),
        sa.Column('partition_year', sa.Integer(), nullable=True),
        sa.Column('partition_month', sa.Integer(), nullable=True),
        sa.Column('partition_day', sa.Integer(), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('version_no', sa.Integer(), default=1, nullable=True),
        sa.Column('idempotency_key', sa.String(255), nullable=True, index=True),
        sa.Column('notification_type', sa.String(50), nullable=False, default='TRANSACTIONAL'),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('recipient_type', sa.String(50), nullable=True),
        sa.Column('recipient_address', sa.String(500), nullable=False),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification_template.public_id', ondelete='SET NULL'), nullable=True),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('variables', postgresql.JSONB, nullable=True),
        sa.Column('business_event', sa.String(100), nullable=True, index=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('priority', sa.String(20), nullable=False, default='NORMAL'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='QUEUED', index=True),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('retry_count', sa.Integer(), default=0, nullable=False),
        sa.Column('max_retries', sa.Integer(), default=3, nullable=False),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key', name='uq_notification_idempotency_key'),
    )
    op.create_index('ix_notification_status_channel', 'notification', ['status', 'channel'])

    # notification_batch table
    op.create_table(
        'notification_batch',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('version_no', sa.Integer(), default=1, nullable=True),
        sa.Column('batch_code', sa.String(100), nullable=False, index=True),
        sa.Column('batch_name', sa.String(255), nullable=False),
        sa.Column('batch_type', sa.String(50), nullable=False, default='BULK'),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('total_count', sa.Integer(), default=0, nullable=False),
        sa.Column('sent_count', sa.Integer(), default=0, nullable=False),
        sa.Column('delivered_count', sa.Integer(), default=0, nullable=False),
        sa.Column('failed_count', sa.Integer(), default=0, nullable=False),
        sa.Column('status', sa.String(30), nullable=False, default='PENDING'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # notification_event table
    op.create_table(
        'notification_event',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('event_code', sa.String(100), nullable=False, index=True),
        sa.Column('event_name', sa.String(255), nullable=False),
        sa.Column('event_category', sa.String(50), nullable=False, default='BUSINESS'),
        sa.Column('notification_type', sa.String(50), nullable=False, default='TRANSACTIONAL'),
        sa.Column('default_channels', postgresql.JSONB, nullable=True),
        sa.Column('default_template_code', sa.String(100), nullable=True),
        sa.Column('is_mandatory', sa.Boolean(), default=False, nullable=False),
        sa.Column('status', sa.String(30), nullable=False, default='ACTIVE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # notification_queue table
    op.create_table(
        'notification_queue',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification.public_id', ondelete='CASCADE'), nullable=False),
        sa.Column('channel', sa.String(50), nullable=False, index=True),
        sa.Column('priority', sa.Integer(), default=5, nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('worker_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='PENDING', index=True),
        sa.Column('attempts', sa.Integer(), default=0, nullable=False),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_queue_status_priority', 'notification_queue', ['status', 'priority'])

    # notification_delivery table
    op.create_table(
        'notification_delivery',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification.public_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('external_message_id', sa.String(500), nullable=True),
        sa.Column('delivery_status', sa.String(30), nullable=False, default='QUEUED', index=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('bounced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('provider_response', postgresql.JSONB, nullable=True),
        sa.Column('attempt_number', sa.Integer(), default=1, nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # notification_retry table
    op.create_table(
        'notification_retry',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification.public_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('attempt_number', sa.Integer(), nullable=False),
        sa.Column('retry_reason', sa.String(500), nullable=True),
        sa.Column('retry_type', sa.String(30), nullable=False, default='AUTO'),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('provider_switched', sa.Boolean(), default=False, nullable=False),
        sa.Column('result_status', sa.String(30), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('retried_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # communication_timeline table
    op.create_table(
        'communication_timeline',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('partition_year', sa.Integer(), nullable=True),
        sa.Column('partition_month', sa.Integer(), nullable=True),
        sa.Column('partition_day', sa.Integer(), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('entity_type', sa.String(50), nullable=False, index=True),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification.public_id', ondelete='SET NULL'), nullable=True),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body_preview', sa.String(500), nullable=True),
        sa.Column('business_event', sa.String(100), nullable=True),
        sa.Column('delivery_status', sa.String(30), nullable=False, default='QUEUED'),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_comm_timeline_entity_type', 'communication_timeline', ['entity_id', 'entity_type'])

    # campaign table
    op.create_table(
        'campaign',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('version_no', sa.Integer(), default=1, nullable=True),
        sa.Column('campaign_code', sa.String(100), nullable=False, index=True),
        sa.Column('campaign_name', sa.String(255), nullable=False),
        sa.Column('campaign_type', sa.String(50), nullable=False, default='BROADCAST'),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False, default='MARKETING'),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification_template.public_id', ondelete='SET NULL'), nullable=True),
        sa.Column('audience_definition', postgresql.JSONB, nullable=True),
        sa.Column('audience_count', sa.Integer(), default=0, nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('has_ab_test', sa.Boolean(), default=False, nullable=False),
        sa.Column('ab_test_config', postgresql.JSONB, nullable=True),
        sa.Column('open_tracking', sa.Boolean(), default=True, nullable=False),
        sa.Column('click_tracking', sa.Boolean(), default=True, nullable=False),
        sa.Column('approval_status', sa.String(30), nullable=False, default='PENDING'),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='DRAFT', index=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # campaign_audience table
    op.create_table(
        'campaign_audience',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaign.public_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_type', sa.String(50), nullable=False),
        sa.Column('recipient_address', sa.String(500), nullable=False),
        sa.Column('segment_group', sa.String(100), nullable=True),
        sa.Column('ab_variant', sa.String(10), nullable=True),
        sa.Column('inclusion_reason', sa.String(500), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # campaign_execution table
    op.create_table(
        'campaign_execution',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaign.public_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('execution_number', sa.Integer(), nullable=False, default=1),
        sa.Column('total_sent', sa.Integer(), default=0, nullable=False),
        sa.Column('total_delivered', sa.Integer(), default=0, nullable=False),
        sa.Column('total_failed', sa.Integer(), default=0, nullable=False),
        sa.Column('total_opened', sa.Integer(), default=0, nullable=False),
        sa.Column('total_clicked', sa.Integer(), default=0, nullable=False),
        sa.Column('total_bounced', sa.Integer(), default=0, nullable=False),
        sa.Column('delivery_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('open_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('click_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='RUNNING'),
        sa.PrimaryKeyConstraint('id'),
    )

    # campaign_result table
    op.create_table(
        'campaign_result',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaign.public_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('delivery_status', sa.String(30), nullable=False, default='QUEUED'),
        sa.Column('opened', sa.Boolean(), default=False, nullable=False),
        sa.Column('clicked', sa.Boolean(), default=False, nullable=False),
        sa.Column('converted', sa.Boolean(), default=False, nullable=False),
        sa.Column('bounced', sa.Boolean(), default=False, nullable=False),
        sa.Column('unsubscribed', sa.Boolean(), default=False, nullable=False),
        sa.Column('ab_variant', sa.String(10), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # otp_request table
    op.create_table(
        'otp_request',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('channel', sa.String(30), nullable=False),
        sa.Column('recipient_address', sa.String(500), nullable=False),
        sa.Column('otp_purpose', sa.String(100), nullable=False),
        sa.Column('otp_hash', sa.String(500), nullable=False),
        sa.Column('otp_length', sa.Integer(), default=6, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('max_attempts', sa.Integer(), default=3, nullable=False),
        sa.Column('attempt_count', sa.Integer(), default=0, nullable=False),
        sa.Column('is_verified', sa.Boolean(), default=False, nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='PENDING', index=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # otp_validation table
    op.create_table(
        'otp_validation',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('otp_request_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('otp_request.public_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('attempt_number', sa.Integer(), nullable=False),
        sa.Column('result', sa.String(20), nullable=False),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # user_notification_preference table
    op.create_table(
        'user_notification_preference',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_type', sa.String(50), nullable=False, default='USER'),
        sa.Column('email_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('sms_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('whatsapp_enabled', sa.Boolean(), default=False, nullable=False),
        sa.Column('push_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('in_app_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('marketing_consent', sa.Boolean(), default=False, nullable=False),
        sa.Column('do_not_disturb', sa.Boolean(), default=False, nullable=False),
        sa.Column('dnd_start_time', sa.String(10), nullable=True),
        sa.Column('dnd_end_time', sa.String(10), nullable=True),
        sa.Column('language_preference', sa.String(10), nullable=False, default='en'),
        sa.Column('timezone', sa.String(100), nullable=False, default='Asia/Kolkata'),
        sa.Column('frequency_daily_limit', sa.Integer(), nullable=True),
        sa.Column('transactional_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('security_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('operational_enabled', sa.Boolean(), default=True, nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'tenant_id', name='uq_user_notification_pref'),
    )

    # notification_subscription table
    op.create_table(
        'notification_subscription',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('event_code', sa.String(100), nullable=False),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('is_subscribed', sa.Boolean(), default=True, nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'event_code', 'channel', 'tenant_id', name='uq_notification_subscription'),
    )

    # delivery_status_history table
    op.create_table(
        'delivery_status_history',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('notification.public_id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('from_status', sa.String(30), nullable=True),
        sa.Column('to_status', sa.String(30), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('changed_by_system', sa.Boolean(), default=True, nullable=False),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # notification_analytics table
    op.create_table(
        'notification_analytics',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('day_key', sa.Integer(), nullable=False, index=True),
        sa.Column('month_key', sa.Integer(), nullable=True),
        sa.Column('year_key', sa.Integer(), nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('record_status', sa.String(20), default='ACTIVE', nullable=True),
        sa.Column('channel', sa.String(50), nullable=False, index=True),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('total_queued', sa.Integer(), default=0, nullable=False),
        sa.Column('total_sent', sa.Integer(), default=0, nullable=False),
        sa.Column('total_delivered', sa.Integer(), default=0, nullable=False),
        sa.Column('total_read', sa.Integer(), default=0, nullable=False),
        sa.Column('total_failed', sa.Integer(), default=0, nullable=False),
        sa.Column('total_bounced', sa.Integer(), default=0, nullable=False),
        sa.Column('total_retried', sa.Integer(), default=0, nullable=False),
        sa.Column('delivery_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('open_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('click_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('bounce_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('failure_rate_pct', sa.Float(), default=0.0, nullable=False),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('notification_analytics')
    op.drop_table('delivery_status_history')
    op.drop_table('notification_subscription')
    op.drop_table('user_notification_preference')
    op.drop_table('otp_validation')
    op.drop_table('otp_request')
    op.drop_table('campaign_result')
    op.drop_table('campaign_execution')
    op.drop_table('campaign_audience')
    op.drop_table('campaign')
    op.drop_table('communication_timeline')
    op.drop_table('notification_retry')
    op.drop_table('notification_delivery')
    op.drop_table('notification_queue')
    op.drop_table('notification')
    op.drop_table('template_variable')
    op.drop_table('template_version')
    op.drop_table('notification_template')
    op.drop_table('provider_configuration')
    op.drop_table('notification_provider')
    op.drop_table('campaign_execution')
    op.drop_table('notification_event')
    op.drop_table('notification_batch')
