import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CRM_BACKEND_URL = process.env.CRM_BACKEND_URL || 'http://localhost:5000';
let waClient = null;
let qrCodeData = null;
let clientStatus = 'DISCONNECTED';

// Detect if the Puppeteer browser context is still alive
export const isClientHealthy = async () => {
  if (!waClient) return false;
  try {
    await waClient.pupPage.evaluate(() => true);
    return true;
  } catch {
    console.warn('[WA-SERVICE] Health check failed — resetting detached client.');
    clientStatus = 'DISCONNECTED';
    waClient = null;
    return false;
  }
};

export const getClientStatus = async () => {
  // Auto-detect and recover from detached browser state
  if (clientStatus === 'CONNECTED' && !(await isClientHealthy())) {
    clientStatus = 'DISCONNECTED';
    qrCodeData = null;
  }
  return { status: clientStatus, qrCode: qrCodeData };
};

export const getWaClient = () => waClient;

export const initializeWhatsApp = async () => {
  if (waClient) {
    console.log('[WA-SERVICE] Client already initialized.');
    return;
  }

  clientStatus = 'INITIALIZING';
  console.log('[WA-SERVICE] Starting whatsapp-web.js client...');

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'GARZA_CRM_SESSION' }),
    webVersionCache: {
      type: 'none' // Forzar a no cachear la versión para evitar el bug de "waiting for ready"
    },
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  // QR Code event — convert to a base64 image for the CRM UI
  client.on('qr', async (qr) => {
    console.log('[WA-SERVICE] QR Code received. Ready for scan in CRM.');
    clientStatus = 'QR';
    try {
      qrCodeData = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('[WA-SERVICE] Failed to generate QR image:', err.message);
    }
  });

  client.on('ready', () => {
    console.log('[WA-SERVICE] WhatsApp client authenticated and connected!');
    clientStatus = 'CONNECTED';
    qrCodeData = null;
    if (readyTimer) clearTimeout(readyTimer);
  });

  client.on('authenticated', () => {
    console.log('[WA-SERVICE] Session authenticated. Waiting for ready...');
    clientStatus = 'INITIALIZING';
    qrCodeData = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('[WA-SERVICE] Authentication failed:', msg);
    clientStatus = 'DISCONNECTED';
    qrCodeData = null;
    waClient = null;
  });

  client.on('disconnected', (reason) => {
    console.log('[WA-SERVICE] Client disconnected:', reason);
    clientStatus = 'DISCONNECTED';
    qrCodeData = null;
    waClient = null;
  });

  // Forward incoming messages to the CRM backend webhook
  client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us')) return; // Skip group messages

    try {
      console.log(`[WA-SERVICE] Message received from ${msg.from}`);
      await axios.post(`${CRM_BACKEND_URL}/api/webhooks/whatsapp`, {
        event: 'message',
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
      console.error('[WA-SERVICE] Error forwarding message to webhook:', err.message);
    }
  });

  // Safety timeout: if ready never fires within 2 minutes, reset and allow re-initialization
  let readyTimer = setTimeout(async () => {
    console.warn('[WA-SERVICE] ready event timed out after 2 minutes. Resetting client...');
    clientStatus = 'DISCONNECTED';
    waClient = null;
    try { await client.destroy(); } catch (_) { /* ignore */ }
  }, 120_000);

  await client.initialize();
  waClient = client;
};
