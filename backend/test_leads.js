import { supabase } from './supabaseClient.js';

async function test() {
  try {
    console.log('Fetching all leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*');
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    } else {
      console.log('Leads:', leads);
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

test();
