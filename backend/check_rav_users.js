import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const saeSupabase = createClient(process.env.SAE_SUPABASE_URL, process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || process.env.SAE_SUPABASE_ANON_KEY);

async function run() {
  try {
    const { data, error } = await saeSupabase.from('crm_users').select('*');
    console.log('RAV USERS in saeSupabase:', data, error);
  } catch (err) {
    console.error('Error fetching RAV users:', err);
  }
}

run();
