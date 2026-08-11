/**
 * @file leadController.js
 * 
 * ES: Controlador del Módulo de Leads y Prospección Temprana. Gestiona la recepción,
 *     asignación, actualización de etapas, notas de seguimiento y descarte de leads.
 * EN: Leads & Early Prospecting Module Controller. Manages lead ingestion, assignment,
 *     stage progression, timeline notes, and discarding.
 */

import { supabase, getSaeConnection, cleanCompanyId } from '../../supabaseClient.js';
import { isValidEmail, notifySuperAdmins } from '../helpers/crmHelpers.js';
import { logDataMutation } from '../../utils/activityLogger.js';

/**
 * ES: Obtiene el listado de prospectos/leads activos filtrados por permisos y empresa.
 * EN: Retrieves active leads list filtered by permissions and company ID.
 */
export const getLeads = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    // ── Leads nativos (tabla leads, excluyendo crm_customer) ──────────────
    let query = supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        type,
        company,
        notes,
        created_at,
        source_session_id,
        assigned_to (id, name)
      `)
      .neq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    if (companyId && !String(companyId).startsWith('company-')) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    // Privacidad por Vendedor
    if (role === 'sales' && userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: leads, error } = await query;
    if (error) throw error;

    // Cruce con crm_appointments para adjuntar active_appointment
    try {
      const clientNames = (leads || [])
        .map(l => l.name)
        .filter(Boolean);

      if (clientNames.length > 0) {
        const { data: appts } = await supabase
          .from('crm_appointments')
          .select('id, client_name, scheduled_at, status, type')
          .in('status', ['active', 'rescheduled'])
          .in('client_name', clientNames);

        if (appts && appts.length > 0) {
          const apptByName = {};
          appts.forEach(a => {
            if (!apptByName[a.client_name]) apptByName[a.client_name] = a;
          });
          leads.forEach(lead => {
            if (lead.name && apptByName[lead.name]) {
              lead.active_appointment = apptByName[lead.name];
            }
          });
        }
      }
    } catch (apptErr) {
      console.warn('[getLeads] Error al cruzar citas activas:', apptErr.message);
    }

    res.json({ success: true, leads: leads || [] });
  } catch (err) {
    console.error('getLeads error:', err);
    res.status(500).json({ success: false, message: 'Error interno al obtener prospectos.' });
  }
};

/**
 * ES: Obtiene los detalles de un prospecto específico por su ID sin fallbacks.
 * EN: Retrieves details of a specific lead by its ID without fallbacks.
 */
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    let query = supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        company,
        notes,
        status,
        type,
        created_at,
        assigned_to (id, name)
      `)
      .eq('id', id)
      .neq('type', 'crm_customer');

    // Privacidad por Vendedor
    if (role === 'sales') {
      query = query.eq('assigned_to', userId);
    }

    const { data: lead, error } = await query.maybeSingle();

    if (error) throw error;
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado o no autorizado.' });
    }

    res.json({ success: true, lead });
  } catch (err) {
    console.error('getLeadById error:', err);
    res.status(500).json({ success: false, message: 'Error interno al obtener el prospecto.' });
  }
};

/**
 * ES: Actualiza la etapa o estatus de un prospecto en el embudo comercial sin fallbacks.
 * EN: Updates a lead's stage or status in the sales funnel without fallbacks.
 */
export const updateLeadStage = async (req, res) => {
  const { id } = req.params;
  const { stage, reason } = req.body;
  const userId = req.user?.userId;
  const role = req.user?.role;
  const userName = req.user?.name || 'Ejecutivo';

  if (!stage) {
    return res.status(400).json({ success: false, message: 'Se requiere el parámetro "stage".' });
  }

  try {
    let query = supabase
      .from('leads')
      .select('id, status, notes, name, assigned_to')
      .eq('id', id);

    // Privacidad por Vendedor
    if (role === 'sales') {
      query = query.eq('assigned_to', userId);
    }

    const { data: lead, error: fetchError } = await query.maybeSingle();

    if (fetchError || !lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado o no autorizado.' });
    }

    const oldStatus = lead.status || 'nuevo';
    const newStatus = stage.toLowerCase().trim();

    if (oldStatus === newStatus) {
      return res.json({ success: true, lead });
    }

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

    let auditText = `Cambio de etapa: de "${oldStatus}" a "${newStatus}".`;
    if (newStatus === 'descartado' && reason && reason.trim() !== '') {
      auditText += ` Motivo de descarte: "${reason.trim()}".`;
    }

    notesData.timeline.push({
      date: new Date().toISOString(),
      text: auditText,
      author: userName,
      type: 'status_change'
    });

    const updatePayload = {
      status: newStatus,
      notes: JSON.stringify(notesData)
    };

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (lead.assigned_to && lead.assigned_to !== userId) {
      try {
        await supabase.from('crm_notifications').insert([
          {
            user_id: lead.assigned_to,
            sender_id: userId,
            company_id: cleanCompanyId(req.user?.companyId),
            title: 'Etapa de Prospecto Actualizada 🔄',
            message: `${userName} movió el prospecto ${lead.name || 'un prospecto'} a la etapa "${newStatus}".`,
            type: 'timeline_note',
            read: false
          }
        ]);
      } catch (notifErr) {
        console.warn('Error al enviar notificación de cambio de etapa:', notifErr.message);
      }
    }

    res.json({ success: true, lead: updatedLead });
  } catch (err) {
    console.error('updateLeadStage error:', err);
    res.status(500).json({ success: false, message: 'Error interno al actualizar la etapa del prospecto.' });
  }
};

