/* Migration: 008_multi_enterprise.sql
   Adds multi-enterprise/multi-tenant support
   - Creates enterprise_companies table (Garza, RAV, etc.)
   - Adds company_id to crm_users and other CRM tables
   - Adds RLS policies for data isolation
*/

-- ─────────────────────────────────────────────────────────────
-- 1. CREATE enterprise_companies TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enterprise_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    company_code TEXT NOT NULL UNIQUE,
    description TEXT,
    color_primary TEXT DEFAULT '#05393A',    -- Default Garza teal
    color_accent TEXT DEFAULT '#E0922B',     -- Default Garza orange
    logo_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. ADD company_id TO crm_users
-- ─────────────────────────────────────────────────────────────
ALTER TABLE crm_users
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES enterprise_companies(id) ON DELETE CASCADE;

-- For existing users, assign to Garza (we'll set this via seed data)
-- Seed initial companies
INSERT INTO enterprise_companies (name, company_code, color_primary, color_accent, description)
VALUES 
    ('Garza', 'GARZA', '#05393A', '#E0922B', 'Comercializadora Garza'),
    ('RAV Aire y Calefacción', 'RAV', '#CC3333', '#0087BE', 'RAV Aire y Calefacción')
ON CONFLICT (company_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. UPDATE existing crm_users to belong to Garza
-- ─────────────────────────────────────────────────────────────
UPDATE crm_users 
SET company_id = (SELECT id FROM enterprise_companies WHERE company_code = 'GARZA')
WHERE company_id IS NULL;

-- Make company_id NOT NULL after migration completes
ALTER TABLE crm_users
    ALTER COLUMN company_id SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. ADD company_id TO OTHER TABLES
-- ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES enterprise_companies(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS opportunities
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES enterprise_companies(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS contacts
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES enterprise_companies(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS quotes
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES enterprise_companies(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS file_container
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES enterprise_companies(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 5. CREATE INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_users_company ON crm_users(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_file_container_company ON file_container(company_id);

-- ─────────────────────────────────────────────────────────────
-- 6. ENABLE RLS AND CREATE POLICIES
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on enterprise_companies (public read, restricted write)
ALTER TABLE enterprise_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_enterprise_companies" 
    ON enterprise_companies 
    FOR SELECT 
    TO authenticated, anon
    USING (active = true);

-- Enable RLS on crm_users (users can read users in same company)
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_users_same_company_select"
    ON crm_users
    FOR SELECT
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "crm_users_admin_all"
    ON crm_users
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM crm_users WHERE id = auth.uid()) = 'admin'
    );

-- Enable RLS on leads (users see leads in their company)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_company_access"
    ON leads
    FOR SELECT
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "leads_own_assignments"
    ON leads
    FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid()
        OR (SELECT role FROM crm_users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "leads_insert_own_company"
    ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "leads_update_own_company"
    ON leads
    FOR UPDATE
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

-- Enable RLS on opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunities_company_access"
    ON opportunities
    FOR SELECT
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "opportunities_insert_own_company"
    ON opportunities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "opportunities_update_own_company"
    ON opportunities
    FOR UPDATE
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

-- Enable RLS on contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_company_access"
    ON contacts
    FOR SELECT
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "contacts_insert_own_company"
    ON contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "contacts_update_own_company"
    ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

-- Enable RLS on quotes
ALTER TABLE IF EXISTS quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_company_access"
    ON quotes
    FOR SELECT
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "quotes_insert_own_company"
    ON quotes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "quotes_update_own_company"
    ON quotes
    FOR UPDATE
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

-- Enable RLS on file_container
ALTER TABLE file_container ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_container_company_access"
    ON file_container
    FOR SELECT
    TO authenticated
    USING (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "file_container_insert_own_company"
    ON file_container
    FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (
            SELECT company_id FROM crm_users
            WHERE id = auth.uid()
        )
    );

-- Add indexes for performance on combined queries
CREATE INDEX IF NOT EXISTS idx_leads_company_assigned ON leads(company_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_company_lead ON opportunities(company_id, lead_id);
