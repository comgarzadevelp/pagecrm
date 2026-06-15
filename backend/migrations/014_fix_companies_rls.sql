-- Migration 014: Fix companies RLS policies to allow sales role to update records in their company
DROP POLICY IF EXISTS "companies_write_isolation" ON public.companies;

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
                (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor', 'sales')
            )
        )
    );

-- Backfill company_id for any existing companies where it is NULL (using created_by user's company_id as fallback)
UPDATE public.companies c
SET company_id = u.company_id
FROM public.crm_users u
WHERE c.created_by = u.id AND c.company_id IS NULL;
