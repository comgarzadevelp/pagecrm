import { supabase, saeSupabase } from '../supabaseClient.js';

async function test() {
  console.log('Querying for bitechi in clie03...');
  const searchTerm = '%bitechi%';
  const { data, error } = await saeSupabase
    .from('clie03')
    .select('clave, nombre, cve_vend, status')
    .or(`nombre.ilike.${searchTerm},nombrecomercial.ilike.${searchTerm}`);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Results count:', data.length);
    data.forEach(d => {
      console.log({
        clave: d.clave,
        nombre: d.nombre,
        cve_vend: d.cve_vend,
        status: d.status
      });
    });
  }
}

test();
