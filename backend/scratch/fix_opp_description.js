import { supabase } from '../supabaseClient.js';

async function fixOppDescription() {
  console.log('=== FIXING OPPORTUNITY DESCRIPTIONS ===');

  const { data: opps, error } = await supabase
    .from('crm_opportunities')
    .select('id, title, description');

  if (error) {
    console.error('Error fetching opps:', error);
    return;
  }

  for (const opp of opps) {
    if (typeof opp.description === 'string' && opp.description.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(opp.description);
        const obraName = parsed.project_name || '';
        const notesText = parsed.general || parsed.notes || '';
        const reqTitle = parsed.requirement_title || '';

        const cleanDescription = `${obraName ? `[Obra: ${obraName}]\n` : ''}${notesText || 'Negociación registrada.'}`.trim();
        const cleanTitle = reqTitle ? reqTitle : opp.title;

        const { error: upErr } = await supabase
          .from('crm_opportunities')
          .update({
            title: cleanTitle,
            description: cleanDescription
          })
          .eq('id', opp.id);

        if (!upErr) {
          console.log(`Successfully formatted description for opp ${opp.id}`);
        } else {
          console.error(`Error updating opp ${opp.id}:`, upErr.message);
        }
      } catch (e) {
        console.error(`Failed to parse opp ${opp.id}:`, e);
      }
    }
  }

  console.log('=== FIX COMPLETE ===');
}

fixOppDescription();
