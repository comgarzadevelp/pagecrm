import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL or SUPABASE key not set in .env');
}

// Conexión A: Base de datos del CRM (Usuarios, Permisos, Leads, Cotizaciones)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    transport: ws
  }
});

// Conexión B: Copia Espejo del SAE (Tablas clie03, vend03, inve03, etc.)
const saeSupabaseUrl = process.env.SAE_SUPABASE_URL || supabaseUrl;
const saeSupabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

export const saeSupabase = createClient(saeSupabaseUrl, saeSupabaseKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    transport: ws
  }
});

// Helper to filter out fake company IDs (e.g. 'company-1') and validate UUID format
export const cleanCompanyId = (id) => {
  if (!id) return null;
  const str = String(id);
  if (str.startsWith('company-')) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(str)) return null;
  return str;
};
