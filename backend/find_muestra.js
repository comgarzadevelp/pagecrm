import { supabase } from './supabaseClient.js';

async function run() {
  const { data, error } = await supabase
    .from('crm_users')
    .select('id, name, email, role')
    .ilike('name', '%muestra%');
  
  if (error) {
    console.error(error);
  } else {
    console.log('Matching users:', data);
  }
}

run();
