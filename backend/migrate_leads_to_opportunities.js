/**
 * migrate_leads_to_opportunities.js
 * 
 * Migra todos los leads tipo 'vendedor_manual' que tienen contact_id o company_id
 * resueltos en sus notas hacia crm_opportunities.
 * 
 * Seguro: solo inserta en crm_opportunities si no existe ya una oportunidad con el mismo
 * título+company_id (evita duplicados).
 * NO elimina los leads — solo los lee.
 */
import { supabase } from './supabaseClient.js';

async function migrate() {
  console.log('\n=== MIGRACIÓN: leads vendedor_manual → crm_opportunities ===\n');

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, email, phone, company, notes, assigned_to, status, created_at')
    .eq('type', 'vendedor_manual')
    .order('created_at', { ascending: true });

  if (error) { console.error('Error fetching leads:', error); return; }

  let migrated = 0;
  let skipped = 0;
  let noIds = 0;

  for (const lead of leads) {
    let notes = {};
    try { notes = JSON.parse(lead.notes); } catch(e) {}

    const contactId = notes.contact_id && notes.contact_id !== 'null' && notes.contact_id !== 'undefined' ? notes.contact_id : null;
    const companyId = notes.company_id && notes.company_id !== 'null' && notes.company_id !== 'undefined' ? notes.company_id : null;

    if (!contactId && !companyId) {
      console.log(`  [SKIP - sin IDs] "${notes.requirement_title || lead.company}" (lead ${lead.id})`);
      noIds++;
      continue;
    }

    const title = notes.requirement_title || lead.company || 'Negociación migrada';

    // Verificar si ya existe en crm_opportunities para evitar duplicados
    let dupQuery = supabase.from('crm_opportunities').select('id').eq('title', title);
    if (companyId) dupQuery = dupQuery.eq('company_id', companyId);
    else if (contactId) dupQuery = dupQuery.eq('contact_id', contactId);
    
    const { data: existing } = await dupQuery.maybeSingle();

    if (existing) {
      console.log(`  [YA EXISTE] "${title}" (opp ${existing.id})`);
      skipped++;
      continue;
    }

    // Migrar a crm_opportunities
    const { data: newOpp, error: oppErr } = await supabase
      .from('crm_opportunities')
      .insert([{
        title,
        description: notes.general || 'Negociación migrada desde bandeja de ventas.',
        type: 'proyecto',
        stage: lead.status === 'ganado' || lead.status === 'cierre_ganado' ? 'ganado' : 
               lead.status === 'perdido' || lead.status === 'cierre_perdido' ? 'perdido' :
               lead.status === 'cotizando' ? 'propuesta' :
               lead.status === 'proceso' || lead.status === 'contactado' ? 'contactado' : 'nuevo',
        value: 0,
        contact_id: contactId,
        company_id: companyId,
        assigned_to: typeof lead.assigned_to === 'object' ? lead.assigned_to?.id : lead.assigned_to,
        created_by: typeof lead.assigned_to === 'object' ? lead.assigned_to?.id : lead.assigned_to,
        stage_updated_at: lead.created_at,
        created_at: lead.created_at,
        updated_at: lead.created_at
      }])
      .select('id')
      .single();

    if (oppErr) {
      console.error(`  [ERROR] "${title}":`, oppErr.message);
    } else {
      console.log(`  [MIGRADO ✓] "${title}" → opp ${newOpp.id} | company_id=${companyId} | contact_id=${contactId}`);
      migrated++;
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`  Migrados:  ${migrated}`);
  console.log(`  Ya existían: ${skipped}`);
  console.log(`  Sin IDs (prospecto huérfano): ${noIds}`);
  console.log(`  Total leads procesados: ${leads.length}`);
}

migrate();
