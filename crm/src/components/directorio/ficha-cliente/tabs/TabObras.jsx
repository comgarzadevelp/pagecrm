import React from 'react';

export default function TabObras({
  loadingLinkedObras,
  linkedObras,
  API_BASE
}) {
  return (
    <div className="customer-quotes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
        <i className="fas fa-hard-hat" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Obras Asignadas
      </h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
        Proyectos físicos, desarrollos o lugares de entrega asociados a esta entidad.
      </p>

      {loadingLinkedObras ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando obras...</p>
        </div>
      ) : linkedObras.length === 0 ? (
        <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <i className="fas fa-building" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay obras vinculadas a esta entidad.</p>
        </div>
      ) : (
        <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {linkedObras.map((obra, idx) => (
            <div key={idx} className="contact-card glass" style={{
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid rgba(212, 163, 89, 0.15)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(212, 163, 89, 0.02) 100%)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: 'var(--color-brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {obra.evidence_photo_url ? (
                    <img src={obra.evidence_photo_url.startsWith('http') ? obra.evidence_photo_url : `${API_BASE}${obra.evidence_photo_url}`} alt="Obra" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="fas fa-hard-hat"></i>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', lineHeight: '1.2' }}>{obra.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                    <i className="fas fa-map-marker-alt"></i> {obra.latitude && obra.longitude ? 'GPS Capturado' : 'Sin GPS'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
