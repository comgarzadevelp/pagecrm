
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function run() {
  const { data: co } = await supabase.from('companies').select('*').limit(1);
  console.log('Companies:', co ? Object.keys(co[0]) : 'none');
  const { data: ct } = await supabase.from('contacts').select('*').limit(1);
  console.log('Contacts:', ct ? Object.keys(ct[0]) : 'none');
  const { data: cu } = await supabase.from('customers').select('*').limit(1);
  console.log('Customers:', cu ? Object.keys(cu[0]) : 'none');
}
run();

