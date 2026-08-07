import { supabase, getSaeConnection } from '../../supabaseClient.js';

// Helper to audit commercial activity to all super admins
const notifySuperAdmins = async (companyId, title, message, type = 'info') => {
  try {
    const { data: superAdmins, error } = await supabase
      .from('crm_users')
      .select('id')
      .eq('role', 'super_admin');
      
    if (error || !superAdmins || superAdmins.length === 0) return;
    
    const payloads = superAdmins.map(admin => ({
      user_id: admin.id,
      company_id: companyId || null,
      title,
      message,
      type,
      read: false
    }));
    
    await supabase.from('crm_notifications').insert(payloads);
  } catch (err) {
    console.error('Error notifying super admins:', err);
  }
};

// Helpers for automatic customer status transitions

const updateCustomerStatusToReactivando = async (companyId, contactId, user) => {
  try {
    if (companyId) {
      await supabase.from('companies').update({ status: 'reactivado_venta' }).eq('id', companyId);
      await supabase.from('leads').update({ status: 'reactivado_venta' }).eq('company_id', companyId);

      // Check sae_clave in company notes to update the lead
      const { data: comp } = await supabase.from('companies').select('notes').eq('id', companyId).maybeSingle();
      if (comp && comp.notes) {
        try {
          const parsed = JSON.parse(comp.notes);
          if (parsed && parsed.sae_clave) {
            const { data: leads } = await supabase.from('leads').select('id, notes');
            for (const lead of (leads || [])) {
              if (lead.notes) {
                try {
                  const pLead = JSON.parse(lead.notes);
                  if (pLead && pLead.sae_clave && String(pLead.sae_clave).trim() === String(parsed.sae_clave).trim()) {
                    const coEmpresa = pLead.sae_empresa || '03';
                    const userEmpresa = user?.sae_empresa || '03';
                    if (coEmpresa === userEmpresa) {
                      await supabase.from('leads').update({ status: 'reactivado_venta' }).eq('id', lead.id);
                    }
                  }
                } catch (e) {}
              }
            }
          }
        } catch (e) {}
      }
    }

    if (contactId) {
      const { data: contact } = await supabase.from('contacts').select('phone, email').eq('id', contactId).maybeSingle();
      if (contact) {
        let leadQuery = supabase.from('leads').update({ status: 'reactivado_venta' });
        if (contact.phone && contact.email) {
          leadQuery = leadQuery.or(`phone.eq.${contact.phone},email.eq.${contact.email}`);
        } else if (contact.phone) {
          leadQuery = leadQuery.eq('phone', contact.phone);
        } else if (contact.email) {
          leadQuery = leadQuery.eq('email', contact.email);
        } else {
          leadQuery = null;
        }
        if (leadQuery) await leadQuery;
      }
    }
  } catch (err) {
    console.error('Error in updateCustomerStatusToReactivando:', err);
  }
};

const checkAndUpgradeCustomerToActive = async (companyId, contactId, user) => {
  try {
    let query = supabase
      .from('crm_opportunities')
      .select('id')
      .eq('stage', 'ganado');

    if (companyId && contactId) {
      query = query.or(`company_id.eq.${companyId},contact_id.eq.${contactId}`);
    } else if (companyId) {
      query = query.eq('company_id', companyId);
    } else if (contactId) {
      query = query.eq('contact_id', contactId);
    } else {
      return;
    }

    const { data: wonOpps, error: countError } = await query;
    if (countError) throw countError;

    const count = wonOpps ? wonOpps.length : 0;
    if (count >= 3) {
      // 1. Upgrade company status
      if (companyId) {
        await supabase.from('companies').update({ status: 'activo' }).eq('id', companyId);
        await supabase.from('leads').update({ status: 'activo' }).eq('company_id', companyId);

        // Fetch company notes to check sae_clave
        const { data: comp } = await supabase.from('companies').select('notes').eq('id', companyId).maybeSingle();
        if (comp && comp.notes) {
          try {
            const parsed = JSON.parse(comp.notes);
            if (parsed && parsed.sae_clave) {
              const { data: leads } = await supabase.from('leads').select('id, notes');
              for (const lead of (leads || [])) {
                if (lead.notes) {
                  try {
                    const pLead = JSON.parse(lead.notes);
                    if (pLead && pLead.sae_clave && String(pLead.sae_clave).trim() === String(parsed.sae_clave).trim()) {
                      const coEmpresa = pLead.sae_empresa || '03';
                      const userEmpresa = user?.sae_empresa || '03';
                      if (coEmpresa === userEmpresa) {
                        await supabase.from('leads').update({ status: 'activo' }).eq('id', lead.id);
                      }
                    }
                  } catch (e) {}
                }
              }
            }
          } catch (e) {}
        }
      }

      // 2. Upgrade contact status (by finding linked lead)
      if (contactId) {
        const { data: contact } = await supabase.from('contacts').select('phone, email').eq('id', contactId).maybeSingle();
        if (contact) {
          let leadQuery = supabase.from('leads').update({ status: 'activo' });
          if (contact.phone && contact.email) {
            leadQuery = leadQuery.or(`phone.eq.${contact.phone},email.eq.${contact.email}`);
          } else if (contact.phone) {
            leadQuery = leadQuery.eq('phone', contact.phone);
          } else if (contact.email) {
            leadQuery = leadQuery.eq('email', contact.email);
          } else {
            leadQuery = null;
          }
          if (leadQuery) await leadQuery;
        }
      }
    }
  } catch (err) {
    console.error('Error in checkAndUpgradeCustomerToActive:', err);
  }
};

