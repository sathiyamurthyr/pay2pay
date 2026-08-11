"""epic_008_settlement_processing

Revision ID: 777d88ee00cc
Revises: 666c77dd99bb
Create Date: 2026-07-30 07:56:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '777d88ee00cc'
down_revision: Union[str, None] = '666c77dd99bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. settlement_transaction
    op.create_table(
        'settlement_transaction',
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
        sa.Column('settlement_number', sa.String(length=100), nullable=False),
        sa.Column('batch_number', sa.String(length=100), nullable=False),
        sa.Column('machine_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('settlement_date', sa.Date(), nullable=False),
        sa.Column('gross_amount', sa.Float(), nullable=False),
        sa.Column('net_amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['machine_id'], ['swipe_machine.public_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['retailer_id'], ['retailer.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'settlement_number', name='uq_tenant_settlement_number')
    )

    # 2. settlement_calculation
    op.create_table(
        'settlement_calculation',
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
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('calculation_version', sa.String(length=20), nullable=False),
        sa.Column('gross_amount', sa.Float(), nullable=False),
        sa.Column('charge_amount', sa.Float(), nullable=False),
        sa.Column('commission_amount', sa.Float(), nullable=False),
        sa.Column('gst_amount', sa.Float(), nullable=False),
        sa.Column('tds_amount', sa.Float(), nullable=False),
        sa.Column('net_settlement', sa.Float(), nullable=False),
        sa.Column('calculation_time', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlement_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 3. settlement_charge
    op.create_table(
        'settlement_charge',
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
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('charge_type', sa.String(length=50), nullable=False),
        sa.Column('charge_source', sa.String(length=50), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=False),
        sa.Column('fixed_amount', sa.Float(), nullable=False),
        sa.Column('calculated_amount', sa.Float(), nullable=False),
        sa.Column('configuration_version', sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlement_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 4. settlement_commission
    op.create_table(
        'settlement_commission',
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
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hierarchy_level', sa.String(length=50), nullable=False),
        sa.Column('commission_type', sa.String(length=30), nullable=False),
        sa.Column('commission_percentage', sa.Float(), nullable=False),
        sa.Column('commission_amount', sa.Float(), nullable=False),
        sa.Column('recipient_entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlement_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 5. settlement_tax
    op.create_table(
        'settlement_tax',
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
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tax_type', sa.String(length=30), nullable=False),
        sa.Column('cgst_pct', sa.Float(), nullable=False),
        sa.Column('sgst_pct', sa.Float(), nullable=False),
        sa.Column('igst_pct', sa.Float(), nullable=False),
        sa.Column('cess_pct', sa.Float(), nullable=False),
        sa.Column('tds_pct', sa.Float(), nullable=False),
        sa.Column('tax_amount', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlement_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 6. wallet_transaction
    op.create_table(
        'wallet_transaction',
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
        sa.Column('txn_type', sa.String(length=30), nullable=False),
        sa.Column('credit_amount', sa.Float(), nullable=False),
        sa.Column('opening_balance', sa.Float(), nullable=False),
        sa.Column('closing_balance', sa.Float(), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=False),
        sa.Column('transaction_status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['retailer_wallet.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 7. wallet_balance_history
    op.create_table(
        'wallet_balance_history',
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
        sa.Column('previous_balance', sa.Float(), nullable=False),
        sa.Column('new_balance', sa.Float(), nullable=False),
        sa.Column('changed_by', sa.String(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['retailer_wallet.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 8. transaction_ledger
    op.create_table(
        'transaction_ledger',
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
        sa.Column('transaction_number', sa.String(length=100), nullable=False),
        sa.Column('ledger_type', sa.String(length=50), nullable=False),
        sa.Column('debit', sa.Float(), nullable=False),
        sa.Column('credit', sa.Float(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=False),
        sa.Column('ledger_status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'ledger_number', name='uq_tenant_ledger_number')
    )

    # 9. accounting_journal
    op.create_table(
        'accounting_journal',
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
        sa.Column('journal_number', sa.String(length=100), nullable=False),
        sa.Column('journal_date', sa.Date(), nullable=False),
        sa.Column('posting_status', sa.String(length=30), nullable=False),
        sa.Column('posting_reference', sa.String(length=100), nullable=False),
        sa.Column('source_module', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'journal_number', name='uq_tenant_journal_number')
    )

    # 10. journal_entry
    op.create_table(
        'journal_entry',
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
        sa.Column('journal_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('account_code', sa.String(length=50), nullable=False),
        sa.Column('debit', sa.Float(), nullable=False),
        sa.Column('credit', sa.Float(), nullable=False),
        sa.Column('cost_centre', sa.String(length=50), nullable=False),
        sa.Column('narration', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['journal_id'], ['accounting_journal.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 11. settlement_processing_log
    op.create_table(
        'settlement_processing_log',
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
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('details', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlement_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 12. settlement_retry
    op.create_table(
        'settlement_retry',
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
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('attempt_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('exception_message', sa.Text(), nullable=False),
        sa.Column('next_retry_time', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlement_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 13. settlement_exception
    op.create_table(
        'settlement_exception',
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
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('error_code', sa.String(length=50), nullable=False),
        sa.Column('exception_details', sa.Text(), nullable=False),
        sa.Column('resolution_status', sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlement_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )


def downgrade() -> None:
    op.drop_table('settlement_exception')
    op.drop_table('settlement_retry')
    op.drop_table('settlement_processing_log')
    op.drop_table('journal_entry')
    op.drop_table('accounting_journal')
    op.drop_table('transaction_ledger')
    op.drop_table('wallet_balance_history')
    op.drop_table('wallet_transaction')
    op.drop_table('settlement_tax')
    op.drop_table('settlement_commission')
    op.drop_table('settlement_charge')
    op.drop_table('settlement_calculation')
    op.drop_table('settlement_transaction')
