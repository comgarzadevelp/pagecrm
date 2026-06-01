import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Checking company_module_config table...');
  const { data, error } = await supabase.from('company_module_config').select('*').limit(5);
  if (error) {
    console.error('Error querying company_module_config:', error);
  } else {
    console.log('Success! company_module_config data:', data);
  }
}

test();
