import express from 'express';
import { handleChatMessage } from '../controllers/chatController.js';

const router = express.Router();

// Ruta para enviar y recibir mensajes del chatbot con IA de Gemini
router.post('/', handleChatMessage);

export default router;
