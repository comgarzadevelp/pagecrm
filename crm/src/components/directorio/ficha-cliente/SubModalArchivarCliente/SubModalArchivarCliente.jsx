import React from 'react';
import './SubModalArchivarCliente.css';

export default function SubModalArchivarCliente({
  isArchiving,
  setShowArchiveModal,
  setArchiveError,
  currentCustomer,
  archiveReason,
  setArchiveReason,
  archiveError,
  confirmArchiveCustomer
}) {
  return (
    <div className="client-submodal-overlay" onClick={() => !isArchiving && setShowArchiveModal(false)}>
      <div className="client-submodal-container archivar-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="submodal-header archivar-modal-header">
          <h3 className="archivar-modal-title">
            <i className="fas fa-archive" /> Confirmar Archivado Permanente
          </h3>
          <button 
            type="button" 
            className="submodal-close archivar-modal-close-btn" 
            onClick={() => { setShowArchiveModal(false); setArchiveError(''); }}
            disabled={isArchiving}
          >
            &times;
          </button>
        </header>
        <div className="submodal-form">
          <div className="archivar-modal-body-padding">
            <p className="archivar-modal-description">
              ¿Estás seguro de que deseas archivar y depurar a <strong>{currentCustomer?.name}</strong>?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#dc2626', display: 'block', marginTop: '4px' }}>
                Esta acción retirará al cliente del Directorio y lo trasladará permanentemente al módulo de Archivo Histórico y Depuración.
              </span>
            </p>
            <div className="form-group full-width">
              <label className="archivar-modal-label">
                Motivo del archivado <span className="archivar-modal-required-asterisk">*</span>
              </label>
              <textarea
                autoFocus
                placeholder="Ej. Registro de prueba/muestra, empresa inexistente, depuración SAE..."
                value={archiveReason}
                onChange={(e) => { setArchiveReason(e.target.value); if (archiveError) setArchiveError(''); }}
                rows="3"
                disabled={isArchiving}
                className="archivar-modal-textarea"
                style={{ 
                  border: `1px solid ${archiveError ? '#ef4444' : '#cbd5e1'}`,
                  opacity: isArchiving ? 0.6 : 1
                }}
              />
            </div>

            {archiveError && (
              <div className="archivar-modal-error-box">
                <i className="fas fa-times-circle" />
                <span>{archiveError}</span>
              </div>
            )}

            {isArchiving && (
              <div className="archivar-modal-processing-box">
                <i className="fas fa-spinner fa-spin" />
                <span>Procesando archivado, por favor espera...</span>
              </div>
            )}
          </div>
          <footer className="submodal-footer archivar-modal-footer">
            <button 
              type="button" 
              className="submodal-btn secondary" 
              onClick={() => { setShowArchiveModal(false); setArchiveError(''); }}
              disabled={isArchiving}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="submodal-btn primary" 
              style={{ 
                background: isArchiving ? '#9ca3af' : '#ef4444', 
                borderColor: isArchiving ? '#6b7280' : '#dc2626',
                color: '#fff',
                cursor: isArchiving ? 'not-allowed' : 'pointer'
              }}
              onClick={confirmArchiveCustomer}
              disabled={isArchiving || archiveReason.trim() === ''}
            >
              {isArchiving ? (
                <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }} /> Archivando...</>
              ) : (
                <><i className="fas fa-archive" style={{ marginRight: '6px' }} /> Archivar Cliente</>
              )}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
