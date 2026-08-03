"""epic_021_customer_lifecycle

Revision ID: jjj021kk22cc
Revises: iii020jj11bb
Create Date: 2026-07-30 09:32:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'jjj021kk22cc'
down_revision: Union[str, None] = 'iii020jj11bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STANDARD_COLS = [
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
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
    sa.Column('created_by', sa.String(length=255), nullable=False),
    sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_by', sa.String(length=255), nullable=False),
    sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('version_no', sa.Integer(), nullable=False),
    sa.Column('record_status', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('is_deleted', sa.Boolean(), nullable=False),
]


def upgrade() -> None:
    # ── 1. customer ──────────────────────────────────────────────────────────
    op.create_table(
        'customer',
        *STANDARD_COLS,
        sa.Column('customer_number', sa.String(length=30), nullable=False),
        sa.Column('customer_category', sa.String(50), nullable=False),
        sa.Column('customer_type', sa.String(50), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('middle_name', sa.String(100), nullable=True),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('full_name', sa.String(300), nullable=False),
        sa.Column('mobile_number', sa.String(20), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('dob', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(20), nullable=True),
        sa.Column('nationality', sa.String(50), nullable=True),
        sa.Column('occupation', sa.String(100), nullable=True),
        sa.Column('preferred_language', sa.String(10), nullable=True),
        sa.Column('preferred_channel', sa.String(30), nullable=True),
        sa.Column('referral_code', sa.String(50), nullable=True),
        sa.Column('referred_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('introduced_by_retailer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('kyc_level', sa.String(50), nullable=False),
        sa.Column('kyc_status', sa.String(50), nullable=False),
        sa.Column('risk_category', sa.String(30), nullable=False),
        sa.Column('customer_status', sa.String(50), nullable=False),
        sa.Column('registration_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('activation_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_active_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_date', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'customer_number', name='uq_customer_tenant_number'),
        sa.UniqueConstraint('tenant_id', 'mobile_number', name='uq_customer_tenant_mobile'),
    )
    op.create_index('ix_customer_mobile', 'customer', ['mobile_number'])
    op.create_index('ix_customer_status', 'customer', ['customer_status'])
    op.create_index('ix_customer_kyc_status', 'customer', ['kyc_status'])
    op.create_index('ix_customer_category', 'customer', ['customer_category'])

    # ── 2. customer_profile ──────────────────────────────────────────────────
    op.create_table(
        'customer_profile',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('photo_url', sa.String(500), nullable=True),
        sa.Column('signature_url', sa.String(500), nullable=True),
        sa.Column('father_name', sa.String(200), nullable=True),
        sa.Column('mother_name', sa.String(200), nullable=True),
        sa.Column('spouse_name', sa.String(200), nullable=True),
        sa.Column('annual_income', sa.Numeric(18, 2), nullable=True),
        sa.Column('income_source', sa.String(100), nullable=True),
        sa.Column('education', sa.String(100), nullable=True),
        sa.Column('marital_status', sa.String(30), nullable=True),
        sa.Column('politically_exposed', sa.Boolean(), nullable=False),
        sa.Column('is_nri', sa.Boolean(), nullable=False),
        sa.Column('is_minor', sa.Boolean(), nullable=False),
        sa.Column('guardian_name', sa.String(200), nullable=True),
        sa.Column('guardian_relation', sa.String(50), nullable=True),
        sa.Column('profile_completeness_pct', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('customer_id', name='uq_customer_profile'),
    )

    # ── 3. customer_address ──────────────────────────────────────────────────
    op.create_table(
        'customer_address',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('address_type', sa.String(30), nullable=False),
        sa.Column('address_line1', sa.String(500), nullable=False),
        sa.Column('address_line2', sa.String(500), nullable=True),
        sa.Column('landmark', sa.String(200), nullable=True),
        sa.Column('village', sa.String(200), nullable=True),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('district', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=False),
        sa.Column('pin_code', sa.String(10), nullable=False),
        sa.Column('country', sa.String(50), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('proof_type', sa.String(50), nullable=True),
        sa.Column('proof_number', sa.String(100), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_address_customer', 'customer_address', ['customer_id'])
    op.create_index('ix_customer_address_pincode', 'customer_address', ['pin_code'])

    # ── 4. customer_identity ─────────────────────────────────────────────────
    op.create_table(
        'customer_identity',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('identity_type', sa.String(50), nullable=False),
        sa.Column('identity_number', sa.String(100), nullable=False),
        sa.Column('identity_number_masked', sa.String(100), nullable=True),
        sa.Column('name_on_document', sa.String(300), nullable=True),
        sa.Column('dob_on_document', sa.Date(), nullable=True),
        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('issuing_authority', sa.String(200), nullable=True),
        sa.Column('verification_status', sa.String(30), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_by', sa.String(100), nullable=True),
        sa.Column('verification_source', sa.String(50), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False),
        sa.Column('extra_data', postgresql.JSONB(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('tenant_id', 'identity_type', 'identity_number', name='uq_customer_identity_tenant_type_number'),
    )
    op.create_index('ix_customer_identity_customer', 'customer_identity', ['customer_id'])
    op.create_index('ix_customer_identity_type', 'customer_identity', ['identity_type'])

    # ── 5. customer_kyc ──────────────────────────────────────────────────────
    op.create_table(
        'customer_kyc',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('kyc_level', sa.String(50), nullable=False),
        sa.Column('kyc_type', sa.String(50), nullable=False),
        sa.Column('kyc_status', sa.String(50), nullable=False),
        sa.Column('submission_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.String(100), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('rejection_code', sa.String(50), nullable=True),
        sa.Column('face_match_score', sa.Float(), nullable=True),
        sa.Column('liveness_score', sa.Float(), nullable=True),
        sa.Column('document_verification_result', postgresql.JSONB(), nullable=True),
        sa.Column('aadhaar_verified', sa.Boolean(), nullable=False),
        sa.Column('pan_verified', sa.Boolean(), nullable=False),
        sa.Column('bank_verified', sa.Boolean(), nullable=False),
        sa.Column('ckyc_number', sa.String(50), nullable=True),
        sa.Column('ckyc_verified', sa.Boolean(), nullable=False),
        sa.Column('kyc_expiry_date', sa.Date(), nullable=True),
        sa.Column('re_kyc_due_date', sa.Date(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_kyc_customer', 'customer_kyc', ['customer_id'])
    op.create_index('ix_customer_kyc_status', 'customer_kyc', ['kyc_status'])

    # ── 6. customer_document ─────────────────────────────────────────────────
    op.create_table(
        'customer_document',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_type', sa.String(50), nullable=False),
        sa.Column('document_name', sa.String(255), nullable=False),
        sa.Column('file_url', sa.String(1000), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('document_number', sa.String(100), nullable=True),
        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('is_encrypted', sa.Boolean(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('verification_status', sa.String(30), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_by', sa.String(100), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False),
        sa.Column('uploaded_by', sa.String(100), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_document_customer', 'customer_document', ['customer_id'])
    op.create_index('ix_customer_document_type', 'customer_document', ['document_type'])

    # ── 7. customer_service ──────────────────────────────────────────────────
    op.create_table(
        'customer_service',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_code', sa.String(50), nullable=False),
        sa.Column('service_name', sa.String(100), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False),
        sa.Column('eligibility_status', sa.String(30), nullable=False),
        sa.Column('eligibility_reason', sa.Text(), nullable=True),
        sa.Column('enabled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('disabled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=False),
        sa.Column('approved_by', sa.String(100), nullable=True),
        sa.Column('cooling_period_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('customer_id', 'service_code', name='uq_customer_service'),
    )
    op.create_index('ix_customer_service_customer', 'customer_service', ['customer_id'])
    op.create_index('ix_customer_service_code', 'customer_service', ['service_code'])

    # ── 8. customer_service_configuration ────────────────────────────────────
    op.create_table(
        'customer_service_configuration',
        *STANDARD_COLS,
        sa.Column('service_code', sa.String(50), nullable=False),
        sa.Column('service_name', sa.String(100), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False),
        sa.Column('requires_full_kyc', sa.Boolean(), nullable=False),
        sa.Column('minimum_kyc_level', sa.String(50), nullable=True),
        sa.Column('minimum_age', sa.Integer(), nullable=True),
        sa.Column('maximum_age', sa.Integer(), nullable=True),
        sa.Column('cooling_period_days', sa.Integer(), nullable=True),
        sa.Column('max_beneficiaries', sa.Integer(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=False),
        sa.Column('risk_validation_enabled', sa.Boolean(), nullable=False),
        sa.Column('allowed_categories', postgresql.JSONB(), nullable=True),
        sa.Column('blocked_categories', postgresql.JSONB(), nullable=True),
        sa.Column('config_status', sa.String(30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'service_code', name='uq_service_config_tenant_code'),
    )

    # ── 9. customer_limit_configuration ──────────────────────────────────────
    op.create_table(
        'customer_limit_configuration',
        *STANDARD_COLS,
        sa.Column('service_code', sa.String(50), nullable=False),
        sa.Column('hierarchy_level', sa.String(50), nullable=False),
        sa.Column('hierarchy_entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('customer_category', sa.String(50), nullable=True),
        sa.Column('kyc_level', sa.String(50), nullable=True),
        sa.Column('single_txn_min', sa.Numeric(18, 2), nullable=True),
        sa.Column('single_txn_max', sa.Numeric(18, 2), nullable=True),
        sa.Column('daily_txn_count', sa.Integer(), nullable=True),
        sa.Column('daily_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('weekly_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('monthly_txn_count', sa.Integer(), nullable=True),
        sa.Column('monthly_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('quarterly_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('yearly_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('max_outstanding', sa.Numeric(18, 2), nullable=True),
        sa.Column('max_failed_attempts', sa.Integer(), nullable=True),
        sa.Column('max_beneficiaries', sa.Integer(), nullable=True),
        sa.Column('cooling_period_hours', sa.Integer(), nullable=True),
        sa.Column('override_allowed', sa.Boolean(), nullable=False),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),
        sa.Column('limit_status', sa.String(30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )
    op.create_index('ix_limit_config_service', 'customer_limit_configuration', ['service_code'])

    # ── 10. customer_limit_override ───────────────────────────────────────────
    op.create_table(
        'customer_limit_override',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_code', sa.String(50), nullable=False),
        sa.Column('override_type', sa.String(50), nullable=False),
        sa.Column('single_txn_max', sa.Numeric(18, 2), nullable=True),
        sa.Column('daily_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('monthly_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('yearly_amount', sa.Numeric(18, 2), nullable=True),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),
        sa.Column('approved_by', sa.String(100), nullable=True),
        sa.Column('approval_reason', sa.Text(), nullable=True),
        sa.Column('override_status', sa.String(30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_limit_override_customer', 'customer_limit_override', ['customer_id'])

    # ── 11. customer_transaction_counter ──────────────────────────────────────
    op.create_table(
        'customer_transaction_counter',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_code', sa.String(50), nullable=False),
        sa.Column('counter_date', sa.Date(), nullable=False),
        sa.Column('txn_count', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('failed_count', sa.Integer(), nullable=False),
        sa.Column('success_count', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('customer_id', 'service_code', 'counter_date', name='uq_daily_counter'),
    )
    op.create_index('ix_daily_counter_customer_date', 'customer_transaction_counter', ['customer_id', 'counter_date'])

    # ── 12. customer_monthly_counter ──────────────────────────────────────────
    op.create_table(
        'customer_monthly_counter',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_code', sa.String(50), nullable=False),
        sa.Column('counter_year', sa.Integer(), nullable=False),
        sa.Column('counter_month', sa.Integer(), nullable=False),
        sa.Column('txn_count', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('failed_count', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('customer_id', 'service_code', 'counter_year', 'counter_month', name='uq_monthly_counter'),
    )

    # ── 13. customer_yearly_counter ───────────────────────────────────────────
    op.create_table(
        'customer_yearly_counter',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_code', sa.String(50), nullable=False),
        sa.Column('counter_year', sa.Integer(), nullable=False),
        sa.Column('txn_count', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(18, 2), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('customer_id', 'service_code', 'counter_year', name='uq_yearly_counter'),
    )

    # ── 14. customer_risk_profile ─────────────────────────────────────────────
    op.create_table(
        'customer_risk_profile',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('risk_category', sa.String(30), nullable=False),
        sa.Column('aml_level', sa.String(30), nullable=False),
        sa.Column('is_pep', sa.Boolean(), nullable=False),
        sa.Column('pep_category', sa.String(50), nullable=True),
        sa.Column('sanction_check_result', sa.String(30), nullable=True),
        sa.Column('sanction_checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('watch_list_match', sa.Boolean(), nullable=False),
        sa.Column('geo_risk_score', sa.Integer(), nullable=True),
        sa.Column('behaviour_risk_score', sa.Integer(), nullable=True),
        sa.Column('velocity_risk_score', sa.Integer(), nullable=True),
        sa.Column('device_risk_score', sa.Integer(), nullable=True),
        sa.Column('ip_risk_score', sa.Integer(), nullable=True),
        sa.Column('last_reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_review_date', sa.Date(), nullable=True),
        sa.Column('reviewed_by', sa.String(100), nullable=True),
        sa.Column('risk_factors', postgresql.JSONB(), nullable=True),
        sa.Column('override_reason', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('customer_id', name='uq_customer_risk_profile'),
    )
    op.create_index('ix_customer_risk_category', 'customer_risk_profile', ['risk_category'])

    # ── 15. customer_status_history ───────────────────────────────────────────
    op.create_table(
        'customer_status_history',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_status', sa.String(50), nullable=True),
        sa.Column('to_status', sa.String(50), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('reason_code', sa.String(50), nullable=True),
        sa.Column('changed_by', sa.String(100), nullable=True),
        sa.Column('changed_by_role', sa.String(50), nullable=True),
        sa.Column('effective_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_status_history_customer', 'customer_status_history', ['customer_id'])

    # ── 16. customer_relationship ─────────────────────────────────────────────
    op.create_table(
        'customer_relationship',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('relation_type', sa.String(50), nullable=False),
        sa.Column('related_name', sa.String(300), nullable=False),
        sa.Column('related_mobile', sa.String(20), nullable=True),
        sa.Column('related_email', sa.String(255), nullable=True),
        sa.Column('related_customer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('dob', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(20), nullable=True),
        sa.Column('identity_type', sa.String(50), nullable=True),
        sa.Column('identity_number', sa.String(100), nullable=True),
        sa.Column('share_percentage', sa.Numeric(5, 2), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False),
        sa.Column('is_active_rel', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_relationship_customer', 'customer_relationship', ['customer_id'])

    # ── 17. customer_timeline ─────────────────────────────────────────────────
    op.create_table(
        'customer_timeline',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('event_code', sa.String(100), nullable=False),
        sa.Column('event_title', sa.String(255), nullable=False),
        sa.Column('event_description', sa.Text(), nullable=True),
        sa.Column('event_data', postgresql.JSONB(), nullable=True),
        sa.Column('performed_by', sa.String(100), nullable=True),
        sa.Column('performed_by_role', sa.String(50), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('device_info', sa.String(255), nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('event_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_timeline_customer', 'customer_timeline', ['customer_id'])
    op.create_index('ix_customer_timeline_event_type', 'customer_timeline', ['event_type'])
    op.create_index('ix_customer_timeline_timestamp', 'customer_timeline', ['event_timestamp'])

    # ── 18. customer_preference ───────────────────────────────────────────────
    op.create_table(
        'customer_preference',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('notification_email', sa.Boolean(), nullable=False),
        sa.Column('notification_sms', sa.Boolean(), nullable=False),
        sa.Column('notification_whatsapp', sa.Boolean(), nullable=False),
        sa.Column('notification_push', sa.Boolean(), nullable=False),
        sa.Column('language', sa.String(10), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('timezone', sa.String(50), nullable=False),
        sa.Column('two_factor_enabled', sa.Boolean(), nullable=False),
        sa.Column('biometric_enabled', sa.Boolean(), nullable=False),
        sa.Column('marketing_consent', sa.Boolean(), nullable=False),
        sa.Column('data_sharing_consent', sa.Boolean(), nullable=False),
        sa.Column('preferred_upi_app', sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('customer_id', name='uq_customer_preference'),
    )

    # ── 19. customer_consent ──────────────────────────────────────────────────
    op.create_table(
        'customer_consent',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('consent_type', sa.String(50), nullable=False),
        sa.Column('consent_text', sa.Text(), nullable=True),
        sa.Column('consent_version', sa.String(20), nullable=False),
        sa.Column('is_given', sa.Boolean(), nullable=False),
        sa.Column('given_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('channel', sa.String(30), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_consent_customer', 'customer_consent', ['customer_id'])

    # ── 20. customer_blacklist ────────────────────────────────────────────────
    op.create_table(
        'customer_blacklist',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('blacklist_type', sa.String(50), nullable=False),
        sa.Column('identity_type', sa.String(50), nullable=True),
        sa.Column('identity_value', sa.String(200), nullable=True),
        sa.Column('mobile_number', sa.String(20), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('reason_code', sa.String(50), nullable=True),
        sa.Column('blacklisted_by', sa.String(100), nullable=True),
        sa.Column('blacklist_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_permanent', sa.Boolean(), nullable=False),
        sa.Column('source_system', sa.String(50), nullable=True),
        sa.Column('blacklist_status', sa.String(30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )
    op.create_index('ix_customer_blacklist_mobile', 'customer_blacklist', ['mobile_number'])
    op.create_index('ix_customer_blacklist_identity', 'customer_blacklist', ['identity_type', 'identity_value'])

    # ── 21. customer_whitelist ────────────────────────────────────────────────
    op.create_table(
        'customer_whitelist',
        *STANDARD_COLS,
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('whitelist_type', sa.String(50), nullable=False),
        sa.Column('service_code', sa.String(50), nullable=True),
        sa.Column('override_limit', sa.Numeric(18, 2), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('approved_by', sa.String(100), nullable=True),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),
        sa.Column('whitelist_status', sa.String(30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.public_id'], ondelete='CASCADE'),
    )
    op.create_index('ix_customer_whitelist_customer', 'customer_whitelist', ['customer_id'])


def downgrade() -> None:
    op.drop_table('customer_whitelist')
    op.drop_table('customer_blacklist')
    op.drop_table('customer_consent')
    op.drop_table('customer_preference')
    op.drop_table('customer_timeline')
    op.drop_table('customer_relationship')
    op.drop_table('customer_status_history')
    op.drop_table('customer_risk_profile')
    op.drop_table('customer_yearly_counter')
    op.drop_table('customer_monthly_counter')
    op.drop_table('customer_transaction_counter')
    op.drop_table('customer_limit_override')
    op.drop_table('customer_limit_configuration')
    op.drop_table('customer_service_configuration')
    op.drop_table('customer_service')
    op.drop_table('customer_document')
    op.drop_table('customer_kyc')
    op.drop_table('customer_identity')
    op.drop_table('customer_address')
    op.drop_table('customer_profile')
    op.drop_table('customer')
