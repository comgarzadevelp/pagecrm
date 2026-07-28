// backend/routes/authRoutes.js
import express from 'express';
import { login, loginSuperAdmin, debugUserInfo } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login  –  Login y obtención de JWT
router.post('/login', login);

// POST /api/auth/login-superadmin  –  Login exclusivo de Super Admin
router.post('/login-superadmin', loginSuperAdmin);

// GET /api/auth/debug-user-info?email=xxx  –  Diagnóstico (temporal)
router.get('/debug-user-info', debugUserInfo);

export default router;

