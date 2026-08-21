import React from 'react';
import FotoEvidencia, { resolvePhotoUrl } from './FotoEvidencia';

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

  const rawPhotos = [];
  if (tl.photoUrl) rawPhotos.push(tl.photoUrl);
  if (tl.photo_url) rawPhotos.push(tl.photo_url);
  if (Array.isArray(tl.photos)) rawPhotos.push(...tl.photos);
  if (Array.isArray(tl.evidence_photos)) rawPhotos.push(...tl.evidence_photos);
  if (Array.isArray(tl.attachments)) rawPhotos.push(...tl.attachments);

  const extractFromText = (txt) => {
    if (!txt || typeof txt !== 'string' || !txt.trim().startsWith('{')) return;
    try {
      const p = JSON.parse(txt.trim());
      if (Array.isArray(p.evidence_photos)) rawPhotos.push(...p.evidence_photos);
      if (Array.isArray(p.attachments)) rawPhotos.push(...p.attachments);
      if (Array.isArray(p.photos)) rawPhotos.push(...p.photos);
      if (Array.isArray(p.timeline)) {
        p.timeline.forEach(t => {
          if (t.photoUrl || t.photo_url) rawPhotos.push(t.photoUrl || t.photo_url);
        });
      }
    } catch (e) {}
  };

  extractFromText(tl.notes);
  extractFromText(tl.description);
  extractFromText(tl.text);

  const photos = Array.from(new Set(rawPhotos.filter(Boolean)));

  // Ocultar duplicados históricos de fotos de negociaciones que se guardaron como tipo 'evidence'
  if (tl.type === 'evidence' && (!tl.created_from || tl.created_from !== 'fieldflow')) {
    return null;
  }

  const isEvidenceItem = (tl.type === 'evidence' && tl.created_from === 'fieldflow') || (tl.isEvidence && !tl.isLead && tl.type !== 'opportunity' && tl.created_from === 'fieldflow');

  // Si el evento es una evidencia fotográfica de visita aislada (Fieldflow), renderiza FotoEvidencia
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

  if (tl.type === 'opportunity') {
    iconClass = 'opportunity';
    faIcon = 'fa-handshake';
  } else if (tl.isVisita) {
    iconClass = 'visita';
    faIcon = tl.type === 'llamada' ? 'fa-phone' : 'fa-map-marker-alt';
  } else if (tl.isChange) {
    iconClass = tl.type === 'archive' ? 'archive' : 'change';
    faIcon = tl.type === 'archive' ? 'fa-archive' : 'fa-history';
  }

  return (
    <div className="fc-timeline-item">
      <div 
        className={`fc-tl-icon ${iconClass}`} 
        style={tl.type === 'opportunity' ? { background: 'rgba(147, 51, 234, 0.12)', color: '#9333ea' } : {}}
      >
        <i className={`fas ${faIcon}`} />
      </div>
      <div className="fc-tl-content">
        <div className="fc-tl-meta">
          <span className="fc-tl-type" style={tl.type === 'opportunity' ? { color: '#9333ea', fontWeight: '800' } : {}}>
            {tl.title || (tl.isChange ? (tl.type === 'archive' ? 'Archivado' : 'Cambio de Datos') : (tl.isVisita ? 'Actividad' : 'Nota Comercial'))}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>por {tl.author || 'Usuario'}</span>
          <span className="fc-tl-date">{formatDate(tl.date)}</span>
        </div>

        {tl.text && <div className="fc-tl-text" style={{ whiteSpace: 'pre-wrap' }}>{tl.text}</div>}
        {tl.sub && <div className="fc-tl-sub">{tl.sub}</div>}

        {/* Galería de Fotografías y Anexos Adjuntos (PDFs) */}
        {photos.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {photos.map((pUrl, pIdx) => {
              const fullUrl = resolvePhotoUrl(pUrl);
              const cleanPath = String(pUrl).toLowerCase();
              const isPdf = cleanPath.endsWith('.pdf') || cleanPath.includes('.pdf');

              if (isPdf) {
                return (
                  <a
                    key={pIdx}
                    href={fullUrl && fullUrl.startsWith('http') ? fullUrl : `https://comgarza.com${(fullUrl || '').replace(/^https?:\/\/[^\/]+/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      color: '#991b1b',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textDecoration: 'none'
                    }}
                  >
                    <i className="fas fa-file-pdf" style={{ fontSize: '1.2rem', color: '#dc2626' }} />
                    <span>Documento PDF Adjunto #{pIdx + 1} ↗</span>
                  </a>
                );
              }

              return (
                <a
                  key={pIdx}
                  href={fullUrl && fullUrl.startsWith('http') ? fullUrl : `https://comgarza.com${(fullUrl || '').replace(/^https?:\/\/[^\/]+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (onPhotoClick) {
                      e.preventDefault();
                      onPhotoClick(fullUrl);
                    }
                  }}
                  style={{
                    display: 'block',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    maxWidth: photos.length === 1 ? '100%' : '180px',
                    maxHeight: '200px'
                  }}
                >
                  <img
                    src={fullUrl}
                    alt={`Evidencia adjunta #${pIdx + 1}`}
                    onError={(e) => {
                      if (fullUrl && !e.target.dataset.retried) {
                        e.target.dataset.retried = 'true';
                        const cleanP = fullUrl.replace(/^https?:\/\/[^\/]+/, '');
                        e.target.src = `https://comgarza.com${cleanP.startsWith('/') ? '' : '/'}${cleanP}`;
                      }
                    }}
                    style={{ width: '100%', height: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                  />
                </a>
              );
            })}
          </div>
        )}

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
