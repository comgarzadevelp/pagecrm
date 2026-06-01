import { supabase } from '../supabaseClient.js';

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

// ---------- OPORTUNIDADES CRUD ----------

export const getOpportunities = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    // Obtener todas las oportunidades con información de contactos, empresas y cotizaciones vinculadas
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
    const { title, description, type, stage, value, contact_id, company_id, assigned_to } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'El título es obligatorio.' });
    }

    const cleanContactId = (typeof contact_id === 'object' && contact_id !== null) ? contact_id.id : ((contact_id && String(contact_id).trim() !== '' && !String(contact_id).trim().startsWith('sae-')) ? String(contact_id).trim() : null);
    const cleanCompanyId = (typeof company_id === 'object' && company_id !== null) ? company_id.id : ((company_id && String(company_id).trim() !== '' && !String(company_id).trim().startsWith('sae-')) ? String(company_id).trim() : null);
    const cleanAssignedTo = (typeof assigned_to === 'object' && assigned_to !== null) ? assigned_to.id : ((assigned_to && String(assigned_to).trim() !== '') ? String(assigned_to).trim() : userId);

    const insertData = {
      title,
      description: description || '',
      type: type || 'proyecto',
      stage: stage || 'nuevo',
      value: value || 0,
      contact_id: cleanContactId,
      company_id: cleanCompanyId,
      assigned_to: cleanAssignedTo,
      created_by: userId,
      stage_updated_at: new Date().toISOString()
    };

    // Tag opportunity to user's company for multi-tenant isolation
    if (companyId && !String(companyId).startsWith('company-')) {
      insertData.company_id = companyId;
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
      .select('stage, company_id')
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
    const { data: opp } = await supabase.from('crm_opportunities').select('title, value, company_id').eq('id', opId).maybeSingle();

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
