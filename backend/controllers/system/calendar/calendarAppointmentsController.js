/**
 * ============================================================================
 * CONTROLADOR DE CITAS LOCALES DEL CRM / LOCAL CRM APPOINTMENTS CONTROLLER
 * ============================================================================
 * ES: Maneja la lógica comercial de citas almacenadas en la base de datos local,
 *     incluyendo registro de resultados (outcomes), verificación perezosa,
 *     reagendamiento local e informes de agenda para directivos.
 * ============================================================================
 */

import { supabase } from '../../../supabaseClient.js';
import {
  syncLazyStatusWithGoogle,
  updateLeadTimelineAndStage
} from './calendarHelpers.js';

/**
 * Consulta si un cliente en particular tiene citas activas o futuras en la agenda.
 * Realiza una verificación perezosa (Lazy Sync) con Google Calendar para limpiar desincronizaciones.
 * 
 * GET /api/calendar/appointments/check
 */
export const checkActiveAppointments = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { client_name, include_past } = req.query;
    
    if (!client_name) {
      return res.status(400).json({ success: false, message: 'Nombre del cliente requerido.' });
    }

    // 1. Construir la consulta a crm_appointments
    let query = supabase
      .from('crm_appointments')
      .select('*')
      .eq('client_name', client_name.trim())
      .in('status', ['active', 'rescheduled']);

    const isSupervisorOrAdmin = ['admin', 'supervisor', 'super_admin'].includes(userRole);
    if (!isSupervisorOrAdmin) {
      query = query.eq('vendedor_id', userId);
    }

    if (include_past === 'true') {
      query = query.order('start_time', { ascending: false });
    } else {
      query = query.gte('start_time', new Date().toISOString())
                   .order('start_time', { ascending: true });
    }

    const { data: appointments, error } = await query;
    if (error) throw error;

    // 2. Sincronización perezosa con Google Calendar
    const activeAppointments = await syncLazyStatusWithGoogle(appointments, userId);

    // 3. Seleccionar la cita relevante resultante
    let selectedAppointment = null;
    if (activeAppointments.length > 0) {
      if (include_past === 'true') {
        activeAppointments.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        selectedAppointment = activeAppointments[0];
      } else {
        const nowStr = new Date().toISOString();
        const futureAppts = activeAppointments.filter(a => a.start_time >= nowStr);
        if (futureAppts.length > 0) {
          futureAppts.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
          selectedAppointment = futureAppts[0];
        }
      }
    }

    res.json({ success: true, appointment: selectedAppointment });
  } catch (err) {
    console.error('Error al verificar citas activas:', err);
    res.status(500).json({ success: false, message: 'Error al verificar citas activas.' });
  }
};

/**
 * Registra el resultado comercial (Outcome) de una cita expirada o reunión realizada
 * (ejemplo: "completada", "no_show_cliente", "no_show_vendedor", "pospuesta")
 * y actualiza la etapa y el timeline del prospecto asociado.
 * 
 * PUT /api/calendar/appointments/:appointmentId/outcome
 */
