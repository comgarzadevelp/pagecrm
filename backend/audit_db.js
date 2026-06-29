/**
 * audit_db.js - Inventario completo de datos en las tablas del CRM
 * Solo lectura, no modifica nada.
 */
import { supabase } from './supabaseClient.js';

async function audit() {
  console.log('\n========================================');
  console.log('   AUDITORÍA DE BASE DE DATOS CRM');
  console.log('========================================\n');

  // 1. LEADS
  const { data: leads } = await supabase.from('leads').select('id, type, status, name, company, created_at').order('created_at', { ascending: false });
  const leadsByType = {};
  (leads || []).forEach(l => {
    if (!leadsByType[l.type]) leadsByType[l.type] = [];
    leadsByType[l.type].push(l);
  });
  console.log(`\n[LEADS] Total: ${(leads || []).length}`);
  Object.entries(leadsByType).forEach(([type, rows]) => {
    console.log(`  type="${type}": ${rows.length} registros`);
    rows.slice(0, 3).forEach(r => console.log(`    - "${r.name}" | status="${r.status}" | ${r.created_at?.substring(0,10)}`));
    if (rows.length > 3) console.log(`    ... y ${rows.length - 3} más`);
  });

  // 2. CRM_OPPORTUNITIES
  const { data: opps } = await supabase.from('crm_opportunities').select('id, title, stage, contact_id, company_id, created_at').order('created_at', { ascending: false });
  console.log(`\n[CRM_OPPORTUNITIES] Total: ${(opps || []).length}`);
  (opps || []).forEach(o => {
    console.log(`  - "${o.title}" | stage="${o.stage}" | company_id=${o.company_id ? o.company_id.substring(0,8)+'...' : 'NULL'} | ${o.created_at?.substring(0,10)}`);
  });

  // 3. COMPANIES
  const { data: cos } = await supabase.from('companies').select('id, name, status, created_at').order('created_at', { ascending: false });
  console.log(`\n[COMPANIES] Total: ${(cos || []).length}`);
  (cos || []).slice(0, 10).forEach(c => console.log(`  - "${c.name}" | status="${c.status}" | ${c.created_at?.substring(0,10)}`));
  if ((cos || []).length > 10) console.log(`  ... y ${cos.length - 10} más`);

  // 4. CONTACTS
  const { data: contacts } = await supabase.from('contacts').select('id, name, email, company_id, created_at').order('created_at', { ascending: false });
  console.log(`\n[CONTACTS] Total: ${(contacts || []).length}`);
  (contacts || []).slice(0, 10).forEach(c => console.log(`  - "${c.name}" | email="${c.email}" | company=${c.company_id ? c.company_id.substring(0,8)+'...' : 'null'} | ${c.created_at?.substring(0,10)}`));
  if ((contacts || []).length > 10) console.log(`  ... y ${contacts.length - 10} más`);

  // 5. QUOTES
  const { data: quotes } = await supabase.from('quotes').select('id, quote_num, total, status, created_at').order('created_at', { ascending: false });
  console.log(`\n[QUOTES/COTIZACIONES] Total: ${(quotes || []).length}`);
  (quotes || []).slice(0, 5).forEach(q => console.log(`  - #${q.quote_num} | $${q.total} | status="${q.status}" | ${q.created_at?.substring(0,10)}`));
  if ((quotes || []).length > 5) console.log(`  ... y ${quotes.length - 5} más`);

  // 6. OBRAS
  const { data: obras } = await supabase.from('obras').select('id, name, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(`\n[OBRAS] (muestra de 5)`);
  (obras || []).forEach(o => console.log(`  - "${o.name}" | ${o.created_at?.substring(0,10)}`));

  // 7. CRM_USERS
  const { data: users } = await supabase.from('crm_users').select('id, name, role, email').order('name');
  console.log(`\n[CRM_USERS] Total: ${(users || []).length}`);
  (users || []).forEach(u => console.log(`  - "${u.name}" | role="${u.role}" | ${u.email}`));

  console.log('\n========================================\n');
}

audit();
