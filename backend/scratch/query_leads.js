import { supabase } from '../supabaseClient.js';

async function test() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, company, type, status, created_at')
    .neq('type', 'crm_customer');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Leads count (non-crm_customer):', leads.length);
    console.log('Leads data:', leads);
  }
}

test();
