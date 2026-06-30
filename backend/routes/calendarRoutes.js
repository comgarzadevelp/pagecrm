// backend/routes/calendarRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { supabase, cleanCompanyId } from '../supabaseClient.js';
import { getAuthUrl, handleAuthCallback } from '../services/googleCalendarService.js';

const router = express.Router();

// GET /api/calendar/auth-url - Generates OAuth URL for the current user
router.get('/auth-url', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
    }

    const authUrl = getAuthUrl(userId);
    res.json({ success: true, authUrl });
  } catch (err) {
    console.error('Error generating Google Calendar Auth URL:', err);
    res.status(500).json({ success: false, message: 'Error interno al generar la URL de autenticación.' });
  }
});

// GET /api/calendar/callback - Public redirect URI for Google OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;
  
  // Use explicit FRONTEND_URL env var. Production falls back to canonical domain.
  // This avoids the bug where host header points to port 5000 (backend) instead of 5174 (frontend).
  const frontendUrl = process.env.FRONTEND_URL
    || (process.env.NODE_ENV === 'production' ? 'https://www.comgarza.com' : 'http://localhost:5174');

  if (error) {
    console.error('Google OAuth Access Denied by User:', error);
    return res.redirect(`${frontendUrl}/#/crm/dashboard?google_success=false&error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    console.error('Missing callback parameters');
    return res.redirect(`${frontendUrl}/#/crm/dashboard?google_success=false&error=MissingParams`);
  }

  try {
    const { email } = await handleAuthCallback(code, userId);
    console.log(`Google Calendar successfully connected for user ${userId}: ${email}`);
    
    // Redirect vendededor back to frontend dashboard with success flag
    res.redirect(`${frontendUrl}/#/crm/dashboard?google_success=true&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error('Error in Google Calendar Auth Callback exchange:', err);
    res.redirect(`${frontendUrl}/#/crm/dashboard?google_success=false&error=ExchangeFailed`);
  }
});

// GET /api/calendar/status - Checks connection status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const { data: user, error } = await supabase
      .from('crm_users')
      .select('google_calendar_connected, google_calendar_email')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      connected: !!user?.google_calendar_connected,
      email: user?.google_calendar_email || null
    });
  } catch (err) {
    console.error('Error getting calendar status:', err);
    res.status(500).json({ success: false, message: 'Error al consultar estado de conexión.' });
  }
});

// GET /api/calendar/events - Fetch upcoming Google Calendar events
router.get('/events', verifyToken, async (req, res) => {
  const userId = req.user?.userId;
  try {
    const { data: user } = await supabase
      .from('crm_users')
      .select('google_calendar_connected')
      .eq('id', userId)
      .single();

    if (!user?.google_calendar_connected) {
      return res.json({ success: true, events: [], notConnected: true });
    }

    const { getCalendarClient } = await import('../services/googleCalendarService.js');
    const calendar = await getCalendarClient(userId);
    
    // Fetch events from today onwards
    const timeMin = new Date();
    timeMin.setHours(0,0,0,0);

    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const activeEvents = (data.items || []).filter(item => item.status !== 'cancelled');

    // Enriquecer los eventos con client_name de crm_appointments de forma resiliente
    let enrichedEvents = activeEvents;
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

        enrichedEvents = activeEvents.map(event => ({
          ...event,
          client_name: apptIndex[event.id]?.client_name || null,
          crm_appointment_id: apptIndex[event.id]?.id || null
        }));
      }
    } catch (apptErr) {
      console.warn('[calendarRoutes] Could not fetch local appointments to enrich Google events:', apptErr.message);
    }

    res.json({ success: true, events: enrichedEvents });
  } catch (err) {
    console.error('Error fetching Google events:', err);
    
    // Auto-recuperación (auto-heal) para invalid_grant (tokens revocados o expirados)
    const isInvalidGrant = err.message?.includes('invalid_grant') || 
                           (err.response?.data?.error === 'invalid_grant') ||
                           (err.cause?.message?.includes('invalid_grant'));
                           
    if (isInvalidGrant) {
      try {
        await supabase
          .from('crm_users')
          .update({ google_calendar_connected: false })
          .eq('id', userId);
        console.log(`[Google Calendar] Usuario ${userId} marcado como desconectado debido a invalid_grant`);
      } catch (dbErr) {
        console.error('Error al actualizar estado de conexión en BD:', dbErr);
      }
      return res.json({ success: true, events: [], notConnected: true });
    }
    
    res.status(500).json({ success: false, message: 'Error al obtener eventos de Google Calendar.' });
  }
});

