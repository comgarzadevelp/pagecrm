
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
async function run() {
  const { data: co, error: coErr } = await supabase.from('companies').select('*').limit(1);
  console.log('Companies:', co && co.length > 0 ? Object.keys(co[0]) : coErr);
  const { data: ct, error: ctErr } = await supabase.from('contacts').select('*').limit(1);
  console.log('Contacts:', ct && ct.length > 0 ? Object.keys(ct[0]) : ctErr);
}
run();

