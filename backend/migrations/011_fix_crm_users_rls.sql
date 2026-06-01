-- Migration: 011_fix_crm_users_rls.sql
-- Description: Fixes critical security issue — crm_users SELECT policy had no company isolation.
--              A 'admin' from Garza could potentially see users from RAV in direct Supabase queries.
--              This migration replaces the flawed policy with proper multi-tenant isolation.

-- ─────────────────────────────────────────────────────────────
-- 1. DROP BROKEN POLICIES ON crm_users
-- ─────────────────────────────────────────────────────────────

-- Was too broad: any admin could see ALL users, regardless of company
DROP POLICY IF EXISTS "crm_users_admin_all" ON public.crm_users;

-- Also drop same_company policy to replace with a unified, stricter one
DROP POLICY IF EXISTS "crm_users_same_company_select" ON public.crm_users;

-- ─────────────────────────────────────────────────────────────
-- 2. CREATE STRICT SELECT POLICY — company-isolated
-- ─────────────────────────────────────────────────────────────

-- Users can only see other users in their own company.
-- super_admin bypasses company filter and sees all users across companies.
CREATE POLICY "crm_users_select_isolation"
    ON public.crm_users
    FOR SELECT
    TO authenticated
    USING (
        -- super_admin sees all users across all companies
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) = 'super_admin'
        OR
        -- everyone else sees only users within their own company
        company_id = (
            SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid()
        )
    );

-- ─────────────────────────────────────────────────────────────
-- 3. CREATE WRITE POLICY — admin limited to own company
-- ─────────────────────────────────────────────────────────────

-- Only super_admin can insert users for any company.
-- admin/supervisor can only insert users for their own company.
DROP POLICY IF EXISTS "crm_users_insert_isolation" ON public.crm_users;
CREATE POLICY "crm_users_insert_isolation"
    ON public.crm_users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- super_admin can create users in any company
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) = 'super_admin'
        OR
        -- admins/supervisors can only create users for their own company
        (
            company_id = (
                SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid()
            )
            AND (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
        )
    );

-- UPDATE: Users can update their own profile; admins can update users in their company; super_admin can update all
DROP POLICY IF EXISTS "crm_users_update_isolation" ON public.crm_users;
CREATE POLICY "crm_users_update_isolation"
    ON public.crm_users
    FOR UPDATE
    TO authenticated
    USING (
        -- User can always update their own profile
        id = auth.uid()
        OR
        -- super_admin updates any user
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) = 'super_admin'
        OR
        -- admin/supervisor updates users within their own company only
        (
            company_id = (
                SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid()
            )
            AND (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor')
        )
    );

-- DELETE: Only super_admin can delete users across companies; admins within own company only
DROP POLICY IF EXISTS "crm_users_delete_isolation" ON public.crm_users;
CREATE POLICY "crm_users_delete_isolation"
    ON public.crm_users
    FOR DELETE
    TO authenticated
    USING (
        -- super_admin deletes any user (except themselves — application should guard that)
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) = 'super_admin'
        OR
        -- admin deletes users only within their own company
        (
            company_id = (
                SELECT u.company_id FROM public.crm_users u WHERE u.id = auth.uid()
            )
            AND (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) = 'admin'
            -- Prevent self-deletion
            AND id != auth.uid()
        )
    );

-- ─────────────────────────────────────────────────────────────
-- 4. NOTE: Backend uses SERVICE_ROLE_KEY which bypasses RLS.
--    These policies serve as a security backstop for:
--    - Direct Supabase dashboard access
--    - Any future client-side Supabase calls
--    - RLS enforcement if backend is migrated to user-scoped JWT
-- ─────────────────────────────────────────────────────────────
