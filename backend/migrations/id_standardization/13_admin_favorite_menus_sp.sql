-- ==============================================================================
-- Migration: 13_admin_favorite_menus_sp.sql
-- Description: Create admin_favorite_menu table and Stored Procedures for
--              toggling and retrieving admin navigation favorites.
-- ==============================================================================

-- 1. Create table admin_favorite_menu if it does not exist
CREATE TABLE IF NOT EXISTS public.admin_favorite_menu (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NULL,
    user_id UUID NOT NULL,
    menu_href VARCHAR(255) NOT NULL,
    menu_label VARCHAR(150) NOT NULL,
    menu_category VARCHAR(100) NULL,
    icon_name VARCHAR(50) NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,
    version_no INT NOT NULL DEFAULT 1
);

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_admin_fav_user_tenant 
    ON public.admin_favorite_menu(tenant_id, user_id, is_active, is_deleted);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_fav_user_menu 
    ON public.admin_favorite_menu(tenant_id, user_id, menu_href) 
    WHERE (is_deleted = false);


-- 2. Stored Procedure / Function to Toggle an Admin Favorite Menu Item
CREATE OR REPLACE FUNCTION public.sp_toggle_admin_favorite_menu(
    p_tenant_id UUID,
    p_user_id UUID,
    p_menu_href VARCHAR,
    p_menu_label VARCHAR DEFAULT NULL,
    p_menu_category VARCHAR DEFAULT NULL,
    p_icon_name VARCHAR DEFAULT NULL,
    p_actor_email VARCHAR DEFAULT 'admin@pay2pay.in'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id BIGINT;
    v_is_deleted BOOLEAN;
    v_is_active BOOLEAN;
    v_action VARCHAR(20);
    v_favorites JSONB;
BEGIN
    -- Check if record exists for this tenant, user, and menu_href
    SELECT id, is_deleted, is_active
    INTO v_existing_id, v_is_deleted, v_is_active
    FROM public.admin_favorite_menu
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND menu_href = p_menu_href
    ORDER BY created_date DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        IF v_is_deleted = FALSE AND v_is_active = TRUE THEN
            -- Currently active -> Soft delete (unfavorite)
            UPDATE public.admin_favorite_menu
            SET is_deleted = TRUE,
                is_active = FALSE,
                updated_date = NOW(),
                updated_by = p_actor_email,
                version_no = version_no + 1
            WHERE id = v_existing_id;
            
            v_action := 'REMOVED';
        ELSE
            -- Previously removed/inactive -> Reactivate
            UPDATE public.admin_favorite_menu
            SET is_deleted = FALSE,
                is_active = TRUE,
                menu_label = COALESCE(p_menu_label, menu_label),
                menu_category = COALESCE(p_menu_category, menu_category),
                icon_name = COALESCE(p_icon_name, icon_name),
                updated_date = NOW(),
                updated_by = p_actor_email,
                version_no = version_no + 1
            WHERE id = v_existing_id;
            
            v_action := 'ADDED';
        END IF;
    ELSE
        -- Insert new favorite record
        INSERT INTO public.admin_favorite_menu (
            public_id,
            tenant_id,
            user_id,
            menu_href,
            menu_label,
            menu_category,
            icon_name,
            display_order,
            is_active,
            is_deleted,
            created_date,
            updated_date,
            created_by,
            updated_by,
            version_no
        ) VALUES (
            gen_random_uuid(),
            p_tenant_id,
            p_user_id,
            p_menu_href,
            COALESCE(p_menu_label, p_menu_href),
            COALESCE(p_menu_category, 'General'),
            p_icon_name,
            0,
            TRUE,
            FALSE,
            NOW(),
            NOW(),
            p_actor_email,
            p_actor_email,
            1
        );
        
        v_action := 'ADDED';
    END IF;

    -- Fetch updated list of active favorites
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'public_id', public_id,
                'menu_href', menu_href,
                'menu_label', menu_label,
                'menu_category', menu_category,
                'icon_name', icon_name,
                'display_order', display_order,
                'created_date', created_date
            ) ORDER BY display_order ASC, created_date ASC
        ),
        '[]'::jsonb
    )
    INTO v_favorites
    FROM public.admin_favorite_menu
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND is_active = TRUE
      AND is_deleted = FALSE;

    RETURN jsonb_build_object(
        'success', TRUE,
        'action', v_action,
        'menu_href', p_menu_href,
        'favorites', v_favorites
    );
END;
$$;


-- 3. Stored Procedure / Function to Get All Admin Favorites for a User
CREATE OR REPLACE FUNCTION public.sp_get_admin_favorite_menus(
    p_tenant_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_favorites JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'public_id', public_id,
                'menu_href', menu_href,
                'menu_label', menu_label,
                'menu_category', menu_category,
                'icon_name', icon_name,
                'display_order', display_order,
                'created_date', created_date
            ) ORDER BY display_order ASC, created_date ASC
        ),
        '[]'::jsonb
    )
    INTO v_favorites
    FROM public.admin_favorite_menu
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND is_active = TRUE
      AND is_deleted = FALSE;

    RETURN jsonb_build_object(
        'success', TRUE,
        'favorites', v_favorites
    );
END;
$$;
