// backend/routes/authRoutes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import { login, loginSuperAdmin, debugUserInfo } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// POST /api/auth/login  –  Login y obtención de JWT
router.post('/login', login);

// POST /api/auth/login-superadmin  –  Login exclusivo de Super Admin
router.post('/login-superadmin', loginSuperAdmin);

// PUT /api/auth/heartbeat – Actualiza last_seen_at del usuario activo e inserta evento de presencia
router.put('/heartbeat', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false });

    const now = new Date().toISOString();
    const eventType = req.body?.event_type || 'heartbeat';

    // 1. Actualizar last_seen_at en crm_users
    const { error: updateErr } = await supabase
      .from('crm_users')
      .update({ last_seen_at: now })
      .eq('id', userId);

    if (updateErr) throw updateErr;

    // 2. Insertar evento en user_session_events (fire-and-forget)
    supabase
      .from('user_session_events')
      .insert({
        user_id:    userId,
        event_type: eventType,
        client_ip:  req.ip || null,
        user_agent: req.headers['user-agent'] || null,
        metadata:   { tab_visible: req.body?.tab_visible ?? true }
      })
      .then()
      .catch(e => console.warn('[Heartbeat] Event log insert warning:', e.message));

    res.json({ success: true, timestamp: now });
  } catch (err) {
    console.warn('[Heartbeat] Warning:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /api/auth/logout – Registra el evento de cierre de sesión
router.post('/logout', async (req, res) => {
  try {
    let userId = null;

    // Intentar extraer token de Authorization Header o Body (para navigator.sendBeacon)
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    if (!token && req.body) {
      if (typeof req.body === 'string') {
        try { token = JSON.parse(req.body).token; } catch {}
      } else if (req.body.token) {
        token = req.body.token;
      }
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        userId = decoded.userId;
      } catch (jwtErr) {
        // Token expirado o inválido
      }
    }

    if (userId) {
      const now = new Date().toISOString();

      await Promise.all([
        supabase
          .from('crm_users')
          .update({ last_logout_at: now, last_seen_at: now })
          .eq('id', userId),

        supabase
          .from('user_session_events')
          .insert({
            user_id:    userId,
            event_type: 'logout',
            client_ip:  req.ip || null,
            user_agent: req.headers['user-agent'] || null
          })
      ]).catch(err => console.warn('[Logout] Log update error:', err.message));
    }

    res.json({ success: true, message: 'Sesión terminada.' });
  } catch (err) {
    console.error('[Logout] Error:', err.message);
    res.status(500).json({ success: false });
  }
});

// GET /api/auth/debug-user-info?email=xxx  –  Diagnóstico (temporal)
router.get('/debug-user-info', debugUserInfo);

export default router;


