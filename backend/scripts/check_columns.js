// backend/scripts/check_columns.js
import { supabase } from '../supabaseClient.js';

async function run() {
  console.log('Inspecting quotes columns...');
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching quotes:', error);
  } else {
    console.log('Sample quotes columns:', data.length > 0 ? Object.keys(data[0]) : 'No quotes found');
  }

  console.log('Inspecting companies columns...');
  const { data: comp, error: compErr } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  if (compErr) {
    console.error('Error fetching companies:', compErr);
  } else {
    console.log('Sample companies columns:', comp.length > 0 ? Object.keys(comp[0]) : 'No companies found');
  }
}

run();
