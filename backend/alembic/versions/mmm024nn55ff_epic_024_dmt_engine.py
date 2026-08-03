"""EPIC-024 — Domestic Money Transfer (DMT) Transaction Engine Schema

Revision ID: mmm024nn55ff
Revises: lll023mm44ee
Create Date: 2026-07-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'mmm024nn55ff'
down_revision = 'lll023mm44ee'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. dmt_transaction
    op.create_table(
        'dmt_transaction',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_number', sa.String(length=40), nullable=False),
        sa.Column('rrn', sa.String(length=50), nullable=True),
        sa.Column('utr', sa.String(length=50), nullable=True),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('beneficiary_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('distributor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('service_type', sa.String(length=30), nullable=False, server_default='DMT'),
        sa.Column('transaction_mode', sa.String(length=20), nullable=False, server_default='IMPS'),  # IMPS, NEFT, RTGS
        sa.Column('transfer_amount', sa.Float(), nullable=False),
        sa.Column('service_charge', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('gst_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('total_debit_amount', sa.Float(), nullable=False),
        sa.Column('net_beneficiary_credit', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('bank_account_number', sa.String(length=50), nullable=False),
        sa.Column('bank_ifsc', sa.String(length=20), nullable=False),
        sa.Column('bank_name', sa.String(length=200), nullable=False),
        sa.Column('beneficiary_name', sa.String(length=300), nullable=False),
        sa.Column('transaction_status', sa.String(length=50), nullable=False, server_default='INITIATED'),
        sa.Column('purpose', sa.String(length=100), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('initiated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),

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
        sa.UniqueConstraint('tenant_id', 'transaction_number', name='uq_dmt_txn_tenant_number'),
    )
    op.create_index('ix_dmt_txn_number', 'dmt_transaction', ['transaction_number'])
    op.create_index('ix_dmt_txn_customer', 'dmt_transaction', ['customer_id'])
    op.create_index('ix_dmt_txn_beneficiary', 'dmt_transaction', ['beneficiary_id'])
    op.create_index('ix_dmt_txn_retailer', 'dmt_transaction', ['retailer_id'])
    op.create_index('ix_dmt_txn_status', 'dmt_transaction', ['transaction_status'])

    # 2. dmt_transaction_status
    op.create_table(
        'dmt_transaction_status',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('current_status', sa.String(length=50), nullable=False),
        sa.Column('sub_status', sa.String(length=50), nullable=True),
        sa.Column('status_message', sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 3. dmt_transaction_charge
    op.create_table(
        'dmt_transaction_charge',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_charge', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('bank_charge', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('switch_charge', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('gst_rate_pct', sa.Float(), nullable=False, server_default='18.0'),
        sa.Column('gst_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('net_charge', sa.Float(), nullable=False, server_default='0.0'),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 4. dmt_transaction_commission
    op.create_table(
        'dmt_transaction_commission',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer_commission', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('distributor_commission', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('super_distributor_commission', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('rm_commission', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('platform_commission', sa.Float(), nullable=False, server_default='0.0'),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 5. dmt_bank_request
    op.create_table(
        'dmt_bank_request',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bank_code', sa.String(length=50), nullable=False),
        sa.Column('api_endpoint', sa.String(length=255), nullable=False),
        sa.Column('request_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 6. dmt_bank_response
    op.create_table(
        'dmt_bank_response',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('response_code', sa.String(length=50), nullable=False),
        sa.Column('response_message', sa.Text(), nullable=True),
        sa.Column('bank_rrn', sa.String(length=50), nullable=True),
        sa.Column('bank_utr', sa.String(length=50), nullable=True),
        sa.Column('response_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 7. dmt_switch_log
    op.create_table(
        'dmt_switch_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('switch_name', sa.String(length=50), nullable=False, server_default='PRIMARY_SWITCH'),
        sa.Column('switch_status', sa.String(length=50), nullable=False),
        sa.Column('latency_ms', sa.Float(), nullable=True),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 8. dmt_retry
    op.create_table(
        'dmt_retry',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retry_attempt', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('retry_reason', sa.Text(), nullable=True),
        sa.Column('retry_status', sa.String(length=30), nullable=False, server_default='PENDING'),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 9. dmt_reversal
    op.create_table(
        'dmt_reversal',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reversal_number', sa.String(length=40), nullable=False),
        sa.Column('reversal_reason', sa.Text(), nullable=False),
        sa.Column('reversal_amount', sa.Float(), nullable=False),
        sa.Column('reversal_status', sa.String(length=30), nullable=False, server_default='COMPLETED'),
        sa.Column('reversed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 10. dmt_refund
    op.create_table(
        'dmt_refund',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('refund_number', sa.String(length=40), nullable=False),
        sa.Column('refund_amount', sa.Float(), nullable=False),
        sa.Column('refund_status', sa.String(length=30), nullable=False, server_default='SUCCESS'),
        sa.Column('refunded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 11. dmt_dispute
    op.create_table(
        'dmt_dispute',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dispute_number', sa.String(length=40), nullable=False),
        sa.Column('dispute_reason', sa.Text(), nullable=False),
        sa.Column('dispute_status', sa.String(length=30), nullable=False, server_default='OPEN'),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 12. dmt_status_history
    op.create_table(
        'dmt_status_history',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_status', sa.String(length=50), nullable=True),
        sa.Column('to_status', sa.String(length=50), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 13. dmt_audit
    op.create_table(
        'dmt_audit',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 14. dmt_notification
    op.create_table(
        'dmt_notification',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_mobile', sa.String(length=20), nullable=False),
        sa.Column('notification_type', sa.String(length=30), nullable=False, server_default='SMS'),
        sa.Column('message_content', sa.Text(), nullable=False),
        sa.Column('delivery_status', sa.String(length=30), nullable=False, server_default='DELIVERED'),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 15. dmt_settlement
    op.create_table(
        'dmt_settlement',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('settlement_batch_id', sa.String(length=50), nullable=True),
        sa.Column('settlement_status', sa.String(length=30), nullable=False, server_default='SETTLED'),
        sa.Column('settled_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['dmt_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )


def downgrade() -> None:
    op.drop_table('dmt_settlement')
    op.drop_table('dmt_notification')
    op.drop_table('dmt_audit')
    op.drop_table('dmt_status_history')
    op.drop_table('dmt_dispute')
    op.drop_table('dmt_refund')
    op.drop_table('dmt_reversal')
    op.drop_table('dmt_retry')
    op.drop_table('dmt_switch_log')
    op.drop_table('dmt_bank_response')
    op.drop_table('dmt_bank_request')
    op.drop_table('dmt_transaction_commission')
    op.drop_table('dmt_transaction_charge')
    op.drop_table('dmt_transaction_status')
    op.drop_table('dmt_transaction')
