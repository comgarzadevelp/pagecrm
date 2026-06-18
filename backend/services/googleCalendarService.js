// backend/services/googleCalendarService.js
import { google } from 'googleapis';
import { supabase } from '../supabaseClient.js';

/**
 * Get OAuth2 Client configured with environment credentials
 */
const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar credentials missing in .env (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)');
  }

  // Production always uses the canonical domain. Dev uses localhost so ngrok is never required.
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://www.comgarza.com/auth/google/callback'
    : (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Generates Auth URL for the vendedor to consent
 * @param {string} userId - User UUID in crm_users
 */
export const getAuthUrl = (userId) => {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Offline access gets us the refresh token
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    state: userId, // State propagates to callback to identify user
    prompt: 'consent' // Forces consent screen to guarantee refresh token delivery
  });
};

/**
 * Handles callback: exchanges code for token, stores refresh token in Supabase
 * @param {string} code - OAuth callback code
 * @param {string} userId - Target user UUID
 */
export const handleAuthCallback = async (code, userId) => {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  
  const refresh_token = tokens.refresh_token;
  
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  // Get calendar email
  const { data } = await calendar.calendars.get({ calendarId: 'primary' });
  const email = data.id;

  const updatePayload = {
    google_calendar_connected: true,
    google_calendar_email: email
  };

  // Only save refresh token if Google returned it (will be null on re-auth without consent prompt)
  if (refresh_token) {
    updatePayload.google_refresh_token = refresh_token;
  }

  const { error } = await supabase
    .from('crm_users')
    .update(updatePayload)
    .eq('id', userId);
    
  if (error) {
    console.error('Error saving Google tokens to Supabase crm_users:', error);
    throw error;
  }

  return { email };
};

/**
 * Instantiates an authorized Calendar API Client
 * @param {string} userId - User UUID
 */
export const getCalendarClient = async (userId) => {
  const { data: user, error } = await supabase
    .from('crm_users')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();
    
  if (error || !user || !user.google_refresh_token) {
    throw new Error('Google Calendar not connected for this user');
  }
  
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: user.google_refresh_token
  });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
};
/**
 * Instantiates an authorized Calendar API Client for the Super Admin
 */
export const getSuperAdminCalendarClient = async () => {
  const { data: superAdmin, error } = await supabase
    .from('crm_users')
    .select('google_refresh_token')
    .eq('role', 'super_admin')
    .eq('google_calendar_connected', true)
    .maybeSingle();

  if (error || !superAdmin || !superAdmin.google_refresh_token) {
    console.warn('Super Admin Google Calendar is not connected. Skipping corporate calendar sync.');
    return null;
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: superAdmin.google_refresh_token
  });
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
};

/**
 * Creates an event in the user's primary calendar
 */
export const createGoogleEvent = async (userId, eventDetails) => {
  const calendar = await getCalendarClient(userId);
  
  const rawDescription = eventDetails.description || '';
  const cleanDescription = rawDescription.replace(/\[CAT:[a-z]+\]\s*/g, '');
  const enrichedDescription = `${cleanDescription}

────────────────────────────────────
💼 Cita Comercial - Grupo Garza
📍 Ubicación: ${eventDetails.location || 'No especificada'}
📞 Atención Garza: (81) 1234-5678
🌐 Sitio Web: www.comgarza.com`;

  const { data } = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: eventDetails.title,
      description: enrichedDescription,
      location: eventDetails.location || '',
      start: {
        dateTime: eventDetails.startTime, // ISO 8601 String
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      end: {
        dateTime: eventDetails.endTime, // ISO 8601 String
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      attendees: eventDetails.attendees || [],
      reminders: {
        useDefault: true
      }
    }
  });
  
  return data;
};

/**
 * Creates a duplicate event in the Corporate Company Calendar using Super Admin auth
 */
