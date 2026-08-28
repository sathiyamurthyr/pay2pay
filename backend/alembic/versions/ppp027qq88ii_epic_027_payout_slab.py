"""create_payout_slab_and_audit_tables

Revision ID: ppp027qq88ii
Revises: company_onboarding_001
Create Date: 2026-08-28 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'ppp027qq88ii'
down_revision = 'company_onboarding_001'
branch_labels = None
depends_on = None

def upgrade():
    try:
        op.create_table(
            'payout_slab',
            sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True, index=True),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column('business_unit_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('branch_id', postgresql.UUID(as_uuid=True), nullable=True),

            sa.Column('service_code', sa.String(length=50), nullable=False, server_default='PAYOUT'),
            sa.Column('slab_name', sa.String(length=150), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),

            sa.Column('min_amount', sa.Numeric(precision=18, scale=4), nullable=False),
            sa.Column('max_amount', sa.Numeric(precision=18, scale=4), nullable=False),

            sa.Column('commission', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.0'),
            sa.Column('commission_type', sa.String(length=20), nullable=False, server_default='FIXED'),

            sa.Column('gst', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.0'),
            sa.Column('gst_type', sa.String(length=20), nullable=False, server_default='PERCENTAGE'),

            sa.Column('vendor_charge', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.0'),
            sa.Column('vendor_charge_type', sa.String(length=20), nullable=False, server_default='FIXED'),

            sa.Column('company_charges', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.0'),
            sa.Column('company_charges_type', sa.String(length=20), nullable=False, server_default='FIXED'),

            sa.Column('company_gst', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.0'),
            sa.Column('company_gst_type', sa.String(length=20), nullable=False, server_default='PERCENTAGE'),

            sa.Column('tds', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.0'),
            sa.Column('tds_type', sa.String(length=20), nullable=False, server_default='PERCENTAGE'),

            sa.Column('other_charges', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.0'),
            sa.Column('other_charges_type', sa.String(length=20), nullable=False, server_default='FIXED'),

            sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),

            sa.Column('effective_from', sa.DateTime(timezone=True), nullable=True),
            sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),

            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('record_status', sa.String(length=30), nullable=False, server_default='ACTIVE'),
            sa.Column('version_no', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('notes', sa.Text(), nullable=True),

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

            sa.Column('created_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('created_by', sa.String(length=255), nullable=True),
            sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_by', sa.String(length=255), nullable=True),
        )
        op.create_index('idx_payout_slab_tenant', 'payout_slab', ['tenant_id'])
        op.create_index('idx_payout_slab_company', 'payout_slab', ['company_id'])
        op.create_index('idx_payout_slab_service', 'payout_slab', ['service_code'])
        op.create_index('idx_payout_slab_range', 'payout_slab', ['min_amount', 'max_amount'])
        op.create_index('idx_payout_slab_status', 'payout_slab', ['is_active', 'is_deleted'])
    except Exception as e:
        print(f"[ALEMBIC MIGRATION NOTICE] payout_slab table creation skipped if exists: {e}")

    try:
        op.create_table(
            'payout_slab_audit',
            sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True, index=True),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column('payout_slab_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payout_slab.public_id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('old_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('new_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('changed_by', sa.String(length=255), nullable=True),
            sa.Column('changed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
            sa.Column('reason', sa.Text(), nullable=True),
        )
        op.create_index('idx_payout_slab_audit_slab', 'payout_slab_audit', ['payout_slab_id'])
        op.create_index('idx_payout_slab_audit_tenant', 'payout_slab_audit', ['tenant_id'])
        op.create_index('idx_payout_slab_audit_company', 'payout_slab_audit', ['company_id'])
        op.create_index('idx_payout_slab_audit_changed_at', 'payout_slab_audit', ['changed_at'])
    except Exception as e:
        print(f"[ALEMBIC MIGRATION NOTICE] payout_slab_audit table creation skipped if exists: {e}")

def downgrade():
    try:
        op.drop_table('payout_slab_audit')
    except Exception:
        pass
    try:
        op.drop_table('payout_slab')
    except Exception:
        pass
