// Script para corregir el status del cliente JUAN PEREZ2 existente
import { supabase } from '../supabaseClient.js';

// 1. Ver todos los leads con nombre parecido a juan perez
const { data: leads, error } = await supabase
  .from('leads')
  .select('id, name, phone, email, type, status')
  .ilike('name', '%juan perez%');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Registros encontrados:');
console.log(JSON.stringify(leads, null, 2));

// 2. Buscar el crm_customer
const customer = leads.find(l => l.type === 'crm_customer');
if (!customer) {
  console.log('No hay crm_customer con ese nombre.');
  process.exit(0);
}

console.log('\nCliente encontrado:', customer.id, customer.name, customer.status);

// 3. Si su status no es cierre_ganado, actualizarlo
if (customer.status !== 'cierre_ganado') {
  // Leer sus notas para agregar entry al timeline
  const { data: custData } = await supabase.from('leads').select('notes').eq('id', customer.id).single();
  let notesData = { general: '', timeline: [] };
  if (custData?.notes) {
    try { notesData = JSON.parse(custData.notes); if (!notesData.timeline) notesData.timeline = []; }
    catch (e) { notesData.general = custData.notes; }
  }
  notesData.timeline.push({
    date: new Date().toISOString(),
    text: '¡Cierre Ganado! (Corrección manual de sincronización)',
    author: 'Sistema',
    type: 'status_change'
  });

  const { error: updateErr } = await supabase
    .from('leads')
    .update({ status: 'cierre_ganado', notes: JSON.stringify(notesData) })
    .eq('id', customer.id);

  if (updateErr) {
    console.error('Error al actualizar:', updateErr);
  } else {
    console.log('✅ Cliente actualizado a cierre_ganado exitosamente.');
  }
} else {
  console.log('El cliente ya tiene status cierre_ganado.');
}