export const createCorporateGoogleEvent = async (companyCalendarId, eventDetails, vendedorName) => {
  const calendar = await getSuperAdminCalendarClient();
  if (!calendar) return null;

  const rawDescription = eventDetails.description || '';
  const cleanDescription = rawDescription.replace(/\[CAT:[a-z]+\]\s*/g, '');

  const enrichedSummary = `[CORP] ${eventDetails.title} | Cliente: ${eventDetails.clientName || 'Sin Cliente'}`;
  const enrichedDescription = `${cleanDescription}\n\n────────────────\n📞 Vendedor: ${vendedorName}\n👤 Cliente: ${eventDetails.clientName || 'Sin Cliente'}\n📍 Ubicación: ${eventDetails.location || 'No especificada'}`;

  const { data } = await calendar.events.insert({
    calendarId: companyCalendarId,
    sendUpdates: 'none',
    requestBody: {
      summary: enrichedSummary,
      description: enrichedDescription,
      location: eventDetails.location || '',
      start: {
        dateTime: eventDetails.startTime,
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      attendees: eventDetails.attendees || []
    }
  });

  return data;
};

/**
 * Updates an existing event in the user's primary calendar
 */
export const updateGoogleEvent = async (userId, googleEventId, eventDetails) => {
  const calendar = await getCalendarClient(userId);
  
  const rawDescription = eventDetails.description || '';
  const cleanDescription = rawDescription.replace(/\[CAT:[a-z]+\]\s*/g, '');
  const enrichedDescription = `${cleanDescription}

────────────────────────────────────
💼 Cita Comercial - Grupo Garza
📍 Ubicación: ${eventDetails.location || 'No especificada'}
📞 Atención Garza: (81) 1234-5678
🌐 Sitio Web: www.comgarza.com`;

  const { data } = await calendar.events.update({
    calendarId: 'primary',
    eventId: googleEventId,
    sendUpdates: 'all',
    requestBody: {
      summary: eventDetails.title,
      description: enrichedDescription,
      location: eventDetails.location || '',
      start: {
        dateTime: eventDetails.startTime,
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      attendees: eventDetails.attendees || []
    }
  });
  
  return data;
};

/**
 * Updates an existing event in the Corporate Company Calendar
 */
export const updateCorporateGoogleEvent = async (companyCalendarId, corporateEventId, eventDetails, vendedorName) => {
  const calendar = await getSuperAdminCalendarClient();
  if (!calendar || !corporateEventId) return null;

  const rawDescription = eventDetails.description || '';
  const cleanDescription = rawDescription.replace(/\[CAT:[a-z]+\]\s*/g, '');

  const enrichedSummary = `[CORP] ${eventDetails.title} | Cliente: ${eventDetails.clientName || 'Sin Cliente'}`;
  const enrichedDescription = `${cleanDescription}\n\n────────────────\n📞 Vendedor: ${vendedorName}\n👤 Cliente: ${eventDetails.clientName || 'Sin Cliente'}\n📍 Ubicación: ${eventDetails.location || 'No especificada'}`;

  const { data } = await calendar.events.update({
    calendarId: companyCalendarId,
    eventId: corporateEventId,
    sendUpdates: 'none',
    requestBody: {
      summary: enrichedSummary,
      description: enrichedDescription,
      location: eventDetails.location || '',
      start: {
        dateTime: eventDetails.startTime,
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: eventDetails.timeZone || 'America/Mexico_City'
      },
      attendees: eventDetails.attendees || []
    }
  });

  return data;
};

/**
 * Deletes an event from the user's primary calendar
 */
export const deleteGoogleEvent = async (userId, googleEventId) => {
  const calendar = await getCalendarClient(userId);
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId
  });
  return true;
};

/**
 * Deletes an event from the Corporate Company Calendar
 */
export const deleteCorporateGoogleEvent = async (companyCalendarId, corporateEventId) => {
  const calendar = await getSuperAdminCalendarClient();
  if (!calendar || !corporateEventId) return false;

  await calendar.events.delete({
    calendarId: companyCalendarId,
    eventId: corporateEventId
  });
  return true;
};
