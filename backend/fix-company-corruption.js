import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixCompanyIdCorruption() {
  console.log('--- Iniciando limpieza de company_id corruptos en leads ---');

  // 1. Obtener la compañía master del tenant (es la que está asignada erróneamente en los leads)
  // Usaremos el companyId del usuario actual (por ejemplo, id = 1 en crm_users que tiene company_id)
  const { data: users, error: userErr } = await supabase.from('crm_users').select('company_id').limit(10);
  if (userErr || !users.length) {
    console.error('No se pudo encontrar crm_users');
    return;
  }
  
  // Asumimos que los usuarios pertenecen al mismo tenant
  const tenantCompanyId = users.find(u => u.company_id && !u.company_id.startsWith('company-'))?.company_id;
  
  if (!tenantCompanyId) {
    console.log('No se encontró un tenantCompanyId UUID. Posiblemente no hay corrupción.');
    return;
  }

  console.log(`Tenant Company ID detectado: ${tenantCompanyId}`);

  // 2. Buscar leads que tengan este tenantCompanyId y sean tipo 'crm_customer'
  const { data: corruptedLeads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, name, company, notes, company_id')
    .eq('company_id', tenantCompanyId)
    .eq('type', 'crm_customer');

  if (leadsErr) {
    console.error('Error buscando leads:', leadsErr);
    return;
  }

  console.log(`Se encontraron ${corruptedLeads.length} leads con company_id apuntando al tenant.`);

  if (corruptedLeads.length === 0) {
    console.log('No hay leads corruptos.');
  } else {
    for (const lead of corruptedLeads) {
      // 3. Remover el company_id del tenant para que no jale sus notas
      const { error: updErr } = await supabase
        .from('leads')
        .update({ company_id: null })
        .eq('id', lead.id);

      if (updErr) {
        console.error(`Error actualizando lead ${lead.name}:`, updErr);
      } else {
        console.log(`✅ Lead corregido (company_id = null): ${lead.name}`);
      }
    }
  }

  // 4. Limpiar las notas de la compañía tenant
  const { data: tenantCo } = await supabase.from('companies').select('notes').eq('id', tenantCompanyId).single();
  if (tenantCo && tenantCo.notes) {
    try {
      const parsedNotes = JSON.parse(tenantCo.notes);
      if (parsedNotes.timeline && parsedNotes.timeline.length > 0) {
        console.log(`Limpiando el timeline de la empresa master (tenía ${parsedNotes.timeline.length} notas)`);
        // Opcional: puedes dejar el timeline en [] o filtrar solo las que digan "fix02 app"
        parsedNotes.timeline = []; 
        await supabase.from('companies').update({ notes: JSON.stringify(parsedNotes) }).eq('id', tenantCompanyId);
        console.log('✅ Timeline de la empresa master limpiado.');
      }
    } catch(e) {}
  }

  console.log('--- Proceso terminado ---');
}

fixCompanyIdCorruption();
