import { supabase } from './supabaseClient.js';

async function check() {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, assigned_to, type, created_at')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error(error);
  } else {
    console.log('Recent leads:');
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
