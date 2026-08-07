/**
 * ============================================================================
 * HELPERS Y SERVICIOS AUXILIARES DE CALENDARIO / CALENDAR HELPERS & UTILS
 * ============================================================================
 * ES: Este archivo contiene funciones auxiliares reutilizables de bajo nivel
 *     para la gestión de citas, enriquecimiento de eventos de Google Calendar,
 *     notificaciones a supervisores/directivos y sincronización de timelines.
 * ============================================================================
 */

import { supabase, cleanCompanyId } from '../../../supabaseClient.js';

/**
 * Enriquece una lista de eventos devueltos por Google Calendar con información
 * registrada localmente en la tabla `crm_appointments` (por ejemplo: `client_name`).
 * 
 * @param {Array} activeEvents - Lista de eventos crudos de la API de Google.
 * @returns {Promise<Array>} Lista de eventos enriquecidos.
 */
export const enrichGoogleEventsWithLocalData = async (activeEvents) => {
  if (!activeEvents || activeEvents.length === 0) return [];
  
  try {
    const { data: localAppts } = await supabase
      .from('crm_appointments')
      .select('id, google_event_id, client_name');

    if (localAppts && localAppts.length > 0) {
      const apptIndex = {};
      localAppts.forEach(appt => {
        if (appt.google_event_id) {
          apptIndex[appt.google_event_id] = { client_name: appt.client_name, id: appt.id };
        }
      });

      return activeEvents.map(event => ({
        ...event,
        client_name: apptIndex[event.id]?.client_name || null,
        crm_appointment_id: apptIndex[event.id]?.id || null
      }));
    }
  } catch (apptErr) {
    console.warn('[CalendarHelpers] No se pudieron obtener las citas locales para enriquecer eventos:', apptErr.message);
  }

  return activeEvents;
};

/**
 * Marca a un usuario como desconectado de Google Calendar cuando se detecta
 * que las credenciales han sido revocadas o el refresh token expiró (`invalid_grant`).
 * 
 * @param {string} userId - ID del usuario en Supabase.
 * @param {Error} err - Error capturado durante la invocación a la API de Google.
 */
export const handleInvalidGrantToken = async (userId, err) => {
  const isInvalidGrant = err.message?.includes('invalid_grant') || 
                         (err.response?.data?.error === 'invalid_grant') ||
                         (err.cause?.message?.includes('invalid_grant'));
                         
  if (isInvalidGrant) {
    try {
      await supabase
        .from('crm_users')
        .update({ google_calendar_connected: false })
        .eq('id', userId);
      console.log(`[Google Calendar] Usuario ${userId} marcado como desconectado debido a token expirado (invalid_grant)`);
    } catch (dbErr) {
      console.error('[CalendarHelpers] Error al actualizar estado de conexión en BD:', dbErr);
    }
    return true;
  }
  return false;
};

/**
 * Envía una notificación interna en el CRM a supervisores y administradores
 * al realizarse acciones clave sobre una cita (creación, reprogramación, cancelación).
 * 
 * @param {Object} params - Parámetros de la notificación.
 */
export const notifyAdminsAndSupervisors = async ({
  userId,
  userName,
  companyId,
  supervisorId,
  title,
  message,
  type,
  notifyAdminsAlso = false
}) => {
  try {
    if (!companyId) return;

    const recipients = new Set();
    if (supervisorId) recipients.add(supervisorId);

    if (notifyAdminsAlso) {
      const { data: admins } = await supabase
        .from('crm_users')
        .select('id')
        .in('role', ['admin', 'super_admin']);

      if (admins) {
        admins.forEach(a => {
          if (a.id !== userId) recipients.add(a.id);
        });
      }
    }

    if (recipients.size > 0) {
      const notifPayloads = Array.from(recipients).map(recId => ({
        user_id: recId,
        sender_id: userId,
        company_id: cleanCompanyId(companyId),
        title,
        message,
        type,
        read: false
      }));

      await supabase.from('crm_notifications').insert(notifPayloads);
    }
  } catch (notifErr) {
    console.warn('[CalendarHelpers] No se pudo enviar notificación:', notifErr.message);
  }
};

/**
 * Actualiza el historial (timeline) y opcionalmente el estado/etapa de un Prospecto (Lead)
 * después de registrar el resultado o cancelar una cita comercial.
 * 
 * @param {Object} params - Parámetros de actualización del prospecto.
 */
