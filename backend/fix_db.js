
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTenant() {
  console.log('Fixing tenant IDs...');
  
  const { data: users } = await supabase.from('crm_users').select('company_id, company_code').eq('company_code', 'GARZA').limit(1);
  if (users && users.length > 0) {
      const tenantId = users[0].company_id;
      console.log('Found GARZA tenant ID:', tenantId);
      
      const { data: uCos, error: err1 } = await supabase.from('companies').update({ company_id: tenantId }).is('company_id', null).select('id');
      console.log('Fixed', uCos?.length, 'companies');
      
      // Update contacts as well
      const { data: uCont, error: err2 } = await supabase.from('contacts').update({ company_id: tenantId }).is('company_id', null).select('id');
      console.log('Fixed', uCont?.length, 'contacts');
  }
}
fixTenant();

