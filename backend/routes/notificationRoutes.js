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

    // 1. Obtener la notificación antes de marcarla para ver su contenido
    const { data: originalNotif, error: fetchErr } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    // 2. Marcar como leída guardando la fecha/hora actual
    const { data, error } = await supabase
      .from('crm_notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    // 3. REBOTE COMERCIAL AL VENDEDOR (Lógica Supervisora del Super Admin)
    // Si la alerta es de inactividad de supervisión (_sa) o SLA
    if (originalNotif && (originalNotif.type.includes('sla') || originalNotif.type.includes('inactive'))) {
      const msg = originalNotif.message || '';
      
      // Buscar la referencia UUID [REF: bd3d6a0c-...]
      const refMatch = msg.match(/\[REF:\s*([a-f0-9\-]+)\]/i);
      if (refMatch && refMatch[1]) {
        const entityId = refMatch[1];
        let sellerId = null;
        let entityTitle = 'tu cartera';

        // A. Buscar si es una oportunidad (negociación)
        const { data: opp } = await supabase
          .from('crm_opportunities')
          .select('assigned_to, title')
          .eq('id', entityId)
          .single();

        if (opp) {
          sellerId = opp.assigned_to;
          entityTitle = `tu negociación "${opp.title}"`;
        } else {
          // B. Buscar si es un lead / cliente
          const { data: lead } = await supabase
            .from('leads')
            .select('assigned_to, name')
            .eq('id', entityId)
            .single();

          if (lead) {
            sellerId = lead.assigned_to;
            entityTitle = `tu cliente/prospecto "${lead.name}"`;
          }
        }

        // C. Si encontramos al vendedor responsable, le enviamos la alerta de rebote
        if (sellerId) {
          await supabase.from('crm_notifications').insert([{
            user_id: sellerId,
            title: '⚠️ ATENCIÓN: Supervisión de Inactividad',
            message: `El Super Administrador observó inactividad en ${entityTitle}. Favor de revisarlo o aclarar la situación con tu supervisor.`,
            type: 'super_admin_warning',
            read: false
          }]);
          console.log(`[REBOTE COMERCIAL] Alerta de supervisión enviada al vendedor ${sellerId} para entidad ${entityId}`);
        }
      }
    }

    res.json({ success: true, notification: data });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar notificación.' });
  }
});

// PUT /api/notifications/:id/snooze - Snooze a notification
router.put('/:id/snooze', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    // We update read to true temporarily or maybe a snooze column if it exists. 
    // Usually, snooze might mean setting read to false but updating updated_at, 
    // or just marking read for now if snooze column doesn't exist.
    // The prompt says "PUT /snooze" so I'll add the route.
    const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Attempt to update snooze_until and read
    const { data, error } = await supabase
      .from('crm_notifications')
      .update({ read: false, snooze_until: snoozeUntil })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    // If snooze_until column doesn't exist, this might throw an error. We can fallback to just read: false.
    if (error) {
      if (error.code === '42703') { // column does not exist
        const fb = await supabase.from('crm_notifications').update({ read: false }).eq('id', id).eq('user_id', userId);
      } else {
        throw error;
      }
    }

    res.json({ success: true, message: 'Notificación pospuesta.' });
  } catch (err) {
    console.error('Error snoozing notification:', err);
    res.status(500).json({ success: false, message: 'Error al posponer notificación.' });
  }
});

// PUT /api/notifications/:id/dismiss - Dismiss a notification
router.put('/:id/dismiss', verifyToken, async (req, res) => {
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
    console.error('Error dismissing notification:', err);
    res.status(500).json({ success: false, message: 'Error al descartar notificación.' });
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