/**
 * ES: Edita la información básica de un prospecto (nombre, email, teléfono, empresa, etc.).
 * EN: Edits basic lead information (name, email, phone, company, etc.).
 */
export const updateLead = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company, notes_general, project_name, requirement_title } = req.body;
  const userId = req.user?.userId;
  const role = req.user?.role;
  const userName = req.user?.name || 'Ejecutivo';

  if (email && email.trim() !== '' && !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'El correo electrónico no es válido (ejemplo@dominio.com).' });
  }

  try {
    let query = supabase
      .from('leads')
      .select('id, name, email, phone, company, notes, assigned_to')
      .eq('id', id);

    // Privacidad por Vendedor
    if (role === 'sales') {
      query = query.eq('assigned_to', userId);
    }

    const { data: lead, error: fetchError } = await query.maybeSingle();

    if (fetchError || !lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado o no autorizado.' });
    }

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

    const changes = [];
    const fieldsToCompare = [
      { key: 'name', label: 'nombre', oldVal: lead.name, newVal: name },
      { key: 'company', label: 'empresa', oldVal: lead.company, newVal: company },
      { key: 'phone', label: 'celular', oldVal: lead.phone, newVal: phone },
      { key: 'email', label: 'email', oldVal: lead.email, newVal: email },
      { key: 'notes_general', label: 'mensaje inicial', oldVal: notesData.general, newVal: notes_general },
      { key: 'project_name', label: 'obra', oldVal: notesData.project_name, newVal: project_name },
      { key: 'requirement_title', label: 'requerimiento', oldVal: notesData.requirement_title, newVal: requirement_title }
    ];

    fieldsToCompare.forEach(field => {
      if (field.newVal !== undefined) {
        const oldValClean = (field.oldVal || '').trim();
        const newValClean = (field.newVal || '').trim();
        if (newValClean !== oldValClean) {
          const displayOld = oldValClean || 'N/A';
          const displayNew = newValClean || 'N/A';
          changes.push(`${field.label} de "${displayOld}" a "${displayNew}"`);
        }
      }
    });

    if (changes.length > 0) {
      const auditText = `${userName} editó los datos: ${changes.join(', ')}.`;
      
      notesData.timeline.push({
        date: new Date().toISOString(),
        text: auditText,
        author: userName,
        type: 'status_change'
      });

      if (notes_general !== undefined) {
        notesData.general = (notes_general || '').trim();
      }
      if (project_name !== undefined) {
        notesData.project_name = (project_name || '').trim();
      }
      if (requirement_title !== undefined) {
        notesData.requirement_title = (requirement_title || '').trim();
      }

      const updatePayload = {
        name: name !== undefined ? name.trim() : lead.name,
        email: email !== undefined ? (email ? email.trim() : null) : lead.email,
        phone: phone !== undefined ? phone.trim() : lead.phone,
        company: company !== undefined ? (company ? company.trim() : null) : lead.company,
        notes: JSON.stringify(notesData)
      };

      if (name && name.trim() !== lead.name) {
        try {
          await supabase
            .from('crm_appointments')
            .update({ client_name: name.trim() })
            .eq('client_name', lead.name || '')
            .in('status', ['active', 'rescheduled']);
        } catch (syncErr) {
          console.warn('Could not sync client_name in crm_appointments:', syncErr.message);
        }
      }

      const { data, error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (lead.assigned_to && lead.assigned_to !== userId) {
        try {
          await supabase.from('crm_notifications').insert([
            {
              user_id: lead.assigned_to,
              sender_id: userId,
              company_id: cleanCompanyId(req.user?.companyId),
              title: 'Prospecto Editado ✏️',
              message: `${userName} editó información del prospecto ${lead.name || 'un prospecto'}.`,
              type: 'timeline_note',
              read: false
            }
          ]);
        } catch (notifErr) {
          console.warn('Error al enviar notificación de edición de lead:', notifErr.message);
        }
      }

      return res.json({ success: true, lead: data });
    }

    res.json({ success: true, lead });
  } catch (err) {
    console.error('updateLead error:', err);
    res.status(500).json({ success: false, message: 'Error interno al actualizar el prospecto.' });
  }
};

