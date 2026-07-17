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

export default router;
