import React from 'react';

export default function FichaFeatureHeader({
  currentCustomer,
  currentStatusStyles,
  formatStatus,
  setShowVisitaModal
}) {
  return (
    <div className="modal-header customer-modal-header-custom">
      <div className="customer-modal-header-top-row">
        <span className="channel-badge contact_form" style={{ background: 'var(--color-brand-primary)', color: '#ffffff', textTransform: 'uppercase' }}>
          {currentCustomer.isCompany ? 'Ficha de Empresa' : 'Ficha de Cliente'}
        </span>
        <span style={{
          background: currentStatusStyles.bg,
          color: currentStatusStyles.color,
          border: `1px solid ${currentStatusStyles.border}`,
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: '800'
        }}>
          {formatStatus(currentCustomer.status || (currentCustomer.isCompany ? 'pendiente_revision' : 'nuevo'))}
        </span>
        {currentCustomer.id && currentCustomer.id.startsWith('sae-') && (
          <span style={{
            background: 'rgba(212, 163, 89, 0.12)',
            color: 'var(--color-brand-primary)',
            border: '1px solid rgba(212, 163, 89, 0.3)'
          }} className="customer-modal-quality-badge">
            <i className="fas fa-database" style={{ fontSize: '0.65rem' }}></i> OBTENIDO DESDE SAE
          </span>
        )}
      </div>
      <h2 className="customer-modal-title-custom">{currentCustomer.name}</h2>
      <div className="customer-modal-header-bottom-row">
        <p className="customer-modal-subtitle-text">
          {currentCustomer.company ? `Constructora: ${currentCustomer.company}` : 'Particular / Consumidor'}
        </p>
        <button className="btn-primary-golden customer-modal-visita-btn" onClick={() => setShowVisitaModal(true)}>
          <i className="fas fa-map-marker-alt" /> Registrar Visita / Actividad
        </button>
      </div>
    </div>
  );
}
