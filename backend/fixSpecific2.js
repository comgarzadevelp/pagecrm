import dotenv from 'dotenv';
dotenv.config({ path: 'Z:\\Diseño V2\\GARZA\\06-GarzaPage\\backend\\.env' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase.from('crm_opportunities').select('id, description').eq('id', '9c9ebc03-b4bd-4f92-b6b8-1ffc59f4b23b').single();
  if (data && data.description) {
    let newDesc = data.description
      .replace('[7/14/2026 - Usuario Muestra] registro 05', '[2026-07-13T23:20:00.000Z - Usuario Muestra] registro 05')
      .replace('[14/7/2026 - Usuario Muestra] registro 05', '[2026-07-13T23:20:00.000Z - Usuario Muestra] registro 05');
    
    await supabase.from('crm_opportunities').update({ description: newDesc }).eq('id', data.id);
    console.log('Fixed registro 05 date in DB.');
  }
}
main();
