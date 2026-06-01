import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const saeSupabase = createClient(process.env.SAE_SUPABASE_URL, process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || process.env.SAE_SUPABASE_ANON_KEY);

async function run() {
  const tables = ['clie01', 'inve01', 'precios01', 'vend01'];
  for (const table of tables) {
    const { data, error } = await saeSupabase.from(table).select('*').limit(1);
    console.log(`Table ${table} exists?`, error ? 'No: ' + error.message : 'Yes');
  }
}

run();
