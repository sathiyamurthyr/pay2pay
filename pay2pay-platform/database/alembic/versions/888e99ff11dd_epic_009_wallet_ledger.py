"""epic_009_wallet_ledger

Revision ID: 888e99ff11dd
Revises: 777d88ee00cc
Create Date: 2026-07-30 07:58:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '888e99ff11dd'
down_revision: Union[str, None] = '777d88ee00cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. enterprise_wallet
    op.create_table(
        'enterprise_wallet',
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
        sa.Column('wallet_number', sa.String(length=100), nullable=False),
        sa.Column('wallet_type', sa.String(length=50), nullable=False),
        sa.Column('owner_type', sa.String(length=50), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('opening_date', sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'wallet_number', name='uq_tenant_enterprise_wallet_number')
    )

    # 2. enterprise_wallet_balance
    op.create_table(
        'enterprise_wallet_balance',
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
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('opening_balance', sa.Float(), nullable=False),
        sa.Column('credit', sa.Float(), nullable=False),
        sa.Column('debit', sa.Float(), nullable=False),
        sa.Column('closing_balance', sa.Float(), nullable=False),
        sa.Column('hold_balance', sa.Float(), nullable=False),
        sa.Column('reserved_balance', sa.Float(), nullable=False),
        sa.Column('available_balance', sa.Float(), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['enterprise_wallet.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 3. wallet_hold
    op.create_table(
        'wallet_hold',
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
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hold_reference', sa.String(length=100), nullable=False),
        sa.Column('hold_amount', sa.Float(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['wallet_id'], ['enterprise_wallet.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 4. wallet_adjustment
    op.create_table(
        'wallet_adjustment',
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
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('adjustment_number', sa.String(length=100), nullable=False),
        sa.Column('adjustment_type', sa.String(length=30), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('approved_by', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['enterprise_wallet.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 5. wallet_statement
    op.create_table(
        'wallet_statement',
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
        sa.Column('statement_number', sa.String(length=100), nullable=False),
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('statement_date', sa.Date(), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('file_path', sa.String(length=255), nullable=False),
        sa.Column('format', sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['enterprise_wallet.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 6. chart_of_accounts
    op.create_table(
        'chart_of_accounts',
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
        sa.Column('account_code', sa.String(length=50), nullable=False),
        sa.Column('account_name', sa.String(length=100), nullable=False),
        sa.Column('parent_account', sa.String(length=50), nullable=True),
        sa.Column('account_type', sa.String(length=50), nullable=False),
        sa.Column('nature', sa.String(length=20), nullable=False),
        sa.Column('posting_allowed', sa.Boolean(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'account_code', name='uq_tenant_coa_account_code')
    )

    # 7. gl_account
    op.create_table(
        'gl_account',
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
        sa.Column('gl_code', sa.String(length=50), nullable=False),
        sa.Column('account_name', sa.String(length=100), nullable=False),
        sa.Column('account_code', sa.String(length=50), nullable=False),
        sa.Column('balance', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'gl_code', name='uq_tenant_gl_code')
    )

    # 8. ledger_entry_detail
    op.create_table(
        'ledger_entry_detail',
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
        sa.Column('ledger_number', sa.String(length=100), nullable=False),
        sa.Column('gl_account_code', sa.String(length=50), nullable=False),
        sa.Column('debit', sa.Float(), nullable=False),
        sa.Column('credit', sa.Float(), nullable=False),
        sa.Column('narration', sa.Text(), nullable=False),
        sa.Column('cost_centre', sa.String(length=50), nullable=False),
        sa.Column('profit_centre', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 9. ledger_balance
    op.create_table(
        'ledger_balance',
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
        sa.Column('gl_account_code', sa.String(length=50), nullable=False),
        sa.Column('as_on_date', sa.Date(), nullable=False),
        sa.Column('debit_total', sa.Float(), nullable=False),
        sa.Column('credit_total', sa.Float(), nullable=False),
        sa.Column('net_balance', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 10. ledger_reversal
    op.create_table(
        'ledger_reversal',
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
        sa.Column('original_ledger_number', sa.String(length=100), nullable=False),
        sa.Column('reversal_ledger_number', sa.String(length=100), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('reversed_by', sa.String(length=255), nullable=False),
        sa.Column('reversed_date', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 11. ledger_adjustment
    op.create_table(
        'ledger_adjustment',
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
        sa.Column('adjustment_number', sa.String(length=100), nullable=False),
        sa.Column('original_ledger_number', sa.String(length=100), nullable=False),
        sa.Column('adjustment_amount', sa.Float(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('approved_by', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 12. reconciliation_batch
    op.create_table(
        'reconciliation_batch',
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
        sa.Column('reconciliation_number', sa.String(length=100), nullable=False),
        sa.Column('source_module', sa.String(length=50), nullable=False),
        sa.Column('target_module', sa.String(length=50), nullable=False),
        sa.Column('difference_amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('completed_by', sa.String(length=255), nullable=False),
        sa.Column('completed_date', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'reconciliation_number', name='uq_tenant_reconciliation_number')
    )

    # 13. reconciliation_exception
    op.create_table(
        'reconciliation_exception',
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
        sa.Column('reconciliation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exception_code', sa.String(length=50), nullable=False),
        sa.Column('exception_details', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['reconciliation_id'], ['reconciliation_batch.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )


def downgrade() -> None:
    op.drop_table('reconciliation_exception')
    op.drop_table('reconciliation_batch')
    op.drop_table('ledger_adjustment')
    op.drop_table('ledger_reversal')
    op.drop_table('ledger_balance')
    op.drop_table('ledger_entry_detail')
    op.drop_table('gl_account')
    op.drop_table('chart_of_accounts')
    op.drop_table('wallet_statement')
    op.drop_table('wallet_adjustment')
    op.drop_table('wallet_hold')
    op.drop_table('enterprise_wallet_balance')
    op.drop_table('enterprise_wallet')
