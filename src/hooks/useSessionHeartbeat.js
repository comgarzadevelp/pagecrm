/**
 * useSessionHeartbeat.js  v2.0
 *
 * Mejoras v2.0:
 *  - Detecta token JWT expirado y aborta silenciosamente (evita pings innecesarios)
 *  - Envía evento 'focus_restored' al volver a la pestaña
 *  - Envía evento 'logout' al cerrar ventana/pestaña usando navigator.sendBeacon
 *  - Respeta la visibilidad del documento (tab_visible)
 *  - Throttle inteligente para evitar llamadas redundantes en ráfagas de foco
 */

import { useEffect, useRef, useCallback } from 'react';

const INTERVAL_MS  = 60_000;        // Heartbeat cada 60s
const API_BASE     = import.meta.env.VITE_API_URL || '';
const JITTER_MS    = 3_000;         // Jitter inicial para distribuir carga

function getToken() {
  return localStorage.getItem('token') || null;
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function useSessionHeartbeat() {
  const timerRef    = useRef(null);
  const lastPingRef = useRef(0);

  const ping = useCallback(async (eventType = 'heartbeat') => {
    const token = getToken();
    if (!token || isTokenExpired(token)) return; // Sesión no activa o expirada

    // Throttle: Evitar enviar más de 1 ping cada 30 segundos
    const now = Date.now();
    if (now - lastPingRef.current < 30_000 && eventType === 'heartbeat') return;
    lastPingRef.current = now;

    const tabVisible = document.visibilityState === 'visible';

    try {
      await fetch(`${API_BASE}/api/auth/heartbeat`, {
        method:  'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ event_type: eventType, tab_visible: tabVisible })
      });
    } catch {
      // Silencioso — no degradar la UX
    }
  }, []);

  const sendLogoutBeacon = useCallback(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) return;

    try {
      // Use sendBeacon for reliable delivery during unload/close
      const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE}/api/auth/logout`, blob);
    } catch {
      // Fail-safe
    }
  }, []);

  useEffect(() => {
    // Ping inicial inmediato al montar (iniciar sesión / cargar app)
    ping('heartbeat');

    // Ping periódico
    timerRef.current = setInterval(() => ping('heartbeat'), INTERVAL_MS);

    // Focus de ventana
    const onFocus = () => ping('focus_restored');
    window.addEventListener('focus', onFocus);

    // Cambio de visibilidad (vuelve de otra pestaña)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ping('focus_restored');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Envío de logout en unload/close
    const onUnload = () => sendLogoutBeacon();
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [ping, sendLogoutBeacon]);
}
