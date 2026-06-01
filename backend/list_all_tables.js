import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  // Query postgrest to see table list
  const { data, error } = await supabase.rpc('get_tables'); // standard rpc if exists
  if (error) {
    console.log('Error calling get_tables RPC:', error.message);
    // Let's try listing using a simple query or fetching schemas
  } else {
    console.log('RPC tables:', data);
  }

  // Let's check some known table names
  const tables = ['crm_users', 'enterprise_companies', 'leads', 'opportunities', 'contacts', 'quotes', 'archived_companies', 'sellers'];
  for (const table of tables) {
    const { data: rows, error: tblErr } = await supabase.from(table).select('*').limit(1);
    console.log(`Table ${table} exists?`, tblErr ? 'No: ' + tblErr.message : 'Yes, columns: ' + Object.keys(rows[0] || {}).join(', '));
  }
}

run();