// ---------- OPORTUNIDADES CRUD ----------

export const getOpportunities = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const { contact_id, company_id } = req.query;

    let query = supabase
      .from('crm_opportunities')
      .select(`
        *,
        contact:contacts(id, name, email, phone),
        company:companies(id, name, alias),
        assigned_user:crm_users!crm_opportunities_assigned_to_fkey(id, name),
        quotes(id, quote_num, total, created_at)
      `)
      .order('created_at', { ascending: false });

    if (role === 'sales') {
      query = query.eq('assigned_to', userId);
    }

    // Filtros opcionales para la Ficha de Cliente — devuelve solo lo de ese contacto o empresa
    if (contact_id && company_id) {
      query = query.or(`contact_id.eq.${contact_id},company_id.eq.${company_id}`);
    } else if (contact_id) {
      query = query.eq('contact_id', contact_id);
    } else if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, opportunities: data || [] });
  } catch (err) {
    console.error('getOpportunities error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener oportunidades.' });
  }
};


export const createOpportunity = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;
    const createdBy = req.user?.name || 'Un ejecutivo';
    const { title, description, type, stage, value, contact_id, company_id, assigned_to, customer_id } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'El título es obligatorio.' });
    }

    let resolvedCompanyId = null;
    let resolvedContactId = null;

    // Resolve customer_id if provided
    if (customer_id) {
      if (String(customer_id).startsWith('sae-')) {
        const saeClave = String(customer_id).replace('sae-', '').trim();
        // 1. Check if company exists locally
        const { data: existingCosRaw } = await supabase
          .from('companies')
          .select('id, notes')
          .like('notes', `%"sae_clave":"${saeClave}"%`);

        const targetEmpresa = req.user?.sae_empresa || '03';
        const exactMatch = (existingCosRaw || []).find(co => {
          try {
            const p = JSON.parse(co.notes);
            return (p.sae_empresa || '03') === targetEmpresa;
          } catch(e) { return false; }
        });

        if (exactMatch) {
          resolvedCompanyId = exactMatch.id;
        } else {
          // Fetch from SAE and insert local company
          const { saeClient, suffix } = getSaeConnection(req.user);
          if (saeClient) {
            const { data: client } = await saeClient
              .from(`clie${suffix}`)
              .select('nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail')
              .eq('clave', saeClave)
              .maybeSingle();

            if (client) {
              const name = client.nombre ? client.nombre.trim() : 'Empresa SAE';
              const alias = client.nombrecomercial ? client.nombrecomercial.trim() : name;
              const { data: newCo } = await supabase.from('companies').insert([{
                name,
                alias,
                type: 'cliente',
                rfc: client.rfc ? client.rfc.trim() : '',
                address: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
                city: client.municipio ? client.municipio.trim() : '',
                state: client.estado ? client.estado.trim() : '',
                phone_main: client.telefono ? client.telefono.trim() : '',
                email_main: client.mail ? client.mail.trim() : '',
                status: 'reactivado_venta',
                notes: JSON.stringify({
                  general: `Empresa importada de ASPEL SAE. Clave: ${saeClave}.`,
                  sae_clave: saeClave,
                  sae_empresa: targetEmpresa,
                  timeline: []
                }),
                created_by: userId,
                company_id: companyId && !String(companyId).startsWith('company-') ? companyId : null
              }]).select('id').single();

              if (newCo) {
                resolvedCompanyId = newCo.id;
              }
            }
          }
        }
      } else {
        // Native customer lead UUID
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', customer_id)
          .maybeSingle();

        if (lead) {
          // Try to resolve contact
          const cleanPhone = lead.phone ? lead.phone.trim() : '';
          const cleanName = lead.name ? lead.name.trim() : '';
          
          if (cleanPhone || cleanName) {
            let existingContact = null;
            if (cleanPhone && cleanName) {
              const { data } = await supabase
                .from('contacts')
                .select('id')
                .or(`phone.eq.${cleanPhone},name.ilike.${cleanName}`)
                .maybeSingle();
              existingContact = data;
            } else if (cleanPhone) {
              const { data } = await supabase
                .from('contacts')
                .select('id')
                .eq('phone', cleanPhone)
                .maybeSingle();
              existingContact = data;
            } else {
              const { data } = await supabase
                .from('contacts')
                .select('id')
                .ilike('name', cleanName)
                .maybeSingle();
              existingContact = data;
            }

            if (existingContact) {
              resolvedContactId = existingContact.id;
            } else {
              const { data: newContact } = await supabase.from('contacts').insert([{
                name: cleanName || 'Contacto Sin Nombre',
                phone: cleanPhone,
                email: lead.email ? lead.email.trim() : null,
                created_by: userId,
                notes: JSON.stringify({
                  general: `Contacto creado automáticamente al generar venta.`,
                  timeline: []
                })
              }]).select('id').single();

              if (newContact) {
                resolvedContactId = newContact.id;
              }
            }
          }

          // Try to resolve company by name (since lead.company_id is the tenant enterprise ID, not the client company ID)
          if (lead.company) {
            const cleanCoName = lead.company.trim();
            const { data: existingCompany } = await supabase
              .from('companies')
              .select('id')
              .ilike('name', cleanCoName)
              .maybeSingle();

            if (existingCompany) {
              resolvedCompanyId = existingCompany.id;
            } else {
              const { data: newCo } = await supabase.from('companies').insert([{
                name: cleanCoName,
                alias: cleanCoName,
                type: 'cliente',
                status: 'reactivado_venta',
                created_by: userId,
                company_id: companyId && !String(companyId).startsWith('company-') ? companyId : null,
                notes: JSON.stringify({
                  general: `Empresa creada automáticamente al generar venta.`,
                  timeline: []
                })
              }]).select('id').single();

              if (newCo) {
                resolvedCompanyId = newCo.id;
              }
            }
          }

          // Link contact to company if both are resolved
          if (resolvedContactId && resolvedCompanyId) {
            await supabase.from('contacts').update({ company_id: resolvedCompanyId }).eq('id', resolvedContactId);
            
            const { data: existingLink } = await supabase
              .from('contact_companies')
              .select('id')
              .eq('contact_id', resolvedContactId)
              .eq('company_id', resolvedCompanyId)
              .maybeSingle();

            if (!existingLink) {
              await supabase.from('contact_companies').insert([{
                contact_id: resolvedContactId,
                company_id: resolvedCompanyId,
                role: 'Representante'
              }]);
            }
          }
        }
      }
    }

    const cleanContactId = resolvedContactId || ((typeof contact_id === 'object' && contact_id !== null) ? contact_id.id : ((contact_id && String(contact_id).trim() !== '' && !String(contact_id).trim().startsWith('sae-')) ? String(contact_id).trim() : null));
    const cleanCompanyId = resolvedCompanyId || ((typeof company_id === 'object' && company_id !== null) ? company_id.id : ((company_id && String(company_id).trim() !== '' && !String(company_id).trim().startsWith('sae-')) ? String(company_id).trim() : null));
    const cleanAssignedTo = (typeof assigned_to === 'object' && assigned_to !== null) ? assigned_to.id : ((assigned_to && String(assigned_to).trim() !== '') ? String(assigned_to).trim() : userId);

    const insertData = {
      title,
      description: description || '',
      type: type || 'suministro',
      stage: stage || 'nuevo',
      value: value || 0,
      contact_id: cleanContactId,
      company_id: cleanCompanyId,
      assigned_to: cleanAssignedTo,
      created_by: userId,
      stage_updated_at: new Date().toISOString()
    };

    // Tag opportunity to user's company for multi-tenant isolation (only if not already linked to a client company and it exists in companies table)
    if (!insertData.company_id && companyId && !String(companyId).startsWith('company-')) {
      const { data: exists } = await supabase.from('companies').select('id').eq('id', companyId).maybeSingle();
      if (exists) {
        insertData.company_id = companyId;
      }
    }

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

    if (error) throw error;

    // Trigger customer status change in the database
    await updateCustomerStatusToReactivando(cleanCompanyId, cleanContactId, req.user);

    // Trigger Super Admin Notification with dynamic money value logging
    const formattedValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
    await notifySuperAdmins(
      companyId,
      'Oportunidad Creada 💼',
      `El ejecutivo ${createdBy} creó la oportunidad "${title}" por un valor en juego de ${formattedValue} (${type}).`,
      'stage_change'
    );

    res.status(201).json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('createOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error al crear la oportunidad.' });
  }
};

