-- ==============================================================================
-- Pay2Pay Organization Mapping & Access Scope Migration
-- File: 01_admin_org_mapping_schema.sql
-- Description: Adds nullable super_distributor_ref_id and mapped_super_distributor_id
--              to retailer table, creates indexes, and safely backfills mapped retailers.
--              Existing unmapped retailers remain NULL.
-- ==============================================================================

BEGIN;

-- 1. Add nullable columns to public.retailer if they don't exist
ALTER TABLE public.retailer 
    ADD COLUMN IF NOT EXISTS super_distributor_ref_id BIGINT NULL;

ALTER TABLE public.retailer 
    ADD COLUMN IF NOT EXISTS mapped_super_distributor_id UUID NULL;

-- 2. Add indexes for high-performance hierarchy querying
CREATE INDEX IF NOT EXISTS idx_retailer_super_distributor_ref_id 
    ON public.retailer (super_distributor_ref_id);

CREATE INDEX IF NOT EXISTS idx_retailer_mapped_super_distributor_id 
    ON public.retailer (mapped_super_distributor_id);

CREATE INDEX IF NOT EXISTS idx_distributor_super_distributor_ref_id 
    ON public.distributor (super_distributor_ref_id);

CREATE INDEX IF NOT EXISTS idx_distributor_mapped_super_distributor_id 
    ON public.distributor (mapped_super_distributor_id);

-- 3. Safe, non-destructive backfill for retailers that already have an active mapped distributor
--    which in turn belongs to an active super/master distributor.
--    NOTE: Unmapped retailers or retailers under unmapped distributors remain NULL.
UPDATE public.retailer r
SET 
    super_distributor_ref_id = d.super_distributor_ref_id,
    mapped_super_distributor_id = d.mapped_super_distributor_id
FROM public.distributor d
WHERE r.mapped_distributor_id = d.public_id
  AND d.super_distributor_ref_id IS NOT NULL
  AND r.super_distributor_ref_id IS NULL;

-- 4. View for high-performance aggregate counts of organization entities
CREATE OR REPLACE VIEW public.view_org_hierarchy_summary AS
SELECT
    (SELECT count(*) FROM public.tenant WHERE is_active = TRUE AND is_deleted = FALSE) AS total_tenants,
    (SELECT count(*) FROM public.company WHERE is_active = TRUE AND is_deleted = FALSE) AS total_companies,
    (SELECT count(*) FROM public.super_distributor WHERE is_active = TRUE AND is_deleted = FALSE) AS total_master_distributors,
    (SELECT count(*) FROM public.distributor WHERE is_active = TRUE AND is_deleted = FALSE) AS total_distributors,
    (SELECT count(*) FROM public.retailer WHERE is_active = TRUE AND is_deleted = FALSE) AS total_retailers,
    (SELECT count(*) FROM public.distributor WHERE mapped_super_distributor_id IS NULL AND is_deleted = FALSE) AS unmapped_distributors,
    (SELECT count(*) FROM public.retailer WHERE mapped_distributor_id IS NULL AND is_deleted = FALSE) AS unmapped_retailers;

COMMIT;
