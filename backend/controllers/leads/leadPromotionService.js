/**
 * @file leadPromotionService.js
 * 
 * ES: Servicio de promoción de leads a negociaciones y contactos.
 * EN: Lead promotion service to convert leads to contacts, companies, and opportunities.
 */

import { supabase } from '../../supabaseClient.js';

/**
 * ES: Promueve un lead a la tabla crm_opportunities, vinculando/creando el contacto y la empresa.
 * EN: Promotes a lead to crm_opportunities, linking/creating contact and company.
 */
export const promoteLeadToOpportunity = async (req, res) => {
  const { id: leadId } = req.params;
  const {
    // Datos del Contacto
    contactName,
    position,
    email,
    phone,
    phone_alt,
    whatsapp,
    notes,
    linkExistingCompanyId,
    newCompanyDetails,
    // Datos de la Negociación Inicial
    title,
    amount,
    stage
  } = req.body;

  const userId = req.user?.userId;
  const companyTenantId = req.user?.companyId; // Multi-tenant ID

  try {
    // 1. Leer el registro original de leads
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado.' });
    }

    // 2. Insertar o vincular el contacto
    const contactPayload = {
      name: contactName || lead.name,
      position: position || 'Contacto',
      email: email || lead.email || '',
      phone: phone || lead.phone || '',
      phone_alt: phone_alt || '',
      whatsapp: whatsapp || '',
      notes: notes || `Contacto promovido desde el lead original: ${lead.name}`,
      created_by: userId
    };

    if (companyTenantId && !String(companyTenantId).startsWith('company-')) {
      contactPayload.company_id = companyTenantId;
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert([contactPayload])
      .select()
      .single();

    if (contactError || !contact) {
      console.error('promoteLeadToOpportunity contact creation error:', contactError);
      return res.status(500).json({ success: false, message: 'Error al crear el contacto durante la promoción.' });
    }

    // 3. Vincular o insertar la empresa
    let resolvedCompanyId = linkExistingCompanyId || null;

    if (!resolvedCompanyId && newCompanyDetails && newCompanyDetails.name) {
      const companyPayload = {
        name: newCompanyDetails.name,
        alias: newCompanyDetails.alias || newCompanyDetails.name,
        type: newCompanyDetails.type || 'cliente',
        rfc: newCompanyDetails.rfc || '',
        address: newCompanyDetails.address || '',
        city: newCompanyDetails.city || '',
        state: newCompanyDetails.state || '',
        phone_main: newCompanyDetails.phone_main || phone || lead.phone || '',
        email_main: newCompanyDetails.email_main || email || lead.email || '',
        status: 'activo',
        notes: JSON.stringify({
          general: newCompanyDetails.notes || `Empresa creada automáticamente al promover el lead ${lead.name}`,
          timeline: []
        }),
        created_by: userId
      };

      if (companyTenantId && !String(companyTenantId).startsWith('company-')) {
        companyPayload.company_id = companyTenantId;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([companyPayload])
        .select()
        .single();

      if (!companyError && company) {
        resolvedCompanyId = company.id;
      } else {
        console.error('promoteLeadToOpportunity company creation error:', companyError);
      }
    }

    // Unir en contact_companies si existe empresa vinculada
    if (resolvedCompanyId) {
      await supabase
        .from('contact_companies')
        .insert([{
          contact_id: contact.id,
          company_id: resolvedCompanyId,
          status: 'activo'
        }]);
    }

    // 4. Inserta la nueva negociación oficial en crm_opportunities
    const opportunityPayload = {
      title: title || `Negociación - ${contact.name}`,
      stage: stage || 'nuevo',
      type: 'proyecto',
      value: amount ? parseFloat(amount) : 0,
      assigned_to: lead.assigned_to || userId,
      contact_id: contact.id,
      company_id: resolvedCompanyId,
      created_by: userId,
      stage_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Tenant isolation
    if (!opportunityPayload.company_id && companyTenantId && !String(companyTenantId).startsWith('company-')) {
      const { data: tenantExists } = await supabase.from('companies').select('id').eq('id', companyTenantId).maybeSingle();
      if (tenantExists) {
        opportunityPayload.company_id = companyTenantId;
      }
    }

    const { data: opportunity, error: oppError } = await supabase
      .from('crm_opportunities')
      .insert([opportunityPayload])
      .select()
      .single();

    if (oppError) {
      console.error('promoteLeadToOpportunity opportunity creation error:', oppError);
      return res.status(500).json({ success: false, message: 'Error al crear la negociación durante la promoción.' });
    }

    // 5. Actualiza el lead original marcándolo como promovido y crm_customer
    let notesData = { general: '', timeline: [] };
    if (lead.notes) {
      try {
        notesData = JSON.parse(lead.notes);
        if (!notesData.timeline) notesData.timeline = [];
      } catch (e) {
        notesData.general = lead.notes;
        notesData.timeline = [];
      }
    }

    notesData.timeline.push({
      date: new Date().toISOString(),
      text: `Lead promovido a Negociación: "${opportunity.title}" y Contacto: "${contact.name}".`,
      author: req.user?.name || 'Sistema',
      type: 'status_change'
    });

    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        status: 'promovido',
        type: 'crm_customer',
        notes: JSON.stringify(notesData),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (leadUpdateError) {
      console.error('promoteLeadToOpportunity lead update error:', leadUpdateError);
      return res.status(500).json({ success: false, message: 'Error al actualizar el estado del prospecto.' });
    }

    res.status(201).json({
      success: true,
      message: 'Prospecto promovido a negociación exitosamente.',
      contact,
      opportunity,
      companyId: resolvedCompanyId
    });
  } catch (err) {
    console.error('promoteLeadToOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error interno al promover el prospecto.' });
  }
};
