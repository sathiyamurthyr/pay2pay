-- =============================================================================
-- PAY2PAY USER TYPE MASTER MIGRATION & STANDARDIZATION
-- =============================================================================

-- 1. Ensure user_type master table exists and matches standard schema
CREATE TABLE IF NOT EXISTS public.user_type (
    user_type_ref_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_type_code   VARCHAR(50) NOT NULL UNIQUE,
    user_type_name   VARCHAR(100) NOT NULL,
    code             VARCHAR(50),
    name             VARCHAR(100),
    description      TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    created_date     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       VARCHAR(255) DEFAULT 'SYSTEM',
    updated_date     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by       VARCHAR(255) DEFAULT 'SYSTEM'
);

-- Ensure all columns exist on user_type if table already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'user_type_code') THEN
        ALTER TABLE public.user_type ADD COLUMN user_type_code VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'user_type_name') THEN
        ALTER TABLE public.user_type ADD COLUMN user_type_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'code') THEN
        ALTER TABLE public.user_type ADD COLUMN code VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'name') THEN
        ALTER TABLE public.user_type ADD COLUMN name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'description') THEN
        ALTER TABLE public.user_type ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'is_active') THEN
        ALTER TABLE public.user_type ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'is_deleted') THEN
        ALTER TABLE public.user_type ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'created_date') THEN
        ALTER TABLE public.user_type ADD COLUMN created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'created_by') THEN
        ALTER TABLE public.user_type ADD COLUMN created_by VARCHAR(255) DEFAULT 'SYSTEM';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'updated_date') THEN
        ALTER TABLE public.user_type ADD COLUMN updated_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'updated_by') THEN
        ALTER TABLE public.user_type ADD COLUMN updated_by VARCHAR(255) DEFAULT 'SYSTEM';
    END IF;
    -- Make tenant_id and public_id nullable if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'tenant_id' AND is_nullable = 'NO') THEN
        ALTER TABLE public.user_type ALTER COLUMN tenant_id DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'public_id' AND is_nullable = 'NO') THEN
        ALTER TABLE public.user_type ALTER COLUMN public_id DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'code' AND is_nullable = 'NO') THEN
        ALTER TABLE public.user_type ALTER COLUMN code DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_type' AND column_name = 'name' AND is_nullable = 'NO') THEN
        ALTER TABLE public.user_type ALTER COLUMN name DROP NOT NULL;
    END IF;
END $$;

-- 2. Seed Default User Type Master Data (1..6)
-- 1 | ADMIN       | Admin
-- 2 | RETAILER    | Retailer
-- 3 | DISTRIBUTOR | Distributor
-- 4 | SD          | Super Distributor
-- 5 | CRM         | CRM
-- 6 | RM          | Regional Manager

INSERT INTO public.user_type (
    user_type_ref_id, user_type_code, user_type_name, code, name, description, is_active, is_deleted, created_by, updated_by
) OVERRIDING SYSTEM VALUE
VALUES
    (1, 'ADMIN', 'Admin', 'ADMIN', 'Admin', 'Full administrative access.', TRUE, FALSE, 'SYSTEM', 'SYSTEM'),
    (2, 'RETAILER', 'Retailer', 'RETAILER', 'Retailer', 'Retailer-level transactions and payouts.', TRUE, FALSE, 'SYSTEM', 'SYSTEM'),
    (3, 'DISTRIBUTOR', 'Distributor', 'DISTRIBUTOR', 'Distributor', 'Distributor-level transactions and mapped retailer data.', TRUE, FALSE, 'SYSTEM', 'SYSTEM'),
    (4, 'SD', 'Super Distributor', 'SD', 'Super Distributor', 'Super Distributor-level transactions and mapped hierarchy.', TRUE, FALSE, 'SYSTEM', 'SYSTEM'),
    (5, 'CRM', 'CRM', 'CRM', 'CRM', 'Customer/service/support transaction visibility according to authorization.', TRUE, FALSE, 'SYSTEM', 'SYSTEM'),
    (6, 'RM', 'Regional Manager', 'RM', 'Regional Manager', 'Regional Manager transactions for mapped retailers.', TRUE, FALSE, 'SYSTEM', 'SYSTEM')
