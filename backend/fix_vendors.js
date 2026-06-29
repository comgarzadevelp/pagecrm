
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const saeSupabaseUrl = process.env.SAE_SUPABASE_URL || supabaseUrl;
const saeSupabaseKey = process.env.SAE_SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, supabaseKey);
const saeSupabase = createClient(saeSupabaseUrl, saeSupabaseKey);

async function run() {
  console.log('Fetching CRM users to build vendor map...');
  const { data: users } = await supabase.from('crm_users').select('id, sae_vendor_key');
  const vendorMap = {};
  if (users) {
    users.forEach(u => {
      if (u.sae_vendor_key) vendorMap[u.sae_vendor_key.trim()] = u.id;
    });
  }
  console.log('Vendor Map:', vendorMap);

  console.log('Fetching SAE clients and their cve_vend...');
  let saeClients = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await saeSupabase.from('clie03').select('clave, cve_vend').eq('status', 'A').range(from, from + size - 1);
    if (error) throw error;
    if (data.length === 0) break;
    saeClients = saeClients.concat(data);
    from += size;
  }
  console.log('Fetched', saeClients.length, 'SAE clients.');
  
  const clientVendorMap = {};
  saeClients.forEach(c => {
     if (c.cve_vend) clientVendorMap[c.clave.trim()] = c.cve_vend.trim();
  });

  console.log('Fetching all migrated companies...');
  const { data: companies } = await supabase.from('companies').select('id, notes, created_by');
  
  const updates = [];
  let count = 0;
  companies.forEach(co => {
     if (co.notes) {
        try {
           const p = JSON.parse(co.notes);
           if (p.sae_clave) {
              const vend = clientVendorMap[p.sae_clave];
              const userId = vend ? vendorMap[vend] : null;
              if (userId && co.created_by !== userId) {
                 updates.push({ id: co.id, created_by: userId });
              }
           }
        } catch(e){}
     }
  });

  console.log('Need to update', updates.length, 'companies.');
  
  for(let i=0; i<updates.length; i+=100) {
      const chunk = updates.slice(i, i+100);
      const promises = chunk.map(u => supabase.from('companies').update({ created_by: u.created_by }).eq('id', u.id));
      await Promise.all(promises);
      count += chunk.length;
      console.log('Updated', count);
  }
  
  console.log('Updating contacts linked to these companies...');
  // update contacts created_by based on their company's created_by
  const { data: contacts } = await supabase.from('contacts').select('id, company_id, created_by');
  const compOwnerMap = {};
  updates.forEach(u => compOwnerMap[u.id] = u.created_by);
  
  const contactUpdates = [];
  contacts.forEach(c => {
     if (c.company_id && compOwnerMap[c.company_id] && c.created_by !== compOwnerMap[c.company_id]) {
        contactUpdates.push({ id: c.id, created_by: compOwnerMap[c.company_id] });
     }
  });
  
  console.log('Need to update', contactUpdates.length, 'contacts.');
  let cCount = 0;
  for(let i=0; i<contactUpdates.length; i+=100) {
      const chunk = contactUpdates.slice(i, i+100);
      const promises = chunk.map(u => supabase.from('contacts').update({ created_by: u.created_by }).eq('id', u.id));
      await Promise.all(promises);
      cCount += chunk.length;
      console.log('Updated contacts', cCount);
  }
  console.log('Done.');
}
run();

