import React from 'react';
import './SubModalDescartarCliente.css';

export default function SubModalDescartarCliente({
  isDiscarding,
  setShowDiscardModal,
  setDiscardError,
  currentCustomer,
  discardReason,
  setDiscardReason,
  discardError,
  confirmArchiveCustomer
}) {
  return (
    <div className="client-submodal-overlay" onClick={() => !isDiscarding && setShowDiscardModal(false)}>
      <div className="client-submodal-container descartar-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="submodal-header descartar-modal-header">
          <h3 className="descartar-modal-title">
            <i className="fas fa-exclamation-triangle" /> Confirmar Descarte
          </h3>
          <button 
            type="button" 
            className="submodal-close descartar-modal-close-btn" 
            onClick={() => { setShowDiscardModal(false); setDiscardError(''); }}
            disabled={isDiscarding}
          >
            &times;
          </button>
        </header>
        <div className="submodal-form">
          <div className="descartar-modal-body-padding">
            <p className="descartar-modal-description">
              ¿Estás seguro de que deseas archivar y descartar permanentemente a <strong>{currentCustomer?.name}</strong>?
            </p>
            <div className="form-group full-width">
              <label className="descartar-modal-label">
                Motivo del descarte <span className="descartar-modal-required-asterisk">*</span>
              </label>
              <textarea
                autoFocus
                placeholder="Ej. Compró con la competencia, proyecto cancelado, etc."
                value={discardReason}
                onChange={(e) => { setDiscardReason(e.target.value); if (discardError) setDiscardError(''); }}
                rows="3"
                disabled={isDiscarding}
                className="descartar-modal-textarea"
                style={{ 
                  border: `1px solid ${discardError ? '#ef4444' : '#cbd5e1'}`,
                  opacity: isDiscarding ? 0.6 : 1
                }}
              />
            </div>

            {discardError && (
              <div className="descartar-modal-error-box">
                <i className="fas fa-times-circle descartar-modal-error-icon" />
                <span>{discardError}</span>
              </div>
            )}

            {isDiscarding && (
              <div className="descartar-modal-processing-box">
                <i className="fas fa-spinner fa-spin" />
                <span>Procesando descarte, por favor espera...</span>
              </div>
            )}
          </div>
          <footer className="submodal-footer descartar-modal-footer">
            <button 
              type="button" 
              className="submodal-btn secondary" 
              onClick={() => { setShowDiscardModal(false); setDiscardError(''); }}
              disabled={isDiscarding}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="submodal-btn primary descartar-modal-confirm-btn" 
              style={{ 
                background: isDiscarding ? '#9ca3af' : '#ef4444', 
                borderColor: isDiscarding ? '#6b7280' : '#dc2626',
                cursor: isDiscarding ? 'not-allowed' : 'pointer'
              }}
              onClick={confirmArchiveCustomer}
              disabled={isDiscarding || discardReason.trim() === ''}
            >
              {isDiscarding ? (
                <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }} /> Descartando...</>
              ) : (
                <><i className="fas fa-trash-alt" style={{ marginRight: '6px' }} /> Descartar Cliente</>
              )}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
