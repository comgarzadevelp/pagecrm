import express from 'express';
// Triggered watch reload: ack checkmark mapping enabled
import cors from 'cors';
import dotenv from 'dotenv';
import { getStatus, startClient, sendMessage, sendMedia, getChats, getChatMessages, getDebugErrors, getMessageMedia, blockContact, markChatAsSeen, logoutClient, deleteMessage, checkNumber } from './controllers/messageController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.get('/api/whatsapp/status', getStatus);
app.post('/api/whatsapp/start', startClient);
app.post('/api/whatsapp/send', sendMessage);
app.post('/api/whatsapp/send-media', sendMedia);
app.get('/api/whatsapp/chats', getChats);
app.get('/api/whatsapp/chats/:chatId/messages', getChatMessages);
app.get('/api/whatsapp/debug-errors', getDebugErrors);
app.get('/api/whatsapp/messages/:messageId/media', getMessageMedia);
app.post('/api/whatsapp/chats/:chatId/block', blockContact);
app.post('/api/whatsapp/chats/:chatId/seen', markChatAsSeen);
app.post('/api/whatsapp/logout', logoutClient);
app.delete('/api/whatsapp/messages/:messageId', deleteMessage);
app.get('/api/whatsapp/check-number/:number', checkNumber);
app.get('/', (req, res) => {
  res.json({ service: 'Garza WhatsApp Microservice', status: 'running' });
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(` WhatsApp Microservice listening on port ${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================');
});
