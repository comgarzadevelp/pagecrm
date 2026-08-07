/**
 * ============================================================================
 * CONTROLADOR DE EVENTOS DE GOOGLE CALENDAR / GOOGLE CALENDAR EVENTS CONTROLLER
 * ============================================================================
 * ES: Gestiona la sincronización directa con la API de Google Calendar:
 *     obtención de eventos próximos, creación, actualización y eliminación.
 * ============================================================================
 */

import { supabase } from '../../../supabaseClient.js';
import {
  enrichGoogleEventsWithLocalData,
  handleInvalidGrantToken,
  notifyAdminsAndSupervisors,
  updateLeadTimelineAndStage
} from './calendarHelpers.js';

/**
 * Obtiene los próximos eventos del usuario desde su Google Calendar principal
 * y los enriquece con datos locales del CRM.
 * 
 * GET /api/calendar/events
 */
export const getEvents = async (req, res) => {
  const userId = req.user?.userId;
  try {
    // 1. Verificar si el usuario tiene conectado Google Calendar
    const { data: user } = await supabase
      .from('crm_users')
      .select('google_calendar_connected')
      .eq('id', userId)
      .single();

    if (!user?.google_calendar_connected) {
      return res.json({ success: true, events: [], notConnected: true });
    }

    // 2. Invocación al cliente autenticado de Google Calendar
    const { getCalendarClient } = await import('../../../services/googleCalendarService.js');
    const calendar = await getCalendarClient(userId);
    
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);

    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const activeEvents = (data.items || []).filter(item => item.status !== 'cancelled');

    // 3. Enriquecer los eventos de Google con datos de citas locales
    const enrichedEvents = await enrichGoogleEventsWithLocalData(activeEvents);

    res.json({ success: true, events: enrichedEvents });
  } catch (err) {
    console.error('Error al obtener eventos de Google Calendar:', err);
    
    // 4. Manejar auto-recuperación si el token expiró/fue revocado
    const wasRevoked = await handleInvalidGrantToken(userId, err);
    if (wasRevoked) {
      return res.json({ success: true, events: [], notConnected: true });
    }
    
    res.status(500).json({ success: false, message: 'Error al obtener eventos de Google Calendar.' });
  }
};

/**
 * Agenda un nuevo evento en Google Calendar (personal y corporativo)
 * y guarda su respaldo en el CRM local con notificaciones al supervisor.
 * 
 * POST /api/calendar/events
 */
export const createEvent = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const companyId = req.user?.companyId;
    const supervisorId = req.user?.supervisorId;
    const { title, description, startTime, endTime, attendees, location, client_name } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Título, fecha de inicio y fin son obligatorios.' });
    }
    
    // 1. Crear el evento en el Google Calendar personal del vendedor
    const { createGoogleEvent, createCorporateGoogleEvent } = await import('../../../services/googleCalendarService.js');
    const googleEvent = await createGoogleEvent(userId, {
      title,
      description,
      startTime,
      endTime,
      location,
      attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
    });

    // 2. Sincronizar en el Google Calendar maestro de la empresa (si está configurado)
    let corpEvent = null;
    try {
      if (companyId) {
        const { data: comp } = await supabase
          .from('enterprise_companies')
          .select('google_calendar_id')
          .eq('id', companyId)
          .single();
        
        if (comp && comp.google_calendar_id) {
          corpEvent = await createCorporateGoogleEvent(comp.google_calendar_id, {
            title,
            description,
            startTime,
            endTime,
            location,
            clientName: client_name,
            attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
          }, userName);
        }
      }
    } catch (corpErr) {
      console.warn('No se pudo sincronizar el evento en el calendario corporativo:', corpErr.message);
    }

    // 3. Extraer categoría del texto de la descripción (si incluye etiqueta [CAT:...])
    let category = 'negocios';
    if (description) {
      const match = description.match(/\[CAT:([a-z]+)\]/);
      if (match && match[1]) category = match[1];
    }
    
    // 4. Guardar respaldo local en la tabla crm_appointments y su auditoría
    let localAppointment = null;
    try {
      if (companyId) {
        const { data, error } = await supabase
          .from('crm_appointments')
          .insert([{
            google_event_id: googleEvent.id,
            company_google_event_id: corpEvent ? corpEvent.id : null,
            vendedor_id: userId,
            company_id: companyId,
            title,
            description,
            category,
            start_time: startTime,
            end_time: endTime,
            attendees,
            location: location || null,
            client_name: client_name || null,
            status: 'active'
          }])
          .select()
          .single();

        if (!error && data) {
          localAppointment = data;
          await supabase.from('crm_appointments_audit').insert([{
            appointment_id: localAppointment.id,
            vendedor_id: userId,
            action: 'CREATE',
            new_data: googleEvent
          }]);
        }
      }
    } catch (dbErr) {
      console.warn('No se pudo guardar el respaldo local de la cita:', dbErr.message);
    }

    // 5. Enviar notificación al supervisor
    await notifyAdminsAndSupervisors({
      userId,
      userName,
      companyId,
      supervisorId,
      title: 'Nueva Cita Agendada 💼',
      message: `El vendedor ${userName} ha agendado una nueva cita: "${title}" para el ${new Date(startTime).toLocaleString('es-MX')}.`,
      type: 'appointment_created'
    });
    
    res.json({ success: true, event: googleEvent, localAppointment });
  } catch (err) {
    console.error('Error al agendar evento en Google Calendar:', err);
    res.status(500).json({ success: false, message: 'Error al agendar evento en Google Calendar.' });
  }
};

