import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  // Querying pg_catalog via raw sql is not possible directly unless we use standard Postgrest features,
  // but let's try reading the OpenAPI schema using a different approach or fetch a known list of tables.
  const checkList = [
    'users', 'crm_users', 'rav_users', 'rav_members', 'members', 'accounts',
    'enterprise_companies', 'companies', 'branches', 'sellers', 'vendedores',
    'leads', 'prospectos', 'opportunities', 'oportunidades', 'contacts', 'contactos',
    'quotes', 'cotizaciones'
  ];
  
  for (const table of checkList) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table '${table}' exists in SUPABASE_URL`);
    }
  }
}

run();
