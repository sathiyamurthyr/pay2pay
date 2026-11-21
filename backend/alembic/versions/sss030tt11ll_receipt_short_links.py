"""receipt_short_links

Revision ID: sss030tt11ll
Revises: rrr029ss00kk
Create Date: 2026-11-21 20:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'sss030tt11ll'
down_revision = 'rrr029ss00kk'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Create receipt_short_links table
    op.execute("""
    CREATE TABLE IF NOT EXISTS public.receipt_short_links (
        receipt_short_link_ref_id BIGSERIAL PRIMARY KEY,
        short_code VARCHAR(16) NOT NULL UNIQUE,
        tid VARCHAR(60) NOT NULL,
        payin_transactions_ref_id BIGINT REFERENCES public.payin_transactions(payin_transactions_ref_id) ON DELETE CASCADE,
        receipt_token TEXT NOT NULL,
        company_ref_id BIGINT NOT NULL REFERENCES public.company(company_ref_id) ON DELETE RESTRICT,
        user_type_ref_id BIGINT REFERENCES public.user_type(user_type_ref_id) ON DELETE RESTRICT,
        user_ref_id BIGINT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        revocation_reason VARCHAR(255),
        access_count INTEGER NOT NULL DEFAULT 0,
        last_accessed_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    """)

    # 2. Add receipt_short_code to payin_transactions
    op.execute("""
    ALTER TABLE public.payin_transactions ADD COLUMN IF NOT EXISTS receipt_short_code VARCHAR(16) UNIQUE;
    """)

    # 3. Create indexes
    op.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_receipt_short_links_code ON public.receipt_short_links (short_code);
    CREATE INDEX IF NOT EXISTS idx_receipt_short_links_tid ON public.receipt_short_links (tid);
    CREATE INDEX IF NOT EXISTS idx_receipt_short_links_company ON public.receipt_short_links (company_ref_id);
    CREATE INDEX IF NOT EXISTS idx_receipt_short_links_active ON public.receipt_short_links (is_active, is_revoked);
    CREATE INDEX IF NOT EXISTS idx_payin_txns_short_code ON public.payin_transactions (receipt_short_code);
    """)

def downgrade():
    op.execute("""
    DROP TABLE IF EXISTS public.receipt_short_links CASCADE;
    ALTER TABLE public.payin_transactions DROP COLUMN IF EXISTS receipt_short_code;
    """)
