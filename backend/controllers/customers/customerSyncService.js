/**
 * ============================================================================
 * SERVICIO DE MUTACIÓN Y SINCRONIZACIÓN / CUSTOMER SYNC SERVICE
 * ============================================================================
 * ES: Mutaciones de escritura: Creación manual, actualización avanzada con
 *     historial de auditoría (change_history), autocreación/vínculo dinámico
 *     con contactos/empresas de ASPEL SAE y configuración B2B.
 * EN: Write mutations: Manual creation, advanced updates with audit history
 *     (change_history), dynamic auto-creation/linking with ASPEL SAE contacts/
 *     companies, and B2B configuration.
 * ============================================================================
 */

import { supabase, getSaeConnection } from '../../supabaseClient.js';

/**
 * ES: Crea un nuevo cliente manual en el CRM.
 * EN: Creates a new manual customer in the CRM.
 */
export const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;
    const { name, email, phone, company, notes, company_id: bodyCompanyId, status: bodyStatus, contact_id } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
    }

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    const insertPayload = {
      name,
      email,
      phone,
      company,
      notes,
      contact_id: contact_id || null,
      status: bodyStatus || 'calificado',
      type: 'crm_customer',
      assigned_to: userId
    };

    if (bodyCompanyId && !String(bodyCompanyId).startsWith('company-') && !String(bodyCompanyId).startsWith('sae-')) {
      insertPayload.company_id = bodyCompanyId;
    } else if (companyId && !String(companyId).startsWith('company-') && !String(bodyCompanyId).startsWith('sae-')) {
      insertPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, customer: data[0] });
  } catch (err) {
    console.error('createCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al registrar cliente.' });
  }
};

