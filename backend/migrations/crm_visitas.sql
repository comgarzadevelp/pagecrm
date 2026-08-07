-- Creación de tabla para Visitas Verificadas
CREATE TABLE crm_visitas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES crm_users(id) NOT NULL,
  contact_id TEXT, -- Puede ser de SAE o UUID
  company_id TEXT,
  obra_id UUID,
  tipo TEXT CHECK (tipo IN ('visita_presencial', 'llamada', 'reunion_virtual')) NOT NULL,
  resultado TEXT NOT NULL,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  timestamp_servidor TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Para asegurar que una visita siempre esté atada a algo
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL OR obra_id IS NOT NULL)
);

-- Indexing para performance
CREATE INDEX idx_crm_visitas_user_id ON crm_visitas(user_id);
CREATE INDEX idx_crm_visitas_company_id ON crm_visitas(company_id);
CREATE INDEX idx_crm_visitas_contact_id ON crm_visitas(contact_id);
CREATE INDEX idx_crm_visitas_timestamp ON crm_visitas(timestamp_servidor DESC);

-- Reglas de integridad: Nunca se debe poder borrar o falsear el timestamp
REVOKE DELETE ON crm_visitas FROM authenticated;
REVOKE UPDATE ON crm_visitas FROM authenticated;
-- (Opcionalmente, puedes permitir que modifiquen solo las notas o resultado, 
-- pero garantizando que no toquen gps_lat, gps_lng ni timestamp_servidor.
-- En este caso, dejamos la inserción abierta pero prohibimos UPDATE completo a menos que se defina política estricta).