/**
 * ES: Promueve un prospecto (lead) a la libreta de contactos y opcionalmente crea/vincula una empresa.
 * EN: Promotes a lead to the contacts directory and optionally creates/links a company.
 */
export const promoteLeadToContact = async (req, res) => {
  const { id: leadId } = req.params;
  const { 
    contactName, 
    position, 
    email, 
    phone, 
    phone_alt, 
    whatsapp, 
    notes,
    linkExistingCompanyId,
    newCompanyDetails 
  } = req.body;
  const userId = req.user?.userId;
  const companyId = req.user?.companyId;

  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ success: false, message: 'Lead no encontrado.' });
    }

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

    if (companyId && !String(companyId).startsWith('company-')) {
      contactPayload.company_id = companyId;
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert([contactPayload])
      .select()
      .single();

    if (contactError || !contact) {
      console.error('promoteLeadToContact contact creation error:', contactError);
      return res.status(500).json({ success: false, message: 'Error al crear el contacto.' });
    }

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

      if (companyId && !String(companyId).startsWith('company-')) {
        companyPayload.company_id = companyId;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([companyPayload])
        .select()
        .single();

      if (!companyError && company) {
        resolvedCompanyId = company.id;
      } else {
        console.error('promoteLeadToContact company creation error:', companyError);
      }
    }

    if (resolvedCompanyId) {
      await supabase
        .from('contact_companies')
        .insert([{
          contact_id: contact.id,
          company_id: resolvedCompanyId,
          status: 'activo'
        }]);
    }

    res.status(201).json({
      success: true,
      message: 'Contacto promovido exitosamente.',
      contact,
      companyId: resolvedCompanyId
    });
  } catch (err) {
    console.error('promoteLeadToContact error:', err);
    res.status(500).json({ success: false, message: 'Error interno al promover el lead a contacto.' });
  }
};

/**
 * ES: Marca un prospecto como descartado agregando el motivo al historial de notas.
 * EN: Marks a lead as discarded and appends the reason to its timeline.
 */
export const discardLead = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId;
  const role = req.user?.role;
  const userName = req.user?.name || 'Ejecutivo';

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ success: false, message: 'El motivo de descarte es obligatorio.' });
  }

  try {
    let query = supabase
      .from('leads')
      .select('id, notes, status')
      .eq('id', id);

    // Privacidad por Vendedor
    if (role === 'sales') {
      query = query.eq('assigned_to', userId);
    }

    const { data: lead, error: fetchError } = await query.maybeSingle();

    if (fetchError || !lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado o no autorizado.' });
    }

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
      text: `Prospecto descartado. Motivo: "${reason.trim()}".`,
      author: userName,
      type: 'status_change'
    });

    const { data, error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'descartado',
        notes: JSON.stringify(notesData)
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, lead: data, message: 'Prospecto descartado correctamente.' });
  } catch (err) {
    console.error('discardLead error:', err);
    res.status(500).json({ success: false, message: 'Error interno al descartar el prospecto.' });
  }
};

/**
 * ES: Registra manualmente un nuevo prospecto en la tabla leads.
 * EN: Manually registers a new lead in the leads table.
 */
