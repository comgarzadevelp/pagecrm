/**
 * @file negotiationController.js
 * 
 * ES: Controlador del Módulo de Negociaciones y Kanban Comercial. Gestiona las etapas
 *     personalizadas, ordenamiento de columnas del tablero Kanban y oportunidades de venta.
 * EN: Negotiations & Sales Kanban Module Controller. Manages custom pipeline stages,
 *     Kanban board column ordering, and sales opportunities.
 */

import { supabase } from '../../supabaseClient.js';

/**
 * ES: Obtiene las etapas personalizadas configuradas por el usuario para su embudo Kanban.
 * EN: Retrieves custom pipeline stages configured by the user for their Kanban funnel.
 */
export const getCustomStages = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const { data, error } = await supabase
      .from('crm_custom_stages')
      .select('id, name, color')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ success: true, stages: data || [] });
  } catch (err) {
    console.error('getCustomStages error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener etapas personalizadas.' });
  }
};

/**
 * ES: Crea una nueva etapa personalizada en el tablero Kanban del vendedor.
 * EN: Creates a new custom stage in the sales rep's Kanban board.
 */
export const createCustomStage = async (req, res) => {
  const { name, color, root_stage } = req.body;
  const userId = req.user?.userId;

  if (!name) {
    return res.status(400).json({ success: false, message: 'El nombre de la etapa es obligatorio.' });
  }

  try {
    const { data, error } = await supabase
      .from('crm_custom_stages')
      .insert([{
        user_id: userId,
        name: name.trim(),
        color: color || '#10b981',
        root_stage: root_stage || 'nuevo'
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Ya tienes una etapa con este nombre.' });
      }
      throw error;
    }

    res.status(201).json({ success: true, stage: data });
  } catch (err) {
    console.error('createCustomStage error:', err);
    res.status(500).json({ success: false, message: 'Error al registrar la etapa personalizada.' });
  }
};

/**
 * ES: Elimina una etapa personalizada y reubica sus prospectos a otra columna del Kanban.
 * EN: Deletes a custom stage and transfers its leads to another Kanban column.
 */
export const deleteCustomStage = async (req, res) => {
  const { id } = req.params;
  const { transferTo } = req.body;
  const userId = req.user?.userId;

  try {
    const { data: stage, error: stageError } = await supabase
      .from('crm_custom_stages')
      .select('name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (stageError || !stage) {
      return res.status(404).json({ success: false, message: 'Etapa no encontrada o no autorizada.' });
    }

    const stageName = stage.name.toLowerCase();
    const destinationStage = (transferTo || 'nuevo').toLowerCase();

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, notes')
      .eq('status', stageName)
      .eq('assigned_to', userId);

    if (leadsError) throw leadsError;

    if (leads && leads.length > 0) {
      const updatePromises = leads.map(async (lead) => {
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
          text: `Estatus reubicado de "${stage.name}" a "${destinationStage}" debido a la eliminación de la etapa personalizada.`,
          author: req.user?.name || 'Sistema',
          type: 'status_change'
        });

        return supabase
          .from('leads')
          .update({
            status: destinationStage,
            notes: JSON.stringify(notesData)
          })
          .eq('id', lead.id);
      });

      await Promise.all(updatePromises);
    }

    const { error: deleteError } = await supabase
      .from('crm_custom_stages')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Etapa eliminada y prospectos reubicados con éxito.' });
  } catch (err) {
    console.error('deleteCustomStage error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar la etapa.' });
  }
};

/**
 * ES: Obtiene el orden personalizado de las columnas del tablero Kanban preferido por el usuario.
 * EN: Retrieves the user's preferred custom Kanban column ordering.
 */
export const getKanbanColumnOrder = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'No autenticado.' });

  try {
    const { data, error } = await supabase
      .from('crm_kanban_column_order')
      .select('column_order')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data && Array.isArray(data.column_order)) {
      let order = data.column_order;
      order = order.filter(k => k !== 'descartado');
      order.push('descartado');
      return res.json({ success: true, columnOrder: order });
    }

    const { data: userData, error: userError } = await supabase
      .from('crm_users')
      .select('bio')
      .eq('id', userId)
      .single();

    if (!userError && userData && userData.bio && userData.bio.startsWith('__kanban_config__:')) {
      try {
        const jsonStr = userData.bio.substring('__kanban_config__:'.length);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          let order = parsed;
          order = order.filter(k => k !== 'descartado');
          order.push('descartado');
          return res.json({ success: true, columnOrder: order });
        }
      } catch (jsonErr) {
        console.warn('Failed to parse kanban config from bio:', jsonErr.message);
      }
    }

    const baseStages = ['nuevo', 'contactado', 'calificado'];
    const { data: customStages } = await supabase
      .from('crm_custom_stages')
      .select('name')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    const customKeys = (customStages || []).map(s => s.name.toLowerCase());
    const finalOrder = [...baseStages, ...customKeys, 'descartado'];
    
    res.json({ success: true, columnOrder: finalOrder });
  } catch (err) {
    console.error('getKanbanColumnOrder error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener orden de columnas.' });
  }
};

