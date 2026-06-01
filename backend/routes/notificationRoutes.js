// backend/routes/notificationRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// GET /api/notifications - Get all notifications for authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const { data, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, notifications: data || [] });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Error al consultar notificaciones.' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('crm_notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    res.json({ success: true, notification: data });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar notificación.' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    const { error } = await supabase
      .from('crm_notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar notificaciones.' });
  }
});

// DELETE /api/notifications/:id - Delete/clear a notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const { error } = await supabase
      .from('crm_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Notificación eliminada.' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar notificación.' });
  }
});

export default router;
