-- ==============================================================================
-- MIGRATION 11: POS Machine Enhancements, POS Vendor Master & Dynamic MDR
-- ==============================================================================

-- 1. Enhance public.swipe_machine table with vendor and assignment columns
ALTER TABLE public.swipe_machine 
    ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendor_commission_type VARCHAR(20) DEFAULT 'PERCENTAGE',
    ADD COLUMN IF NOT EXISTS vendor_commission_value NUMERIC(10, 4) DEFAULT 0.50,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Ensure indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_swipe_machine_serial ON public.swipe_machine(serial_number);
CREATE INDEX IF NOT EXISTS idx_swipe_machine_mobile ON public.swipe_machine(mobile_number);
CREATE INDEX IF NOT EXISTS idx_swipe_machine_vendor ON public.swipe_machine(vendor_id);
CREATE INDEX IF NOT EXISTS idx_swipe_machine_status ON public.swipe_machine(status);
CREATE INDEX IF NOT EXISTS idx_swipe_machine_mapped_ret ON public.swipe_machine(mapped_retailer_id);

-- 2. Create pos_vendor_master table for dynamic vendor management
CREATE TABLE IF NOT EXISTS public.pos_vendor_master (
    id SERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID,
    company_id UUID,
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(100) NOT NULL,
    default_commission_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
    default_commission_value NUMERIC(10, 4) NOT NULL DEFAULT 0.5000,
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_mobile VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system',
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_pos_vendor_code ON public.pos_vendor_master(vendor_code);
CREATE INDEX IF NOT EXISTS idx_pos_vendor_active ON public.pos_vendor_master(is_active, is_deleted);

-- Seed standard POS Vendors if not present
INSERT INTO public.pos_vendor_master (vendor_code, vendor_name, default_commission_type, default_commission_value)
VALUES 
    ('VND_PINELABS', 'Pine Labs', 'PERCENTAGE', 0.5000),
    ('VND_MOSAMBEE', 'Mosambee', 'PERCENTAGE', 0.4500),
    ('VND_MSWIPE', 'Mswipe Technologies', 'PERCENTAGE', 0.5000),
    ('VND_PAYTM', 'Paytm EDC', 'PERCENTAGE', 0.4000),
    ('VND_PAY2PAY', 'Pay2Pay POS Terminal', 'PERCENTAGE', 0.5000),
    ('VND_RAZORPAY', 'Razorpay POS', 'PERCENTAGE', 0.4500),
    ('VND_INNOVITI', 'Innoviti Payment Solutions', 'PERCENTAGE', 0.5000)
ON CONFLICT (vendor_code) DO NOTHING;

-- 3. Ensure global default MDR records exist in pos_mdr_configuration
INSERT INTO public.pos_mdr_configuration (
    public_id, retailer_id, payment_mode, mdr, mdr_type, gst_rate, effective_from, is_active, is_deleted, created_date, updated_date, created_by
)
SELECT 
    gen_random_uuid(), NULL, 'POS - Instant', 1.7000, 'PERCENTAGE', 18.00, NOW(), TRUE, FALSE, NOW(), NOW(), 'system'
WHERE NOT EXISTS (
    SELECT 1 FROM public.pos_mdr_configuration 
    WHERE retailer_id IS NULL AND payment_mode = 'POS - Instant' AND is_deleted = FALSE
);

INSERT INTO public.pos_mdr_configuration (
    public_id, retailer_id, payment_mode, mdr, mdr_type, gst_rate, effective_from, is_active, is_deleted, created_date, updated_date, created_by
)
SELECT 
    gen_random_uuid(), NULL, 'POS+T1', 1.6000, 'PERCENTAGE', 18.00, NOW(), TRUE, FALSE, NOW(), NOW(), 'system'
WHERE NOT EXISTS (
    SELECT 1 FROM public.pos_mdr_configuration 
    WHERE retailer_id IS NULL AND payment_mode = 'POS+T1' AND is_deleted = FALSE
);

INSERT INTO public.pos_mdr_configuration (
    public_id, retailer_id, payment_mode, mdr, mdr_type, gst_rate, effective_from, is_active, is_deleted, created_date, updated_date, created_by
)
SELECT 
    gen_random_uuid(), NULL, 'POS+T2', 1.5000, 'PERCENTAGE', 18.00, NOW(), TRUE, FALSE, NOW(), NOW(), 'system'
WHERE NOT EXISTS (
    SELECT 1 FROM public.pos_mdr_configuration 
    WHERE retailer_id IS NULL AND payment_mode = 'POS+T2' AND is_deleted = FALSE
);
