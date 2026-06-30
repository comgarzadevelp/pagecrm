import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'z:/Diseño V2/GARZA/06-GarzaPage/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: companies, error: err1 } = await supabase
    .from('companies')
    .select('id, name, notes')
    .ilike('name', '%JAVER%');
    
  console.log('COMPANIES JAVER:');
  companies.forEach(c => {
    console.log(`Company ID: ${c.id}`);
    console.log(`Name: ${c.name}`);
    console.log(`Notes: ${c.notes}`);
    console.log('---');
  });

  const { data: leads, error: err2 } = await supabase
    .from('leads')
    .select('id, name, notes')
    .ilike('name', '%JAVER%');
    
  console.log('\nLEADS JAVER:');
  leads.forEach(l => {
    console.log(`Lead ID: ${l.id}`);
    console.log(`Name: ${l.name}`);
    console.log(`Notes: ${l.notes}`);
    console.log('---');
  });
}

check().catch(console.error);
