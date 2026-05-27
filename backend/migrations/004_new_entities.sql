/* =============================================================
   MIGRACIÓN 004 — CRM V2: Nuevas Entidades y Cambios de Esquema
   Copiar y pegar completo en la consola SQL de Supabase
   ============================================================= */

-- ─────────────────────────────────────────────────────────────
-- 1. PERFIL EXTENDIDO DE USUARIOS CRM
-- ─────────────────────────────────────────────────────────────
ALTER TABLE crm_users
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp    TEXT,
  ADD COLUMN IF NOT EXISTS bio         TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
  ADD COLUMN IF NOT EXISTS position    TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- ─────────────────────────────────────────────────────────────
-- 2. AMPLIAR STAGES DEL PIPELINE EN LEADS
-- ─────────────────────────────────────────────────────────────
-- Eliminar constraint existente (si existe) y reemplazar con stages ampliados
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'nuevo', 'asignado', 'contactado', 'proceso',
    'ganado', 'perdido', 'frio', 'pedido', 'descartado', 'calificado'
  ));

-- Propiedad "cliente" al ganar un lead
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 3. TABLA DE CONTACTOS (personas físicas)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  position    TEXT,
  email       TEXT,
  phone       TEXT,
  phone_alt   TEXT,
  whatsapp    TEXT,
  notes       TEXT,
  avatar_url  TEXT,
  created_by  UUID        REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 4. TABLA DE EMPRESAS / DESARROLLOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT        NOT NULL,
  alias             TEXT,
  type              TEXT        DEFAULT 'empresa',     -- 'empresa' | 'desarrollo' | 'contratista'
  rfc               TEXT,
  address           TEXT,
  city              TEXT        DEFAULT 'Monterrey',
  state             TEXT        DEFAULT 'Nuevo León',
  maps_url          TEXT,
  website           TEXT,
  industry          TEXT,
  -- Teléfonos por área
  phone_main        TEXT,
  phone_purchases   TEXT,
  phone_payments    TEXT,
  -- Correos por área
  email_main        TEXT,
  email_purchases   TEXT,
  email_payments    TEXT,
  -- Contactos vinculados por rol
  contact_main      UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  contact_purchases UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  contact_payments  UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  -- Estado y notas
  status            TEXT        DEFAULT 'activo',       -- 'activo' | 'inactivo' | 'prospecto'
  notes             TEXT,
  created_by        UUID        REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 5. TABLA RELACIONAL CONTACTO ↔ EMPRESA (M:M)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID NOT NULL REFERENCES contacts(id)  ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role        TEXT,   -- ej: "Compras", "Pagos", "Director General"
  UNIQUE(contact_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_companies_contact ON contact_companies(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_companies_company ON contact_companies(company_id);
ALTER TABLE contact_companies DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. TABLA CONTENEDOR DE ARCHIVOS (Admin sube, todos ven)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_container (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL,
  description  TEXT,
  file_url     TEXT        NOT NULL,
  file_type    TEXT,        -- 'image' | 'pdf' | 'document' | 'spreadsheet' | 'other'
  file_size    INTEGER,     -- bytes
  category     TEXT        DEFAULT 'general',  -- 'recursos', 'contratos', 'convenios', 'general'
  uploaded_by  UUID        REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_container_category ON file_container(category);
ALTER TABLE file_container DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- FIN DE MIGRACIÓN 004
-- ============================================================= */
