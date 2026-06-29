
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTenant() {
  console.log('Fixing tenant IDs...');
  
  // Update companies without tenant
  const { data: cos, error: err1 } = await supabase.from('companies').update({ company_id: '8a81657b-7b08-4171-a080-86dc84e868a2' }).is('company_id', null).select('id');
  if (err1) console.error('Error companies:', err1);
  else console.log('Updated', cos?.length, 'companies');
  
  // wait, the tenant ID for Garza is what?
  // Let's first query a user to see what companyId they have.
  const { data: users } = await supabase.from('crm_users').select('company_id, company_code').eq('company_code', 'GARZA').limit(1);
  if (users && users.length > 0) {
      const tenantId = users[0].company_id;
      console.log('Found GARZA tenant ID:', tenantId);
      
      const { data: uCos } = await supabase.from('companies').update({ company_id: tenantId }).is('company_id', null).select('id');
      console.log('Fixed', uCos?.length, 'companies');
      
      // Update contacts created_by so sales can see them? 
      // Actually sales can only see contacts they created OR contacts linked to their companies.
      // Wait, getContacts has:
      // if (role === 'sales') { query = query.eq('created_by', userId); }
      // This means a sales user can ONLY see contacts they created! This is too restrictive if they need to see imported contacts.
      // I should update getContacts in contactController.js to allow viewing all contacts of their tenant, or at least contacts linked to their companies.
  }
}
fixTenant();

