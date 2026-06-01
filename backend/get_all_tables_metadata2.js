import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const checkList = [
    'users', 'crm_users', 'rav_users', 'rav_members', 'members', 'accounts',
    'enterprise_companies', 'companies', 'branches', 'sellers', 'vendedores',
    'leads', 'prospectos', 'opportunities', 'oportunidades', 'contacts', 'contactos',
    'quotes', 'cotizaciones', 'archived_companies'
  ];
  
  for (const table of checkList) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}' error: ${error.message} (code: ${error.code})`);
    } else {
      console.log(`Table '${table}' EXISTS! Rows:`, data.length);
    }
  }
}

run();
