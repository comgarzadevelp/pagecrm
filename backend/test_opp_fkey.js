import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
    const { data, error } = await supabase
      .from('crm_opportunities')
      .select(`
        id,
        title,
        stage,
        value,
        assigned_to,
        contact_id,
        company_id,
        seller:crm_users!assigned_to (id, name),
        contact:contacts!contact_id (id, name),
        company:companies!company_id (id, name)
      `)
      .limit(1);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', JSON.stringify(data, null, 2));
    }
}
testQuery();