/**
 * ES: Actualiza la información de un cliente nativo o sincronizado de SAE.
 * EN: Updates information of a native or SAE-synced customer.
 */
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, company, company_id, notes, status,
      position, phone_alt, whatsapp, contact_notes,
      company_rfc, company_address, company_city, company_state
    } = req.body;
    const userId = req.user?.userId;

    let matchedLead = null;
    let saeClave = null;
    if (id.startsWith('sae-')) {
      saeClave = id.replace('sae-', '').trim();
      const { data: existingLeads, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('type', 'crm_customer');

      if (fetchErr) throw fetchErr;

      for (const lead of existingLeads || []) {
        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed && parsed.sae_clave && parsed.sae_clave.trim() === saeClave) {
              const coEmpresa = parsed.sae_empresa || '03';
              const userEmpresa = req.user?.sae_empresa || '03';
              if (coEmpresa === userEmpresa) {
                matchedLead = lead;
                break;
              }
            }
          } catch (e) { }
        }
      }
    } else {
      const { data: leadData, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('type', 'crm_customer')
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      matchedLead = leadData;
    }

    let contactId = null;
    let resolvedCompanyId = null;

    if (matchedLead && matchedLead.notes) {
      try {
        const parsed = JSON.parse(matchedLead.notes.trim());
        if (parsed.contact_id) contactId = parsed.contact_id;
        if (parsed.company_id) resolvedCompanyId = parsed.company_id;
      } catch (e) { }
    }

    if (req.body.contact_id !== undefined) contactId = req.body.contact_id;
    if (req.body.company_id !== undefined) resolvedCompanyId = req.body.company_id;

    if (contactId && String(contactId).startsWith('sae-contact-')) {
      const parts = String(contactId).split('-');
      const saeClave = parts.slice(2, parts.length - 1).join('-');
      const indexStr = parts[parts.length - 1];
      const indexVal = parseInt(indexStr) - 1;

      if (saeClave) {
        const saeObj = getSaeConnection(req.user);
        if (saeObj.saeClient) {
          const { data: saeConts } = await saeObj.saeClient
            .from(`contac${saeObj.suffix}`)
            .select('nombre, telefono, email')
            .eq('cve_clie', saeClave)
            .eq('status', 'A');

          const saeCont = (saeConts && saeConts.length > indexVal) ? saeConts[indexVal] : (saeConts && saeConts.length > 0 ? saeConts[0] : null);

          if (saeCont) {
            const cleanName = saeCont.nombre ? saeCont.nombre.trim() : 'Contacto SAE';
            const cleanPhone = saeCont.telefono ? saeCont.telefono.trim() : '';
            const cleanEmail = saeCont.email ? saeCont.email.trim() : '';

            let foundC = null;
            if (cleanPhone) {
              const { data } = await supabase.from('contacts').select('id').eq('phone', cleanPhone).maybeSingle();
              foundC = data;
            }
            if (!foundC && cleanName) {
              const { data } = await supabase.from('contacts').select('id').ilike('name', cleanName).maybeSingle();
              foundC = data;
            }

            if (foundC) {
              contactId = foundC.id;
            } else {
              const { data: newCont, error: contErr } = await supabase
                .from('contacts')
                .insert([{
                  name: cleanName,
                  phone: cleanPhone,
                  email: cleanEmail,
                  position: 'Representante Autorizado',
                  contact_type: 'oficina',
                  created_by: userId,
                  notes: `Importado automáticamente desde SAE.`
                }])
                .select('id')
                .single();

              if (!contErr && newCont) contactId = newCont.id;
            }
          }
        }
      }
    }

    if (resolvedCompanyId && String(resolvedCompanyId).startsWith('sae-')) {
      const saeClave = String(resolvedCompanyId).replace('sae-', '').trim();
      const { data: existingCosRaw } = await supabase
        .from('companies')
        .select('id, notes')
        .like('notes', `%"sae_clave":"${saeClave}"%`);

      const targetEmpresa = req.user?.sae_empresa || '03';
      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch (e) { return false; }
      });

      if (exactMatch) {
        resolvedCompanyId = exactMatch.id;
      } else {
        const saeObj = getSaeConnection(req.user);
        if (saeObj.saeClient) {
          const { data: client } = await saeObj.saeClient
            .from(`clie${saeObj.suffix}`)
            .select('nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail')
            .eq('clave', saeClave)
            .maybeSingle();

          if (client) {
            const name = client.nombre ? client.nombre.trim() : 'Empresa SAE';
            const alias = client.nombrecomercial ? client.nombrecomercial.trim() : name;

            const notesPayload = JSON.stringify({
              general: `Empresa importada de ASPEL SAE. Clave: ${saeClave}.`,
              sae_clave: saeClave,
              sae_empresa: targetEmpresa,
              timeline: []
            });

            const { data: newCo, error: insertErr } = await supabase
              .from('companies')
              .insert([{
                name,
                alias,
                type: 'cliente',
                rfc: client.rfc ? client.rfc.trim() : '',
                address: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
                city: client.municipio ? client.municipio.trim() : '',
                state: client.estado ? client.estado.trim() : '',
                phone_main: client.telefono ? client.telefono.trim() : '',
                email_main: client.mail ? client.mail.trim() : '',
                status: 'activa',
                notes: notesPayload,
                created_by: userId,
                company_id: req.user?.companyId
              }])
              .select('id')
              .single();

            if (!insertErr && newCo) resolvedCompanyId = newCo.id;
          }
        }
      }
    }

    let existingContact = null;
    if (contactId) {
      const { data: cData } = await supabase.from('contacts').select('*').eq('id', contactId).maybeSingle();
      existingContact = cData;
    }
    if (!existingContact && phone && phone.trim().length > 5 && !['sin telefono', 'n/a', '0', '1234567890'].includes(phone.trim().toLowerCase())) {
      const { data: cData } = await supabase.from('contacts').select('*').eq('phone', phone.trim()).maybeSingle();
      existingContact = cData;
    }
    if (!existingContact && email && email.includes('@') && !['n/a', 's', 'no@no.com', 'sin@correo.com'].includes(email.trim().toLowerCase())) {
      const { data: cData } = await supabase.from('contacts').select('*').ilike('email', email.trim()).maybeSingle();
      existingContact = cData;
    }

    const changeHistory = [];
    const auditUser = req.user?.name || 'Ejecutivo';

    const addChange = (fieldName, oldVal, newVal) => {
      const cleanOld = (oldVal || '').toString().trim();
      const cleanNew = (newVal || '').toString().trim();
      if (cleanNew !== cleanOld) {
        changeHistory.push({
          date: new Date().toISOString(),
          field: fieldName,
          old_value: cleanOld || 'N/A',
          new_value: cleanNew || 'N/A',
          author: auditUser
        });
      }
    };

    let finalWhatsapp = whatsapp;
    let finalPosition = position;
    let finalPhoneAlt = phone_alt;
    let finalContactNotes = contact_notes;

    if (existingContact) {
      contactId = existingContact.id;
      if (name !== undefined) addChange('Nombre del Contacto', existingContact.name, name);
      if (email !== undefined) addChange('Correo Electrónico', existingContact.email, email);
      if (phone !== undefined) addChange('Teléfono Principal', existingContact.phone, phone);
      if (position !== undefined) addChange('Cargo / Posición', existingContact.position, position);
      if (phone_alt !== undefined) addChange('Teléfono Alternativo', existingContact.phone_alt, phone_alt);
      if (whatsapp !== undefined) addChange('WhatsApp del Contacto', existingContact.whatsapp, whatsapp);
      if (contact_notes !== undefined) addChange('Notas del Contacto', existingContact.notes, contact_notes);

      const updateContactData = {
        name: name !== undefined ? name : existingContact.name,
        email: email !== undefined ? email : existingContact.email,
        phone: phone !== undefined ? phone : existingContact.phone,
        position: position !== undefined ? position : existingContact.position,
        phone_alt: phone_alt !== undefined ? phone_alt : existingContact.phone_alt,
        whatsapp: whatsapp !== undefined ? whatsapp : existingContact.whatsapp,
        notes: contact_notes !== undefined ? contact_notes : existingContact.notes,
        updated_at: new Date().toISOString()
      };

      await supabase.from('contacts').update(updateContactData).eq('id', existingContact.id);

      finalWhatsapp = updateContactData.whatsapp;
      finalPosition = updateContactData.position;
      finalPhoneAlt = updateContactData.phone_alt;
      finalContactNotes = updateContactData.notes;
    } else {
      const insertContactData = {
        name: name || 'Contacto nuevo',
        email: email || '',
        phone: phone || '',
        position: position || 'Representante Autorizado',
        phone_alt: phone_alt || '',
        whatsapp: whatsapp || '',
        notes: contact_notes || '',
        created_by: userId
      };
      const { data: newCont } = await supabase.from('contacts').insert([insertContactData]).select('id').single();
      if (newCont) contactId = newCont.id;

      finalWhatsapp = insertContactData.whatsapp;
      finalPosition = insertContactData.position;
      finalPhoneAlt = insertContactData.phone_alt;
      finalContactNotes = insertContactData.notes;
    }

    let existingCompany = null;
    if (resolvedCompanyId) {
      const { data: coData } = await supabase.from('companies').select('*').eq('id', resolvedCompanyId).maybeSingle();
      existingCompany = coData;
    } else if (company) {
      const { data: coData } = await supabase.from('companies').select('*').ilike('name', company.trim()).maybeSingle();
      existingCompany = coData;
    }

    let finalRfc = company_rfc;
    let finalAddress = company_address;
    let finalCity = company_city;
    let finalState = company_state;

    if (existingCompany) {
      resolvedCompanyId = existingCompany.id;
      if (company !== undefined) addChange('Razón Social / Empresa', existingCompany.name, company);
      if (company_rfc !== undefined) addChange('RFC de Empresa', existingCompany.rfc, company_rfc);
      if (company_address !== undefined) addChange('Dirección de Empresa', existingCompany.address, company_address);
      if (company_city !== undefined) addChange('Municipio de Empresa', existingCompany.city, company_city);
      if (company_state !== undefined) addChange('Estado de Empresa', existingCompany.state, company_state);

      const updateCompanyData = {
        name: company !== undefined ? company : existingCompany.name,
        rfc: company_rfc !== undefined ? company_rfc : existingCompany.rfc,
        address: company_address !== undefined ? company_address : existingCompany.address,
        city: company_city !== undefined ? company_city : existingCompany.city,
        state: company_state !== undefined ? company_state : existingCompany.state,
        updated_at: new Date().toISOString()
      };

      await supabase.from('companies').update(updateCompanyData).eq('id', existingCompany.id);

      finalRfc = updateCompanyData.rfc;
      finalAddress = updateCompanyData.address;
      finalCity = updateCompanyData.city;
      finalState = updateCompanyData.state;
    } else if (company) {
      const insertCompanyData = {
        name: company,
        rfc: company_rfc || '',
        address: company_address || '',
        city: company_city || '',
        state: company_state || '',
        created_by: userId,
        status: 'activa'
      };
      const { data: newCo } = await supabase.from('companies').insert([insertCompanyData]).select('id').single();
      if (newCo) resolvedCompanyId = newCo.id;

      finalRfc = insertCompanyData.rfc;
      finalAddress = insertCompanyData.address;
      finalCity = insertCompanyData.city;
      finalState = insertCompanyData.state;
    }

    if (contactId && resolvedCompanyId) {
      await supabase
        .from('contact_companies')
        .upsert([
          {
            contact_id: contactId,
            company_id: resolvedCompanyId,
            status: 'activo'
          }
        ], { onConflict: 'contact_id,company_id' });

      const { data: compCheck } = await supabase
        .from('companies')
        .select('contact_main')
        .eq('id', resolvedCompanyId)
        .maybeSingle();

      if (compCheck && !compCheck.contact_main) {
        await supabase
          .from('companies')
          .update({ contact_main: contactId })
          .eq('id', resolvedCompanyId);
      }
    }

    if (matchedLead) {
      if (name !== undefined) addChange('Nombre', matchedLead.name, name);
      if (email !== undefined) addChange('Email', matchedLead.email, email);
      if (phone !== undefined) addChange('Teléfono', matchedLead.phone, phone);
      if (company !== undefined) addChange('Empresa', matchedLead.company, company);
    }

    let notesData = { general: '', timeline: [], change_history: [] };
    if (notes) {
      try {
        const parsed = JSON.parse(notes.trim());
        notesData = { ...parsed };
      } catch (e) {
        notesData.general = notes;
      }
    } else if (matchedLead && matchedLead.notes) {
      try {
        const parsed = JSON.parse(matchedLead.notes.trim());
        notesData = { ...parsed };
      } catch (e) {
        notesData.general = matchedLead.notes;
      }
    }

    if (!notesData.timeline) notesData.timeline = [];
    if (!notesData.change_history) notesData.change_history = [];

    if (changeHistory.length > 0) {
      notesData.change_history.push(...changeHistory);
    }

    notesData.contact_id = contactId;
    notesData.company_id = resolvedCompanyId;
    if (saeClave) {
      notesData.sae_clave = saeClave;
      notesData.sae_empresa = req.user?.sae_empresa || '03';
    }

    const notesPayload = JSON.stringify(notesData);
    let updatedCustomerRec = null;

    if (matchedLead) {
      const { data, error } = await supabase
        .from('leads')
        .update({
          name: name !== undefined ? name : matchedLead.name,
          email: email !== undefined ? email : matchedLead.email,
          phone: phone !== undefined ? phone : matchedLead.phone,
          company: company !== undefined ? company : matchedLead.company,
          company_id: matchedLead.company_id,
          notes: notesPayload,
          status: status || matchedLead.status || 'calificado'
        })
        .eq('id', matchedLead.id)
        .select()
        .single();

      if (error) throw error;
      updatedCustomerRec = data;
    } else {
      const { data, error } = await supabase
        .from('leads')
        .insert([
          {
            name: name || '',
            email: email || '',
            phone: phone || '',
            company: company || '',
            company_id: (req.user?.companyId && !String(req.user.companyId).startsWith('company-')) ? req.user.companyId : null,
            notes: notesPayload,
            status: status || 'calificado',
            type: 'crm_customer',
            assigned_to: userId
          }
        ])
        .select()
        .single();

      if (error) throw error;
      updatedCustomerRec = data;
    }

    const returnCust = {
      ...updatedCustomerRec,
      id,
      whatsapp: finalWhatsapp,
      position: finalPosition,
      phone_alt: finalPhoneAlt,
      contact_notes: finalContactNotes,
      rfc: finalRfc,
      calle: finalAddress,
      municipio: finalCity,
      estado: finalState
    };

    res.json({ success: true, customer: returnCust });
  } catch (err) {
    console.error('updateCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar cliente.' });
  }
};

