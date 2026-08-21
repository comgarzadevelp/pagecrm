import React from 'react';
import FotoEvidencia from '../FotoEvidencia';
import './TimelineFeed.css';

export default function TimelineFeed({
  activeRightTab,
  clientProfile,
  companyContacts,
  currentCustomer,
  unifiedTimeline,
  loadingOpps,
  loadingVisitas,
  loadingAppts
}) {
  if (loadingOpps || loadingVisitas || loadingAppts) {
    return (
      <div className="timeline-loading-container">
        <div className="spinner timeline-loading-spinner" />
        <p className="timeline-loading-text">Consolidando historial comercial...</p>
      </div>
    );
  }

  if (activeRightTab === 'directorio' && clientProfile === 'b2b') {
    return (
      <div className="timeline-directory-container">
        <p className="timeline-directory-desc">
          Todos los contactos registrados para <strong>{currentCustomer.company || currentCustomer.name}</strong>.
        </p>
        
        {companyContacts.length === 0 ? (
          <div className="timeline-directory-empty">
            No hay contactos adicionales registrados en esta cuenta.
          </div>
        ) : (
          companyContacts.map((c, i) => {
            const contactId = c.id || c.contact?.id;
            const isPrimary = currentCustomer.contact_id === contactId;
            const secondaryId = currentCustomer.notes ? (() => {
              try { return JSON.parse(currentCustomer.notes).secondary_contact_id; } catch { return null; }
            })() : null;
            const isSecondary = secondaryId === contactId;

            let cardClass = "timeline-directory-card";
            if (isPrimary) cardClass += " timeline-directory-card-primary";
            else if (isSecondary) cardClass += " timeline-directory-card-secondary";
            else cardClass += " timeline-directory-card-default";

            return (
              <div key={i} className={cardClass}>
                <div className="timeline-directory-card-header">
                  <h4 className="timeline-directory-card-name">{c.name || c.contact?.name}</h4>
                  <div className="timeline-directory-card-badges">
                    {isPrimary && (
                      <span className="timeline-directory-badge timeline-directory-badge-primary">Contacto Titular (A)</span>
                    )}
                    {isSecondary && !isPrimary && (
                      <span className="timeline-directory-badge timeline-directory-badge-secondary">Contacto Secundario (B)</span>
                    )}
                    {!isPrimary && !isSecondary && (
                      <span className="timeline-directory-badge timeline-directory-badge-default">Informativo</span>
                    )}
                  </div>
                </div>
                <div className="timeline-directory-card-row">
                  <i className="fas fa-briefcase timeline-directory-card-icon"></i> {c.position || c.contact?.position || (c.role ? `Rol: ${c.role}` : 'Sin cargo')}
                </div>
                {(c.phone || c.contact?.phone) && (
                  <div className="timeline-directory-card-row-plain">
                    <i className="fas fa-phone timeline-directory-card-icon"></i> {c.phone || c.contact?.phone}
                  </div>
                )}
                {(c.email || c.contact?.email) && (
                  <div className="timeline-directory-card-row-plain">
                    <i className="fas fa-envelope timeline-directory-card-icon"></i> {c.email || c.contact?.email}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  const filteredItems = unifiedTimeline.filter(item => {
    if (activeRightTab === 'notas') return item.isNote;
    if (activeRightTab === 'visitas') return item.isVisita;
    if (activeRightTab === 'bitacora') return item.isNote || item.isVisita;
    if (activeRightTab === 'cambios') return item.isChange;
    return true; // completo
  });

  if (filteredItems.length === 0) {
    return (
      <div className="timeline-empty-container">
        <i className="fas fa-stream timeline-empty-icon" />
        <p className="timeline-empty-text">
          No hay registros en esta categoría.
        </p>
      </div>
    );
  }

  return (
    <div className="timeline-track timeline-track-scroll">
      {filteredItems.map((evt, idx) => {
        // Las evidencias fotográficas reales de visitas de campo de obras provienen de Fieldflow
        const isFieldflowEvidence = (evt.type === 'evidence' || evt.isEvidence) && evt.created_from === 'fieldflow';
        
        if (isFieldflowEvidence) {
          return (
            <FotoEvidencia
              key={evt.id || idx}
              evidence={evt}
              onPhotoClick={(url) => window.open(url, '_blank')}
            />
          );
        }

        // Si fue una foto subida por error de timeline viejo de negociaciones (que no vino de fieldflow), la omitimos de FotoEvidencia
        if (evt.type === 'evidence' && evt.created_from !== 'fieldflow') {
          return null;
        }

        const nodeClass = `timeline-node timeline-node-${evt.isVisita ? 'visit' : (evt.isChange ? 'manual' : 'manual')}`;
        
        let iconName = 'fa-comment-alt';
        let nodeIconClass = "";
        if (evt.isVisita) {
          iconName = evt.type === 'llamada' ? 'fa-phone-alt' : 'fa-map-marker-alt';
        } else if (evt.type === 'opportunity') {
          iconName = 'fa-handshake';
          nodeIconClass = "timeline-node-icon-opportunity";
        } else if (evt.isChange) {
          iconName = 'fa-user-shield';
          nodeIconClass = "timeline-node-icon-change";
        }

        // Extraer fotos y adjuntos específicos de la oportunidad
        const rawPhotos = [];
        if (evt.photoUrl) rawPhotos.push(evt.photoUrl);
        if (evt.photo_url) rawPhotos.push(evt.photo_url);
        if (Array.isArray(evt.photos)) rawPhotos.push(...evt.photos);
        if (Array.isArray(evt.evidence_photos)) rawPhotos.push(...evt.evidence_photos);
        if (Array.isArray(evt.attachments)) rawPhotos.push(...evt.attachments);

        if (evt.type === 'opportunity') {
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
          extractFromText(evt.notes);
          extractFromText(evt.description);
          extractFromText(evt.text);
        }

        const eventPhotos = Array.from(new Set(rawPhotos.filter(Boolean)));

        return (
          <div key={evt.id || idx} className={nodeClass}>
            <div className={`timeline-node-icon ${nodeIconClass}`}>
              <i className={`fas ${iconName}`} />
            </div>
            <div className="timeline-node-card">
              <div className="timeline-node-header">
                <span className={`timeline-node-type ${evt.type === 'opportunity' ? 'timeline-node-type-opportunity' : (evt.isChange ? 'timeline-node-type-change' : '')}`}>{evt.title}</span>
                <span className="timeline-node-time">
                  {new Date(evt.date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="timeline-node-text timeline-node-text-plain">{evt.text}</p>

              {/* Anexos y Comprobantes Adjuntos en Oportunidades Moradas */}
              {evt.type === 'opportunity' && eventPhotos.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {eventPhotos.map((pUrl, pIdx) => {
                    const cleanPath = String(pUrl).toLowerCase();
                    const isPdf = cleanPath.endsWith('.pdf') || cleanPath.includes('.pdf');
                    const src = pUrl.startsWith('http') ? pUrl : `https://comgarza.com${pUrl.startsWith('/') ? '' : '/'}${pUrl}`;

                    if (isPdf) {
                      return (
                        <a
                          key={pIdx}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            color: '#991b1b',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            textDecoration: 'none'
                          }}
                        >
                          <i className="fas fa-file-pdf" style={{ fontSize: '1rem', color: '#dc2626' }} />
                          <span>Documento PDF Adjunto #{pIdx + 1} ↗</span>
                        </a>
                      );
                    }

                    return (
                      <a
                        key={pIdx}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        <img
                          src={src}
                          alt="Anexo"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </a>
                    );
                  })}
                </div>
              )}

              {evt.gps_lat && evt.gps_lng && (
                <div className="timeline-gps-box">
                  <span className="timeline-gps-label">
                    📍 Ubicación en Campo Verificada: {evt.gps_address || `Coordenadas ${parseFloat(evt.gps_lat).toFixed(5)}, ${parseFloat(evt.gps_lng).toFixed(5)}`}
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${evt.gps_lat},${evt.gps_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="timeline-gps-link"
                  >
                    (Ver en Google Maps ↗)
                  </a>
                </div>
              )}

              {evt.isNote && (
                <span className="timeline-note-source-badge">
                  {evt.created_from === 'contacto' && 'Creado desde ficha contacto'}
                  {evt.created_from === 'cliente' && 'Creado desde ficha cliente'}
                  {evt.created_from === 'empresa' && 'Creado desde ficha empresa'}
                  {!evt.created_from && 'Creado desde ficha cliente'}
                </span>
              )}

              <span className="timeline-node-author">
                <i className="fas fa-user-circle" /> {evt.author}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
