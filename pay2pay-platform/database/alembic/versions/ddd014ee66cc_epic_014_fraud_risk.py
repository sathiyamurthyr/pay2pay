"""epic_014_fraud_risk

Revision ID: ddd014ee66cc
Revises: ccc013dd55bb
Create Date: 2026-07-30 08:09:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ddd014ee66cc'
down_revision: Union[str, None] = 'ccc013dd55bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. risk_profile
    op.create_table(
        'risk_profile',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('profile_code', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('risk_band', sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'entity_type', 'entity_id', name='uq_tenant_risk_entity')
    )

    # 2. risk_score
    op.create_table(
        'risk_score',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('risk_profile_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('component', sa.String(length=50), nullable=False),
        sa.Column('score_delta', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['risk_profile_id'], ['risk_profile.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 3. fraud_rule
    op.create_table(
        'fraud_rule',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('rule_code', sa.String(length=100), nullable=False),
        sa.Column('rule_name', sa.String(length=255), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('threshold_value', sa.Float(), nullable=False),
        sa.Column('action', sa.String(length=30), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'rule_code', name='uq_tenant_fraud_rule_code')
    )

    # 4. fraud_rule_version
    op.create_table(
        'fraud_rule_version',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('changes_description', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['rule_id'], ['fraud_rule.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 5. fraud_alert
    op.create_table(
        'fraud_alert',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('alert_code', sa.String(length=100), nullable=False),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['rule_id'], ['fraud_rule.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'alert_code', name='uq_tenant_fraud_alert_code')
    )

    # 6. fraud_case
    op.create_table(
        'fraud_case',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('case_number', sa.String(length=100), nullable=False),
        sa.Column('alert_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('assigned_investigator', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['alert_id'], ['fraud_alert.public_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'case_number', name='uq_tenant_fraud_case_number')
    )

    # 7. fraud_case_history
    op.create_table(
        'fraud_case_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('old_status', sa.String(length=30), nullable=False),
        sa.Column('new_status', sa.String(length=30), nullable=False),
        sa.Column('changed_by', sa.String(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['fraud_case.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 8. fraud_investigation
    op.create_table(
        'fraud_investigation',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('findings_text', sa.Text(), nullable=False),
        sa.Column('risk_outcome', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['fraud_case.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 9. fraud_decision
    op.create_table(
        'fraud_decision',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('case_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('decision_action', sa.String(length=50), nullable=False),
        sa.Column('approved_by', sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['fraud_case.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 10. blacklist
    op.create_table(
        'blacklist',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('entry_code', sa.String(length=100), nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('item_value', sa.String(length=255), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 11. whitelist
    op.create_table(
        'whitelist',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('entry_code', sa.String(length=100), nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('item_value', sa.String(length=255), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 12. watchlist
    op.create_table(
        'watchlist',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('watch_code', sa.String(length=100), nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('item_value', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 13. risk_event
    op.create_table(
        'risk_event',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('event_code', sa.String(length=100), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('raw_details_json', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 14. risk_history
    op.create_table(
        'risk_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('risk_profile_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('old_score', sa.Integer(), nullable=False),
        sa.Column('new_score', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['risk_profile_id'], ['risk_profile.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 15. device_fingerprint
    op.create_table(
        'device_fingerprint',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('fingerprint_hash', sa.String(length=100), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=False),
        sa.Column('os', sa.String(length=50), nullable=False),
        sa.Column('browser', sa.String(length=50), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 16. login_history
    op.create_table(
        'login_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('user_email', sa.String(length=255), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=False),
        sa.Column('country', sa.String(length=50), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('is_suspicious', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 17. behaviour_profile
    op.create_table(
        'behaviour_profile',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=255), nullable=False),
        sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_by', sa.String(length=255), nullable=False),
        sa.Column('version_no', sa.Integer(), nullable=False),
        sa.Column('record_status', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False),
        sa.Column('retailer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('avg_daily_settlement', sa.Float(), nullable=False),
        sa.Column('max_payout_volume', sa.Float(), nullable=False),
        sa.Column('velocity_baseline', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['retailer_id'], ['retailer.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )


def downgrade() -> None:
    op.drop_table('behaviour_profile')
    op.drop_table('login_history')
    op.drop_table('device_fingerprint')
    op.drop_table('risk_history')
    op.drop_table('risk_event')
    op.drop_table('watchlist')
    op.drop_table('whitelist')
    op.drop_table('blacklist')
    op.drop_table('fraud_decision')
    op.drop_table('fraud_investigation')
    op.drop_table('fraud_case_history')
    op.drop_table('fraud_case')
    op.drop_table('fraud_alert')
    op.drop_table('fraud_rule_version')
    op.drop_table('fraud_rule')
    op.drop_table('risk_score')
    op.drop_table('risk_profile')
