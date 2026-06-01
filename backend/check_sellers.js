import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const saeSupabase = createClient(process.env.SAE_SUPABASE_URL, process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || process.env.SAE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await saeSupabase.from('vend03').select('*').limit(5);
  console.log('VEND03 Rows:', data, error);
}

run();
