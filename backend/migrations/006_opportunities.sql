/* =============================================================
   MIGRACIÓN 006 — CRM V2.2: Rediseño del Embudo a Oportunidades
   Copiar y pegar completo en la consola SQL de Supabase
   ============================================================= */

-- 1. Nueva tabla de oportunidades (proyectos o pedidos vinculados a empresa y/o contacto)
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT          NOT NULL,
  description     TEXT          DEFAULT '',
  type            TEXT          DEFAULT 'proyecto', -- 'proyecto' | 'pedido'
  stage           TEXT          DEFAULT 'nuevo',    -- 'nuevo' | 'contactado' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido'
  value           NUMERIC       DEFAULT 0,
  
  -- Vinculaciones opcionales a contactos y/o empresas
  contact_id      UUID          REFERENCES contacts(id) ON DELETE SET NULL,
  company_id      UUID          REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Vendedor asignado
  assigned_to     UUID          REFERENCES crm_users(id) ON DELETE SET NULL,
  
  -- Control de inactividad por etapa
  stage_updated_at TIMESTAMPTZ  DEFAULT now(),
  
  created_by      UUID          REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

-- Habilitar accesos sin RLS estricto para facilidad de desarrollo
ALTER TABLE crm_opportunities DISABLE ROW LEVEL SECURITY;

-- 2. Vincular cotizaciones del CRM a oportunidades
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL;
ALTER TABLE quotes ALTER COLUMN client_id DROP NOT NULL;

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_assigned_to ON crm_opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_contact_id ON crm_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_company_id ON crm_opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity_id ON quotes(opportunity_id);
