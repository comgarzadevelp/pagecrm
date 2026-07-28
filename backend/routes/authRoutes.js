// backend/routes/authRoutes.js
import express from 'express';
import { login, loginSuperAdmin, debugUserInfo } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// POST /api/auth/login  –  Login y obtención de JWT
router.post('/login', login);

// POST /api/auth/login-superadmin  –  Login exclusivo de Super Admin
router.post('/login-superadmin', loginSuperAdmin);

// PUT /api/auth/heartbeat – Actualiza last_seen_at del usuario activo
// Llamado cada 60 segundos desde el frontend mientras el usuario está logueado
router.put('/heartbeat', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false });

    const { error } = await supabase
      .from('crm_users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    // No romper la sesión si falla — la columna podría no existir aún
    console.warn('Heartbeat warning:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /api/auth/debug-user-info?email=xxx  –  Diagnóstico (temporal)
router.get('/debug-user-info', debugUserInfo);

export default router;


