"""epic_007_settlement_intake

Revision ID: 666c77dd99bb
Revises: 555b99cc88aa
Create Date: 2026-07-30 07:53:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '666c77dd99bb'
down_revision: Union[str, None] = '555b99cc88aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. settlement_file
    op.create_table(
        'settlement_file',
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
        sa.Column('file_number', sa.String(length=100), nullable=False),
        sa.Column('bank_name', sa.String(length=100), nullable=False),
        sa.Column('settlement_date', sa.Date(), nullable=False),
        sa.Column('business_date', sa.Date(), nullable=False),
        sa.Column('original_file_name', sa.String(length=255), nullable=False),
        sa.Column('stored_file_name', sa.String(length=255), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('checksum', sa.String(length=64), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('uploaded_by', sa.String(length=255), nullable=False),
        sa.Column('completed_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('tenant_id', 'file_hash', name='uq_tenant_settlement_file_hash')
    )

    # 2. settlement_file_detail
    op.create_table(
        'settlement_file_detail',
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
        sa.Column('file_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('line_number', sa.Integer(), nullable=False),
        sa.Column('txn_reference', sa.String(length=100), nullable=False),
        sa.Column('mid', sa.String(length=50), nullable=False),
        sa.Column('tid', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('settlement_amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('validation_result', sa.Text(), nullable=True),
        sa.Column('reject_reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['file_id'], ['settlement_file.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 3. settlement_staging
    op.create_table(
        'settlement_staging',
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
        sa.Column('settlement_date', sa.Date(), nullable=False),
        sa.Column('machine_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('settlement_amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('validation_status', sa.String(length=30), nullable=False),
        sa.Column('processed_flag', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['machine_id'], ['swipe_machine.public_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['retailer_id'], ['retailer.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 4. settlement_reject
    op.create_table(
        'settlement_reject',
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
        sa.Column('line_number', sa.Integer(), nullable=False),
        sa.Column('reject_code', sa.String(length=50), nullable=False),
        sa.Column('reject_message', sa.Text(), nullable=False),
        sa.Column('original_data', sa.Text(), nullable=False),
        sa.Column('corrected_flag', sa.Boolean(), nullable=False),
        sa.Column('resolved_by', sa.String(length=255), nullable=True),
        sa.Column('resolved_date', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 5. settlement_duplicate
    op.create_table(
        'settlement_duplicate',
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
        sa.Column('duplicate_type', sa.String(length=50), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=False),
        sa.Column('existing_batch', sa.String(length=100), nullable=False),
        sa.Column('current_batch', sa.String(length=100), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('action_taken', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 6. settlement_validation
    op.create_table(
        'settlement_validation',
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
        sa.Column('validation_rule', sa.String(length=100), nullable=False),
        sa.Column('result', sa.String(length=30), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('executed_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('executed_by', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 7. settlement_import_log
    op.create_table(
        'settlement_import_log',
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
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('details', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 8. settlement_file_history
    op.create_table(
        'settlement_file_history',
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
        sa.Column('file_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('changed_by', sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(['file_id'], ['settlement_file.public_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )

    # 9. settlement_upload_batch
    op.create_table(
        'settlement_upload_batch',
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
        sa.Column('total_files_count', sa.Integer(), nullable=False),
        sa.Column('total_records', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id')
    )


def downgrade() -> None:
    op.drop_table('settlement_upload_batch')
    op.drop_table('settlement_file_history')
    op.drop_table('settlement_import_log')
    op.drop_table('settlement_validation')
    op.drop_table('settlement_duplicate')
    op.drop_table('settlement_reject')
    op.drop_table('settlement_staging')
    op.drop_table('settlement_file_detail')
    op.drop_table('settlement_file')