/**
 * ES: Guarda la preferencia de ordenamiento de columnas del Kanban para el vendedor.
 * EN: Saves the sales rep's preferred Kanban column order.
 */
export const saveKanbanColumnOrder = async (req, res) => {
  const userId = req.user?.userId;
  const { columnOrder } = req.body;

  if (!userId) return res.status(401).json({ success: false, message: 'No autenticado.' });
  if (!Array.isArray(columnOrder)) {
    return res.status(400).json({ success: false, message: 'Se requiere un array "columnOrder".' });
  }

  let orderToSave = columnOrder.filter(k => k !== 'descartado');
  orderToSave.push('descartado');

  try {
    const { error: upsertError } = await supabase
      .from('crm_kanban_column_order')
      .upsert({ user_id: userId, column_order: orderToSave, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (!upsertError) {
      return res.json({ success: true, message: 'Orden de columnas guardado exitosamente.' });
    }

    console.log('crm_kanban_column_order table upsert failed, using bio fallback:', upsertError.message);

    const configStr = `__kanban_config__:${JSON.stringify(orderToSave)}`;
    const { error: userUpdateError } = await supabase
      .from('crm_users')
      .update({ bio: configStr, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (userUpdateError) throw userUpdateError;

    res.json({ success: true, message: 'Orden de columnas guardado exitosamente (en bio).' });
  } catch (err) {
    console.error('saveKanbanColumnOrder error:', err);
    res.status(500).json({ success: false, message: 'Error al guardar orden de columnas.' });
  }
};

/**
 * ES: Consulta las oportunidades comerciales asociadas a un prospecto.
 * EN: Retrieves sales opportunities linked to a lead.
 */
export const getOpportunities = async (req, res) => {
  const { id: leadId } = req.params;
  const companyId = req.user?.companyId;

  try {
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, opportunities: data });
  } catch (err) {
    console.error('getOpportunities error', err);
    res.status(500).json({ success: false, message: 'Error al obtener oportunidades' });
  }
};

/**
 * ES: Crea una nueva oportunidad comercial vinculada a un prospecto.
 * EN: Creates a new sales opportunity linked to a lead.
 */
export const createOpportunity = async (req, res) => {
  const { id: leadId } = req.params;
  const { title, stage } = req.body;
  const companyId = req.user?.companyId;

  try {
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    const opportunityPayload = {
      lead_id: leadId,
      title,
      stage
    };

    if (companyId && !String(companyId).startsWith('company-')) {
      opportunityPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('opportunities')
      .insert(opportunityPayload)
      .select();

    if (error) throw error;
    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('createOpportunity error', err);
    res.status(500).json({ success: false, message: 'Error al crear oportunidad' });
  }
};

/**
 * ES: Actualiza la etapa del embudo comercial de una oportunidad.
 * EN: Updates the sales funnel stage for an opportunity.
 */
export const updateOpportunityStage = async (req, res) => {
  const { opId } = req.params;
  const { stage } = req.body;
  const companyId = req.user?.companyId;

  try {
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    let query = supabase
      .from('opportunities')
      .update({ stage })
      .eq('id', opId);

    if (companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.select();

    if (error) throw error;
    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('updateOpportunityStage error', err);
    res.status(500).json({ success: false, message: 'Error al actualizar oportunidad' });
  }
};

/**
 * ES: Elimina una oportunidad comercial del sistema.
 * EN: Deletes a sales opportunity from the system.
 */
export const deleteOpportunity = async (req, res) => {
  const { opId } = req.params;
  try {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', opId);

    if (error) throw error;
    res.json({ success: true, message: 'Oportunidad eliminada' });
  } catch (err) {
    console.error('deleteOpportunity error', err);
    res.status(500).json({ success: false, message: 'Error al eliminar oportunidad' });
  }
};
