import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL or SUPABASE key not set in .env');
}

// Conexión A: Base de datos del CRM (Usuarios, Permisos, Leads, Cotizaciones)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Conexión B: Copia Espejo del SAE (Tablas clie03, vend03, inve03, etc.)
const saeSupabaseUrl = process.env.SAE_SUPABASE_URL || supabaseUrl;
const saeSupabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

export const saeSupabase = createClient(saeSupabaseUrl, saeSupabaseKey);
