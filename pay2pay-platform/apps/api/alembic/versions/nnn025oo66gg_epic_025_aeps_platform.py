"""EPIC-025 — Aadhaar Enabled Payment System (AEPS) Platform Schema

Revision ID: nnn025oo66gg
Revises: mmm024nn55ff
Create Date: 2026-07-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'nnn025oo66gg'
down_revision = 'mmm024nn55ff'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. aeps_transaction
    op.create_table(
        'aeps_transaction',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_number', sa.String(length=40), nullable=False),
        sa.Column('rrn', sa.String(length=50), nullable=True),
        sa.Column('stan', sa.String(length=50), nullable=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('distributor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('device_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('masked_aadhaar', sa.String(length=20), nullable=False),
        sa.Column('bank_iin', sa.String(length=20), nullable=False),
        sa.Column('bank_name', sa.String(length=200), nullable=False),
        sa.Column('service_type', sa.String(length=40), nullable=False, server_default='CASH_WITHDRAWAL'),  # CASH_WITHDRAWAL, BALANCE_ENQUIRY, MINI_STATEMENT, CASH_DEPOSIT
        sa.Column('transaction_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('available_balance', sa.Float(), nullable=True),
        sa.Column('ledger_balance', sa.Float(), nullable=True),
        sa.Column('service_charge', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('gst_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('retailer_commission', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('net_settlement_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('transaction_status', sa.String(length=50), nullable=False, server_default='INITIATED'),
        sa.Column('auth_response_code', sa.String(length=20), nullable=True),
        sa.Column('auth_response_message', sa.Text(), nullable=True),
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
        sa.UniqueConstraint('tenant_id', 'transaction_number', name='uq_aeps_txn_tenant_number'),
    )
    op.create_index('ix_aeps_txn_number', 'aeps_transaction', ['transaction_number'])
    op.create_index('ix_aeps_txn_customer', 'aeps_transaction', ['customer_id'])
    op.create_index('ix_aeps_txn_retailer', 'aeps_transaction', ['retailer_id'])
    op.create_index('ix_aeps_txn_status', 'aeps_transaction', ['transaction_status'])

    # 2. aeps_transaction_status
    op.create_table(
        'aeps_transaction_status',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('current_status', sa.String(length=50), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 3. aeps_biometric_capture
    op.create_table(
        'aeps_biometric_capture',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('biometric_type', sa.String(length=30), nullable=False, server_default='FINGERPRINT'),  # FINGERPRINT, IRIS
        sa.Column('vendor_name', sa.String(length=100), nullable=False),
        sa.Column('device_serial_number', sa.String(length=100), nullable=False),
        sa.Column('pid_block_encrypted', sa.Text(), nullable=False),
        sa.Column('quality_score', sa.Integer(), nullable=False, server_default='85'),
        sa.Column('capture_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 4. aeps_device
    op.create_table(
        'aeps_device',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('device_serial_number', sa.String(length=100), nullable=False),
        sa.Column('vendor_name', sa.String(length=100), nullable=False),  # MANTRA, MORPHO, STARTEK, COGENT
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('rd_service_version', sa.String(length=50), nullable=False, server_default='1.0.4'),
        sa.Column('firmware_version', sa.String(length=50), nullable=False, server_default='2.0.1'),
        sa.Column('device_status', sa.String(length=30), nullable=False, server_default='ACTIVE'),
        sa.Column('assigned_retailer_id', postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'device_serial_number', name='uq_aeps_device_tenant_serial'),
    )

    # 5. aeps_device_health
    op.create_table(
        'aeps_device_health',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('device_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('last_ping_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('health_status', sa.String(length=30), nullable=False, server_default='HEALTHY'),
        sa.Column('battery_level_pct', sa.Integer(), nullable=True, server_default='95'),
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
        sa.ForeignKeyConstraint(['device_id'], ['aeps_device.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 6. aeps_bank_request
    op.create_table(
        'aeps_bank_request',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bank_iin', sa.String(length=20), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 7. aeps_bank_response
    op.create_table(
        'aeps_bank_response',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('response_code', sa.String(length=20), nullable=False),
        sa.Column('response_message', sa.Text(), nullable=True),
        sa.Column('bank_rrn', sa.String(length=50), nullable=True),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 8. aeps_npci_log
    op.create_table(
        'aeps_npci_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('npci_txn_id', sa.String(length=100), nullable=False),
        sa.Column('npci_status', sa.String(length=30), nullable=False, server_default='SUCCESS'),
        sa.Column('npci_response_code', sa.String(length=20), nullable=False, server_default='00'),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 9. aeps_transaction_charge
    op.create_table(
        'aeps_transaction_charge',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_charge', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('gst_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('npci_charge', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('bank_charge', sa.Float(), nullable=False, server_default='0.5'),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 10. aeps_commission
    op.create_table(
        'aeps_commission',
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 11. aeps_retry
    op.create_table(
        'aeps_retry',
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 12. aeps_reversal
    op.create_table(
        'aeps_reversal',
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 13. aeps_dispute
    op.create_table(
        'aeps_dispute',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dispute_number', sa.String(length=40), nullable=False),
        sa.Column('dispute_type', sa.String(length=50), nullable=False, server_default='CASH_NOT_DISPENSED'),
        sa.Column('dispute_status', sa.String(length=30), nullable=False, server_default='OPEN'),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 14. aeps_settlement
    op.create_table(
        'aeps_settlement',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 15. aeps_status_history
    op.create_table(
        'aeps_status_history',
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 16. aeps_notification
    op.create_table(
        'aeps_notification',
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 17. aeps_receipt
    op.create_table(
        'aeps_receipt',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('public_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('receipt_number', sa.String(length=40), nullable=False),
        sa.Column('receipt_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )

    # 18. aeps_audit
    op.create_table(
        'aeps_audit',
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
        sa.ForeignKeyConstraint(['transaction_id'], ['aeps_transaction.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
    )


def downgrade() -> None:
    op.drop_table('aeps_audit')
    op.drop_table('aeps_receipt')
    op.drop_table('aeps_notification')
    op.drop_table('aeps_status_history')
    op.drop_table('aeps_settlement')
    op.drop_table('aeps_dispute')
    op.drop_table('aeps_reversal')
    op.drop_table('aeps_retry')
    op.drop_table('aeps_commission')
    op.drop_table('aeps_transaction_charge')
    op.drop_table('aeps_npci_log')
    op.drop_table('aeps_bank_response')
    op.drop_table('aeps_bank_request')
    op.drop_table('aeps_device_health')
    op.drop_table('aeps_device')
    op.drop_table('aeps_biometric_capture')
    op.drop_table('aeps_transaction_status')
    op.drop_table('aeps_transaction')
