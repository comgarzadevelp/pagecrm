import { supabase } from './supabaseClient.js';

async function check() {
  console.log('\n=== OPORTUNIDADES RECIENTES (últimas 10) ===');
  const { data: opps, error: oppErr } = await supabase
    .from('crm_opportunities')
    .select('id, title, stage, contact_id, company_id, created_at, company:companies(id, name, notes)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (oppErr) { console.error('ERROR opps:', oppErr); }
  else {
    opps.forEach(o => {
      console.log(`\n[OPP] ${o.title}`);
      console.log(`  contact_id: ${o.contact_id}`);
      console.log(`  company_id: ${o.company_id}`);
      console.log(`  company.name: ${o.company?.name}`);
      if (o.company?.notes) {
        try {
          const n = JSON.parse(o.company.notes);
          console.log(`  company.notes.sae_clave: ${n.sae_clave}`);
        } catch(e) { console.log(`  company.notes (raw): ${o.company.notes?.substring(0, 100)}`); }
      }
    });
  }

  console.log('\n=== EMPRESAS CON sae_clave EN NOTAS ===');
  const { data: cos, error: cosErr } = await supabase
    .from('companies')
    .select('id, name, notes')
    .like('notes', '%sae_clave%')
    .limit(20);

  if (cosErr) { console.error('ERROR companies:', cosErr); }
  else {
    cos.forEach(c => {
      try {
        const n = JSON.parse(c.notes);
        console.log(`  [CO] id=${c.id} | name="${c.name}" | sae_clave="${n.sae_clave}"`);
      } catch(e) { console.log(`  [CO] id=${c.id} | name="${c.name}" | notes_parse_error`); }
    });
  }
}

check();
