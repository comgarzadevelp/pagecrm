import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  const { data: companies, error: err1 } = await supabase.from('enterprise_companies').select('*');
  console.log('COMPANIES:', companies, err1);

  const { data: users, error: err2 } = await supabase.from('crm_users').select('id, name, email, company_id');
  console.log('USERS:', users, err2);
}

run();
