import { supabase } from '../supabaseClient.js';

async function syncLeadsToOpps() {
  console.log('=== SYNCING RECENT LEADS TO CRM_OPPORTUNITIES ===');

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log(`Found ${leads.length} recent leads.`);

  for (const lead of leads) {
    let parsedNotes = {};
    try {
      parsedNotes = typeof lead.notes === 'string' ? JSON.parse(lead.notes) : (lead.notes || {});
    } catch (e) {
      parsedNotes = { general: lead.notes };
    }

    const title = parsedNotes.requirement_title || parsedNotes.project_name || `Negociación - ${lead.name || lead.company}`;
    
    // Check if opportunity already exists
    const { data: existingOpp } = await supabase
      .from('crm_opportunities')
      .select('id')
      .ilike('title', `%${lead.name || title}%`)
      .maybeSingle();

    if (existingOpp) {
      console.log(`Opportunity already exists for lead: ${lead.name} (id: ${existingOpp.id})`);
      continue;
    }

    // Resolve contact/company if possible
    let contactId = null;
    let companyId = null;

    if (lead.phone) {
      const { data: c } = await supabase.from('contacts').select('id').eq('phone', lead.phone).maybeSingle();
      if (c) contactId = c.id;
    }
    if (lead.company) {
      const { data: co } = await supabase.from('companies').select('id').ilike('name', lead.company).maybeSingle();
      if (co) companyId = co.id;
    }

    const oppPayload = {
      title,
      description: JSON.stringify(parsedNotes),
      stage: 'nuevo',
      type: 'proyecto',
      value: 0,
      assigned_to: lead.assigned_to,
      contact_id: contactId,
      company_id: companyId,
      created_at: lead.created_at || new Date().toISOString(),
      stage_updated_at: new Date().toISOString()
    };

    const { data: newOpp, error: insertErr } = await supabase
      .from('crm_opportunities')
      .insert([oppPayload])
      .select()
      .single();

    if (insertErr) {
      console.error(`Failed to create opportunity for lead ${lead.name}:`, insertErr.message);
    } else {
      console.log(`SUCCESS: Created opportunity ${newOpp.id} (${newOpp.title}) for lead ${lead.name}`);
    }
  }

  console.log('=== SYNC COMPLETE ===');
}

syncLeadsToOpps();
