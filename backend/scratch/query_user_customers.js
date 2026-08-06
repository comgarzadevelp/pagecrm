import { supabase } from '../supabaseClient.js';

async function test() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, company, type, status, created_at')
    .eq('type', 'crm_customer')
    .eq('assigned_to', '0fa243df-7307-4454-9f55-a3a625c62184');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Customer leads for USUARIO MUESTRA:', leads.length);
    console.log('Leads data:', leads);
  }
}

test();