/**
 * ES: Configura los contactos primario y secundario B2B de un cliente.
 * EN: Configures primary and secondary B2B contacts for a customer.
 */
export const updateCustomerB2BConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { primary_contact_id, secondary_contact_id } = req.body;

    let leadId = id;
    let matchedLead = null;
    if (id.startsWith('sae-')) {
      const saeClave = id.replace('sae-', '').trim();
      const { data } = await supabase.from('leads').select('*').eq('type', 'crm_customer');
      for (const lead of data || []) {
        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed && parsed.sae_clave === saeClave) {
              const coEmpresa = parsed.sae_empresa || '03';
              const userEmpresa = req.user?.sae_empresa || '03';
              if (coEmpresa === userEmpresa) {
                matchedLead = lead;
                leadId = lead.id;
                break;
              }
            }
          } catch (e) { }
        }
      }
    } else {
      const { data } = await supabase.from('leads').select('*').eq('id', id).single();
      matchedLead = data;
    }

    if (!matchedLead) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }

    let notesObj = {};
    try {
      if (matchedLead.notes) notesObj = JSON.parse(matchedLead.notes);
    } catch (e) { }

    notesObj.contact_id = primary_contact_id;
    notesObj.secondary_contact_id = secondary_contact_id;

    const { error } = await supabase.from('leads').update({
      contact_id: primary_contact_id || null,
      notes: JSON.stringify(notesObj)
    }).eq('id', leadId);

    if (error) throw error;

    res.json({ success: true, message: 'Configuracion B2B actualizada' });
  } catch (error) {
    console.error('updateCustomerB2BConfig error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
