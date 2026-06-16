import { supabase } from './supabaseClient.js';

async function run() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, assigned_to, type, created_at')
    .eq('assigned_to', '0fa243df-7307-4454-9f55-a3a625c62184');

  if (error) {
    console.error(error);
  } else {
    console.log('Leads assigned to Usuario Muestra:');
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
