/**
 * cleanup_db.js
 * Limpieza total de datos de prueba. IRREVERSIBLE.
 * Preserva: crm_users, estructura de tablas, integración SAE.
 */
import { supabase } from './supabaseClient.js';

async function cleanup() {
  console.log('\n=== LIMPIEZA DE BASE DE DATOS CRM ===\n');

  const steps = [
    { table: 'crm_opportunities', filter: null, label: 'Oportunidades/Negociaciones' },
    { table: 'obras', filter: null, label: 'Obras/Proyectos' },
    { table: 'contacts', filter: null, label: 'Contactos' },
    { table: 'companies', filter: null, label: 'Empresas' },
    { table: 'leads', filter: null, label: 'Leads (todos los tipos)' },
  ];

  for (const step of steps) {
    let query = supabase.from(step.table).delete();
    // Supabase requiere siempre un filtro — usamos neq con un UUID imposible para borrar todo
    query = query.neq('id', '00000000-0000-0000-0000-000000000000');

    const { error, count } = await query;
    if (error) {
      console.error(`[ERROR] ${step.label}:`, error.message);
    } else {
      console.log(`[OK] ${step.label} eliminados.`);
    }
  }

  // Verificación post-limpieza
  console.log('\n=== VERIFICACIÓN ===');
  for (const step of steps) {
    const { count } = await supabase.from(step.table).select('*', { count: 'exact', head: true });
    console.log(`  ${step.table}: ${count ?? 0} registros restantes`);
  }

  const { data: users } = await supabase.from('crm_users').select('id', { count: 'exact' });
  console.log(`  crm_users: ${users?.length ?? 0} registros (preservados)`);

  console.log('\n=== LIMPIEZA COMPLETADA ===\n');
}

cleanup();
