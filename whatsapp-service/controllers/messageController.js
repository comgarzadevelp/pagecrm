import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import { getWaClient, getClientStatus, initializeWhatsApp } from '../services/client.js';

export const getStatus = async (req, res) => {
  res.json({ success: true, data: await getClientStatus() });
};

export const startClient = async (req, res) => {
  try {
    initializeWhatsApp(); // intentionally non-blocking
    res.json({ success: true, message: 'WhatsApp client initialization started.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start WhatsApp client.', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  const { to, body } = req.body;

  if (!to || !body) {
    return res.status(400).json({ success: false, message: 'Missing "to" or "body" in request.' });
  }

  const client = getWaClient();
  if (!client) {
    return res.status(503).json({ success: false, message: 'WhatsApp client is not connected.' });
  }

  try {
    let chatId = to;
    if (!chatId.includes('@')) {
      chatId = `${chatId}@c.us`;
    }

    // Send message using the library's built-in handling
    const result = await client.sendMessage(chatId, body);
    return res.json({ success: true, messageId: result.id.id });
  } catch (error) {
    console.error('[WA-SERVICE] Error in sendMessage:', error);
    const isLidError = error.message && error.message.includes('No LID for user');
    res.status(500).json({
      success: false,
      message: isLidError
        ? 'No se encontró ese número. Formato México: 5218XXXXXXXXXX'
        : `Error al enviar: ${error.message}`,
      error: error.message
    });
  }
};

export const sendMedia = async (req, res) => {
  const { to, url, filename, caption } = req.body;

  if (!to || !url || !filename) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const client = getWaClient();
  if (!client) {
    return res.status(503).json({ success: false, message: 'WhatsApp client is not connected.' });
  }

  try {
    const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
    const result = await client.sendMessage(chatId, media, { caption: caption || '' });
    res.json({ success: true, messageId: result.id.id, message: 'Media sent successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send media.', error: error.message });
  }
};

export const getChats = async (req, res) => {
  const client = getWaClient();
  if (!client) return res.status(503).json({ success: false, message: 'Not connected.' });

  try {
    const chats = await client.getChats();
    const data = chats.slice(0, 50).map(c => ({
      id: c.id._serialized,
      name: c.name,
      isGroup: c.isGroup,
      unreadCount: c.unreadCount,
      timestamp: c.timestamp,
      lastMessage: c.lastMessage ? {
        body: c.lastMessage.body,
        fromMe: c.lastMessage.fromMe,
        timestamp: c.lastMessage.timestamp,
        type: c.lastMessage.type
      } : null
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getChatMessages = async (req, res) => {
  const client = getWaClient();
  if (!client) return res.status(503).json({ success: false, message: 'Not connected.' });

  const { chatId } = req.params;
  const limit = parseInt(req.query.limit) || 30;

  try {
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit });
    const data = messages.map(m => ({
      id: m.id.id,
      body: m.body,
      fromMe: m.fromMe,
      timestamp: m.timestamp,
      type: m.type,
      hasMedia: m.hasMedia
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
