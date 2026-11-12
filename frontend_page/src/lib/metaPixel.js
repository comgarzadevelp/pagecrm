/**
 * Servicio centralizado de seguimiento para Meta Pixel (Browser) + Meta Conversions API (Server-Side CAPI)
 * y Google Analytics 4 (gtag).
 * Garantiza deduplicación mediante event_id único y persistencia de parámetros fbclid (_fbc) y _fbp.
 */

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '728394719679375';

function getCookie(name) {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function setCookie(name, value, days = 90) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function generateEventId(prefix = 'evt') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Captura fbclid de la URL al aterrizar desde Meta Ads y construye la cookie _fbc
 * en formato oficial fb.1.{timestamp_ms}.{fbclid} por si el script de terceros tarda o es bloqueado.
 */
export function captureMetaClickParams() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get('fbclid');
    if (fbclid) {
      const fbcValue = `fb.1.${Date.now()}.${fbclid}`;
      setCookie('_fbc', fbcValue, 90);
      sessionStorage.setItem('garza_fbc', fbcValue);
    }

    if (!getCookie('_fbp')) {
      const randomId = Math.floor(1000000000 + Math.random() * 9000000000);
      setCookie('_fbp', `fb.1.${Date.now()}.${randomId}`, 90);
    }
  } catch (err) {
    console.warn('[metaPixel] No se pudo capturar parámetros de clic:', err);
  }
}

export function getMetaBrowserIdentifiers() {
  const fbp = getCookie('_fbp') || undefined;
  const fbc = getCookie('_fbc') || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('garza_fbc') : null) || undefined;
  return { fbp, fbc };
}

export function setMetaAdvancedMatching({ email, phone, name }) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  try {
    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
    const formattedPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const nameParts = (name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);

    const advancedMatching = {};
    if (email) advancedMatching.em = email.trim().toLowerCase();
    if (formattedPhone) advancedMatching.ph = formattedPhone;
    if (nameParts[0]) advancedMatching.fn = nameParts[0];
    if (nameParts.length > 1) advancedMatching.ln = nameParts.slice(1).join(' ');
    advancedMatching.country = 'mx';

    window.fbq('init', PIXEL_ID, advancedMatching);
  } catch (err) {
    console.warn('[metaPixel] Error en setMetaAdvancedMatching:', err);
  }
}

/**
 * Registra PageView en cambios de ruta SPA (React Router).
 */
export function trackPageView(pathname) {
  if (typeof window === 'undefined') return;

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'PageView');
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: pathname || window.location.pathname,
      page_location: window.location.href
    });
  }
}

/**
 * Registra eventos de interacción para que GA4 mida con precisión el tiempo de permanencia real
 */
export function trackEngagementSignal(action, label) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'user_engagement_signal', {
      event_category: 'engagement',
      event_action: action,
      event_label: label
    });
  }
}

/**
 * Registra una conversión Lead en el navegador con el mismo eventID enviado al backend
 * para deduplicación exacta con Meta CAPI.
 */
export function trackLeadConversion({
  eventId,
  email,
  phone,
  name,
  company,
  contentName = 'Formulario Contacto B2B',
  leadType = 'contact_form'
}) {
  if (typeof window === 'undefined') return;

  setMetaAdvancedMatching({ email, phone, name });

  if (typeof window.fbq === 'function') {
    window.fbq(
      'track',
      'Lead',
      {
        content_name: contentName,
        content_category: company || 'Suministro Industrial B2B',
        lead_type: leadType,
        currency: 'MXN'
      },
      { eventID: eventId }
    );
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead', {
      event_category: 'engagement',
      event_label: contentName,
      lead_type: leadType
    });
  }
}

/**
 * Registra clics a WhatsApp o teléfono como evento Contact tanto en el navegador como en CAPI.
 */
export function trackContactClick({ channel = 'whatsapp', label = 'CTA WhatsApp', href = '' } = {}) {
  if (typeof window === 'undefined') return;

  const eventId = generateEventId('contact');
  const { fbp, fbc } = getMetaBrowserIdentifiers();
  const eventSourceUrl = window.location.href;

  if (typeof window.fbq === 'function') {
    window.fbq(
      'track',
      'Contact',
      {
        content_name: label,
        content_category: channel,
        destination: href
      },
      { eventID: eventId }
    );
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', channel === 'whatsapp' ? 'click_whatsapp' : 'click_phone', {
      event_category: 'contact',
      event_label: label,
      link_url: href
    });
  }

  try {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const payload = JSON.stringify({
      eventName: 'Contact',
      eventId,
      eventSourceUrl,
      fbp,
      fbc,
      customData: {
        content_name: label,
        content_category: channel
      }
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${apiBase}/api/leads/track`, blob);
    } else {
      fetch(`${apiBase}/api/leads/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => { });
    }
  } catch (_) { }
}
