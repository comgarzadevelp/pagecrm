import { supabase } from './supabaseClient.js';

async function verify() {
  const sae_clave = 'X314-1';
  
  const { data: cos } = await supabase
    .from('companies')
    .select('id, name, notes')
    .like('notes', `%"sae_clave":"${sae_clave}"%`)
    .limit(1);
  
  console.log('Empresas encontradas por sae_clave:', JSON.stringify(cos));
  
  if (cos && cos[0]) {
    const companyId = cos[0].id;
    const { data: opps } = await supabase
      .from('crm_opportunities')
      .select('id, title, stage, company_id')
      .eq('company_id', companyId);
    console.log('Oportunidades de CIENEGA:', JSON.stringify(opps));
  }
}

verify();
