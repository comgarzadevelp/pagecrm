/* =============================================================
   MIGRACIÓN 007 — CRM V2.3: Archivado de Contactos y Empresas SAE
   Copiar y pegar completo en la consola SQL de Supabase
   ============================================================= */

-- 1. Tabla de contactos archivados (copia permanente de SAE a CRM)
CREATE TABLE IF NOT EXISTS archived_contacts (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  sae_id       TEXT         NOT NULL UNIQUE, -- ej: 'sae-contact-CLIE01-1'
  cve_clie     TEXT         NOT NULL,
  name         TEXT         NOT NULL,
  position     TEXT,
  email        TEXT,
  phone        TEXT,
  whatsapp     TEXT,
  notes        TEXT,
  archived_by  UUID         REFERENCES crm_users(id) ON DELETE SET NULL,
  archived_at  TIMESTAMPTZ  DEFAULT now(),
  created_at   TIMESTAMPTZ  DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_archived_contacts_sae_id ON archived_contacts(sae_id);
CREATE INDEX IF NOT EXISTS idx_archived_contacts_archived_by ON archived_contacts(archived_by);

-- 2. Tabla de empresas archivadas (copia permanente de SAE a CRM para ocultar de la lista principal)
CREATE TABLE IF NOT EXISTS archived_companies (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  sae_id       TEXT         NOT NULL UNIQUE, -- ej: 'sae-CLIE01'
  clave        TEXT         NOT NULL,
  name         TEXT         NOT NULL,
  alias        TEXT,
  rfc          TEXT,
  address      TEXT,
  city         TEXT,
  state        TEXT,
  phone_main   TEXT,
  email_main   TEXT,
  status       TEXT,
  notes        TEXT,
  archived_by  UUID         REFERENCES crm_users(id) ON DELETE SET NULL,
  archived_at  TIMESTAMPTZ  DEFAULT now(),
  created_at   TIMESTAMPTZ  DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_archived_companies_sae_id ON archived_companies(sae_id);
CREATE INDEX IF NOT EXISTS idx_archived_companies_archived_by ON archived_companies(archived_by);
