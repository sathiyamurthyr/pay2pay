"""epic_010_payout_engine

Revision ID: 999f00aa22ee
Revises: 888e99ff11dd
Create Date: 2026-07-30 08:01:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '999f00aa22ee'
down_revision: Union[str, None] = '888e99ff11dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. payout_request
    op.create_table(
        'payout_request',
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
        sa.Column('payout_number', sa.String(length=100), nullable=False),
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('charges', sa.Float(), nullable=False),
        sa.Column('gst', sa.Float(), nullable=False),
        sa.Column('net_amount', sa.Float(), nullable=False),
        sa.Column('purpose', sa.String(length=100), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('requested_by', sa.String(length=255), nullable=False),
        sa.Column('approved_by', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['retailer_id'], ['retailer.public_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['wallet_id'], ['enterprise_wallet.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'payout_number', name='uq_tenant_payout_number')
    )

    # 2. payout_batch
    op.create_table(
        'payout_batch',
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
        sa.Column('batch_number', sa.String(length=100), nullable=False),
        sa.Column('total_payouts', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 3. payout_transaction
    op.create_table(
        'payout_transaction',
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
        sa.Column('transaction_number', sa.String(length=100), nullable=False),
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('gateway_reference', sa.String(length=100), nullable=False),
        sa.Column('bank_reference', sa.String(length=100), nullable=False),
        sa.Column('utr_number', sa.String(length=100), nullable=False),
        sa.Column('rrn', sa.String(length=100), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('processed_time', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['payout_id'], ['payout_request.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 4. payout_bank_request
    op.create_table(
        'payout_bank_request',
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
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('gateway_code', sa.String(length=50), nullable=False),
        sa.Column('endpoint', sa.String(length=255), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('request_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('response_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['payout_id'], ['payout_request.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 5. payout_bank_response
    op.create_table(
        'payout_bank_response',
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
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('http_status', sa.Integer(), nullable=False),
        sa.Column('gateway_status', sa.String(length=50), nullable=False),
        sa.Column('bank_status', sa.String(length=50), nullable=False),
        sa.Column('response_code', sa.String(length=50), nullable=False),
        sa.Column('response_message', sa.Text(), nullable=False),
        sa.Column('reference', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['payout_id'], ['payout_request.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 6. payout_webhook
    op.create_table(
        'payout_webhook',
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
        sa.Column('webhook_id', sa.String(length=100), nullable=False),
        sa.Column('gateway_code', sa.String(length=50), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False),
        sa.Column('signature', sa.String(length=255), nullable=False),
        sa.Column('validation_result', sa.String(length=30), nullable=False),
        sa.Column('processed_time', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 7. payout_status_history
    op.create_table(
        'payout_status_history',
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
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('old_status', sa.String(length=30), nullable=False),
        sa.Column('new_status', sa.String(length=30), nullable=False),
        sa.Column('changed_by', sa.String(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['payout_id'], ['payout_request.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 8. payout_retry
    op.create_table(
        'payout_retry',
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
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retry_number', sa.Integer(), nullable=False),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('retry_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['payout_id'], ['payout_request.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 9. payout_reversal
    op.create_table(
        'payout_reversal',
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
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reversal_number', sa.String(length=100), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['payout_id'], ['payout_request.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 10. payout_exception
    op.create_table(
        'payout_exception',
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
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('error_code', sa.String(length=50), nullable=False),
        sa.Column('exception_details', sa.Text(), nullable=False),
        sa.Column('resolution_status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['payout_id'], ['payout_request.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 11. payout_reconciliation
    op.create_table(
        'payout_reconciliation',
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
        sa.Column('payout_number', sa.String(length=100), nullable=False),
        sa.Column('gateway_status', sa.String(length=50), nullable=False),
        sa.Column('bank_status', sa.String(length=50), nullable=False),
        sa.Column('ledger_status', sa.String(length=50), nullable=False),
        sa.Column('wallet_status', sa.String(length=50), nullable=False),
        sa.Column('difference_amount', sa.Float(), nullable=False),
        sa.Column('resolution', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 12. bank_gateway
    op.create_table(
        'bank_gateway',
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
        sa.Column('gateway_code', sa.String(length=50), nullable=False),
        sa.Column('gateway_name', sa.String(length=100), nullable=False),
        sa.Column('api_endpoint', sa.String(length=255), nullable=False),
        sa.Column('auth_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('timeout_sec', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'gateway_code', name='uq_tenant_bank_gateway_code')
    )

    # 13. beneficiary_bank_account
    op.create_table(
        'beneficiary_bank_account',
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
        sa.Column('bank_name', sa.String(length=100), nullable=False),
        sa.Column('account_holder', sa.String(length=100), nullable=False),
        sa.Column('account_number', sa.String(length=50), nullable=False),
        sa.Column('ifsc_code', sa.String(length=20), nullable=False),
        sa.Column('upi_id', sa.String(length=100), nullable=True),
        sa.Column('verification_status', sa.String(length=30), nullable=False),
        sa.Column('primary_flag', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['retailer_id'], ['retailer.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )


def downgrade() -> None:
    op.drop_table('beneficiary_bank_account')
    op.drop_table('bank_gateway')
    op.drop_table('payout_reconciliation')
    op.drop_table('payout_exception')
    op.drop_table('payout_reversal')
    op.drop_table('payout_retry')
    op.drop_table('payout_status_history')
    op.drop_table('payout_webhook')
    op.drop_table('payout_bank_response')
    op.drop_table('payout_bank_request')
    op.drop_table('payout_transaction')
    op.drop_table('payout_batch')
    op.drop_table('payout_request')
