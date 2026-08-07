import React from 'react';

/**
 * Función de utilidad pura para resolver la URL de la imagen en cualquier módulo
 */
export function resolvePhotoUrl(rawUrl, apiBase) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }
  const base = apiBase || import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'https://comgarza.com' : '');
  return `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

function defaultFormatDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(d);
  }
}

export default function FotoEvidencia({
  evidence,
  photoUrl: propPhotoUrl,
  author: propAuthor,
  date: propDate,
  text: propText,
  deviceInfo: propDeviceInfo,
  gpsLat: propGpsLat,
  gpsLng: propGpsLng,
  formatDate: customFormatDate,
  onPhotoClick,
  API_BASE,
  style = {},
  className = ''
}) {
  // Soporta recibir un objeto único `evidence` o props individuales
  const item = evidence || {};

  const rawPhotoUrl = propPhotoUrl || item.photoUrl || item.photo_url || item.photo || item.foto || item.url || item.image || item.image_url || item.evidencia;
  const photoUrl = resolvePhotoUrl(rawPhotoUrl, API_BASE);

  const author = propAuthor || item.author || item.author_name || item.vendedor || item.usuario_nombre || item.user_name || 'Usuario';
  const date = propDate || item.date || item.timestamp_servidor || item.created_at;
  const text = propText || item.text || item.resultado || item.notas || item.description || 'Registro de evidencia fotográfica de visita en sitio.';
  const deviceInfo = propDeviceInfo || item.deviceInfo || item.device_info || item.dispositivo || item.device;
  const gpsLat = propGpsLat || item.gps_lat || item.latitude || (item.gps && item.gps.lat);
  const gpsLng = propGpsLng || item.gps_lng || item.longitude || (item.gps && item.gps.lng);

  const displayDate = customFormatDate ? customFormatDate(date) : defaultFormatDate(date);

  return (
    <div className={`fc-timeline-item foto-evidencia-card ${className}`} style={{ ...style }}>
      <div className="fc-tl-icon visita">
        <i className="fas fa-camera" />
      </div>
      <div className="fc-tl-content">
        <div className="fc-tl-meta">
          <span className="fc-tl-type">EVIDENCIA FOTOGRÁFICA</span>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>por {author}</span>
          <span className="fc-tl-date">{displayDate}</span>
        </div>

        {text && <div className="fc-tl-text" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>}

        {/* Imagen de Evidencia */}
        {photoUrl && (
          <a
            href={photoUrl.startsWith('http') ? photoUrl : `https://comgarza.com${photoUrl.replace(/^https?:\/\/[^\/]+/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (onPhotoClick) {
                e.preventDefault();
                onPhotoClick(photoUrl);
              }
            }}
            style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '10px', cursor: 'pointer' }}
          >
            <img
              src={photoUrl}
              alt="Evidencia fotográfica"
              onError={(e) => {
                // Si la imagen falla en entorno local (404), intenta cargar automáticamente desde producción
                if (photoUrl && !e.target.dataset.retried) {
                  e.target.dataset.retried = 'true';
                  const cleanPath = photoUrl.replace(/^https?:\/\/[^\/]+/, '');
                  e.target.src = `https://comgarza.com${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
                }
              }}
              style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
            />
          </a>
        )}

        {/* Dispositivo de Origen */}
        {deviceInfo && (
          <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', borderLeft: '2px solid #cbd5e1' }}>
            <strong>Dispositivo:</strong> {deviceInfo}
          </p>
        )}

        {/* Mini-mapa interactivo para coordenadas GPS */}
        {gpsLat && gpsLng && (
          <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '360px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <iframe
              width="100%"
              height="140"
              frameBorder="0"
              style={{ border: 0, display: 'block' }}
              src={`https://maps.google.com/maps?q=${gpsLat},${gpsLng}&z=16&output=embed`}
              allowFullScreen
            ></iframe>
            <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                📍 Ubicación en Campo Verificada
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${gpsLat},${gpsLng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: '800', textDecoration: 'none' }}
              >
                Abrir Maps ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