ON CONFLICT (user_type_ref_id) DO UPDATE SET
    user_type_code = EXCLUDED.user_type_code,
    user_type_name = EXCLUDED.user_type_name,
    code           = EXCLUDED.code,
    name           = EXCLUDED.name,
    description    = EXCLUDED.description,
    is_active      = EXCLUDED.is_active,
    is_deleted     = EXCLUDED.is_deleted,
    updated_date   = CURRENT_TIMESTAMP,
    updated_by     = 'SYSTEM';

-- Also ensure unique constraint on user_type_code and code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_type_user_type_code'
    ) THEN
        BEGIN
            ALTER TABLE public.user_type ADD CONSTRAINT uq_user_type_user_type_code UNIQUE (user_type_code);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;


-- 3. TRANSACTIONS TABLE
-- Add user_type_ref_id and user_type columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'user_type_ref_id'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN user_type_ref_id BIGINT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'user_type'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN user_type VARCHAR(50);
    END IF;
END $$;

-- Temporarily disable update trigger to backfill existing records
ALTER TABLE public.transactions DISABLE TRIGGER trg_transactions_no_update;

UPDATE public.transactions t
SET 
    user_type = COALESCE(t.user_type, 'RETAILER'),
    user_type_ref_id = ut.user_type_ref_id
FROM public.user_type ut
WHERE UPPER(COALESCE(t.user_type, 'RETAILER')) = UPPER(ut.user_type_code)
  AND t.user_type_ref_id IS NULL;

UPDATE public.transactions
SET 
    user_type = 'RETAILER',
    user_type_ref_id = 2
WHERE user_type_ref_id IS NULL;

ALTER TABLE public.transactions ENABLE TRIGGER trg_transactions_no_update;

-- Add Foreign Key constraint for transactions.user_type_ref_id -> user_type.user_type_ref_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_user_type_ref_id'
    ) THEN
        ALTER TABLE public.transactions 
        ADD CONSTRAINT fk_transactions_user_type_ref_id 
        FOREIGN KEY (user_type_ref_id) 
        REFERENCES public.user_type(user_type_ref_id);
    END IF;
END $$;

-- Add Index on transactions(user_type_ref_id)
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_ref_id ON public.transactions(user_type_ref_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_type);


-- 4. PAYOUT_TRANSACTION TABLE
-- Add user_type_ref_id and user_type columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payout_transaction' AND column_name = 'user_type_ref_id'
    ) THEN
        ALTER TABLE public.payout_transaction ADD COLUMN user_type_ref_id BIGINT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'payout_transaction' AND column_name = 'user_type'
    ) THEN
        ALTER TABLE public.payout_transaction ADD COLUMN user_type VARCHAR(50);
    END IF;
END $$;

-- Backfill payout_transaction user_type and user_type_ref_id
UPDATE public.payout_transaction pt
SET 
    user_type = COALESCE(pt.user_type, 'RETAILER'),
    user_type_ref_id = ut.user_type_ref_id
FROM public.user_type ut
WHERE UPPER(COALESCE(pt.user_type, 'RETAILER')) = UPPER(ut.user_type_code)
  AND pt.user_type_ref_id IS NULL;

UPDATE public.payout_transaction
SET 
    user_type = 'RETAILER',
    user_type_ref_id = 2
WHERE user_type_ref_id IS NULL;

-- Add Foreign Key constraint for payout_transaction.user_type_ref_id -> user_type.user_type_ref_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_payout_transaction_user_type_ref_id'
    ) THEN
        ALTER TABLE public.payout_transaction 
        ADD CONSTRAINT fk_payout_transaction_user_type_ref_id 
        FOREIGN KEY (user_type_ref_id) 
        REFERENCES public.user_type(user_type_ref_id);
    END IF;
END $$;

-- Add Index on payout_transaction(user_type_ref_id)
CREATE INDEX IF NOT EXISTS idx_payout_transaction_user_type_ref_id ON public.payout_transaction(user_type_ref_id);
CREATE INDEX IF NOT EXISTS idx_payout_transaction_user_type ON public.payout_transaction(user_type);
