/**
 * @file opportunityController.js
 * 
 * ES: Controlador dedicado exclusivamente a gestionar crm_opportunities y el tablero Kanban de ventas.
 * EN: Controller dedicated exclusively to managing crm_opportunities and the sales Kanban board.
 */

import { supabase, cleanCompanyId } from '../../supabaseClient.js';
import { notifySuperAdmins, parseOpportunityDescription } from '../helpers/crmHelpers.js';

/**
 * ES: Obtiene el listado de negociaciones (crm_opportunities) y las cruza en memoria con citas activas.
 * EN: Retrieves sales opportunities list and merges them in memory with active appointments.
 */
export const getOpportunities = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let query = supabase
      .from('crm_opportunities')
      .select(`
        id,
        title,
        description,
        type,
        stage,
        created_at,
        stage_updated_at,
        updated_at,
        value,
        assigned_to (id, name),
        company_id,
        contact_id,
        companies (id, name),
        contacts (id, name, email, phone)
      `)
      .order('created_at', { ascending: false });

    // Regla de Privacidad por Vendedor
    if (role === 'sales' && userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: opportunities, error } = await query;
    if (error) throw error;

    // Cruzar en memoria con la tabla crm_appointments para adjuntar la cita activa (active_appointment)
    try {
      const { data: appts } = await supabase
        .from('crm_appointments')
        .select('id, client_name, scheduled_at, status, type')
        .in('status', ['active', 'rescheduled']);

      if (appts && appts.length > 0 && opportunities && opportunities.length > 0) {
        opportunities.forEach(opp => {
          const contactName = opp.contacts?.name?.toLowerCase();
          const companyName = opp.companies?.name?.toLowerCase();
          const oppTitle = opp.title?.toLowerCase();

          // Buscar cita activa que coincida por nombre o contacto
          const activeAppt = appts.find(appt => {
            const clientName = appt.client_name?.toLowerCase();
            if (!clientName) return false;
            return (
              clientName === contactName ||
              clientName === companyName ||
              clientName === oppTitle
            );
          });

          if (activeAppt) {
            opp.active_appointment = activeAppt;
          }
        });
      }
    } catch (apptErr) {
      console.warn('[getOpportunities] Error al cruzar citas activas:', apptErr.message);
    }

    const mappedOpps = (opportunities || []).map(opp => {
      const parsed = parseOpportunityDescription(opp.title, opp.description, opp);
      return {
        id: opp.id,
        name: opp.title || 'Negociación',
        email: opp.contacts?.email || '',
        phone: opp.contacts?.phone || '',
        status: opp.stage || 'nuevo',
        type: opp.type || 'proyecto',
        company: opp.companies?.name || opp.contacts?.name || '',
        notes: JSON.stringify({
          general: parsed.cleanDescription,
          project_name: parsed.project_name,
          timeline: parsed.timelineEntries,
          amount: opp.value || 0,
          requirement_title: opp.title || '',
          contact_id: opp.contact_id || null,
          company_id: opp.company_id || null
        }),
        created_at: opp.created_at,
        source_session_id: null,
        assigned_to: opp.assigned_to,
        is_opportunity: true,
        opportunity_id: opp.id,
        stage_updated_at: opp.stage_updated_at || opp.created_at,
        active_appointment: opp.active_appointment || null
      };
    });

    res.json({ success: true, opportunities: mappedOpps });
  } catch (err) {
    console.error('getOpportunities error:', err);
    res.status(500).json({ success: false, message: 'Error interno al obtener negociaciones.' });
  }
};

/**
 * ES: Obtiene el detalle individual de una negociación por su ID sin realizar fallbacks a la tabla leads.
 * EN: Retrieves individual opportunity details by ID without fallbacks to leads table.
 */
