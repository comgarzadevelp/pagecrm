import { supabase } from './supabaseClient.js';

async function check() {
  const { data, error } = await supabase
    .from('crm_notifications')
    .select('id, user_id, sender_id, title, message, type, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching notifications:', error);
  } else {
    console.log('Recent notifications:');
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