export const createManualLead = async (req, res) => {
  const userId = req.user?.userId;
  const reqCompanyId = req.user?.companyId;

  try {
    const {
      contact_name, company_name, email, phone, notes, requirement_title, obra_id,
      evidence_photo_url, evidence_text, latitude, longitude, maps_url
    } = req.body;

    const leadContactName = contact_name?.trim() || '';
    const leadCompanyName = company_name?.trim() || '';
    const leadContactPhone = phone?.trim() || '';
    const leadContactEmail = email?.trim() || '';
    const leadObraName = req.body.obra_name?.trim() || '';

    if (!leadContactName) {
      return res.status(400).json({ success: false, message: 'El nombre del contacto es obligatorio.' });
    }

    if (leadContactEmail && !isValidEmail(leadContactEmail)) {
      return res.status(400).json({ success: false, message: 'El correo electrónico no es válido.' });
    }

    let finalObraId = obra_id || null;

    // Autocrear la obra en la tabla 'obras' si se ingresó un nombre de obra nuevo
    if (!finalObraId && leadObraName) {
      try {
        const { data: existingObra } = await supabase
          .from('obras')
          .select('id')
          .ilike('name', leadObraName)
          .maybeSingle();

        if (existingObra) {
          finalObraId = existingObra.id;
        } else {
          const { data: newObra } = await supabase
            .from('obras')
            .insert([{
              name: leadObraName,
              status: 'En Construcción',
              latitude: latitude || null,
              longitude: longitude || null
            }])
            .select('id')
            .single();

          if (newObra) {
            finalObraId = newObra.id;
          }
        }
      } catch (errObra) {
        console.warn('[createManualLead] Advertencia al autocrear obra en BD:', errObra.message);
      }
    }

    let sharedEvidenceNode = null;
    if (evidence_photo_url || evidence_text || (latitude && longitude)) {
      sharedEvidenceNode = {
        date: new Date().toISOString(),
        text: `Evidencia de campo en registro: ${evidence_text || 'Foto/Ubicación capturada'}`,
        author: req.user?.name || 'Vendedor',
        type: 'evidence',
        photo_url: evidence_photo_url || null,
        latitude: latitude || null,
        longitude: longitude || null,
        maps_url: maps_url || null
      };
    }

    const notesPayload = {
      general: notes || 'Prospecto registrado manualmente.',
      project_name: leadObraName,
      requirement_title: requirement_title?.trim() || '',
      obra_id: finalObraId || null,
      company_id: null,
      contact_id: null,
      timeline: [{
        date: new Date().toISOString(),
        text: 'Prospecto registrado manualmente en el CRM.',
        author: req.user?.name || 'Vendedor',
        type: 'status_change'
      }]
    };

    if (sharedEvidenceNode) notesPayload.timeline.push(sharedEvidenceNode);

    const reqContactId = req.body.contact_id || null;
    const reqCompanyId = req.body.company_id || null;

    const insertPayload = {
      name: leadContactName.trim(),
      email: leadContactEmail ? leadContactEmail.trim() : null,
      phone: leadContactPhone.trim(),
      company: leadCompanyName.trim(),
      notes: JSON.stringify(notesPayload),
      assigned_to: userId,
      status: 'nuevo',
      type: 'vendedor_manual'
    };

    if (reqCompanyId && !String(reqCompanyId).startsWith('company-') && !String(reqCompanyId).startsWith('sae-')) {
      insertPayload.company_id = reqCompanyId;
    }

    // 1. Crear registro en 'leads'
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([insertPayload])
      .select()
      .single();

    if (leadError) throw leadError;

    // 2. Resolver o vincular contacto/empresa y crear oportunidad oficial en 'crm_opportunities'
    let resolvedContactId = reqContactId && !String(reqContactId).startsWith('sae-') ? reqContactId : null;
    let resolvedCompanyId = reqCompanyId && !String(reqCompanyId).startsWith('sae-') && !String(reqCompanyId).startsWith('company-') ? reqCompanyId : null;

    if (!resolvedContactId && (leadContactPhone || leadContactEmail)) {
      try {
        let q = supabase.from('contacts').select('id');
        if (leadContactPhone) q = q.eq('phone', leadContactPhone);
        else if (leadContactEmail) q = q.eq('email', leadContactEmail);
        const { data: existingContact } = await q.maybeSingle();

        if (existingContact) {
          resolvedContactId = existingContact.id;
        } else if (leadContactName) {
          const { data: newContact } = await supabase.from('contacts').insert([{
            name: leadContactName,
            phone: leadContactPhone || '',
            email: leadContactEmail || '',
            notes: notes || 'Contacto creado desde registro de negociación.',
            created_by: userId
          }]).select('id').maybeSingle();
          if (newContact) resolvedContactId = newContact.id;
        }
      } catch (cErr) {
        console.warn('[createManualLead] Advertencia resolviendo contacto:', cErr.message);
      }
    }

    if (!resolvedCompanyId && leadCompanyName) {
      try {
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', leadCompanyName)
          .maybeSingle();

        if (existingCompany) {
          resolvedCompanyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabase.from('companies').insert([{
            name: leadCompanyName,
            phone_main: leadContactPhone || '',
            email_main: leadContactEmail || '',
            status: 'activo',
            notes: JSON.stringify({ general: 'Empresa creada desde registro de negociación.', timeline: [] }),
            created_by: userId
          }]).select('id').maybeSingle();
          if (newCompany) resolvedCompanyId = newCompany.id;
        }
      } catch (coErr) {
        console.warn('[createManualLead] Advertencia resolviendo empresa:', coErr.message);
      }
    }

    if (resolvedContactId && resolvedCompanyId) {
      await supabase.from('contact_companies').insert([{
        contact_id: resolvedContactId,
        company_id: resolvedCompanyId,
        status: 'activo'
      }]).catch(() => {});
    }

    const oppTitle = requirement_title?.trim()
      ? requirement_title.trim()
      : (leadObraName ? `${leadObraName} - ${leadCompanyName || leadContactName}` : `Negociación - ${leadCompanyName || leadContactName}`);

    const oppDescriptionText = `${leadObraName ? `[Obra: ${leadObraName}]\n` : ''}${notes || 'Negociación registrada en el CRM.'}`;

    const opportunityPayload = {
      title: oppTitle,
      description: oppDescriptionText,
      stage: 'nuevo',
      type: 'proyecto',
      value: 0,
      assigned_to: userId,
      contact_id: resolvedContactId || null,
      company_id: resolvedCompanyId || null,
      created_by: userId,
      stage_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    let opportunityData = null;
    try {
      const { data: opp, error: oppErr } = await supabase
        .from('crm_opportunities')
        .insert([opportunityPayload])
        .select()
        .single();

      if (oppErr) {
        console.error('[createManualLead] Error al insertar en crm_opportunities:', oppErr);
      } else {
        opportunityData = opp;
      }
    } catch (oppExc) {
      console.error('[createManualLead] Excepción al crear crm_opportunities:', oppExc);
    }

    return res.status(201).json({
      success: true,
      lead: leadData,
      opportunity: opportunityData,
      isNegotiation: true
    });
  } catch (err) {
    console.error('createManualLead error:', err);
    res.status(500).json({ success: false, message: 'Error interno al registrar la negociación.' });
  }
};

/**
 * ES: Verifica si existe un prospecto duplicado registrado con el mismo número de teléfono.
 * EN: Checks if a duplicate lead exists with the same phone number.
 */
export const checkDuplicatePhone = async (req, res) => {
  const { phone } = req.query;
  const userId = req.user?.userId;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Número de teléfono requerido.' });
  }

  try {
    const cleanPhone = phone.trim();
    const { data: duplicateLeads, error } = await supabase
      .from('leads')
      .select('id, name, assigned_to(id, name)')
      .eq('phone', cleanPhone)
      .neq('status', 'descartado');

    if (error) throw error;

    if (duplicateLeads && duplicateLeads.length > 0) {
      const foreignDuplicate = duplicateLeads.find(l => l.assigned_to?.id !== userId);
      
      if (foreignDuplicate) {
        return res.json({ 
          success: true, 
          duplicate: true, 
          message: `Este número ya está asignado a ${foreignDuplicate.assigned_to?.name || 'otro ejecutivo'}.`,
          lead: {
            id: foreignDuplicate.id,
            name: foreignDuplicate.name,
            assignedSeller: foreignDuplicate.assigned_to?.name || 'N/A'
          }
        });
      }
    }

    res.json({ success: true, duplicate: false });
  } catch (err) {
    console.error('checkDuplicatePhone error:', err);
    res.status(500).json({ success: false, message: 'Error al verificar duplicidad.' });
  }
};

