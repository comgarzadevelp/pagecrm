/**
 * migrate_failed_leads.js
 * 
 * Migra los 3 leads que fallaron porque su contact_id no existe en contacts table.
 * Los migra usando solo company_id (omitiendo el contact_id huérfano).
 */
import { supabase } from './supabaseClient.js';

const FAILED_LEAD_IDS = [
  '49a28ac6-da32-4de3-b5b9-43469490fdce', // Suministro - garza constructora
  '38141797-168d-4f2a-9242-d6701232c07d', // Sanitarios para proyecto (CIENEGA)
  '116d7152-5031-4807-ae9e-d76449fc7031', // Tinacos para departametos
];

async function migrate() {
  console.log('\n=== MIGRACIÓN LEADS FALLIDOS (solo company_id) ===\n');

  for (const leadId of FAILED_LEAD_IDS) {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, name, company, notes, assigned_to, status, created_at')
      .eq('id', leadId)
      .single();

    if (error || !lead) { console.error(`Lead ${leadId} no encontrado`); continue; }

    let notes = {};
    try { notes = JSON.parse(lead.notes); } catch(e) {}

    const companyId = notes.company_id && notes.company_id !== 'null' ? notes.company_id : null;
    const title = notes.requirement_title || lead.company || 'Negociación migrada';

    if (!companyId) { console.log(`[SKIP] "${title}" sin company_id`); continue; }

    // Verificar que la empresa existe
    const { data: co } = await supabase.from('companies').select('id, name').eq('id', companyId).maybeSingle();
    if (!co) { console.log(`[SKIP] "${title}" company_id ${companyId} no existe en companies`); continue; }

    // Verificar duplicado
    const { data: existing } = await supabase
      .from('crm_opportunities')
      .select('id')
      .eq('title', title)
      .eq('company_id', companyId)
      .maybeSingle();

    if (existing) { console.log(`[YA EXISTE] "${title}"`); continue; }

    const assignedTo = typeof lead.assigned_to === 'object' ? lead.assigned_to?.id : lead.assigned_to;

    const { data: newOpp, error: oppErr } = await supabase
      .from('crm_opportunities')
      .insert([{
        title,
        description: notes.general || 'Negociación migrada desde bandeja de ventas.',
        type: 'proyecto',
        stage: 'nuevo',
        value: 0,
        contact_id: null, // omitir contact_id huérfano
        company_id: companyId,
        assigned_to: assignedTo,
        created_by: assignedTo,
        stage_updated_at: lead.created_at,
        created_at: lead.created_at,
        updated_at: lead.created_at
      }])
      .select('id')
      .single();

    if (oppErr) {
      console.error(`[ERROR] "${title}":`, oppErr.message);
    } else {
      console.log(`[MIGRADO ✓] "${title}" (empresa: ${co.name}) → opp ${newOpp.id}`);
    }
  }
}

migrate();
