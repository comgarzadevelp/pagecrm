import { supabase } from '../supabaseClient.js';

async function checkOpp() {
  const { data, error } = await supabase
    .from('crm_opportunities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching opps:', error);
    return;
  }

  console.log('=== CURRENT CRM_OPPORTUNITIES IN DB ===');
  data.forEach(o => {
    console.log(`ID: ${o.id}`);
    console.log(`Title: ${o.title}`);
    console.log(`Description: ${o.description}`);
    console.log(`Stage: ${o.stage}`);
    console.log(`Company ID: ${o.company_id}, Contact ID: ${o.contact_id}`);
    console.log('---');
  });
}

checkOpp();