/**
 * ES: Agrega una nota o entrada al historial cronológico (timeline) de un prospecto.
 * EN: Adds a note or entry to the chronological timeline of a lead.
 */
export const addLeadTimelineEntry = async (req, res) => {
  const { id } = req.params;
  const { text, type } = req.body;
  const userId = req.user?.userId;
  const userName = req.user?.name || 'Ejecutivo';

  if (!text) {
    return res.status(400).json({ success: false, message: 'El texto de la nota es obligatorio.' });
  }

  try {
    let { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, notes, name, assigned_to')
      .eq('id', id)
      .maybeSingle();

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado.' });
    }

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

    const newEntry = {
      date: new Date().toISOString(),
      text: text.trim(),
      author: userName,
      type: type || 'note'
    };
    notesData.timeline.push(newEntry);

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        notes: JSON.stringify(notesData),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    if (userId) {
      logDataMutation(userId, 'Nota en Lead', lead.name || text.trim().substring(0, 30));
    }

    if (lead.assigned_to && lead.assigned_to !== userId) {
      try {
        await supabase.from('crm_notifications').insert([
          {
            user_id: lead.assigned_to,
            sender_id: userId,
            company_id: cleanCompanyId(req.user?.companyId),
            title: 'Nueva Nota en tu Lead 📝',
            message: `${userName} agregó una nota en ${lead.name || 'un prospecto'}: "${text.trim().substring(0, 60)}${text.trim().length > 60 ? '...' : ''}"`,
            type: 'timeline_note',
            read: false
          }
        ]);
      } catch (notifErr) {
        console.warn('Error sending notification on timeline entry:', notifErr.message);
      }
    }

    res.json({ success: true, timeline: notesData.timeline });
  } catch (err) {
    console.error('addLeadTimelineEntry error:', err);
    res.status(500).json({ success: false, message: 'Error al registrar la nota de seguimiento.' });
  }
};

