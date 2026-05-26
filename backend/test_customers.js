import { supabase } from './supabaseClient.js';

async function test() {
  try {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error querying crm_customers:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('TABLE_DOES_NOT_EXIST');
      }
    } else {
      console.log('crm_customers exists! Data:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

test();
