import dotenv from 'dotenv';
dotenv.config({ path: 'Z:\\Diseño V2\\GARZA\\06-GarzaPage\\backend\\.env' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data } = await supabase.from('crm_opportunities').select('id, description');
  for (const row of data) {
    if (!row.description) continue;
    let newDesc = row.description.replace(/\[(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*([^\]]+))?\]/g, (match, m1, m2, m3, author) => {
      // If m1 (which was the month because of US format) is greater than 12, it must be the day.
      if (parseInt(m1, 10) > 12 || parseInt(m2, 10) > 12) {
         // Try to flip m1 and m2
         const authorStr = author ? ` - ${author}` : '';
         if (parseInt(m2, 10) > 12) {
           return `[${m2}/${m1}/${m3}${authorStr}]`;
         } else {
           return `[${m2}/${m1}/${m3}${authorStr}]`;
         }
      }
      return match;
    });
    if (newDesc !== row.description) {
      await supabase.from('crm_opportunities').update({ description: newDesc }).eq('id', row.id);
      console.log('Fixed dates for', row.id);
    }
  }
}
main();
