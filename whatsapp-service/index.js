import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getStatus, startClient, sendMessage, sendMedia, getChats, getChatMessages } from './controllers/messageController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/whatsapp/status', getStatus);
app.post('/api/whatsapp/start', startClient);
app.post('/api/whatsapp/send', sendMessage);
app.post('/api/whatsapp/send-media', sendMedia);
app.get('/api/whatsapp/chats', getChats);
app.get('/api/whatsapp/chats/:chatId/messages', getChatMessages);

app.get('/', (req, res) => {
  res.json({ service: 'Garza WhatsApp Microservice', status: 'running' });
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(` WhatsApp Microservice listening on port ${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================');
});
