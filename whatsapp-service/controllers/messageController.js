import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import { getWaClient, getClientStatus, initializeWhatsApp, logoutClientSession } from '../services/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to extract user identity from request
const getUserId = (req) => {
  return req.headers['x-user-id'] || req.query.userId || req.body?.userId || 'default';
};

export const getStatus = async (req, res) => {
  const userId = getUserId(req);
  res.json({ success: true, data: await getClientStatus(userId) });
};

export const startClient = async (req, res) => {
  const userId = getUserId(req);
  try {
    initializeWhatsApp(userId); // intentionally non-blocking
    res.json({ success: true, message: `WhatsApp client initialization started for user [${userId}].` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start WhatsApp client.', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  const userId = getUserId(req);
  const { to, body } = req.body;

  if (!to || !body) {
    return res.status(400).json({ success: false, message: 'Missing "to" or "body" in request.' });
  }

  const client = getWaClient(userId);
  if (!client) {
    return res.status(503).json({ success: false, message: 'WhatsApp client is not connected for your user session.' });
  }

  try {
    let chatId = to;
    if (!chatId.includes('@')) {
      chatId = `${chatId}@c.us`;
    }

    const result = await client.sendMessage(chatId, body);
    const messageId = result && result.id ? result.id.id : `msg_${Date.now()}`;
    return res.json({ success: true, messageId });
  } catch (error) {
    console.error(`[WA-SERVICE] Error in sendMessage for user [${userId}]:`, error);
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
  const userId = getUserId(req);
  const { to, url, mimetype, data: base64Data, filename, caption } = req.body;

  if (!to || (!url && (!mimetype || !base64Data))) {
    return res.status(400).json({ success: false, message: 'Missing required fields (url or mimetype+data).' });
  }

  const client = getWaClient(userId);
  if (!client) {
    return res.status(503).json({ success: false, message: 'WhatsApp client is not connected for your user session.' });
  }

  try {
    let media;
    if (url) {
      media = await MessageMedia.fromUrl(url, { unsafeMime: true });
    } else {
      media = new MessageMedia(mimetype, base64Data, filename || 'file');
    }
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
    const result = await client.sendMessage(chatId, media, { caption: caption || '' });
    const messageId = result && result.id ? result.id.id : `msg_${Date.now()}`;
    res.json({ success: true, messageId, message: 'Media sent successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send media.', error: error.message });
  }
};

export const getChats = async (req, res) => {
  const userId = getUserId(req);
  const client = getWaClient(userId);
  if (!client) return res.status(503).json({ success: false, message: 'Not connected.' });

  try {
    let chats = [];
    try {
      chats = await client.getChats();
    } catch (evalErr) {
      console.warn(`[WA-SERVICE] Standard getChats failed for [${userId}], falling back to in-memory Store:`, evalErr.message);
      chats = await client.pupPage.evaluate(() => {
        try {
          const chatCol = (window.Store && window.Store.Chat) || (window.require && window.require('WAWebCollections')?.Chat);
          if (!chatCol) return [];
          const models = chatCol.models || (chatCol.getModelsArray ? chatCol.getModelsArray() : []);
          return models.slice(0, 50).map(c => {
            const rawId = c.id?._serialized || c.id?.$1 || (typeof c.id === 'string' ? c.id : String(c.id || ''));
            const lastMsg = c.lastReceivedKey || (c.msgs && c.msgs.last ? c.msgs.last() : null);
            return {
              id: { _serialized: rawId },
              name: c.name || c.formattedTitle || (c.contact && c.contact.name) || rawId.split('@')[0],
              isGroup: Boolean(c.isGroup),
              unreadCount: c.unreadCount || 0,
              timestamp: c.t || c.timestamp || Math.floor(Date.now() / 1000),
              lastMessage: lastMsg ? {
                body: lastMsg.body || '',
                fromMe: Boolean(lastMsg.fromMe || (lastMsg.id && lastMsg.id.fromMe)),
                timestamp: lastMsg.t || lastMsg.timestamp || 0,
                type: lastMsg.type || 'chat',
                ack: lastMsg.ack || 0,
              } : null,
            };
          });
        } catch {
          return [];
        }
      });
    }

    const data = (chats || []).slice(0, 50).map((c) => {
      const rawId = c.id?._serialized || c.id?.$1 || String(c.id || '');
      return {
        id: rawId,
        name: c.name || rawId.split('@')[0],
        isGroup: Boolean(c.isGroup),
        unreadCount: c.unreadCount || 0,
        timestamp: c.timestamp || Math.floor(Date.now() / 1000),
        avatarUrl: c.avatarUrl || null,
        lastMessage: c.lastMessage
          ? {
              body: c.lastMessage.body,
              fromMe: c.lastMessage.fromMe,
              timestamp: c.lastMessage.timestamp,
              type: c.lastMessage.type,
              ack: c.lastMessage.ack,
            }
          : null,
      };
    });

    let user = { name: 'Yo', avatarUrl: null };
    if (client.info) {
      user.name = client.info.pushname || 'Yo';
      try {
        if (client.info.wid && client.info.wid._serialized) {
          user.avatarUrl = await client.getProfilePicUrl(client.info.wid._serialized);
        }
      } catch (e) {
        // ignore
      }
    }

    res.json({ success: true, data, user });
  } catch (error) {
    console.error(`[WA-SERVICE] Error in getChats for user [${userId}]:`, error);
    try {
      const logPath = path.join(__dirname, '..', 'error.log');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - getChats [${userId}] error:\n${error && error.stack ? error.stack : JSON.stringify(error)}\n\n`);
    } catch (e) {
      console.error('Failed to write to error.log:', e);
    }
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
};

export const getChatMessages = async (req, res) => {
  const userId = getUserId(req);
  const client = getWaClient(userId);
  if (!client) return res.status(503).json({ success: false, message: 'Not connected.' });

  const { chatId } = req.params;
  const limit = parseInt(req.query.limit) || 30;

  try {
    let data = [];
    try {
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      data = messages.map(m => ({
        id: m.id?._serialized || m.id?.$1 || m.id?.id || String(m.id || ''),
        body: m.body,
        caption: m.caption || (m.hasMedia && m.body ? m.body : null),
        fromMe: m.fromMe,
        timestamp: m.timestamp,
        type: m.type,
        hasMedia: m.hasMedia,
        ack: m.ack
      }));
    } catch (chatErr) {
      console.warn(`[WA-SERVICE] Standard fetchMessages failed for ${chatId}, using chat.msgs fallback:`, chatErr.message);
      data = await client.pupPage.evaluate(async (targetChatId, lim) => {
        try {
          const collections = window.require ? window.require('WAWebCollections') : null;
          if (!collections || !collections.Chat) return [];

          const widFactory = window.require('WAWebWidFactory');
          let chatWid = widFactory ? widFactory.createWid(targetChatId) : null;

          let chat = chatWid ? collections.Chat.get(chatWid) : null;
          if (!chat) {
            const allChats = collections.Chat.getModelsArray ? collections.Chat.getModelsArray() : (collections.Chat.models || []);
            chat = allChats.find(c => {
              const sid = c.id?._serialized || c.id?.$1 || (typeof c.id === 'string' ? c.id : '');
              return sid === targetChatId;
            });
          }

          if (!chat) return [];

          // Trigger message loading from IndexedDB if chat.msgs is empty
          if (chat.msgs && (!chat.msgs.length || chat.msgs.length < 5)) {
            try {
              const loadAction = window.require('WAWebChatLoadMessages');
              if (loadAction && loadAction.loadEarlierMsgs) {
                await loadAction.loadEarlierMsgs({ chat });
              }
            } catch (_) {}
          }

          const rawMsgs = chat.msgs
            ? (chat.msgs.getModelsArray ? chat.msgs.getModelsArray() : (chat.msgs.models || chat.msgs._models || []))
            : [];

          return rawMsgs.slice(-lim).map(m => {
            const rawId = m.id?._serialized || m.id?.$1 || (m.id?.id && m.id.id._serialized) || String(m.id || '');
            return {
              id: rawId,
              body: m.body || m.caption || '',
              caption: m.caption || null,
              fromMe: Boolean(m.fromMe || (m.id && m.id.fromMe)),
              timestamp: m.t || m.timestamp || 0,
              type: m.type || 'chat',
              hasMedia: Boolean(m.hasMedia || m.mimetype || m.mediaKey),
              ack: m.ack || 0
            };
          });
        } catch (innerErr) {
          return [];
        }
      }, chatId, limit);
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDebugErrors = async (req, res) => {
  const userId = getUserId(req);
  const client = getWaClient(userId);
  if (!client) return res.status(503).json({ success: false, message: 'Not connected.' });
  try {
    const errors = await client.pupPage.evaluate(() => window.WWebJS.errors || []);
    res.json({ success: true, errors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMessageMedia = async (req, res) => {
  const userId = getUserId(req);
  const { messageId } = req.params;
  const client = getWaClient(userId);
  if (!client) return res.status(503).json({ success: false, message: 'Not connected.' });

  try {
    const msg = await client.getMessageById(messageId);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }
    if (!msg.hasMedia) {
      return res.status(400).json({ success: false, message: 'Message does not contain media.' });
    }
    const media = await msg.downloadMedia();
    if (!media) {
      return res.status(404).json({ success: false, message: 'Failed to download media.' });
    }
    res.json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const blockContact = async (req, res) => {
  const userId = getUserId(req);
  const { chatId } = req.params;
  if (!chatId) return res.status(400).json({ success: false, message: 'Missing chatId.' });
  try {
    const client = getWaClient(userId);
    if (!client) return res.status(503).json({ success: false, message: 'WhatsApp client not ready.' });
    const contact = await client.getContactById(chatId);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });
    await contact.block();
    res.json({ success: true, message: `Contact ${chatId} blocked.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markChatAsSeen = async (req, res) => {
  const userId = getUserId(req);
  const { chatId } = req.params;
  if (!chatId) return res.status(400).json({ success: false, message: 'Missing chatId.' });
  try {
    const client = getWaClient(userId);
    if (!client) return res.status(503).json({ success: false, message: 'WhatsApp client not ready.' });
    const chat = await client.getChatById(chatId);
    if (chat) {
      await chat.sendSeen();
    }
    res.json({ success: true, message: `Chat ${chatId} marked as seen.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const logoutClient = async (req, res) => {
  const userId = getUserId(req);
  const result = await logoutClientSession(userId);
  res.json(result);
};

export const deleteMessage = async (req, res) => {
  const userId = getUserId(req);
  const { messageId } = req.params;
  const { everyone } = req.body; // true = delete for everyone, false = delete only locally
  if (!messageId) return res.status(400).json({ success: false, message: 'Missing messageId.' });
  try {
    const client = getWaClient(userId);
    if (!client) return res.status(503).json({ success: false, message: 'WhatsApp client not ready.' });
    // Fetch the message object via the internal store
    const msg = await client.getMessageById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: 'Mensaje no encontrado.' });
    await msg.delete(everyone === true || everyone === 'true');
    res.json({ success: true, message: 'Mensaje eliminado.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const checkNumber = async (req, res) => {
  const userId = getUserId(req);
  const { number } = req.params;

  if (!number) {
    return res.status(400).json({ success: false, message: 'Missing number parameter.' });
  }

  const client = getWaClient(userId);
  if (!client) {
    return res.status(503).json({ success: false, message: 'WhatsApp client is not connected for your user session.' });
  }

  try {
    let chatId = number.replace(/\D/g, '');
    if (!chatId.includes('@')) {
      chatId = `${chatId}@c.us`;
    }
    const isRegistered = await client.isRegisteredUser(chatId);
    return res.json({ success: true, isRegistered, chatId });
  } catch (error) {
    console.error(`[WA-SERVICE] Error in checkNumber for user [${userId}]:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
