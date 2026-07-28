import express from 'express';
import { getLeadsWebsite, getAnalytics, updateLeadStatus, getSellers, getChatHistory, deleteLead, getQuotesStats } from '../controllers/saController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// Middleware de autenticación global para estas rutas
router.use(verifyToken);

// Middleware para verificar que el usuario sea super_admin
const authorizeSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de Super Admin' });
  }
};
router.use(authorizeSuperAdmin);

// Obtener leads de las páginas web (consolida MTY y GDL)
router.get('/leads-website', getLeadsWebsite);

// Actualizar estatus o asignación de un lead
router.put('/leads-website/update', updateLeadStatus);

// Eliminar lead (spam)
router.delete('/leads-website/:id', deleteLead);

// Obtener vendedores para asignar
router.get('/sellers', getSellers);

// Obtener historial de chat de un lead (si proviene de chatbot)
router.get('/chat-history/:sessionId', getChatHistory);

// Obtener métricas para los gráficos del dashboard (consolida MTY y GDL)
router.get('/analytics', getAnalytics);

// Obtener cotizaciones y estadísticas consolidadas para Super Admin
router.get('/quotes-stats', getQuotesStats);

// Observar notificaciones de cualquier usuario (Super Admin solo lectura - Filtra últimos 7 días)
router.get('/user-notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, notifications: data || [] });
  } catch (err) {
    console.error('Error fetching user notifications (SA):', err);
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones del usuario.' });
  }
});

// Observar TODAS las notificaciones históricas de cualquier usuario (para la vista detallada)
router.get('/user-notifications/:userId/all', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, notifications: data || [] });
  } catch (err) {
    console.error('Error fetching all user notifications (SA):', err);
    res.status(500).json({ success: false, message: 'Error al obtener historial de notificaciones.' });
  }
});

// GET /api/sa/user-presence – Devuelve usuarios con estado de presencia y contador de notificaciones (consolida N+1)
router.get('/user-presence', async (req, res) => {
  try {
    const { data: users, error: usersErr } = await supabase
      .from('crm_users')
      .select(`
        id, name, email, role, position, avatar_url,
        last_seen_at, last_login_at, last_logout_at,
        session_count, created_at
      `)
      .order('created_at', { ascending: false });

    if (usersErr) throw usersErr;

    // Notificaciones no leídas de los últimos 7 días
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: notifs, error: notifsErr } = await supabase
      .from('crm_notifications')
      .select('user_id, read')
      .eq('read', false)
      .gte('created_at', sevenDaysAgo);

    const unreadMap = {};
    (notifs || []).forEach(n => {
      unreadMap[n.user_id] = (unreadMap[n.user_id] || 0) + 1;
    });

    const enriched = (users || []).map(u => ({
      ...u,
      unreadCount: unreadMap[u.id] || 0
    }));

    res.json({ success: true, users: enriched, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[user-presence] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sa/adoption-metrics – Devuelve métricas de adopción por usuario desde la vista user_adoption_metrics
router.get('/adoption-metrics', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_adoption_metrics')
      .select('*');

    if (error) throw error;
    res.json({ success: true, metrics: data || [] });
  } catch (err) {
    console.error('[adoption-metrics] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
