import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log("Testing crm_opportunities insert...");
  const insertData = {
    title: "Test Opportunity",
    description: "Testing from script",
    type: "proyecto",
    stage: "nuevo",
    value: 1000
  };

  const { data, error } = await supabase
    .from('crm_opportunities')
    .insert([insertData])
    .select(`
        *,
        contact:contacts(id, name, email, phone),
        company:companies(id, name, alias),
        assigned_user:crm_users!crm_opportunities_assigned_to_fkey(id, name),
        quotes(id, quote_num, total, created_at)
      `);

  if (error) {
    console.error("DB Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success:", data);
    // cleanup
    if (data && data[0]) {
      await supabase.from('crm_opportunities').delete().eq('id', data[0].id);
    }
  }
}

test();