/**
 * Reprograma o actualiza la información de un evento en Google Calendar
 * y sincroniza sus cambios en el respaldo local del CRM.
 * 
 * PUT /api/calendar/events/:eventId
 */
export const updateEvent = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const companyId = req.user?.companyId;
    const supervisorId = req.user?.supervisorId;
    const { eventId } = req.params;
    const { title, description, startTime, endTime, attendees, category, location, client_name } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Título, fecha de inicio y fin son obligatorios.' });
    }

    // 1. Resolver el propietario original de la cita si difiere del usuario actual
    let ownerId = userId;
    let original = null;
    try {
      const { data } = await supabase
        .from('crm_appointments')
        .select('*')
        .eq('google_event_id', eventId)
        .single();
      if (data) {
        original = data;
        ownerId = original.vendedor_id || userId;
      }
    } catch (dbErr) {
      console.warn('No se pudo consultar la cita original antes de actualizar:', dbErr.message);
    }

    // 2. Actualizar en el Google Calendar del vendedor
    const { updateGoogleEvent, updateCorporateGoogleEvent } = await import('../../../services/googleCalendarService.js');
    const googleEvent = await updateGoogleEvent(ownerId, eventId, {
      title,
      description,
      startTime,
      endTime,
      location,
      attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
    });

    // 3. Actualizar cita local y calendario corporativo
    let localAppointment = null;
    try {
      if (original) {
        if (original.company_google_event_id) {
          try {
            const { data: comp } = await supabase
              .from('enterprise_companies')
              .select('google_calendar_id')
              .eq('id', companyId)
              .single();
            
            if (comp && comp.google_calendar_id) {
              await updateCorporateGoogleEvent(
                comp.google_calendar_id,
                original.company_google_event_id,
                {
                  title,
                  description,
                  startTime,
                  endTime,
                  location,
                  clientName: client_name || original.client_name,
                  attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
                },
                userName
              );
            }
          } catch (corpErr) {
            console.warn('No se pudo actualizar la cita en el calendario corporativo:', corpErr.message);
          }
        }

        const { data, error } = await supabase
          .from('crm_appointments')
          .update({
            title,
            description,
            start_time: startTime,
            end_time: endTime,
            attendees,
            location: location || original.location,
            client_name: client_name || original.client_name,
            category: category || original.category,
            status: 'rescheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', original.id)
          .select()
          .single();

        if (!error && data) {
          localAppointment = data;
          await supabase.from('crm_appointments_audit').insert([{
            appointment_id: localAppointment.id,
            vendedor_id: userId,
            action: 'UPDATE',
            old_data: original,
            new_data: localAppointment
          }]);
        }
      }
    } catch (dbErr) {
      console.warn('No se pudo actualizar el registro local de la cita:', dbErr.message);
    }

    // 4. Notificar al supervisor sobre la reprogramación
    await notifyAdminsAndSupervisors({
      userId,
      userName,
      companyId,
      supervisorId,
      title: 'Cita Reprogramada ⏳',
      message: `El vendedor ${userName} ha reprogramado la cita: "${title}" para el ${new Date(startTime).toLocaleString('es-MX')}.`,
      type: 'appointment_rescheduled'
    });

    res.json({ success: true, event: googleEvent, localAppointment });
  } catch (err) {
    console.error('Error al actualizar el evento en Google Calendar:', err);
    res.status(500).json({ success: false, message: 'Error al reprogramar el evento en Google Calendar: ' + err.message });
  }
};

