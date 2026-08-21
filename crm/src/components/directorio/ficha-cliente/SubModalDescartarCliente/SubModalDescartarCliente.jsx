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
  confirmDiscardCustomer
}) {
  return (
    <div className="client-submodal-overlay" onClick={() => !isDiscarding && setShowDiscardModal(false)}>
      <div className="client-submodal-container descartar-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="submodal-header descartar-modal-header">
          <h3 className="descartar-modal-title">
            <i className="fas fa-ban" /> Descartar Cliente
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
              ¿Deseas descartar temporalmente a <strong>{currentCustomer?.name}</strong>?
            </p>

            <div className="descartar-modal-explanation-card">
              <i className="fas fa-info-circle" style={{ color: '#0284c7', marginTop: '2px' }} />
              <div>
                Este cliente se moverá a la pestaña <strong>Descartados</strong> del Directorio para no alterar tus métricas del embudo activo. 
                Podrás recuperarlo o recontactarlo cuando vuelva a tener interés de compra.
              </div>
            </div>

            <div className="form-group full-width">
              <label className="descartar-modal-label">
                Motivo del descarte (opcional)
              </label>
              <textarea
                autoFocus
                placeholder="Ej. Proyecto pausado, sin presupuesto este trimestre, no compra ahora..."
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
                <i className="fas fa-times-circle" />
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
              className="submodal-btn primary" 
              style={{ 
                background: isDiscarding ? '#94a3b8' : '#475569', 
                borderColor: isDiscarding ? '#64748b' : '#334155',
                color: '#fff',
                cursor: isDiscarding ? 'not-allowed' : 'pointer'
              }}
              onClick={confirmDiscardCustomer}
              disabled={isDiscarding}
            >
              {isDiscarding ? (
                <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }} /> Descartando...</>
              ) : (
                <><i className="fas fa-ban" style={{ marginRight: '6px' }} /> Descartar Cliente</>
              )}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
