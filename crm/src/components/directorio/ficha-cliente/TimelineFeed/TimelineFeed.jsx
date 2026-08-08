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
        if (evt.isEvidence || evt.photoUrl || evt.photo_url) {
          return (
            <FotoEvidencia
              key={evt.id || idx}
              evidence={evt}
              onPhotoClick={(url) => window.open(url, '_blank')}
            />
          );
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
