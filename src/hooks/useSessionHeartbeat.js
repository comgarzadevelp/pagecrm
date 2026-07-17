/**
 * useSessionHeartbeat.js
 * Hook global que envía un ping de presencia al backend cada INTERVAL_MS.
 * Actualiza la columna last_seen_at en crm_users para tracking real de sesiones.
 *
 * Uso: montar una sola vez en el componente raíz de la app (App.jsx o similar)
 *   import { useSessionHeartbeat } from './hooks/useSessionHeartbeat';
 *   useSessionHeartbeat();
 */

import { useEffect, useRef } from 'react';

const INTERVAL_MS = 60_000; // cada 60 segundos
const API_BASE    = import.meta.env.VITE_API_URL || '';

export function useSessionHeartbeat() {
  const timerRef = useRef(null);

  const ping = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // no hay sesión activa

    try {
      await fetch(`${API_BASE}/api/auth/heartbeat`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // silencioso — no interrumpir la experiencia del usuario
    }
  };

  useEffect(() => {
    // Ping inmediato al montar (al iniciar sesión / recargar)
    ping();

    // Ping periódico
    timerRef.current = setInterval(ping, INTERVAL_MS);

    // Ping al recuperar foco de ventana (vuelve de otra pestaña)
    const onFocus = () => ping();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
}