export const getOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    let query = supabase
      .from('crm_opportunities')
      .select(`
        id,
        title,
        description,
        type,
        stage,
        created_at,
        stage_updated_at,
        updated_at,
        value,
        assigned_to (id, name),
        company_id,
        contact_id,
        companies (id, name),
        contacts (id, name, email, phone)
      `)
      .eq('id', id);

    // Regla de Privacidad por Vendedor
    if (role === 'sales' && userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: opportunity, error } = await query.maybeSingle();

    if (error) throw error;
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Negociación no encontrada o no autorizada.' });
    }

    const parsed = parseOpportunityDescription(opportunity.title, opportunity.description, opportunity);
    const mappedOpp = {
      id: opportunity.id,
      name: opportunity.title || 'Negociación',
      email: opportunity.contacts?.email || '',
      phone: opportunity.contacts?.phone || '',
      status: opportunity.stage || 'nuevo',
      type: opportunity.type || 'proyecto',
      company: opportunity.companies?.name || opportunity.contacts?.name || '',
      notes: JSON.stringify({
        general: parsed.cleanDescription,
        project_name: parsed.project_name,
        timeline: parsed.timelineEntries,
        amount: opportunity.value || 0,
        requirement_title: opportunity.title || '',
        contact_id: opportunity.contact_id || null,
        company_id: opportunity.company_id || null
      }),
      created_at: opportunity.created_at,
      source_session_id: null,
      assigned_to: opportunity.assigned_to,
      is_opportunity: true,
      opportunity_id: opportunity.id,
      stage_updated_at: opportunity.stage_updated_at || opportunity.created_at
    };

    res.json({ success: true, opportunity: mappedOpp });
  } catch (err) {
    console.error('getOpportunityById error:', err);
    res.status(500).json({ success: false, message: 'Error interno al obtener la negociación.' });
  }
};

/**
 * ES: Crea una nueva negociación (crm_opportunities) asociando obligatoriamente los campos clave.
 * EN: Creates a new opportunity (crm_opportunities) with mandatory fields.
 */
export const createOpportunity = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { title, stage, amount, contact_id, company_id } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'El título de la negociación es obligatorio.' });
    }

    const insertPayload = {
      title,
      stage: stage || 'nuevo',
      type: 'proyecto',
      value: amount ? parseFloat(amount) : 0,
      assigned_to: userId,
      contact_id: contact_id || null,
      company_id: company_id || null,
      stage_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .insert([insertPayload])
      .select(`
        id,
        title,
        description,
        type,
        stage,
        created_at,
        stage_updated_at,
        updated_at,
        value,
        assigned_to (id, name),
        company_id,
        contact_id
      `)
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, opportunity });
  } catch (err) {
    console.error('createOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error interno al crear la negociación.' });
  }
};

/**
 * ES: Actualiza la columna stage, stage_updated_at y agrega el evento al timeline en description.
 * EN: Updates opportunity stage, stage_updated_at, and appends the timeline event to description.
 */
export const updateOpportunityStage = async (req, res) => {
  try {
    const { opId } = req.params;
    const { stage } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const userName = req.user?.name || 'Ejecutivo';

    if (!stage) {
      return res.status(400).json({ success: false, message: 'Se requiere la etapa (stage).' });
    }

    // Buscar oportunidad actual
    let query = supabase
      .from('crm_opportunities')
      .select('id, stage, description, assigned_to')
      .eq('id', opId);

    if (role === 'sales' && userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: opp, error: fetchError } = await query.maybeSingle();
    if (fetchError || !opp) {
      return res.status(404).json({ success: false, message: 'Negociación no encontrada o no autorizada.' });
    }

    const oldStage = opp.stage || 'nuevo';
    const newStage = stage.toLowerCase().trim();
    const eventText = `\n[${new Date().toISOString()} - ${userName}] Cambio de etapa de "${oldStage}" a "${newStage}".`;
    const newDescription = (opp.description || '') + eventText;

    const { data: updatedOpp, error: updateError } = await supabase
      .from('crm_opportunities')
      .update({
        stage: newStage,
        stage_updated_at: new Date().toISOString(),
        description: newDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', opId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, opportunity: updatedOpp });
  } catch (err) {
    console.error('updateOpportunityStage error:', err);
    res.status(500).json({ success: false, message: 'Error interno al actualizar la etapa de la negociación.' });
  }
};

/**
 * ES: Edita título, valor económico, descripción y asignación de la negociación.
 * EN: Edits title, value, description, and assignment of the opportunity.
 */
export const updateOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const { title, value, description, assigned_to } = req.body;

    let query = supabase
      .from('crm_opportunities')
      .select('id, assigned_to')
      .eq('id', id);

    if (role === 'sales' && userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: opp, error: fetchError } = await query.maybeSingle();
    if (fetchError || !opp) {
      return res.status(404).json({ success: false, message: 'Negociación no encontrada o no autorizada.' });
    }

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updatePayload.title = title;
    if (value !== undefined) updatePayload.value = value ? parseFloat(value) : 0;
    if (description !== undefined) updatePayload.description = description;
    if (assigned_to !== undefined) updatePayload.assigned_to = assigned_to;

    const { data: updatedOpp, error: updateError } = await supabase
      .from('crm_opportunities')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, opportunity: updatedOpp });
  } catch (err) {
    console.error('updateOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error interno al actualizar la negociación.' });
  }
};

