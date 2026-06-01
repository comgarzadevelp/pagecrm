-- Migration: 009_notifications_and_roles.sql
-- Description: Adds tables for appointments (preventing data loss via soft delete), audits, notifications, and updates user roles.
-- Clean up stale tables from previous partial runs to prevent column missing errors

-- ─────────────────────────────────────────────────────────────
-- 0. CLEAN UP PREVIOUS PARTIAL TABLES (Ensures fresh column creation)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.crm_appointments_audit CASCADE;
DROP TABLE IF EXISTS public.crm_notifications CASCADE;
DROP TABLE IF EXISTS public.crm_appointments CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 1. ADD SUPERVISOR RELATIONSHIP & EXPAND ROLES ON crm_users
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.crm_users
    ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL;

ALTER TABLE public.crm_users DROP CONSTRAINT IF EXISTS crm_users_role_check;
ALTER TABLE public.crm_users ADD CONSTRAINT crm_users_role_check CHECK (role IN ('sales', 'admin', 'supervisor', 'super_admin', 'sistemas'));

-- ─────────────────────────────────────────────────────────────
-- 2. CREATE crm_appointments TABLE (Local backup for Google Calendar events)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.crm_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_event_id TEXT UNIQUE,
    vendedor_id UUID NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.enterprise_companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'negocios', -- 'negocios', 'llamada', 'demo', 'seguimiento', 'otro'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees TEXT, -- Comma-separated emails or JSON array
    status TEXT DEFAULT 'active', -- 'active', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_appointments_vendedor ON public.crm_appointments(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_company ON public.crm_appointments(company_id);

-- Enable RLS on crm_appointments
ALTER TABLE public.crm_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_company_access" ON public.crm_appointments;
CREATE POLICY "appointments_company_access"
    ON public.crm_appointments
    FOR SELECT
    TO authenticated
    USING (
        company_id = (
            SELECT u.company_id FROM public.crm_users u
            WHERE u.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "appointments_vendedor_insert" ON public.crm_appointments;
CREATE POLICY "appointments_vendedor_insert"
    ON public.crm_appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        vendedor_id = auth.uid()
    );

DROP POLICY IF EXISTS "appointments_vendedor_update" ON public.crm_appointments;
CREATE POLICY "appointments_vendedor_update"
    ON public.crm_appointments
    FOR UPDATE
    TO authenticated
    USING (
        vendedor_id = auth.uid() 
        OR (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor', 'super_admin')
    );

-- ─────────────────────────────────────────────────────────────
-- 3. CREATE crm_notifications TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.crm_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE, -- Target recipient
    sender_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL, -- Who triggered the action (vendedor)
    company_id UUID REFERENCES public.enterprise_companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'appointment_created', 'appointment_deleted', 'sae_lock_alert', 'general'
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.crm_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.crm_notifications(company_id);

-- Enable RLS on crm_notifications
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_access" ON public.crm_notifications;
CREATE POLICY "notifications_own_access"
    ON public.crm_notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

DROP POLICY IF EXISTS "notifications_insert_all" ON public.crm_notifications;
CREATE POLICY "notifications_insert_all"
    ON public.crm_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON public.crm_notifications;
CREATE POLICY "notifications_update_own"
    ON public.crm_notifications
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- ─────────────────────────────────────────────────────────────
-- 4. CREATE crm_appointments_audit TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.crm_appointments_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.crm_appointments(id) ON DELETE SET NULL,
    vendedor_id UUID REFERENCES public.crm_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit
ALTER TABLE public.crm_appointments_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_read_supervisors_and_admins" ON public.crm_appointments_audit;
CREATE POLICY "audit_read_supervisors_and_admins"
    ON public.crm_appointments_audit
    FOR SELECT
    TO authenticated
    USING (
        (SELECT u.role FROM public.crm_users u WHERE u.id = auth.uid()) IN ('admin', 'supervisor', 'super_admin', 'sistemas')
    );

DROP POLICY IF EXISTS "audit_insert_authenticated" ON public.crm_appointments_audit;
CREATE POLICY "audit_insert_authenticated"
    ON public.crm_appointments_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
