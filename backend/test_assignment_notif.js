import { supabase, cleanCompanyId } from './supabaseClient.js';

async function run() {
  const fakeId = 'company-1';
  const cleaned = cleanCompanyId(fakeId);
  console.log(`Fake company ID "${fakeId}" cleaned to:`, cleaned);

  const testSellerId = '4224442e-c03a-487a-afdf-5899bc12e180'; // Seller user ID from database logs
  const testSenderId = 'd53e5054-93be-4013-805c-8b8966661609'; // Admin/Supervisor user ID

  console.log('Inserting test notification...');
  const { data, error } = await supabase.from('crm_notifications').insert([
    {
      user_id: testSellerId,
      sender_id: testSenderId,
      company_id: cleaned,
      title: 'TEST: Asignación limpia',
      message: 'Esta es una notificación de prueba limpia con company_id filtrado.',
      type: 'lead_assigned',
      read: false
    }
  ]).select();

  if (error) {
    console.error('Error inserting notification:', error);
  } else {
    console.log('Success! Inserted notification:', data);
  }
}

run();