/**
 * ES: Elimina una negociación del sistema.
 * EN: Deletes an opportunity from the system.
 */
export const deleteOpportunity = async (req, res) => {
  try {
    const { opId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    let query = supabase
      .from('crm_opportunities')
      .select('id, assigned_to')
      .eq('id', opId);

    if (role === 'sales' && userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: opp, error: fetchError } = await query.maybeSingle();
    if (fetchError || !opp) {
      return res.status(404).json({ success: false, message: 'Negociación no encontrada o no autorizada.' });
    }

    const { error } = await supabase
      .from('crm_opportunities')
      .delete()
      .eq('id', opId);

    if (error) throw error;

    res.json({ success: true, message: 'Negociación eliminada exitosamente.' });
  } catch (err) {
    console.error('deleteOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error interno al eliminar la negociación.' });
  }
};

/**
 * ES: Marca una negociación como descartada en crm_opportunities agregando el motivo al timeline.
 * EN: Marks an opportunity as discarded in crm_opportunities and appends the reason to the timeline.
 */
export const discardOpportunity = async (req, res) => {
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
      .from('crm_opportunities')
      .select('id, description, assigned_to')
      .eq('id', id);

    if (role === 'sales' && userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data: opp, error: fetchError } = await query.maybeSingle();

    if (fetchError || !opp) {
      return res.status(404).json({ success: false, message: 'Negociación no encontrada o no autorizada.' });
    }

    const eventText = `\n[${new Date().toISOString()} - ${userName}] Negociación descartada. Motivo: "${reason.trim()}".`;
    const newDescription = (opp.description || '') + eventText;

    const { data: updatedOpp, error: updateError } = await supabase
      .from('crm_opportunities')
      .update({
        stage: 'descartado',
        description: newDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, opportunity: updatedOpp, message: 'Negociación descartada correctamente.' });
  } catch (err) {
    console.error('discardOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error interno al descartar la negociación.' });
  }
};

/**
 * ES: Asigna o reasigna una negociación a un vendedor específico.
 * EN: Assigns or reassigns an opportunity to a specific sales rep.
 */
export const assignOpportunity = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params;
    const { sellerId } = req.body;

    const { data, error } = await supabase
      .from('crm_opportunities')
      .update({ assigned_to: sellerId || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (sellerId && data && data[0]) {
      try {
        const oppTitle = data[0].title || 'una negociación';
        await supabase.from('crm_notifications').insert([
          {
            user_id: sellerId,
            sender_id: req.user?.userId || null,
            company_id: cleanCompanyId(req.user?.companyId),
            title: 'Nueva Negociación Asignada 👤',
            message: `Se te ha asignado la negociación "${oppTitle}". [ID: ${id}]`,
            type: 'lead_assigned',
            read: false
          }
        ]);
      } catch (notifErr) {
        console.warn('Error sending notification on opportunity assignment:', notifErr.message);
      }
    }

    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('assignOpportunity error:', err);
    res.status(500).json({ success: false, message: 'Error al asignar la negociación.' });
  }
};
