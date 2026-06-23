-- Agregar columnas de auditoría de historial laboral a contact_companies
-- Ejecutar en Supabase SQL Editor

ALTER TABLE contact_companies
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo')),
  ADD COLUMN IF NOT EXISTS fecha_hasta DATE;

-- Índice para filtrado rápido por status
CREATE INDEX IF NOT EXISTS idx_contact_companies_status ON contact_companies(status);
