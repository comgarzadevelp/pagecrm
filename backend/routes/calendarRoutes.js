// backend/routes/calendarRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { supabase } from '../supabaseClient.js';
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
  const frontendUrl = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')[0] 
    : 'http://localhost:5174';

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
  try {
    const userId = req.user?.userId;
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
    
    res.json({ success: true, events: data.items || [] });
  } catch (err) {
    console.error('Error fetching Google events:', err);
    res.status(500).json({ success: false, message: 'Error al obtener eventos de Google Calendar.' });
  }
});

// POST /api/calendar/events - Create new Google Calendar event (Resilient with local backup and notifications)
router.post('/events', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.name || 'Vendedor';
    const companyId = req.user?.companyId;
    const supervisorId = req.user?.supervisorId;
    const { title, description, startTime, endTime, attendees } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Título, fecha de inicio y fin son obligatorios.' });
    }
    
    // 1. Create event in Google Calendar
    const { createGoogleEvent } = await import('../services/googleCalendarService.js');
    const googleEvent = await createGoogleEvent(userId, {
      title,
      description,
      startTime,
      endTime,
      attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
    });

    // Extract category if present
    let category = 'negocios';
    if (description) {
      const match = description.match(/\[CAT:([a-z]+)\]/);
      if (match && match[1]) category = match[1];
    }
    
    // 2. Local Backup: save in crm_appointments (Resilient)
    let localAppointment = null;
    try {
      if (companyId) {
        const { data, error } = await supabase
          .from('crm_appointments')
          .insert([
            {
              google_event_id: googleEvent.id,
              vendedor_id: userId,
              company_id: companyId,
              title,
              description,
              category,
              start_time: startTime,
              end_time: endTime,
              attendees,
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

    // 3. Notify Supervisor (Resilient)
    try {
      if (supervisorId && companyId) {
        await supabase
          .from('crm_notifications')
          .insert([
            {
              user_id: supervisorId,
              sender_id: userId,
              company_id: companyId,
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
        
        // Soft delete locally (Try updating cancellation_reason, fallback if column doesn't exist)
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
      }
    } catch (dbErr) {
      console.warn('Could not query/update local appointment table during cancellation:', dbErr.message);
    }

    // 2. Remove from Google Calendar
    const { deleteGoogleEvent } = await import('../services/googleCalendarService.js');
    await deleteGoogleEvent(userId, eventId);
    
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
          company_id: companyId,
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
    res.status(500).json({ success: false, message: 'Error al eliminar el evento de Google Calendar.' });
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
    const { title, description, startTime, endTime, attendees, category } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Título, fecha de inicio y fin son obligatorios.' });
    }

    // 1. Update in Google Calendar
    const { updateGoogleEvent } = await import('../services/googleCalendarService.js');
    const googleEvent = await updateGoogleEvent(userId, eventId, {
      title,
      description,
      startTime,
      endTime,
      attendees: attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : []
    });

    // 2. Local Update in crm_appointments (Resilient)
    let localAppointment = null;
    try {
      // Find original local record
      const { data: original } = await supabase
        .from('crm_appointments')
        .select('*')
        .eq('google_event_id', eventId)
        .single();

      if (original) {
        const { data, error } = await supabase
          .from('crm_appointments')
          .update({
            title,
            description,
            start_time: startTime,
            end_time: endTime,
            attendees,
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
              company_id: companyId,
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
    res.status(500).json({ success: false, message: 'Error al reprogramar el evento en Google Calendar.' });
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
