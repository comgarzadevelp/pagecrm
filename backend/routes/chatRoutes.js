import express from 'express';
import { handleChatMessage, getChatbotConfig, saveChatbotConfig, syncChatbotFromGoogle } from '../controllers/chatController.js';

const router = express.Router();

// Ruta para enviar y recibir mensajes del chatbot con IA de Gemini
router.post('/', handleChatMessage);

// Rutas para la administración dinámica del chatbot
router.get('/config', getChatbotConfig);
router.post('/config', saveChatbotConfig);
router.post('/config/sync', syncChatbotFromGoogle);

export default router;