export const registerOutcome = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const { appointmentId } = req.params;
    const { outcome, comments, targetStage } = req.body;

    if (!outcome) {
      return res.status(400).json({ success: false, message: 'El resultado de la reunión es obligatorio.' });
    }

    // 1. Manejo especial de actividades de campo (Visitas)
    if (appointmentId.startsWith('db-activity-')) {
      const visitaId = appointmentId.replace('db-activity-', '');
      try {
        const { data: visita } = await supabase.from('crm_visitas').select('*').eq('id', visitaId).single();
        if (visita) {
          await supabase
            .from('crm_visitas')
            .update({ 
              resultado: outcome === 'completada' ? 'Completado' : outcome,
              notas: `[COMPLETADA] ${comments || ''} | ${visita.notas || ''}`
            })
            .eq('id', visitaId);
          return res.json({ success: true, message: 'Actividad de campo marcada como completada.' });
        }
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar actividad de campo.' });
      }
    }

    // 2. Obtener cita local
    const { data: appointment, error: apptError } = await supabase
      .from('crm_appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }

    // 3. Mapear resultado a estatus de BD
    let statusMapped = 'completed';
    let outcomeLabel = 'Concretada';
    if (outcome === 'no_show_cliente') {
      statusMapped = 'no-show-client';
      outcomeLabel = 'Cliente No-Show';
    } else if (outcome === 'no_show_vendedor') {
      statusMapped = 'no-show-seller';
      outcomeLabel = 'Vendedor No-Show';
    } else if (outcome === 'pospuesta') {
      statusMapped = 'postponed';
      outcomeLabel = 'Pospuesta / Reprogramar';
    } else if (outcome === 'completada') {
      statusMapped = 'completed';
      outcomeLabel = 'Completada Exitosamente';
    }

    const outcomeComments = comments || 'Sin comentarios adicionales';

    // 4. Actualizar cita local en Supabase y registrar auditoría
    const { error: updateApptError } = await supabase
      .from('crm_appointments')
      .update({
        status: statusMapped,
        description: `[RESULTADO: ${outcomeLabel.toUpperCase()} - Comentarios: ${outcomeComments}] ${appointment.description || ''}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateApptError) throw updateApptError;

    await supabase.from('crm_appointments_audit').insert([{
      appointment_id: appointment.id,
      vendedor_id: userId,
      action: 'UPDATE',
      old_data: { status: appointment.status },
      new_data: { status: statusMapped, outcome, comments: outcomeComments }
    }]);

    // 5. Actualizar timeline y estatus del Lead
    if (appointment.client_name) {
      await updateLeadTimelineAndStage({
        clientName: appointment.client_name,
        userName,
        timelineText: `Resultado de la reunión: ${outcomeLabel.toUpperCase()}. Comentarios: ${outcomeComments}`,
        targetStage
      });
    }

    res.json({ success: true, message: 'Resultado de reunión registrado exitosamente.' });
  } catch (err) {
    console.error('Error al registrar resultado de la reunión:', err);
    res.status(500).json({ success: false, message: 'Error interno al registrar el resultado de la reunión.' });
  }
};

/**
 * Reagenda la fecha y hora de una cita local en el CRM.
 * 
 * PUT /api/calendar/appointments/:appointmentId/reschedule
 */
export const rescheduleAppointment = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const { appointmentId } = req.params;
    const { newStart, newEnd, comments } = req.body;

    if (!newStart || !newEnd) {
      return res.status(400).json({ success: false, message: 'La nueva fecha de inicio y fin son obligatorias.' });
    }

    // 1. Manejo especial de actividades de campo (Visitas)
    if (appointmentId.startsWith('db-activity-')) {
      const visitaId = appointmentId.replace('db-activity-', '');
      try {
        const { data: visita } = await supabase.from('crm_visitas').select('*').eq('id', visitaId).single();
        if (visita) {
          await supabase
            .from('crm_visitas')
            .update({ 
              timestamp_servidor: new Date(newStart).toISOString(),
              notas: `[REAGENDADA: ${comments || 'Sin comentarios'}] ${visita.notas || ''}`
            })
            .eq('id', visitaId);
          return res.json({ success: true, message: 'Actividad de campo reagendada exitosamente.' });
        }
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al reagendar actividad de campo.' });
      }
    }

    // 2. Obtener cita local
    const { data: appointment, error: apptError } = await supabase
      .from('crm_appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }

    // 3. Actualizar cita local
    const { error: updateApptError } = await supabase
      .from('crm_appointments')
      .update({
        start_time: newStart,
        end_time: newEnd,
        description: `[REAGENDADO: ${comments || 'Sin comentarios'}] ${appointment.description || ''}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateApptError) throw updateApptError;

    // 4. Actualizar en Google Calendar si estaba sincronizado
    if (appointment.google_event_id) {
      try {
        const { updateGoogleEvent } = await import('../../../services/googleCalendarService.js');
        await updateGoogleEvent(userId, appointment.google_event_id, {
          start: { dateTime: newStart },
          end: { dateTime: newEnd },
          description: `[REAGENDADO] ${appointment.description || ''}`
        });
      } catch (gErr) {
        console.warn('Fallo al actualizar evento en Google Calendar durante reagendamiento:', gErr.message);
      }
    }

    // 5. Auditoría
    await supabase.from('crm_appointments_audit').insert([{
      appointment_id: appointment.id,
      vendedor_id: userId,
      action: 'RESCHEDULE',
      old_data: { start_time: appointment.start_time, end_time: appointment.end_time },
      new_data: { start_time: newStart, end_time: newEnd, comments }
    }]);

    // 6. Actualizar historial del Lead
    if (appointment.client_name) {
      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('id, notes')
          .eq('name', appointment.client_name)
          .single();

        if (lead) {
          let notesData = lead.notes || [];
          if (!Array.isArray(notesData)) notesData = [];
          
          notesData.push({
            id: `note-${Date.now()}`,
            text: `📆 Cita reagendada para el ${new Date(newStart).toLocaleString('es-MX')} (Anterior: ${new Date(appointment.start_time).toLocaleString('es-MX')}). Notas: ${comments || 'N/A'}`,
            author: userName,
            timestamp: new Date().toISOString(),
            isSystem: true
          });

          await supabase.from('leads').update({ notes: JSON.stringify(notesData) }).eq('id', lead.id);
        }
      } catch (leadErr) {
        console.warn('No se pudo actualizar la historia del prospecto durante el reagendamiento:', leadErr.message);
      }
    }

    res.json({ success: true, message: 'Cita reagendada exitosamente.' });
  } catch (err) {
    console.error('Error al reagendar la cita:', err);
    res.status(500).json({ success: false, message: 'Error interno al reagendar la cita.' });
  }
};

/**
 * Obtiene la agenda consolidada de citas para supervisores, administradores y super admins
 * aplicando reglas de aislamiento por empresa.
 * 
 * GET /api/calendar/team-appointments
 */
export const getTeamAppointments = async (req, res) => {
  try {
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!['admin', 'supervisor', 'super_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Acceso restringido.' });
    }

    let query = supabase
      .from('crm_appointments')
      .select('*, vendedor:crm_users(name, role), company:enterprise_companies(name, company_code)');

    if (role === 'supervisor' || role === 'admin') {
      // Aislamiento estricto por compañía
      query = query.eq('company_id', companyId);
    } else if (role === 'super_admin') {
      const filterCompanyId = req.query.company_id;
      if (filterCompanyId && filterCompanyId !== 'all') {
        query = query.eq('company_id', filterCompanyId);
      }
    }

    const { data, error } = await query.order('start_time', { ascending: true });
    if (error) throw error;

    res.json({ success: true, appointments: data || [] });
  } catch (err) {
    console.error('Error al consultar agenda del equipo:', err);
    res.status(500).json({ success: false, message: 'Error al consultar agenda del equipo.' });
  }
};
