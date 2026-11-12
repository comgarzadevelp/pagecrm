import crypto from 'crypto';

const GRAPH_API_VERSION = 'v21.0';

function sha256Hash(value) {
  if (!value || typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Normaliza teléfonos de México a formato E.164 sin '+' (52 + 10 dígitos) antes de aplicar SHA-256,
 * cumpliendo la especificación de Meta Customer Information Parameters.
 */
function normalizeAndHashPhone(phone) {
  if (!phone) return undefined;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;
  const e164Digits = digits.length === 10 ? `52${digits}` : digits;
  return sha256Hash(e164Digits);
}

function splitFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') return { fn: undefined, ln: undefined };
  const parts = fullName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return { fn: undefined, ln: undefined };
  if (parts.length === 1) return { fn: sha256Hash(parts[0]), ln: undefined };
  return {
    fn: sha256Hash(parts[0]),
    ln: sha256Hash(parts.slice(1).join(' '))
  };
}

export function extractClientIp(req) {
  if (!req) return undefined;
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp) return String(cfIp).trim();

  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const firstIp = String(forwarded).split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  return req.socket?.remoteAddress || req.ip || undefined;
}

/**
 * Envía un evento a Meta Conversions API (CAPI) con deduplicación por event_id
 * y parámetros de coincidencia avanzada (EMQ).
 */
export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  actionSource = 'website',
  userData = {},
  customData = {},
  req = null
}) {
  const pixelId = process.env.META_PIXEL_ID || '728394719679375';
  const accessToken = process.env.META_CAPI_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!accessToken) {
    console.warn('[Meta CAPI] META_CAPI_TOKEN no configurado; se omite envío server-side.');
    return { skipped: true };
  }

  try {
    const { fn, ln } = splitFullName(userData.name);
    const clientIp = userData.clientIpAddress || extractClientIp(req);
    const clientUserAgent = userData.clientUserAgent || req?.headers?.['user-agent'];

    const hashedUserData = {
      em: userData.email ? [sha256Hash(userData.email)] : undefined,
      ph: userData.phone ? [normalizeAndHashPhone(userData.phone)] : undefined,
      fn: fn ? [fn] : undefined,
      ln: ln ? [ln] : undefined,
      country: [sha256Hash('mx')],
      client_ip_address: clientIp,
      client_user_agent: clientUserAgent,
      fbp: userData.fbp || undefined,
      fbc: userData.fbc || undefined,
      external_id: userData.externalId ? [sha256Hash(String(userData.externalId))] : undefined
    };

    Object.keys(hashedUserData).forEach((key) => {
      if (hashedUserData[key] === undefined) {
        delete hashedUserData[key];
      }
    });

    const eventPayload = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId || `evt_${Date.now()}`,
      event_source_url: eventSourceUrl || 'https://comgarza.com/',
      action_source: actionSource,
      user_data: hashedUserData,
      custom_data: {
        currency: 'MXN',
        ...customData
      }
    };

    const bodyPayload = {
      data: [eventPayload]
    };

    if (testEventCode && testEventCode.trim() !== '') {
      bodyPayload.test_event_code = testEventCode.trim();
    }

    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Meta CAPI Error]:', JSON.stringify(result));
      return { success: false, error: result };
    }

    console.log(`[Meta CAPI OK] Evento "${eventName}" (ID: ${eventPayload.event_id}) enviado. events_received: ${result.events_received}`);
    return { success: true, result };
  } catch (err) {
    console.error('[Meta CAPI Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

