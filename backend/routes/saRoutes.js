import express from 'express';
import { getLeadsWebsite, getAnalytics, updateLeadStatus, getSellers, getChatHistory, deleteLead, getQuotesStats } from '../controllers/saController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

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

export default router;
