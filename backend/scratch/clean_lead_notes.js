import { supabase } from '../supabaseClient.js';

async function cleanLeadNotes() {
  console.log('=== CLEANING LEAD NOTES PREFIX ===');

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, notes');

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  for (const lead of leads) {
    const raw = lead.notes || lead.description || '';
    if (typeof raw === 'string' && raw.includes('{') && raw.includes('}')) {
      const jsonStart = raw.indexOf('{');
      const cleanJson = raw.slice(jsonStart);
      try {
        JSON.parse(cleanJson);
        const { error: upErr } = await supabase
          .from('leads')
          .update({ notes: cleanJson })
          .eq('id', lead.id);
        
        if (!upErr) {
          console.log(`Cleaned notes for lead ${lead.id}`);
        }
      } catch (e) {}
    }
  }

  console.log('=== LEAD NOTES CLEANUP COMPLETE ===');
}

cleanLeadNotes();
