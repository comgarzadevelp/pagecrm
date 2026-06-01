// backend/routes/authRoutes.js
import express from 'express';
import { login, loginSuperAdmin } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login  –  Login y obtención de JWT
router.post('/login', login);

// POST /api/auth/login-superadmin  –  Login exclusivo de Super Admin
router.post('/login-superadmin', loginSuperAdmin);

export default router;

