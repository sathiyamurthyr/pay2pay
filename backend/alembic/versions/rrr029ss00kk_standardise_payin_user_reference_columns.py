"""standardise_payin_user_reference_columns

Revision ID: rrr029ss00kk
Revises: qqq028rr99jj
Create Date: 2026-11-21 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'rrr029ss00kk'
down_revision = 'qqq028rr99jj'
branch_labels = None
depends_on = None

def upgrade():
    # 1. payin_transactions
    op.execute("""
    ALTER TABLE public.payin_transactions ADD COLUMN IF NOT EXISTS user_type_ref_id BIGINT REFERENCES public.user_type(user_type_ref_id);
    ALTER TABLE public.payin_transactions ADD COLUMN IF NOT EXISTS user_ref_id BIGINT;
    ALTER TABLE public.payin_transactions ALTER COLUMN retailer_ref_id DROP NOT NULL;
    """)

    # 2. payin_api_logs
    op.execute("""
    ALTER TABLE public.payin_api_logs ADD COLUMN IF NOT EXISTS user_type_ref_id BIGINT REFERENCES public.user_type(user_type_ref_id);
    ALTER TABLE public.payin_api_logs ADD COLUMN IF NOT EXISTS user_ref_id BIGINT;
    """)

    # 3. payin_callback_logs
    op.execute("""
    ALTER TABLE public.payin_callback_logs ADD COLUMN IF NOT EXISTS user_type_ref_id BIGINT REFERENCES public.user_type(user_type_ref_id);
    ALTER TABLE public.payin_callback_logs ADD COLUMN IF NOT EXISTS user_ref_id BIGINT;
    """)

    # 4. payin_audit_logs
    op.execute("""
    ALTER TABLE public.payin_audit_logs ADD COLUMN IF NOT EXISTS user_type_ref_id BIGINT REFERENCES public.user_type(user_type_ref_id);
    ALTER TABLE public.payin_audit_logs ADD COLUMN IF NOT EXISTS user_ref_id BIGINT;
    """)

    # 5. Dynamic data backfill using authoritative public.user_type lookup
    op.execute("""
    DO $$
    DECLARE
        v_ret_type_id BIGINT;
        v_admin_type_id BIGINT;
    BEGIN
        SELECT user_type_ref_id INTO v_ret_type_id FROM public.user_type WHERE UPPER(user_type_code) = 'RETAILER';
        SELECT user_type_ref_id INTO v_admin_type_id FROM public.user_type WHERE UPPER(user_type_code) = 'ADMIN';

        UPDATE public.payin_transactions 
        SET user_type_ref_id = v_ret_type_id, 
            user_ref_id = COALESCE(user_ref_id, retailer_ref_id) 
        WHERE user_type_ref_id IS NULL;

        UPDATE public.payin_api_logs 
        SET user_type_ref_id = v_ret_type_id, 
            user_ref_id = COALESCE(user_ref_id, retailer_ref_id) 
        WHERE user_type_ref_id IS NULL AND retailer_ref_id IS NOT NULL;

        UPDATE public.payin_audit_logs 
        SET user_type_ref_id = v_admin_type_id, 
            user_ref_id = COALESCE(user_ref_id, actor_ref_id) 
        WHERE user_type_ref_id IS NULL AND actor_ref_id IS NOT NULL;

        UPDATE public.payin_callback_logs c 
        SET user_type_ref_id = t.user_type_ref_id, 
            user_ref_id = t.user_ref_id 
        FROM public.payin_transactions t 
        WHERE c.tid = t.tid AND c.user_type_ref_id IS NULL;
    END $$;
    """)

    # 6. Composite & standard indexes
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_payin_txns_company_user ON public.payin_transactions(company_ref_id, user_type_ref_id, user_ref_id);
    CREATE INDEX IF NOT EXISTS idx_payin_txns_user_type_ref ON public.payin_transactions(user_type_ref_id);
    CREATE INDEX IF NOT EXISTS idx_payin_txns_user_ref ON public.payin_transactions(user_ref_id);
    CREATE INDEX IF NOT EXISTS idx_payin_api_logs_company_user ON public.payin_api_logs(company_ref_id, user_type_ref_id, user_ref_id);
    CREATE INDEX IF NOT EXISTS idx_payin_callback_logs_company_user ON public.payin_callback_logs(company_ref_id, user_type_ref_id, user_ref_id);
    CREATE INDEX IF NOT EXISTS idx_payin_audit_logs_company_user ON public.payin_audit_logs(company_ref_id, user_type_ref_id, user_ref_id);
    """)

def downgrade():
    op.execute("""
    DROP INDEX IF EXISTS public.idx_payin_audit_logs_company_user;
    DROP INDEX IF EXISTS public.idx_payin_callback_logs_company_user;
    DROP INDEX IF EXISTS public.idx_payin_api_logs_company_user;
    DROP INDEX IF EXISTS public.idx_payin_txns_user_ref;
    DROP INDEX IF EXISTS public.idx_payin_txns_user_type_ref;
    DROP INDEX IF EXISTS public.idx_payin_txns_company_user;

    ALTER TABLE public.payin_audit_logs DROP COLUMN IF EXISTS user_ref_id;
    ALTER TABLE public.payin_audit_logs DROP COLUMN IF EXISTS user_type_ref_id;

    ALTER TABLE public.payin_callback_logs DROP COLUMN IF EXISTS user_ref_id;
    ALTER TABLE public.payin_callback_logs DROP COLUMN IF EXISTS user_type_ref_id;

    ALTER TABLE public.payin_api_logs DROP COLUMN IF EXISTS user_ref_id;
    ALTER TABLE public.payin_api_logs DROP COLUMN IF EXISTS user_type_ref_id;

    ALTER TABLE public.payin_transactions DROP COLUMN IF EXISTS user_type_ref_id;
    """)
