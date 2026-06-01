// backend/services/googleCalendarService.js
import { google } from 'googleapis';
import { supabase } from '../supabaseClient.js';

/**
 * Get OAuth2 Client configured with environment credentials
 */
const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Calendar credentials missing in .env (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)');
  }

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
 * Creates an event in the user's primary calendar
 */
export const createGoogleEvent = async (userId, eventDetails) => {
  const calendar = await getCalendarClient(userId);
  
  const { data } = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: eventDetails.title,
      description: eventDetails.description,
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
 * Updates an existing event
 */
export const updateGoogleEvent = async (userId, googleEventId, eventDetails) => {
  const calendar = await getCalendarClient(userId);
  
  const { data } = await calendar.events.update({
    calendarId: 'primary',
    eventId: googleEventId,
    sendUpdates: 'all',
    requestBody: {
      summary: eventDetails.title,
      description: eventDetails.description,
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
 * Deletes an event
 */
export const deleteGoogleEvent = async (userId, googleEventId) => {
  const calendar = await getCalendarClient(userId);
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId
  });
  return true;
};