// POST /api/calendar/events - Create new Google Calendar event (Resilient with local backup and notifications// POST /api/calendar/events - Create new Google Calendar event (Resilient with local backup and notifications)
router.post('/events', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const companyId = req.user?.companyId;
    const supervisorId = req.user?.supervisorId;
    const { title, description, startTime, endTime, attendees, location, client_name } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Título, fecha de inicio y fin son obligatorios.' });
    }
    
    // 1. Create event in personal Google Calendar
    const { createGoogleEvent, createCorporateGoogleEvent } = await import('../services/googleCalendarService.js');
    const googleEvent = await createGoogleEvent(userId, {
      title,
      description,
      startTime,
      endTime,
      location,
      attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
    });

    // 2. Dual Sincronización: check if company has a master calendar
    let corpEvent = null;
    let companyCalendarId = null;
    try {
      if (companyId) {
        const { data: comp } = await supabase
          .from('enterprise_companies')
          .select('google_calendar_id')
          .eq('id', companyId)
          .single();
        
        if (comp && comp.google_calendar_id) {
          companyCalendarId = comp.google_calendar_id;
          corpEvent = await createCorporateGoogleEvent(companyCalendarId, {
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
      console.warn('Could not sync event to corporate master calendar:', corpErr.message);
    }

    // Extract category if present
    let category = 'negocios';
    if (description) {
      const match = description.match(/\[CAT:([a-z]+)\]/);
      if (match && match[1]) category = match[1];
    }
    
    // 3. Local Backup: save in crm_appointments (Resilient)
    let localAppointment = null;
    try {
      if (companyId) {
        const { data, error } = await supabase
          .from('crm_appointments')
          .insert([
            {
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
            }
          ])
          .select()
          .single();

        if (!error && data) {
          localAppointment = data;

          // Write into crm_appointments_audit
          await supabase
            .from('crm_appointments_audit')
            .insert([
              {
                appointment_id: localAppointment.id,
                vendedor_id: userId,
                action: 'CREATE',
                new_data: googleEvent
              }
            ]);
        }
      }
    } catch (dbErr) {
      console.warn('Could not save local backup/audit (tables might not be migrated yet):', dbErr.message);
    }

    // 4. Notify Supervisor (Resilient)
    try {
      if (supervisorId && companyId) {
        await supabase
          .from('crm_notifications')
          .insert([
            {
              user_id: supervisorId,
              sender_id: userId,
              company_id: cleanCompanyId(companyId),
              title: 'Nueva Cita Agendada 💼',
              message: `El vendedor ${userName} ha agendado una nueva cita: "${title}" para el ${new Date(startTime).toLocaleString('es-MX')}.`,
              type: 'appointment_created',
              read: false
            }
          ]);
      }
    } catch (notifErr) {
      console.warn('Could not send notification to supervisor:', notifErr.message);
    }
    
    res.json({ success: true, event: googleEvent, localAppointment });
  } catch (err) {
    console.error('Error creating Google event:', err);
    res.status(500).json({ success: false, message: 'Error al agendar evento en Google Calendar.' });
  }
});

// GET /api/calendar/appointments/check - Check if a client has future active appointments
router.get('/appointments/check', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { client_name, include_past } = req.query;
    if (!client_name) {
      return res.status(400).json({ success: false, message: 'Nombre del cliente requerido.' });
    }

    let query = supabase
      .from('crm_appointments')
      .select('*')
      .eq('client_name', client_name.trim())
      .in('status', ['active', 'rescheduled']);

    // Si no es un rol de gestión (admin, supervisor, super_admin), restringimos a su propia agenda
    const isSupervisorOrAdmin = ['admin', 'supervisor', 'super_admin'].includes(userRole);
    if (!isSupervisorOrAdmin) {
      query = query.eq('vendedor_id', userId);
    }

    if (include_past === 'true') {
      // Retorna la más reciente programada (pasada o futura)
      query = query.order('start_time', { ascending: false });
    } else {
      // Comportamiento original: solo futuras citas activas
      query = query.gte('start_time', new Date().toISOString())
                   .order('start_time', { ascending: true });
    }

    // Obtenemos todas las citas que coinciden (sin limit 1) para poder limpiar todas las desincronizadas en un solo paso
    const { data: appointments, error } = await query;

    if (error) throw error;

    let activeAppointments = [];

    // Sincronización perezosa (Lazy Sync) de todas las citas locales activas
    if (appointments && appointments.length > 0) {
      const { getCalendarClient } = await import('../services/googleCalendarService.js');
      
      for (const appt of appointments) {
        if (appt.google_event_id) {
          try {
            const ownerId = appt.vendedor_id || userId;
            const calendar = await getCalendarClient(ownerId);
            
            const gEvent = await calendar.events.get({
              calendarId: 'primary',
              eventId: appt.google_event_id
            });

            // Si el evento está cancelado en la nube
            if (gEvent.data && gEvent.data.status === 'cancelled') {
              console.log(`[Check Lazy Sync] Event ${appt.google_event_id} is cancelled in Google. Soft deleting locally.`);
              await supabase
                .from('crm_appointments')
                .update({
                  status: 'cancelled',
                  deleted_at: new Date().toISOString(),
                  cancellation_reason: 'Cancelado externamente en Google Calendar'
                })
                .eq('id', appt.id);
            } else {
              activeAppointments.push(appt); // Sigue activa
            }
          } catch (gErr) {
            // Si no se encuentra en Google Calendar (404 / notFound), significa que fue borrado
            if (gErr.code === 404 || gErr.status === 404 || (gErr.message && gErr.message.includes('notFound'))) {
              console.log(`[Check Lazy Sync] Event ${appt.google_event_id} not found in Google Calendar. Soft deleting locally.`);
              await supabase
                .from('crm_appointments')
                .update({
                  status: 'cancelled',
                  deleted_at: new Date().toISOString(),
                  cancellation_reason: 'Eliminado externamente de Google Calendar'
                })
                .eq('id', appt.id);
            } else {
              console.warn('[Check Lazy Sync] Failed to verify event status in Google Calendar:', gErr.message);
              activeAppointments.push(appt); // Ante la duda o error de red, asumimos que sigue activa
            }
          }
        } else {
          activeAppointments.push(appt);
        }
      }
    }

    // Elegir la cita más relevante de las que quedaron verdaderamente activas
    let selectedAppointment = null;
    if (activeAppointments.length > 0) {
      if (include_past === 'true') {
        // Ordenamos descendente por start_time y tomamos la primera (la más reciente)
        activeAppointments.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        selectedAppointment = activeAppointments[0];
      } else {
        // Comportamiento original: solo futuras citas activas ordenadas de forma ascendente
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
    console.error('Error checking active appointment:', err);
    res.status(500).json({ success: false, message: 'Error al verificar citas activas.' });
  }
});

// PUT /api/calendar/appointments/:appointmentId/outcome - Register outcome of an expired appointment
router.put('/appointments/:appointmentId/outcome', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const { appointmentId } = req.params;
    const { outcome, comments, targetStage } = req.body;

    if (!outcome) {
      return res.status(400).json({ success: false, message: 'El resultado de la reunión es obligatorio.' });
    }

    // Handle CRM Visitas (FieldFlow) outcome if it starts with db-activity-
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

    // 1. Get local appointment
    const { data: appointment, error: apptError } = await supabase
      .from('crm_appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }

    // 2. Map outcome to status
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

    // 3. Update appointment status locally
    const { error: updateApptError } = await supabase
      .from('crm_appointments')
      .update({
        status: statusMapped,
        description: `[RESULTADO: ${outcomeLabel.toUpperCase()} - Comentarios: ${outcomeComments}] ${appointment.description || ''}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateApptError) throw updateApptError;

    // 4. Audit outcome
    await supabase
      .from('crm_appointments_audit')
      .insert([
        {
          appointment_id: appointment.id,
          vendedor_id: userId,
          action: 'UPDATE',
          old_data: { status: appointment.status },
          new_data: { status: statusMapped, outcome, comments: outcomeComments }
        }
      ]);

    // 5. Update Lead timeline and stage
    if (appointment.client_name) {
      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('name', appointment.client_name)
          .neq('status', 'descartado')
          .neq('status', 'calificado')
          .maybeSingle();

        if (lead) {
          let notesData = { general: '', timeline: [] };
          if (lead.notes) {
            try {
              notesData = JSON.parse(lead.notes);
            } catch (e) {
              notesData.general = lead.notes;
            }
          }
          if (!notesData.timeline) notesData.timeline = [];

          // Add outcome log to timeline
          notesData.timeline.push({
            date: new Date().toISOString(),
            text: `Resultado de la reunión: ${outcomeLabel.toUpperCase()}. Comentarios: ${outcomeComments}`,
            author: userName,
            type: 'timeline_note'
          });

          // Add status change log if stage is changing
          const finalStage = targetStage || lead.status;
          if (finalStage.toLowerCase() !== lead.status.toLowerCase()) {
            notesData.timeline.push({
              date: new Date().toISOString(),
              text: `Cambio de estatus: de "${lead.status}" a "${finalStage}" después de registrar el resultado de la reunión (Sistema).`,
              author: 'Sistema',
              type: 'status_change'
            });
          }

          // Update Lead in DB
          const { error: leadUpdateError } = await supabase
            .from('leads')
            .update({
              status: finalStage.toLowerCase(),
              notes: JSON.stringify(notesData)
            })
            .eq('id', lead.id);

          if (leadUpdateError) throw leadUpdateError;
          console.log(`[Meeting Outcome Sync] Lead ${lead.id} outcome registered and stage updated to ${finalStage}`);
        }
      } catch (leadErr) {
        console.warn('Could not update lead timeline/stage during meeting outcome:', leadErr.message);
      }
    }

    res.json({ success: true, message: 'Resultado de reunión registrado exitosamente.' });
  } catch (err) {
    console.error('Error registering meeting outcome:', err);
    res.status(500).json({ success: false, message: 'Error interno al registrar el resultado de la reunión.' });
  }
});

// PUT /api/calendar/appointments/:appointmentId/reschedule - Reschedule a future appointment
router.put('/appointments/:appointmentId/reschedule', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const { appointmentId } = req.params;
    const { newStart, newEnd, comments } = req.body;

    if (!newStart || !newEnd) {
      return res.status(400).json({ success: false, message: 'La nueva fecha de inicio y fin son obligatorias.' });
    }

    // Handle CRM Visitas (FieldFlow) reschedule if it starts with db-activity-
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

    // 1. Get local appointment
    const { data: appointment, error: apptError } = await supabase
      .from('crm_appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (apptError || !appointment) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada.' });
    }

    // 2. Update local appointment
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

    // 3. Update Google Calendar (if connected and has event ID)
    if (appointment.google_event_id) {
      try {
        const { updateGoogleEvent } = await import('../services/googleCalendarService.js');
        await updateGoogleEvent(userId, appointment.google_event_id, {
          start: { dateTime: newStart },
          end: { dateTime: newEnd },
          description: `[REAGENDADO] ${appointment.description || ''}`
        });
      } catch (gErr) {
        console.warn('Failed to update Google Calendar event during reschedule:', gErr.message);
      }
    }

    // 4. Audit
    await supabase
      .from('crm_appointments_audit')
      .insert([{
        appointment_id: appointment.id,
        vendedor_id: userId,
        action: 'RESCHEDULE',
        old_data: { start_time: appointment.start_time, end_time: appointment.end_time },
        new_data: { start_time: newStart, end_time: newEnd, comments }
      }]);

    // 5. Update Lead history
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
        console.warn('Could not update lead history during reschedule:', leadErr.message);
      }
    }

    res.json({ success: true, message: 'Cita reagendada exitosamente.' });
  } catch (err) {
    console.error('Error rescheduling meeting:', err);
    res.status(500).json({ success: false, message: 'Error interno al reagendar la cita.' });
  }
});

// DELETE /api/calendar/events/:eventId - Delete Google Calendar event (Resilient soft delete, audit & notifications with reason)
router.delete('/events/:eventId', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const companyId = req.user?.companyId;
    const supervisorId = req.user?.supervisorId;
    const { eventId } = req.params;
    const { reason } = req.query; // Extract reason from query string
    
    const cancellationReason = reason || 'No especificado por el vendedor';

    // Handle CRM Visitas (FieldFlow) cancellation if it starts with db-activity-
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

    // 1. Local Lookup & Soft Delete
    let localAppointment = null;
    try {
      const { data } = await supabase
        .from('crm_appointments')
        .select('*')
        .eq('google_event_id', eventId)
        .single();
      
      if (data) {
        localAppointment = data;
        
        // Soft delete locally
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
          // Fallback if column is missing: append to description
          await supabase
            .from('crm_appointments')
            .update({
              status: 'cancelled',
              description: `[CANCELADO - Motivo: ${cancellationReason}] ${localAppointment.description || ''}`,
              deleted_at: new Date().toISOString()
            })
            .eq('id', localAppointment.id);
        }

        // Audit deletion
        await supabase
          .from('crm_appointments_audit')
          .insert([
            {
              appointment_id: localAppointment.id,
              vendedor_id: userId,
              action: 'DELETE',
              old_data: localAppointment,
              new_data: { cancellation_reason: cancellationReason }
            }
          ]);

        // RESTORE LEAD TO PREVIOUS STAGE (Resilient)
        if (localAppointment.client_name) {
          try {
            const { data: lead } = await supabase
              .from('leads')
              .select('*')
              .eq('name', localAppointment.client_name)
              .neq('status', 'descartado')
              .neq('status', 'calificado')
              .maybeSingle();

            if (lead) {
              let notesData = { general: '', timeline: [] };
              if (lead.notes) {
                try {
                  notesData = JSON.parse(lead.notes);
                } catch (e) {
                  notesData.general = lead.notes;
                }
              }
              if (!notesData.timeline) notesData.timeline = [];

              // Encontrar la etapa anterior en el timeline en reversa
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

              // Agregar logs al timeline del lead
              notesData.timeline.push({
                date: new Date().toISOString(),
                text: `Se canceló la reunión. Motivo: ${cancellationReason}`,
                author: userName,
                type: 'timeline_note'
              });

              notesData.timeline.push({
                date: new Date().toISOString(),
                text: `Cambio de estatus: de "${lead.status}" a "${previousStage}" debido a la cancelación de la reunión (Sistema).`,
                author: 'Sistema',
                type: 'status_change'
              });

              // Actualizar el lead en la DB
              await supabase
                .from('leads')
                .update({
                  status: previousStage,
                  notes: JSON.stringify(notesData)
                })
                .eq('id', lead.id);

              console.log(`[Cancel Event Sync] Lead ${lead.id} stage reverted from ${lead.status} to ${previousStage}`);
            }
          } catch (leadErr) {
            console.warn('Could not revert lead stage during appointment cancellation:', leadErr.message);
          }
        }
      }
    } catch (dbErr) {
      console.warn('Could not query/update local appointment table during cancellation:', dbErr.message);
    }

    // 2. Remove from personal Google Calendar & Corporate Calendar (Tolerant)
    try {
      const { deleteGoogleEvent, deleteCorporateGoogleEvent } = await import('../services/googleCalendarService.js');
      // Usar vendedor_id original de la cita si está disponible (para resolver mismatch si lo hace supervisor/admin)
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
          console.warn('Could not delete from corporate master calendar:', corpErr.message);
        }
      }
    } catch (gCalErr) {
      console.warn('Google Calendar delete event failed (might be already deleted in cloud):', gCalErr.message);
      // Continuamos de todos modos para no bloquear el flujo local
    }
    
    // 3. Notify Supervisor & Super Admins / Admins of cancellation with reason
    try {
      const titleText = localAppointment ? localAppointment.title : 'Evento de Calendario';
      
      // Get all admins and super_admins
      const { data: admins } = await supabase
        .from('crm_users')
        .select('id')
        .in('role', ['admin', 'super_admin']);

      const recipients = new Set();
      if (supervisorId) recipients.add(supervisorId);
      if (admins) {
        admins.forEach(a => {
          if (a.id !== userId) recipients.add(a.id); // Don't notify the seller themselves
        });
      }

      if (recipients.size > 0 && companyId) {
        const notifPayloads = Array.from(recipients).map(recId => ({
          user_id: recId,
          sender_id: userId,
          company_id: cleanCompanyId(companyId),
          title: 'Cita Cancelada ⚠️',
          message: `El vendedor ${userName} ha cancelado la cita: "${titleText}". Motivo: "${cancellationReason}".`,
          type: 'appointment_deleted',
          read: false
        }));

        await supabase
          .from('crm_notifications')
          .insert(notifPayloads);
      }
    } catch (notifErr) {
      console.warn('Could not notify supervisor/admins of cancellation:', notifErr.message);
    }

    res.json({ success: true, message: 'Evento cancelado exitosamente.' });
  } catch (err) {
    console.error('Error deleting Google event:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar el evento de Google Calendar: ' + err.message });
  }
});

// POST /api/calendar/disconnect - Revokes connection
router.post('/disconnect', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const { error } = await supabase
      .from('crm_users')
      .update({
        google_calendar_connected: false,
        google_calendar_email: null,
        google_refresh_token: null
      })
      .eq('id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Google Calendar desconectado exitosamente.' });
  } catch (err) {
    console.error('Error disconnecting calendar:', err);
    res.status(500).json({ success: false, message: 'Error al desconectar Google Calendar.' });
  }
});

// PUT /api/calendar/events/:eventId - Reschedule / Update calendar event (Resilient update + supervisor alert)
router.put('/events/:eventId', verifyToken, async (req, res) => {
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

    // 0. Lookup original record to resolve correct seller/owner ID before updating Google Calendar
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
      console.warn('Could not lookup appointment owner before update:', dbErr.message);
    }

    // 1. Update in personal Google Calendar
    const { updateGoogleEvent, updateCorporateGoogleEvent } = await import('../services/googleCalendarService.js');
    const googleEvent = await updateGoogleEvent(ownerId, eventId, {
      title,
      description,
      startTime,
      endTime,
      location,
      attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
    });

    // 2. Local Update in crm_appointments (Resilient) & Dual Sync update
    let localAppointment = null;
    try {
      if (original) {
        // Sync Corporate Google Calendar event if connected
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
            console.warn('Could not reschedule event in corporate master calendar:', corpErr.message);
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

          // Audit change
          await supabase
            .from('crm_appointments_audit')
            .insert([
              {
                appointment_id: localAppointment.id,
                vendedor_id: userId,
                action: 'UPDATE',
                old_data: original,
                new_data: localAppointment
              }
            ]);
        }
      }
    } catch (dbErr) {
      console.warn('Could not update local appointment registry:', dbErr.message);
    }

    // 3. Notify Supervisor (Resilient)
    try {
      if (supervisorId && companyId) {
        await supabase
          .from('crm_notifications')
          .insert([
            {
              user_id: supervisorId,
              sender_id: userId,
              company_id: cleanCompanyId(companyId),
              title: 'Cita Reprogramada ⏳',
              message: `El vendedor ${userName} ha reprogramado la cita: "${title}" para el ${new Date(startTime).toLocaleString('es-MX')}.`,
              type: 'appointment_rescheduled',
              read: false
            }
          ]);
      }
    } catch (notifErr) {
      console.warn('Could not notify supervisor of reschedule:', notifErr.message);
    }

    res.json({ success: true, event: googleEvent, localAppointment });
  } catch (err) {
    console.error('Error updating Google event:', err);
    res.status(500).json({ success: false, message: 'Error al reprogramar el evento en Google Calendar: ' + err.message });
  }
});

// GET /api/calendar/team-appointments - Pull team appointments for supervisors & admins
router.get('/team-appointments', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!['admin', 'supervisor', 'super_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Acceso restringido.' });
    }

    let query = supabase
      .from('crm_appointments')
      .select('*, vendedor:crm_users(name, role), company:enterprise_companies(name, company_code)');

    if (role === 'supervisor' || role === 'admin') {
      // Strict isolation: supervisors and local admins can only view their own company's events
      query = query.eq('company_id', companyId);
    } else if (role === 'super_admin') {
      // Super admins can view all or filter by a specific company query param
      const filterCompanyId = req.query.company_id;
      if (filterCompanyId && filterCompanyId !== 'all') {
        query = query.eq('company_id', filterCompanyId);
      }
    }

    const { data, error } = await query.order('start_time', { ascending: true });
    if (error) throw error;

    res.json({ success: true, appointments: data || [] });
  } catch (err) {
    console.error('Error fetching team appointments:', err);
    res.status(500).json({ success: false, message: 'Error al consultar agenda del equipo.' });
  }
});


export default router;
