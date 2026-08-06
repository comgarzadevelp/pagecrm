import { supabase } from './supabaseClient.js';

async function fixTimezoneBug() {
  console.log('Iniciando corrección de zona horaria (+6 horas) en evidencias fotográficas afectadas por EXIF...');
  let totalFixed = 0;

  for (const table of ['leads', 'companies']) {
    console.log(`Procesando tabla: ${table}...`);
    const { data: records, error } = await supabase.from(table).select('id, notes').not('notes', 'is', null);
    
    if (error) {
      console.error(`Error obteniendo registros de ${table}:`, error);
      continue;
    }

    for (const record of records) {
      if (!record.notes) continue;
      
      let parsedNotes;
      try {
        parsedNotes = JSON.parse(record.notes);
      } catch (e) {
        continue;
      }

      if (!parsedNotes.timeline || !Array.isArray(parsedNotes.timeline)) continue;

      let changed = false;
      const timeline = parsedNotes.timeline;

      for (let i = 0; i < timeline.length; i++) {
        const node = timeline[i];
        // Si es evidencia y se subió antes de aplicar el parche de hoy
        if (node.type === 'evidence' && node.date) {
          const device = node.deviceInfo ? node.deviceInfo.toLowerCase() : '';
          
          // Las fotos que sufrieron el bug de -6 horas son aquellas cuyo EXIF 
          // sobreescribió la fecha (ej. decían samsung, iphone, motorola, etc).
          // FieldFlow Mobile App y "Dispositivo Móvil" NO sufrieron el bug.
          const hasExifDevice = (device.includes('samsung') || device.includes('iphone') || device.includes('motorola') || device.includes('xiaomi') || device.includes('huawei'));

          if (hasExifDevice) {
            const oldDate = new Date(node.date);
            // Sumar 6 horas a la fecha en UTC para que al restarlas en frontend dé la hora correcta
            const fixedDate = new Date(oldDate.getTime() + (6 * 60 * 60 * 1000));
            
            console.log(`[CORRIGIENDO] ${table} ID ${record.id}: Cambiando de ${oldDate.toISOString()} a ${fixedDate.toISOString()} (Dispositivo: ${node.deviceInfo})`);
            node.date = fixedDate.toISOString();
            changed = true;
            totalFixed++;
          }
        }
      }

      if (changed) {
        const { error: updateError } = await supabase.from(table).update({ notes: JSON.stringify(parsedNotes) }).eq('id', record.id);
        if (updateError) console.error(`Error actualizando registro ${record.id}:`, updateError);
      }
    }
  }

  console.log(`¡Proceso terminado! Se corrigieron ${totalFixed} registros.`);
}

fixTimezoneBug();
