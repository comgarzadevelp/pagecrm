import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
    const { data: quotes } = await supabase.from('quotes').select('id').limit(5);
    console.log('Quotes:', quotes?.length || 0);

    const { data: leads } = await supabase.from('leads').select('id, status').limit(5);
    console.log('Leads:', leads?.length || 0);
    
    const { data: opportunities } = await supabase.from('crm_opportunities').select('id').limit(5);
    console.log('Opportunities:', opportunities?.length || 0);
}

checkData();
