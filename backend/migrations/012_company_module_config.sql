-- Migration: 012_company_module_config.sql
-- Description: Adds a feature-flags table for modular CRM configuration per enterprise company.
-- The super_admin can enable/disable specific CRM modules for each company,
-- allowing different companies to have different CRM experiences.

-- ─────────────────────────────────────────────────────────────
-- 1. CREATE company_module_config TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_module_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.enterprise_companies(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,          -- matches keys from moduleRegistry.js (e.g. 'leads', 'calendar', 'quotes')
    enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',         -- optional per-module config (e.g. SAE connection, custom labels)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
    UNIQUE(company_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_module_config_company ON public.company_module_config(company_id);

-- ─────────────────────────────────────────────────────────────
-- 2. RLS POLICIES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.company_module_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can READ module config (needed at login to build sidebar)
DROP POLICY IF EXISTS "module_config_read_all" ON public.company_module_config;
CREATE POLICY "module_config_read_all"
    ON public.company_module_config
    FOR SELECT
    TO authenticated
    USING (true);

-- Only super_admin can INSERT/UPDATE/DELETE module config
DROP POLICY IF EXISTS "module_config_write_superadmin" ON public.company_module_config;
CREATE POLICY "module_config_write_superadmin"
    ON public.company_module_config
    FOR ALL
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) = 'super_admin'
    );

-- ─────────────────────────────────────────────────────────────
-- 3. SEED DEFAULT CONFIG FOR EXISTING COMPANIES
-- ─────────────────────────────────────────────────────────────
-- Garza: all modules enabled (they are the primary company)
-- RAV: all modules enabled by default, super_admin can customize later

-- We insert all known modules for each existing company
DO $$
DECLARE
    comp RECORD;
    modules TEXT[] := ARRAY[
        'dashboard', 'contacts', 'companies', 'calendar', 'leads',
        'pipeline', 'quotes', 'quotes-manager', 'customers',
        'files', 'archive-contacts', 'notifications', 'profile',
        'orphans', 'sellers'
    ];
    m TEXT;
BEGIN
    FOR comp IN SELECT id FROM public.enterprise_companies WHERE active = true LOOP
        FOREACH m IN ARRAY modules LOOP
            INSERT INTO public.company_module_config (company_id, module_key, enabled)
            VALUES (comp.id, m, true)
            ON CONFLICT (company_id, module_key) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
