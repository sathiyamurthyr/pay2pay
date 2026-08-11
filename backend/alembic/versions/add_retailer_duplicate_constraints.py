"""add_retailer_duplicate_constraints

Revision ID: retailer_duplicate_001
Revises: ooo026pp77hh
Create Date: 2026-08-11 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'retailer_duplicate_001'
down_revision = 'ooo026pp77hh'
branch_labels = None
depends_on = None

def upgrade():
    # Add aadhaar_number to retailer_kyc if missing
    try:
        op.add_column('retailer_kyc', sa.Column('aadhaar_number', sa.String(length=20), nullable=True))
        op.create_index('ix_retailer_kyc_aadhaar_number', 'retailer_kyc', ['aadhaar_number'], unique=False)
    except Exception:
        pass

    # Add upi_id to retailer_bank if missing
    try:
        op.add_column('retailer_bank', sa.Column('upi_id', sa.String(length=100), nullable=True))
        op.create_index('ix_retailer_bank_upi_id', 'retailer_bank', ['upi_id'], unique=False)
    except Exception:
        pass

    # Add Composite Unique Constraints for Retailer Duplicate Validation (tenant_id + company_id + field)
    try:
        op.create_unique_constraint('uq_retailer_contact_tenant_company_mobile', 'retailer_contact', ['tenant_id', 'company_id', 'mobile'])
        op.create_unique_constraint('uq_retailer_contact_tenant_company_email', 'retailer_contact', ['tenant_id', 'company_id', 'email'])
        op.create_unique_constraint('uq_retailer_bank_tenant_company_account', 'retailer_bank', ['tenant_id', 'company_id', 'account_number'])
        op.create_unique_constraint('uq_retailer_bank_tenant_company_upi', 'retailer_bank', ['tenant_id', 'company_id', 'upi_id'])
        op.create_unique_constraint('uq_retailer_kyc_tenant_company_pan', 'retailer_kyc', ['tenant_id', 'company_id', 'pan_number'])
        op.create_unique_constraint('uq_retailer_kyc_tenant_company_gst', 'retailer_kyc', ['tenant_id', 'company_id', 'gst_number'])
        op.create_unique_constraint('uq_retailer_kyc_tenant_company_aadhaar', 'retailer_kyc', ['tenant_id', 'company_id', 'aadhaar_number'])
    except Exception:
        pass

def downgrade():
    try:
        op.drop_constraint('uq_retailer_kyc_tenant_company_aadhaar', 'retailer_kyc', type_='unique')
        op.drop_constraint('uq_retailer_kyc_tenant_company_gst', 'retailer_kyc', type_='unique')
        op.drop_constraint('uq_retailer_kyc_tenant_company_pan', 'retailer_kyc', type_='unique')
        op.drop_constraint('uq_retailer_bank_tenant_company_upi', 'retailer_bank', type_='unique')
        op.drop_constraint('uq_retailer_bank_tenant_company_account', 'retailer_bank', type_='unique')
        op.drop_constraint('uq_retailer_contact_tenant_company_email', 'retailer_contact', type_='unique')
        op.drop_constraint('uq_retailer_contact_tenant_company_mobile', 'retailer_contact', type_='unique')
    except Exception:
        pass
