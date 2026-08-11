"""epic_011_reporting_analytics

Revision ID: aaa011bb33ff
Revises: 999f00aa22ee
Create Date: 2026-07-30 08:03:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'aaa011bb33ff'
down_revision: Union[str, None] = '999f00aa22ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. report_definition
    op.create_table(
        'report_definition',
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
        sa.Column('report_code', sa.String(length=100), nullable=False),
        sa.Column('report_name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('query_template', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'report_code', name='uq_tenant_report_code')
    )

    # 2. report_execution
    op.create_table(
        'report_execution',
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
        sa.Column('execution_number', sa.String(length=100), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('execution_status', sa.String(length=30), nullable=False),
        sa.Column('record_count', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=255), nullable=True),
        sa.Column('executed_by', sa.String(length=255), nullable=False),
        sa.Column('execution_time_ms', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['report_definition.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 3. report_schedule
    op.create_table(
        'report_schedule',
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
        sa.Column('schedule_code', sa.String(length=100), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('frequency', sa.String(length=30), nullable=False),
        sa.Column('recipient_email', sa.String(length=255), nullable=False),
        sa.Column('format', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('last_executed', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['report_id'], ['report_definition.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 4. dashboard_widget
    op.create_table(
        'dashboard_widget',
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
        sa.Column('widget_code', sa.String(length=100), nullable=False),
        sa.Column('widget_name', sa.String(length=150), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('chart_type', sa.String(length=30), nullable=False),
        sa.Column('config_json', sa.Text(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 5. dashboard_layout
    op.create_table(
        'dashboard_layout',
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
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('layout_name', sa.String(length=100), nullable=False),
        sa.Column('widget_grid_config', sa.Text(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['admin_user.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 6. analytics_snapshot
    op.create_table(
        'analytics_snapshot',
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
        sa.Column('snapshot_key', sa.String(length=100), nullable=False),
        sa.Column('snapshot_type', sa.String(length=50), nullable=False),
        sa.Column('total_settlements', sa.Integer(), nullable=False),
        sa.Column('total_volume', sa.Float(), nullable=False),
        sa.Column('gross_revenue', sa.Float(), nullable=False),
        sa.Column('net_revenue', sa.Float(), nullable=False),
        sa.Column('active_merchants', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 7. daily_summary
    op.create_table(
        'daily_summary',
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
        sa.Column('summary_date', sa.Date(), nullable=False),
        sa.Column('total_transactions', sa.Integer(), nullable=False),
        sa.Column('gross_amount', sa.Float(), nullable=False),
        sa.Column('mdr_revenue', sa.Float(), nullable=False),
        sa.Column('gst_collected', sa.Float(), nullable=False),
        sa.Column('tds_deducted', sa.Float(), nullable=False),
        sa.Column('net_wallet_credit', sa.Float(), nullable=False),
        sa.Column('outbound_payout_volume', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 8. monthly_summary
    op.create_table(
        'monthly_summary',
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
        sa.Column('year_month', sa.String(length=20), nullable=False),
        sa.Column('total_volume', sa.Float(), nullable=False),
        sa.Column('net_revenue', sa.Float(), nullable=False),
        sa.Column('active_pos_terminals', sa.Integer(), nullable=False),
        sa.Column('active_retailers', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 9. yearly_summary
    op.create_table(
        'yearly_summary',
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
        sa.Column('financial_year', sa.String(length=20), nullable=False),
        sa.Column('total_volume', sa.Float(), nullable=False),
        sa.Column('gross_revenue', sa.Float(), nullable=False),
        sa.Column('net_revenue', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 10. audit_report
    op.create_table(
        'audit_report',
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
        sa.Column('audit_code', sa.String(length=100), nullable=False),
        sa.Column('audit_event', sa.String(length=150), nullable=False),
        sa.Column('module', sa.String(length=50), nullable=False),
        sa.Column('risk_severity', sa.String(length=20), nullable=False),
        sa.Column('details_json', sa.Text(), nullable=False),
        sa.Column('generated_date', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 11. report_export
    op.create_table(
        'report_export',
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
        sa.Column('export_reference', sa.String(length=100), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('format', sa.String(length=20), nullable=False),
        sa.Column('file_path', sa.String(length=255), nullable=False),
        sa.Column('downloads_count', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['report_definition.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 12. report_history
    op.create_table(
        'report_history',
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
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('downloaded_by', sa.String(length=255), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=False),
        sa.Column('downloaded_date', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['report_definition.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 13. mis_distribution
    op.create_table(
        'mis_distribution',
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
        sa.Column('distribution_code', sa.String(length=100), nullable=False),
        sa.Column('scheduled_report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_list', sa.Text(), nullable=False),
        sa.Column('delivery_channel', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['scheduled_report_id'], ['report_schedule.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )


def downgrade() -> None:
    op.drop_table('mis_distribution')
    op.drop_table('report_history')
    op.drop_table('report_export')
    op.drop_table('audit_report')
    op.drop_table('yearly_summary')
    op.drop_table('monthly_summary')
    op.drop_table('daily_summary')
    op.drop_table('analytics_snapshot')
    op.drop_table('dashboard_layout')
    op.drop_table('dashboard_widget')
    op.drop_table('report_schedule')
    op.drop_table('report_execution')
    op.drop_table('report_definition')
