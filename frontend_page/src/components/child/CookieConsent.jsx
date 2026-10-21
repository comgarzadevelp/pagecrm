import { useState } from 'react';

const STORAGE_KEY = 'cookieConsent';

const applyConsent = (granted) => {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
  }
};

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const CookieConsent = () => {
  const [decision, setDecision] = useState(() => {
    const stored = readStored();
    if (stored === 'granted') applyConsent(true);
    return stored;
  });

  if (decision) return null;

  const choose = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage no disponible */
    }
    applyConsent(value === 'granted');
    setDecision(value);
  };

  const btn = { padding: '0.5rem 1.1rem', borderRadius: 6, border: '1px solid #fff', cursor: 'pointer', fontWeight: 600 };

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 9999, background: '#05393a', color: '#fff', padding: '1rem 1.25rem', borderRadius: 10, display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 30px rgba(0,0,0,.3)' }}
    >
      <p style={{ margin: 0, flex: '1 1 280px', fontSize: '0.9rem' }}>
        Usamos cookies analíticas para mejorar el sitio. Consulta nuestro{' '}
        <a href="/politica-de-privacidad.html" style={{ color: '#fff', textDecoration: 'underline' }}>Aviso de Privacidad</a>.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={() => choose('denied')} style={{ ...btn, background: 'transparent', color: '#fff' }}>Rechazar</button>
        <button type="button" onClick={() => choose('granted')} style={{ ...btn, background: '#fff', color: '#05393a' }}>Aceptar</button>
      </div>
    </div>
  );
};

export default CookieConsent;
