"""create_company_onboarding_table

Revision ID: company_onboarding_001
Revises: retailer_duplicate_001
Create Date: 2026-08-11 19:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'company_onboarding_001'
down_revision = 'retailer_duplicate_001'
branch_labels = None
depends_on = None

def upgrade():
    try:
        op.create_table(
            'company_onboarding',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True, index=True),
            sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
            sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
            sa.Column('current_step', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('completed_steps', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
            sa.Column('progress_percentage', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='DRAFT'),
            sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('last_saved_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('draft_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_date', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version_no', sa.Integer(), nullable=False, server_default='1'),
            sa.UniqueConstraint('tenant_id', 'company_id', name='uq_company_onboarding_tenant_company')
        )
    except Exception as e:
        print(f"[ALEMBIC MIGRATION NOTICE] Table creation skipped if exists: {e}")

def downgrade():
    try:
        op.drop_table('company_onboarding')
    except Exception:
        pass
