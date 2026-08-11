"""EPIC-023 — Customer & Beneficiary Policy, Limit & Configuration Engine Schema

Revision ID: lll023mm44ee
Revises: kkk022ll33dd
Create Date: 2026-07-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'lll023mm44ee'
down_revision = 'kkk022ll33dd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. policy_master
    op.create_table(
        'policy_master',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_code', sa.String(length=100), nullable=False),
        sa.Column('policy_name', sa.String(length=200), nullable=False),
        sa.Column('policy_category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('current_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('policy_status', sa.String(length=50), nullable=False, server_default='DRAFT'),
        sa.Column('is_mandatory', sa.Boolean(), nullable=False, server_default='true'),
        # Enterprise Base Mixin
        sa.Column('day_key', sa.Integer(), nullable=True),
        sa.Column('week_key', sa.Integer(), nullable=True),
        sa.Column('month_key', sa.Integer(), nullable=True),
        sa.Column('quarter_key', sa.Integer(), nullable=True),
        sa.Column('year_key', sa.Integer(), nullable=True),
        sa.Column('financial_year_key', sa.Integer(), nullable=True),
        sa.Column('financial_quarter_key', sa.Integer(), nullable=True),
        sa.Column('financial_month_key', sa.Integer(), nullable=True),
        sa.Column('date_key', sa.Integer(), nullable=False),
        sa.Column('time_key', sa.Integer(), nullable=True),
        sa.Column('partition_year', sa.Integer(), nullable=True),
        sa.Column('partition_month', sa.Integer(), nullable=True),
        sa.Column('partition_day', sa.Integer(), nullable=True),
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
        sa.UniqueConstraint('tenant_id', 'policy_code', name='uq_policy_master_tenant_code'),
    )
    op.create_index('ix_policy_master_code', 'policy_master', ['policy_code'])
    op.create_index('ix_policy_master_status', 'policy_master', ['policy_status'])

    # 2. policy_version
    op.create_table(
        'policy_version',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('rules_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('version_status', sa.String(length=30), nullable=False, server_default='DRAFT'),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_by', sa.String(length=100), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 3. policy_scope
    op.create_table(
        'policy_scope',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scope_level', sa.String(length=50), nullable=False, server_default='PLATFORM'),
        sa.Column('target_entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('service_code', sa.String(length=50), nullable=True),
        sa.Column('priority_rank', sa.Integer(), nullable=False, server_default='1'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 4. policy_assignment
    op.create_table(
        'policy_assignment',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_entity_type', sa.String(length=50), nullable=False),
        sa.Column('assigned_entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_override', sa.Boolean(), nullable=False, server_default='false'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 5. customer_policy
    op.create_table(
        'customer_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('min_age', sa.Integer(), nullable=True, server_default='18'),
        sa.Column('max_age', sa.Integer(), nullable=True),
        sa.Column('otp_mandatory', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('aadhaar_mandatory', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('pan_mandatory', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('video_kyc_required', sa.Boolean(), nullable=False, server_default='false'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 6. beneficiary_policy
    op.create_table(
        'beneficiary_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('max_beneficiaries_per_customer', sa.Integer(), nullable=True, server_default='10'),
        sa.Column('penny_drop_mandatory', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('name_match_score_threshold', sa.Float(), nullable=False, server_default='80.0'),
        sa.Column('cooling_period_hours', sa.Integer(), nullable=False, server_default='24'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 7. service_policy
    op.create_table(
        'service_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_code', sa.String(length=50), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('required_kyc_level', sa.String(length=50), nullable=False, server_default='MINIMUM_KYC'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 8. limit_policy
    op.create_table(
        'limit_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_code', sa.String(length=50), nullable=False),
        sa.Column('single_txn_max', sa.Float(), nullable=True),
        sa.Column('daily_amount_max', sa.Float(), nullable=True),
        sa.Column('monthly_amount_max', sa.Float(), nullable=True),
        sa.Column('yearly_amount_max', sa.Float(), nullable=True),
        sa.Column('daily_count_max', sa.Integer(), nullable=True),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 9. risk_policy
    op.create_table(
        'risk_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('max_risk_score_allowed', sa.Integer(), nullable=False, server_default='70'),
        sa.Column('aml_screening_required', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('pep_screening_required', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sanction_check_required', sa.Boolean(), nullable=False, server_default='true'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 10. approval_policy
    op.create_table(
        'approval_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('approval_type', sa.String(length=50), nullable=False, server_default='AUTO'),
        sa.Column('amount_threshold', sa.Float(), nullable=True),
        sa.Column('required_approver_role', sa.String(length=100), nullable=True),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 11. otp_policy
    op.create_table(
        'otp_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('trigger_condition', sa.String(length=50), nullable=False, server_default='ALWAYS'),
        sa.Column('threshold_amount', sa.Float(), nullable=True),
        sa.Column('expiry_seconds', sa.Integer(), nullable=False, server_default='300'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 12. cooling_policy
    op.create_table(
        'cooling_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_event', sa.String(length=50), nullable=False, server_default='NEW_BENEFICIARY'),
        sa.Column('cooling_hours', sa.Integer(), nullable=False, server_default='24'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 13. holiday_policy
    op.create_table(
        'holiday_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('holiday_date', sa.Date(), nullable=False),
        sa.Column('holiday_name', sa.String(length=100), nullable=False),
        sa.Column('allow_transactions', sa.Boolean(), nullable=False, server_default='true'),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 14. override_policy
    op.create_table(
        'override_policy',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('override_level', sa.String(length=50), nullable=False),
        sa.Column('override_target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('override_rules', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 15. policy_history
    op.create_table(
        'policy_history',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('old_version', sa.Integer(), nullable=True),
        sa.Column('new_version', sa.Integer(), nullable=False),
        sa.Column('change_reason', sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 16. policy_audit
    op.create_table(
        'policy_audit',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action_name', sa.String(length=100), nullable=False),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 17. policy_publish_log
    op.create_table(
        'policy_publish_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('published_version', sa.Integer(), nullable=False),
        sa.Column('published_by', sa.String(length=100), nullable=False),
        sa.Column('publish_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
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
        sa.ForeignKeyConstraint(['policy_id'], ['policy_master.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )


def downgrade() -> None:
    op.drop_table('policy_publish_log')
    op.drop_table('policy_audit')
    op.drop_table('policy_history')
    op.drop_table('override_policy')
    op.drop_table('holiday_policy')
    op.drop_table('cooling_policy')
    op.drop_table('otp_policy')
    op.drop_table('approval_policy')
    op.drop_table('risk_policy')
    op.drop_table('limit_policy')
    op.drop_table('service_policy')
    op.drop_table('beneficiary_policy')
    op.drop_table('customer_policy')
    op.drop_table('policy_assignment')
    op.drop_table('policy_scope')
    op.drop_table('policy_version')
    op.drop_table('policy_master')
