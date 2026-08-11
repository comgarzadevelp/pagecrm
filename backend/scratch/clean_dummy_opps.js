import { supabase } from '../supabaseClient.js';

async function cleanDummyOpps() {
  console.log('=== CLEANING SYNCHRONIZED DUMMY OPPS ===');
  
  // Delete opps created recently with title starting with "Negociación - " or description containing raw json
  const { data: opps, error } = await supabase
    .from('crm_opportunities')
    .select('id, title, description, created_at');

  if (error) {
    console.error('Error fetching opps:', error);
    return;
  }

  console.log(`Total opps in database: ${opps.length}`);

  for (const opp of opps) {
    // Check if it was created by sync script (e.g. title starts with "Negociación - " or description has raw JSON without proper formatting)
    if (opp.title.startsWith('Negociación - ') || opp.title.startsWith('OBRA NO ESPECIFICADA')) {
      const { error: delErr } = await supabase
        .from('crm_opportunities')
        .delete()
        .eq('id', opp.id);
      
      if (delErr) {
        console.error(`Failed to delete opp ${opp.id}:`, delErr.message);
      } else {
        console.log(`Deleted auto-synced opp ${opp.id} (${opp.title})`);
      }
    }
  }

  console.log('=== CLEANUP COMPLETE ===');
}

cleanDummyOpps();
