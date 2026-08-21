import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CRM_BACKEND_URL = process.env.CRM_BACKEND_URL || 'http://localhost:5000';

// Multi-tenant maps: key = sanitized userId
const waClients = new Map();
const clientStates = new Map();

// Helper to sanitize userId for file paths & keys
export const sanitizeUserId = (rawUserId) => {
  if (!rawUserId || typeof rawUserId !== 'string') return 'default';
  const clean = rawUserId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return clean || 'default';
};

// Health check for a specific user client
export const isClientHealthy = async (rawUserId) => {
  const userId = sanitizeUserId(rawUserId);
  const waClient = waClients.get(userId);
  if (!waClient) return false;
  try {
    await waClient.pupPage.evaluate(() => true);
    return true;
  } catch {
    console.warn(`[WA-SERVICE] Health check failed for user [${userId}] — resetting client.`);
    clientStates.set(userId, { status: 'DISCONNECTED', qrCode: null });
    waClients.delete(userId);
    return false;
  }
};

export const getClientStatus = async (rawUserId) => {
  const userId = sanitizeUserId(rawUserId);
  const state = clientStates.get(userId) || { status: 'DISCONNECTED', qrCode: null };

  if (state.status === 'CONNECTED' && !(await isClientHealthy(userId))) {
    clientStates.set(userId, { status: 'DISCONNECTED', qrCode: null });
    return { status: 'DISCONNECTED', qrCode: null };
  }
  return state;
};

export const getWaClient = (rawUserId) => {
  const userId = sanitizeUserId(rawUserId);
  return waClients.get(userId) || null;
};

export const initializeWhatsApp = async (rawUserId) => {
  const userId = sanitizeUserId(rawUserId);

  if (waClients.has(userId)) {
    const existingStatus = clientStates.get(userId)?.status;
    if (existingStatus === 'CONNECTED' || existingStatus === 'INITIALIZING' || existingStatus === 'QR') {
      console.log(`[WA-SERVICE] Client for user [${userId}] is already active (${existingStatus}).`);
      return;
    }
  }

  clientStates.set(userId, { status: 'INITIALIZING', qrCode: null });
  console.log(`[WA-SERVICE] Initializing WhatsApp client for user [${userId}]...`);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `GARZA_${userId.toUpperCase()}` }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  // Event: QR Code
  client.on('qr', async (qr) => {
    console.log(`[WA-SERVICE] QR Code received for user [${userId}].`);
    try {
      const qrCodeData = await qrcode.toDataURL(qr);
      clientStates.set(userId, { status: 'QR', qrCode: qrCodeData });
    } catch (err) {
      console.error(`[WA-SERVICE] Failed to generate QR for user [${userId}]:`, err.message);
      clientStates.set(userId, { status: 'QR', qrCode: null });
    }
  });

  // Event: Ready
  client.on('ready', () => {
    console.log(`[WA-SERVICE] WhatsApp client CONNECTED for user [${userId}]!`);
    clientStates.set(userId, { status: 'CONNECTED', qrCode: null });
    if (readyTimer) clearTimeout(readyTimer);
  });

  // Event: Authenticated
  client.on('authenticated', () => {
    console.log(`[WA-SERVICE] Session authenticated for user [${userId}].`);
    clientStates.set(userId, { status: 'INITIALIZING', qrCode: null });
  });

  // Event: Auth Failure
  client.on('auth_failure', (msg) => {
    console.error(`[WA-SERVICE] Auth failure for user [${userId}]:`, msg);
    clientStates.set(userId, { status: 'DISCONNECTED', qrCode: null });
    waClients.delete(userId);
  });

  // Event: Disconnected
  client.on('disconnected', (reason) => {
    console.log(`[WA-SERVICE] Client disconnected for user [${userId}]:`, reason);
    clientStates.set(userId, { status: 'DISCONNECTED', qrCode: null });
    waClients.delete(userId);
  });

  // Event: Incoming Message
  client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return;

    try {
      console.log(`[WA-SERVICE] Message received for user [${userId}] from ${msg.from}`);
      await axios.post(`${CRM_BACKEND_URL}/api/webhooks/whatsapp`, {
        event: 'message',
        userId: userId,
        payload: {
          id: msg.id.id,
          from: msg.from,
          senderName: msg._data?.notifyName || msg.from,
          body: msg.body,
          type: msg.type,
          fromMe: msg.fromMe,
          timestamp: msg.timestamp,
          hasMedia: msg.hasMedia
        }
      });
    } catch (err) {
      console.error(`[WA-SERVICE] Webhook forward error for user [${userId}]:`, err.message);
    }
  });

  // Safety timeout: 2 minutes max to reach ready state
  let readyTimer = setTimeout(async () => {
    const currentState = clientStates.get(userId)?.status;
    if (currentState !== 'CONNECTED') {
      console.warn(`[WA-SERVICE] Ready timeout for user [${userId}]. Resetting client...`);
      clientStates.set(userId, { status: 'DISCONNECTED', qrCode: null });
      waClients.delete(userId);
      try { await client.destroy(); } catch (_) {}
    }
  }, 120_000);

  waClients.set(userId, client);
  await client.initialize();
};

export const logoutClientSession = async (rawUserId) => {
  const userId = sanitizeUserId(rawUserId);
  const client = waClients.get(userId);
  if (!client) return { success: false, message: 'No active session for user.' };
  try {
    await client.logout();
    clientStates.set(userId, { status: 'DISCONNECTED', qrCode: null });
    waClients.delete(userId);
    return { success: true, message: `Session destroyed for user [${userId}].` };
  } catch (err) {
    clientStates.set(userId, { status: 'DISCONNECTED', qrCode: null });
    waClients.delete(userId);
    return { success: true, message: `Session cleared after error: ${err.message}` };
  }
};
