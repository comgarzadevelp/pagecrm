import { supabase } from '../supabaseClient.js';

async function test() {
  const { data, error } = await supabase
    .from('crm_opportunities')
    .select('*');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('CRM opportunities raw data:', data);
  }
}

test();