/**
 * Cancela o elimina un evento de Google Calendar (personal y corporativo)
 * registrando el motivo, actualizando el estado local y notificando a directivos.
 * 
 * DELETE /api/calendar/events/:eventId
 */
export const deleteEvent = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const companyId = req.user?.companyId;
    const supervisorId = req.user?.supervisorId;
    const { eventId } = req.params;
    const { reason } = req.query;
    
    const cancellationReason = reason || 'No especificado por el vendedor';

    // 1. Manejo especial si corresponde a una Actividad de Campo (Visita)
    if (eventId.startsWith('db-activity-')) {
      const visitaId = eventId.replace('db-activity-', '');
      try {
        await supabase
          .from('crm_visitas')
          .update({ 
            resultado: 'Cancelada', 
            notas: `[CANCELADA] Motivo: ${cancellationReason}` 
          })
          .eq('id', visitaId);
        return res.json({ success: true, message: 'Actividad de campo cancelada exitosamente.' });
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al cancelar actividad de campo.' });
      }
    }

    // 2. Búsqueda y baja lógica en el CRM local
    let localAppointment = null;
    try {
      const { data } = await supabase
        .from('crm_appointments')
        .select('*')
        .eq('google_event_id', eventId)
        .single();
      
      if (data) {
        localAppointment = data;
        try {
          await supabase
            .from('crm_appointments')
            .update({
              status: 'cancelled',
              deleted_at: new Date().toISOString(),
              cancellation_reason: cancellationReason
            })
            .eq('id', localAppointment.id);
        } catch (colErr) {
          await supabase
            .from('crm_appointments')
            .update({
              status: 'cancelled',
              description: `[CANCELADO - Motivo: ${cancellationReason}] ${localAppointment.description || ''}`,
              deleted_at: new Date().toISOString()
            })
            .eq('id', localAppointment.id);
        }

        await supabase.from('crm_appointments_audit').insert([{
          appointment_id: localAppointment.id,
          vendedor_id: userId,
          action: 'DELETE',
          old_data: localAppointment,
          new_data: { cancellation_reason: cancellationReason }
        }]);

        // Revertir etapa del prospecto si aplicaba
        if (localAppointment.client_name) {
          await updateLeadTimelineAndStage({
            clientName: localAppointment.client_name,
            userName,
            timelineText: `Se canceló la reunión. Motivo: ${cancellationReason}`,
            revertStage: true
          });
        }
      }
    } catch (dbErr) {
      console.warn('No se pudo actualizar el registro local de la cita cancelada:', dbErr.message);
    }

    // 3. Eliminar de Google Calendar (personal y corporativo)
    try {
      const { deleteGoogleEvent, deleteCorporateGoogleEvent } = await import('../../../services/googleCalendarService.js');
      const ownerId = localAppointment ? (localAppointment.vendedor_id || userId) : userId;
      await deleteGoogleEvent(ownerId, eventId);

      if (localAppointment && localAppointment.company_google_event_id) {
        try {
          const { data: comp } = await supabase
            .from('enterprise_companies')
            .select('google_calendar_id')
            .eq('id', companyId)
            .single();
          
          if (comp && comp.google_calendar_id) {
            await deleteCorporateGoogleEvent(comp.google_calendar_id, localAppointment.company_google_event_id);
          }
        } catch (corpErr) {
          console.warn('No se pudo borrar el evento del calendario corporativo:', corpErr.message);
        }
      }
    } catch (gCalErr) {
      console.warn('Fallo al eliminar el evento de Google Calendar (posiblemente borrado previamente):', gCalErr.message);
    }
    
    // 4. Notificar a supervisores y administradores con la razón de la cancelación
    const titleText = localAppointment ? localAppointment.title : 'Evento de Calendario';
    await notifyAdminsAndSupervisors({
      userId,
      userName,
      companyId,
      supervisorId,
      title: 'Cita Cancelada ⚠️',
      message: `El vendedor ${userName} ha cancelado la cita: "${titleText}". Motivo: "${cancellationReason}".`,
      type: 'appointment_deleted',
      notifyAdminsAlso: true
    });

    res.json({ success: true, message: 'Evento cancelado exitosamente.' });
  } catch (err) {
    console.error('Error al cancelar evento de Google Calendar:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar el evento de Google Calendar: ' + err.message });
  }
};
