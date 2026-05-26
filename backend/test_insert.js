import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('--- Database Connection and Schema Diagnostics ---');
  
  // 1. Check if we can query crm_users
  console.log('Querying crm_users...');
  const { data: users, error: userError } = await supabase.from('crm_users').select('id, name').limit(1);
  if (userError) {
    console.error('Error querying crm_users:', userError);
  } else {
    console.log('Success crm_users! Sample user:', users);
  }

  // 2. Check if we can query leads
  console.log('Querying leads...');
  const { data: leads, error: leadError } = await supabase.from('leads').select('id, name').limit(1);
  if (leadError) {
    console.error('Error querying leads:', leadError);
  } else {
    console.log('Success leads! Sample customer:', leads);
  }

  // 3. Test insert into quotes with a mock row
  console.log('Attempting to insert a mock quote into "quotes"...');
  
  if (!users || users.length === 0 || !leads || leads.length === 0) {
    console.error('Cannot run mock insert because we do not have registered users or leads in the DB.');
    return;
  }

  const mockQuote = {
    quote_num: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
    client_id: leads[0].id,
    seller_id: users[0].id,
    agreement: 'public',
    items: [{ id: 1, description: 'Test steel pvc', quantity: 10, price: 15.5 }],
    notes: 'Condiciones de prueba',
    subtotal: 155.0,
    iva: 24.8,
    total: 179.8
  };

  const { data: inserted, error: insertError } = await supabase
    .from('quotes')
    .insert([mockQuote])
    .select();

  if (insertError) {
    console.error('!!! INSERT ERROR !!!');
    console.error('Code:', insertError.code);
    console.error('Message:', insertError.message);
    console.error('Details:', insertError.details);
    console.error('Hint:', insertError.hint);
  } else {
    console.log('🎉 SUCCESS! Inserted quote:', inserted);
    
    // Clean up
    console.log('Cleaning up mock quote...');
    await supabase.from('quotes').delete().eq('id', inserted[0].id);
  }
}

test();