/**
 * ES: Asigna o reasigna un prospecto a un vendedor específico.
 * EN: Assigns or reassigns a lead to a specific sales rep.
 */
export const assignLead = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params;
    const { sellerId } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .update({ assigned_to: sellerId || null })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (sellerId && data && data[0]) {
      try {
        const leadName = data[0].name || 'un nuevo prospecto';
        await supabase.from('crm_notifications').insert([
          {
            user_id: sellerId,
            sender_id: req.user?.userId || null,
            company_id: cleanCompanyId(req.user?.companyId),
            title: 'Nuevo Lead Asignado 👤',
            message: `Se te ha asignado el prospecto "${leadName}". ¡Por favor ponte en contacto pronto! [ID: ${id}]`,
            type: 'lead_assigned',
            read: false
          }
        ]);
      } catch (notifErr) {
        console.warn('Error sending notification on lead assignment:', notifErr.message);
      }
    }

    res.json({ success: true, lead: data[0] });
  } catch (err) {
    console.error('assignLead error:', err);
    res.status(500).json({ success: false, message: 'Error al asignar prospecto.' });
  }
};

/**
 * ES: Obtiene los prospectos huérfanos sin vendedor asignado.
 * EN: Retrieves unassigned orphan leads.
 */
export const getOrphanLeads = async (req, res) => {
  try {
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
    }

    let orphansQuery = supabase
      .from('leads')
      .select('*')
      .is('assigned_to', null)
      .neq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      orphansQuery = orphansQuery.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data: crmOrphans, error: crmError } = await orphansQuery;

    if (crmError) throw crmError;

    let saeOrphans = [];
    const saeObj = getSaeConnection(req.user);
    if (saeObj.saeClient) {
      try {
        const { data: saeData, error: saeError } = await saeObj.saeClient
          .from(`clie${saeObj.suffix}`)
          .select('clave, nombre, rfc, telefono, mail, cve_vend, status, fch_ultcom, ventas')
          .eq('status', 'A')
          .or('cve_vend.is.null, cve_vend.eq."", cve_vend.eq." ", cve_vend.eq."  ", cve_vend.eq."   "');

        if (saeError) {
          console.warn('Advertencia al consultar clie03 espejo de SAE:', saeError);
        } else {
          saeOrphans = (saeData || []).map(client => ({
            id: `sae-${client.clave.trim()}`,
            name: client.nombre.trim(),
            email: client.mail ? client.mail.trim() : '',
            phone: client.telefono ? client.telefono.trim() : '',
            company: 'Sincronizado de ASPEL SAE',
            notes: `Cliente importado del SAE. Clave: ${client.clave.trim()}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
            status: 'nuevo',
            type: 'sae_orphan',
            created_at: client.fch_ultcom || new Date().toISOString(),
            assigned_to: null,
            raw_sae_key: client.clave.trim()
          }));
        }
      } catch (saeEx) {
        console.error('Error no crítico al consultar SAE espejo:', saeEx);
      }
    }

    res.json({
      success: true,
      crmOrphans: crmOrphans || [],
      saeOrphans: saeOrphans
    });
  } catch (err) {
    console.error('getOrphanLeads error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener leads huérfanos.' });
  }
};
