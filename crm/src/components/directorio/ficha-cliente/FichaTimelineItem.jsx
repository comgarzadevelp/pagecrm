import React from 'react';
import FotoEvidencia from './FotoEvidencia';

function defaultFormatDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Función de utilidad para compilar notas en JSON y visitas en una lista unificada de timeline
 */
export function compileTimelineItems(notesInput, visitas = []) {
  const list = [];
  let currentNotes = { timeline: [] };
  if (notesInput) {
    if (typeof notesInput === 'string') {
      try { currentNotes = JSON.parse(notesInput); } catch {}
    } else if (typeof notesInput === 'object') {
      currentNotes = notesInput;
    }
  }

  (currentNotes.timeline || []).forEach(item => {
    const isChange = item.type === 'change' || item.type === 'status_change' || item.type === 'archive';
    const isEvidence = item.type === 'evidence' || !!(item.photoUrl || item.photo_url);
    const isNote = item.type === 'nota' || (!item.type && !isChange && !isEvidence);

    list.push({
      ...item,
      isNote,
      isChange,
      isVisita: false,
      isEvidence,
      ts: new Date(item.date || item.created_at).getTime() || 0
    });
  });

  visitas.forEach(v => {
    const isEvidence = !!(v.photo_url || v.photoUrl || v.photo || v.foto);
    list.push({
      id: v.id,
      type: 'visita',
      text: v.resultado ? `Resultado: ${v.resultado}` : (v.notas || 'Visita registrada'),
      sub: v.resultado ? v.notas : null,
      date: v.created_at || v.timestamp_servidor || v.fecha,
      author: v.created_by_name || v.usuario_nombre || v.vendedor || 'Usuario',
      photo_url: v.photo_url || v.photoUrl || v.photo || v.foto || null,
      photoUrl: v.photoUrl || v.photo_url || v.photo || v.foto || null,
      device_info: v.dispositivo || v.device_info || v.deviceInfo || null,
      isNote: false,
      isChange: false,
      isVisita: !isEvidence,
      isEvidence: isEvidence,
      gps_lat: v.gps_lat || v.lat || null,
      gps_lng: v.gps_lng || v.lng || null,
      ts: new Date(v.created_at || v.timestamp_servidor || v.fecha).getTime() || 0
    });
  });

  return list.sort((a, b) => b.ts - a.ts);
}

export default function FichaTimelineItem({ tl, formatDate = defaultFormatDate, onPhotoClick }) {
  if (!tl) return null;

  const photoUrl = tl.photoUrl || tl.photo_url;
  const isEvidenceItem = tl.isEvidence || !!photoUrl;

  // Si el evento es una evidencia fotográfica o incluye foto de FieldFlow, renderiza FotoEvidencia
  if (isEvidenceItem) {
    return (
      <FotoEvidencia
        evidence={tl}
        formatDate={formatDate}
        onPhotoClick={onPhotoClick}
      />
    );
  }

  let iconClass = 'nota';
  let faIcon = 'fa-sticky-note';

  if (tl.isVisita) {
    iconClass = 'visita';
    faIcon = tl.type === 'llamada' ? 'fa-phone' : 'fa-map-marker-alt';
  } else if (tl.isChange) {
    iconClass = tl.type === 'archive' ? 'archive' : 'change';
    faIcon = tl.type === 'archive' ? 'fa-archive' : 'fa-history';
  }

  return (
    <div className="fc-timeline-item">
      <div className={`fc-tl-icon ${iconClass}`}>
        <i className={`fas ${faIcon}`} />
      </div>
      <div className="fc-tl-content">
        <div className="fc-tl-meta">
          <span className="fc-tl-type">
            {tl.isChange ? (tl.type === 'archive' ? 'Archivado' : 'Cambio de Datos') : (tl.isVisita ? 'Actividad' : 'Nota Comercial')}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>por {tl.author || 'Usuario'}</span>
          <span className="fc-tl-date">{formatDate(tl.date)}</span>
        </div>

        {tl.text && <div className="fc-tl-text" style={{ whiteSpace: 'pre-wrap' }}>{tl.text}</div>}
        {tl.sub && <div className="fc-tl-sub">{tl.sub}</div>}

        {/* Mini-mapa interactivo para visitas presenciales/llamadas con coordenadas GPS */}
        {tl.gps_lat && tl.gps_lng && (
          <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '360px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <iframe
              width="100%"
              height="140"
              frameBorder="0"
              style={{ border: 0, display: 'block' }}
              src={`https://maps.google.com/maps?q=${tl.gps_lat},${tl.gps_lng}&z=16&output=embed`}
              allowFullScreen
            ></iframe>
            <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                📍 Ubicación en Campo Verificada
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${tl.gps_lat},${tl.gps_lng}`}
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
