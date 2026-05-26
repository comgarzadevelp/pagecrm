// backend/routes/authRoutes.js
import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/login  –  Login y obtención de JWT
router.post('/login', login);

export default router;
