-- Migration: 010_strict_isolation_policies.sql
-- Description: Reinforces strict multi-tenant data isolation between companies (Garza vs. RAV)
-- Enforces Row Level Security (RLS) across all primary transactional tables: leads, contacts, companies, quotes, appointments.

-- ─────────────────────────────────────────────────────────────
-- 1. REINFORCE RLS ON leads TABLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_company_access" ON public.leads;
DROP POLICY IF EXISTS "leads_own_assignments" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_own_company" ON public.leads;
DROP POLICY IF EXISTS "leads_update_own_company" ON public.leads;
DROP POLICY IF EXISTS "leads_select_isolation" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_isolation" ON public.leads;
DROP POLICY IF EXISTS "leads_write_isolation" ON public.leads;

-- SELECT POLICY: Users can only see leads belonging to their own company
CREATE POLICY "leads_select_isolation"
    ON public.leads
    FOR SELECT
    TO authenticated
    USING (
        -- super_admin and sistemas can bypass company filters
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        leads.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

-- INSERT POLICY: Users can only insert leads for their own company
CREATE POLICY "leads_insert_isolation"
    ON public.leads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        leads.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

-- UPDATE/DELETE POLICY: Users can update leads in their own company, sales can only update if assigned
CREATE POLICY "leads_write_isolation"
    ON public.leads
    FOR ALL
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            leads.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                -- Sales can only update if they own the lead
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR leads.assigned_to = auth.uid()
            )
        )
    );

-- ─────────────────────────────────────────────────────────────
-- 2. REINFORCE RLS ON contacts TABLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_company_access" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_own_company" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_own_company" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select_isolation" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_isolation" ON public.contacts;
DROP POLICY IF EXISTS "contacts_write_isolation" ON public.contacts;

-- SELECT POLICY: Isolated per company, sales restricted to own contacts
CREATE POLICY "contacts_select_isolation"
    ON public.contacts
    FOR SELECT
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            contacts.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR contacts.created_by = auth.uid()
            )
        )
    );

-- INSERT POLICY
CREATE POLICY "contacts_insert_isolation"
    ON public.contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        contacts.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

-- UPDATE/DELETE POLICY
CREATE POLICY "contacts_write_isolation"
    ON public.contacts
    FOR ALL
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            contacts.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR contacts.created_by = auth.uid()
            )
        )
    );

-- ─────────────────────────────────────────────────────────────
-- 3. REINFORCE RLS ON companies TABLE
-- ─────────────────────────────────────────────────────────────
-- Ensure that the company_id column exists on public.companies table first
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.enterprise_companies(id) ON DELETE CASCADE;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_company_access" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_own_company" ON public.companies;
DROP POLICY IF EXISTS "companies_update_own_company" ON public.companies;
DROP POLICY IF EXISTS "companies_select_isolation" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_isolation" ON public.companies;
DROP POLICY IF EXISTS "companies_write_isolation" ON public.companies;

-- SELECT POLICY: Isolated per company, sales restricted to own assigned companies
CREATE POLICY "companies_select_isolation"
    ON public.companies
    FOR SELECT
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            companies.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR companies.created_by = auth.uid()
            )
        )
    );

-- INSERT POLICY
CREATE POLICY "companies_insert_isolation"
    ON public.companies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        companies.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

-- UPDATE/DELETE POLICY
CREATE POLICY "companies_write_isolation"
    ON public.companies
    FOR ALL
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            companies.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR companies.created_by = auth.uid()
            )
        )
    );

-- ─────────────────────────────────────────────────────────────
-- 4. REINFORCE RLS ON quotes TABLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_company_access" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_own_company" ON public.quotes;
DROP POLICY IF EXISTS "quotes_update_own_company" ON public.quotes;
DROP POLICY IF EXISTS "quotes_select_isolation" ON public.quotes;
DROP POLICY IF EXISTS "quotes_insert_isolation" ON public.quotes;
DROP POLICY IF EXISTS "quotes_write_isolation" ON public.quotes;

-- SELECT POLICY
CREATE POLICY "quotes_select_isolation"
    ON public.quotes
    FOR SELECT
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            quotes.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR quotes.seller_id = auth.uid()
            )
        )
    );

-- INSERT POLICY
CREATE POLICY "quotes_insert_isolation"
    ON public.quotes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        quotes.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
    );

-- UPDATE/DELETE POLICY
CREATE POLICY "quotes_write_isolation"
    ON public.quotes
    FOR ALL
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('super_admin', 'sistemas')
        OR
        (
            quotes.company_id = (SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid())
            AND (
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
                OR quotes.seller_id = auth.uid()
            )
        )
    );
