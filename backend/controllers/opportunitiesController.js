import { supabase } from '../supabaseClient.js';

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

    res.status(201).json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('createOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error al crear la oportunidad.' });
  }
};

export const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, stage, value, contact_id, company_id, assigned_to } = req.body;

    // Verificar primero la oportunidad actual para ver si cambia de etapa
    const { data: currentOpp, error: getError } = await supabase
      .from('crm_opportunities')
      .select('stage')
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

    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('updateOpportunityStage error:', err);
    res.status(500).json({ success: false, message: 'Error al cambiar la etapa de la oportunidad.' });
  }
};

export const deleteOpportunity = async (req, res) => {
  try {
    const { opId } = req.params;

    const { error } = await supabase
      .from('crm_opportunities')
      .delete()
      .eq('id', opId);

    if (error) throw error;

    res.json({ success: true, message: 'Oportunidad eliminada exitosamente.' });
  } catch (err) {
    console.error('deleteOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar la oportunidad.' });
  }
};
