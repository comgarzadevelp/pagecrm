import { supabase } from './supabaseClient.js';

async function check() {
  const { data: users, error: uErr } = await supabase
    .from('crm_users')
    .select('id, name, email, role');
  
  if (uErr) {
    console.error('Error fetching users:', uErr);
    return;
  }
  
  console.log('CRM Users:');
  console.log(JSON.stringify(users, null, 2));

  const { data: notifs, error: nErr } = await supabase
    .from('crm_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15);

  if (nErr) {
    console.error('Error fetching notifications:', nErr);
  } else {
    console.log('Recent notifications:');
    console.log(JSON.stringify(notifs, null, 2));
  }
}

check();