export const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const updatedBy = req.user?.name || 'Un ejecutivo';
    const { title, description, type, stage, value, contact_id, company_id, assigned_to } = req.body;

    // Verificar primero la oportunidad actual para ver si cambia de etapa
    const { data: currentOpp, error: getError } = await supabase
      .from('crm_opportunities')
      .select('stage, company_id, contact_id')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    const cleanContactId = (typeof contact_id === 'object' && contact_id !== null) ? contact_id.id : ((contact_id && String(contact_id).trim() !== '') ? String(contact_id).trim() : null);
    const cleanCompanyId = (typeof company_id === 'object' && company_id !== null) ? company_id.id : ((company_id && String(company_id).trim() !== '') ? String(company_id).trim() : null);
    const cleanAssignedTo = (typeof assigned_to === 'object' && assigned_to !== null) ? assigned_to.id : ((assigned_to && String(assigned_to).trim() !== '') ? String(assigned_to).trim() : null);

    const updateData = {
      title,
      description,
      type,
      stage,
      value,
      contact_id: cleanContactId,
      company_id: cleanCompanyId,
      assigned_to: cleanAssignedTo,
      updated_at: new Date().toISOString()
    };

    // Si cambia de etapa, actualizar la fecha de última actualización de etapa para el control de inactividad
    if (currentOpp && currentOpp.stage !== stage) {
      updateData.stage_updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('crm_opportunities')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        contact:contacts(id, name, email, phone),
        company:companies(id, name, alias),
        assigned_user:crm_users!crm_opportunities_assigned_to_fkey(id, name),
        quotes(id, quote_num, total, created_at)
      `);

    if (error) throw error;

    // Si transiciona a ganado, verificar si el cliente califica para ser ACTIVO
    if (stage === 'ganado') {
      await checkAndUpgradeCustomerToActive(cleanCompanyId || currentOpp?.company_id, cleanContactId || currentOpp?.contact_id, req.user);
    }

    // Trigger Super Admin Notification
    const formattedValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
    await notifySuperAdmins(
      currentOpp?.company_id || companyId,
      'Oportunidad Modificada ✏️',
      `El ejecutivo ${updatedBy} actualizó la oportunidad "${title}" (en juego: ${formattedValue}, etapa: ${stage}).`,
      'stage_change'
    );

    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('updateOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar la oportunidad.' });
  }
};

export const updateOpportunityStage = async (req, res) => {
  try {
    const { opId } = req.params;
    const { stage } = req.body;
    const companyId = req.user?.companyId;
    const updatedBy = req.user?.name || 'Un ejecutivo';

    // Fetch opp details before updating
    const { data: opp } = await supabase.from('crm_opportunities').select('title, value, company_id, contact_id').eq('id', opId).maybeSingle();

    const { data, error } = await supabase
      .from('crm_opportunities')
      .update({
        stage,
        stage_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', opId)
      .select(`
        *,
        contact:contacts(id, name, email, phone),
        company:companies(id, name, alias),
        assigned_user:crm_users!crm_opportunities_assigned_to_fkey(id, name),
        quotes(id, quote_num, total, created_at)
      `);

    if (error) throw error;

    if (opp) {
      // Si transiciona a ganado, verificar si el cliente califica para ser ACTIVO
      if (stage === 'ganado') {
        await checkAndUpgradeCustomerToActive(opp.company_id, opp.contact_id, req.user);
      }

      const formattedValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(opp.value || 0);
      await notifySuperAdmins(
        opp.company_id || companyId,
        'Etapa de Oportunidad Cambiada 📈',
        `El ejecutivo ${updatedBy} cambió la etapa de la oportunidad "${opp.title}" (en juego: ${formattedValue}) a "${stage}".`,
        'stage_change'
      );
    }

    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('updateOpportunityStage error:', err);
    res.status(500).json({ success: false, message: 'Error al cambiar la etapa de la oportunidad.' });
  }
};

export const deleteOpportunity = async (req, res) => {
  try {
    const { opId } = req.params;
    const companyId = req.user?.companyId;
    const deletedBy = req.user?.name || 'Un ejecutivo';

    // Fetch opp details before deleting to write message
    const { data: opp } = await supabase.from('crm_opportunities').select('title, value, company_id').eq('id', opId).maybeSingle();

    const { error } = await supabase
      .from('crm_opportunities')
      .delete()
      .eq('id', opId);

    if (error) throw error;

    if (opp) {
      const formattedValue = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(opp.value || 0);
      await notifySuperAdmins(
        opp.company_id || companyId,
        'Oportunidad Eliminada 🗑️',
        `El ejecutivo ${deletedBy} eliminó la oportunidad "${opp.title}" (en juego: ${formattedValue}).`,
        'warning'
      );
    }

    res.json({ success: true, message: 'Oportunidad eliminada exitosamente.' });
  } catch (err) {
    console.error('deleteOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar la oportunidad.' });
  }
};
