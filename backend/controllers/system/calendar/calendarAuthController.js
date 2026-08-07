import { supabase } from '../../../supabaseClient.js';
import { getAuthUrl as getOAuthUrl, handleAuthCallback } from '../../../services/googleCalendarService.js';

// GET /api/calendar/auth-url - Generates OAuth URL for the current user
export const getAuthUrl = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
    }

    const authUrl = getOAuthUrl(userId);
    res.json({ success: true, authUrl });
  } catch (err) {
    console.error('Error generating Google Calendar Auth URL:', err);
    res.status(500).json({ success: false, message: 'Error interno al generar la URL de autenticación.' });
  }
};

// GET /api/calendar/callback - Public redirect URI for Google OAuth callback
export const handleCallback = async (req, res) => {
  const { code, state: userId, error } = req.query;
  
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
    
    res.redirect(`${frontendUrl}/#/crm/dashboard?google_success=true&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error('Error in Google Calendar Auth Callback exchange:', err);
    res.redirect(`${frontendUrl}/#/crm/dashboard?google_success=false&error=ExchangeFailed`);
  }
};

// GET /api/calendar/status - Checks connection status
export const getStatus = async (req, res) => {
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
};

// POST /api/calendar/disconnect - Revokes connection
export const disconnectCalendar = async (req, res) => {
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
};
