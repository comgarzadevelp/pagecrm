// backend/cleanup_sla_and_dev_leads.js
import { supabase } from './supabaseClient.js';

async function runCleanup() {
  console.log('=== INICIANDO SCRIPT DE DEPURACIÓN Y LIMPIEZA DE SLA/PRUEBAS ===\n');

  try {
    // 1. ELIMINAR NOTIFICACIONES DE INACTIVIDAD (SLA) EXISTENTES
    console.log('1. Eliminando alertas falsas de inactividad de la tabla crm_notifications...');
    const slaTypes = [
      'opp_sla_7d',
      'opp_sla_72h',
      'opp_sla_48h',
      'opp_sla_7d_super',
      'customer_inactive_15d_super'
    ];
    
    const { data: deletedNotifs, error: notifError } = await supabase
      .from('crm_notifications')
      .delete()
      .in('type', slaTypes)
      .select('id');

    if (notifError) throw notifError;
    console.log(`✓ Se eliminaron ${deletedNotifs?.length || 0} notificaciones de inactividad (SLA).\n`);

    // 2. DETECTAR Y ARCHIVAR LEADS DE DESARROLLO/PRUEBAS (TABLA leads)
    console.log('2. Buscando prospectos/clientes de desarrollo/pruebas activos...');
    
    // Obtener leads activos que tengan indicios de ser de prueba
    const { data: activeLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, company, status, created_at')
      .neq('status', 'inactiva')
      .neq('status', 'inactivo')
      .neq('status', 'descartado')
      .neq('status', 'descartada')
      .neq('status', 'cierre_ganado')
      .neq('status', 'cierre_perdido')
      .neq('status', 'ganado')
      .neq('status', 'perdido');

    if (leadsError) throw leadsError;

    const testKeywords = ['prueba', 'test', 'desarrollo', 'demo', 'obra prueba', 'obras prueba', 'inactivo', 'temporal'];
    const leadsToArchive = [];

    for (const lead of (activeLeads || [])) {
      const nameLower = (lead.name || '').toLowerCase();
      const companyLower = (lead.company || '').toLowerCase();
      
      const isTest = testKeywords.some(keyword => nameLower.includes(keyword) || companyLower.includes(keyword));
      
      // También consideramos "de prueba" si tienen más de 30 días creados sin actividad
      const createdDate = new Date(lead.created_at);
      const daysOld = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
      
      if (isTest || daysOld > 30) {
        leadsToArchive.push(lead.id);
      }
    }

    if (leadsToArchive.length > 0) {
      console.log(`-> Encontrados ${leadsToArchive.length} prospectos/clientes de prueba o inactivos antiguos.`);
      const { error: updateLeadsError } = await supabase
        .from('leads')
        .update({ status: 'descartado' })
        .in('id', leadsToArchive);

      if (updateLeadsError) throw updateLeadsError;
      console.log(`✓ Se actualizaron los ${leadsToArchive.length} leads a estatus "descartado" (archivado sin borrar de la DB).\n`);
    } else {
      console.log('✓ No se encontraron prospectos de desarrollo activos para archivar.\n');
    }

    // 3. DETECTAR Y ARCHIVAR NEGOCIACIONES DE DESARROLLO/PRUEBAS (TABLA crm_opportunities)
    console.log('3. Buscando negociaciones/oportunidades de desarrollo/pruebas activas...');
    const { data: activeOpps, error: oppsError } = await supabase
      .from('crm_opportunities')
      .select('id, title, stage, created_at')
      .not('stage', 'in', '("ganado","perdido","venta_ganada","venta_perdida","cierre_ganado","cierre_perdido","descartado","descartada")');

    if (oppsError) throw oppsError;

    const oppsToArchive = [];
    for (const opp of (activeOpps || [])) {
      const nameLower = (opp.title || '').toLowerCase();
      const isTest = testKeywords.some(keyword => nameLower.includes(keyword));
      const createdDate = new Date(opp.created_at);
      const daysOld = (new Date() - createdDate) / (1000 * 60 * 60 * 24);

      if (isTest || daysOld > 30) {
        oppsToArchive.push(opp.id);
      }
    }

    if (oppsToArchive.length > 0) {
      console.log(`-> Encontradas ${oppsToArchive.length} negociaciones de prueba o inactivas antiguas.`);
      const { error: updateOppsError } = await supabase
        .from('crm_opportunities')
        .update({ stage: 'descartado' })
        .in('id', oppsToArchive);

      if (updateOppsError) throw updateOppsError;
      console.log(`✓ Se actualizaron las ${oppsToArchive.length} negociaciones a etapa "descartado" (archivadas sin borrar de la DB).\n`);
    } else {
      console.log('✓ No se encontraron negociaciones de desarrollo activas para archivar.\n');
    }

    console.log('=== LIMPIEZA COMPLETADA CON ÉXITO ===');
  } catch (err) {
    console.error('Error durante la depuración:', err.message);
  }
}

runCleanup();