export const updateLeadTimelineAndStage = async ({
  clientName,
  userName,
  timelineText,
  noteType = 'timeline_note',
  targetStage = null,
  revertStage = false
}) => {
  if (!clientName) return;

  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('name', clientName)
      .neq('status', 'descartado')
      .neq('status', 'calificado')
      .maybeSingle();

    if (!lead) return;

    let notesData = { general: '', timeline: [] };
    if (lead.notes) {
      try {
        notesData = JSON.parse(lead.notes);
      } catch (e) {
        notesData.general = lead.notes;
      }
    }
    if (!notesData.timeline) notesData.timeline = [];

    // Agregar entrada al timeline
    notesData.timeline.push({
      date: new Date().toISOString(),
      text: timelineText,
      author: userName,
      type: noteType
    });

    let newStatus = lead.status;

    if (revertStage) {
      // Revertir a la etapa anterior buscando en el historial
      let previousStage = 'nuevo';
      for (let i = notesData.timeline.length - 1; i >= 0; i--) {
        const entry = notesData.timeline[i];
        if (entry.text && typeof entry.text === 'string') {
          const match = entry.text.match(/Cambio de estatus: de "([^"]+)" a "reunion_agendada"/i);
          if (match && match[1]) {
            const candidate = match[1].toLowerCase().trim();
            if (candidate !== 'reunion_agendada' && candidate !== 'reunion agendada') {
              previousStage = candidate;
              break;
            }
          }
        }
      }
      newStatus = previousStage;

      notesData.timeline.push({
        date: new Date().toISOString(),
        text: `Cambio de estatus: de "${lead.status}" a "${previousStage}" debido a la cancelación de la reunión (Sistema).`,
        author: 'Sistema',
        type: 'status_change'
      });
    } else if (targetStage && targetStage.toLowerCase() !== lead.status.toLowerCase()) {
      newStatus = targetStage.toLowerCase();
      notesData.timeline.push({
        date: new Date().toISOString(),
        text: `Cambio de estatus: de "${lead.status}" a "${targetStage}" después de registrar el resultado de la reunión (Sistema).`,
        author: 'Sistema',
        type: 'status_change'
      });
    }

    await supabase
      .from('leads')
      .update({
        status: newStatus,
        notes: JSON.stringify(notesData)
      })
      .eq('id', lead.id);

    console.log(`[CalendarHelpers] Lead ${lead.id} actualizado exitosamente a la etapa "${newStatus}".`);
  } catch (leadErr) {
    console.warn('[CalendarHelpers] No se pudo actualizar el timeline/estado del prospecto:', leadErr.message);
  }
};

/**
 * Realiza una verificación perezosa (Lazy Sync) de un listado de citas locales
 * contra la API de Google Calendar para detectar cancelaciones o eliminaciones externas.
 * 
 * @param {Array} appointments - Citas locales a verificar.
 * @param {string} currentUserId - ID del usuario actual.
 * @returns {Promise<Array>} Lista de citas locales que permanecen activas.
 */
export const syncLazyStatusWithGoogle = async (appointments, currentUserId) => {
  if (!appointments || appointments.length === 0) return [];

  const activeAppointments = [];
  const { getCalendarClient } = await import('../../../services/googleCalendarService.js');

  for (const appt of appointments) {
    if (appt.google_event_id) {
      try {
        const ownerId = appt.vendedor_id || currentUserId;
        const calendar = await getCalendarClient(ownerId);
        
        const gEvent = await calendar.events.get({
          calendarId: 'primary',
          eventId: appt.google_event_id
        });

        if (gEvent.data && gEvent.data.status === 'cancelled') {
          console.log(`[LazySync] El evento ${appt.google_event_id} se canceló en Google. Actualizando localmente.`);
          await supabase
            .from('crm_appointments')
            .update({
              status: 'cancelled',
              deleted_at: new Date().toISOString(),
              cancellation_reason: 'Cancelado externamente en Google Calendar'
            })
            .eq('id', appt.id);
        } else {
          activeAppointments.push(appt);
        }
      } catch (gErr) {
        if (gErr.code === 404 || gErr.status === 404 || (gErr.message && gErr.message.includes('notFound'))) {
          console.log(`[LazySync] El evento ${appt.google_event_id} no existe en Google Calendar. Actualizando localmente.`);
          await supabase
            .from('crm_appointments')
            .update({
              status: 'cancelled',
              deleted_at: new Date().toISOString(),
              cancellation_reason: 'Eliminado externamente de Google Calendar'
            })
            .eq('id', appt.id);
        } else {
          console.warn('[LazySync] No se pudo verificar el evento en Google Calendar:', gErr.message);
          activeAppointments.push(appt);
        }
      }
    } else {
      activeAppointments.push(appt);
    }
  }

  return activeAppointments;
};
