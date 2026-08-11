import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { validateQuotePDF } from '../../../utils/pdfValidator';
import './EvidenceUploadModal.css';

export default function EvidenceUploadModal({ isOpen, onClose, onSuccess }) {
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setEvidenceFile(null);
    setEvidenceError('');
    onClose();
  };

  const handleValidate = async () => {
    if (!evidenceFile) return;
    setIsUploadingEvidence(true);
    setEvidenceError('');
    try {
      const validation = await validateQuotePDF(evidenceFile);
      if (validation.isValid) {
        onSuccess(evidenceFile);
        handleClose();
      } else {
        setEvidenceError(validation.reason);
      }
    } catch (e) {
      setEvidenceError('Ocurrió un error al analizar el PDF.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  return (
    <div className="modal-overlay-glass" style={{ zIndex: 11000 }}>
      <div className="modal-content-glass" style={{ height: 'auto', minHeight: 'unset', maxHeight: '90vh', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2>
            <i className="fas fa-file-pdf" style={{ color: '#e2445c', marginRight: '8px' }} />
            Evidencia de Cotización
          </h2>
          <button type="button" className="modal-close-btn" onClick={handleClose}>&times;</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
          El sistema no detecta ninguna cotización interna generada para este prospecto. Por favor, sube el PDF de la cotización externa (ej. de ASPEL SAE) para validarlo y autorizar el avance de etapa.
        </p>

        <div className="modal-body-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div
            className="premium-file-upload-zone"
            style={{
              border: '2px dashed rgba(124, 58, 237, 0.3)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              background: 'rgba(124, 58, 237, 0.02)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={e => {
                setEvidenceFile(e.target.files[0] || null);
                setEvidenceError('');
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(226, 68, 92, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e2445c',
                fontSize: '1.5rem'
              }}>
                <i className={evidenceFile ? "fas fa-file-pdf" : "fas fa-cloud-upload-alt"} />
              </div>
              {evidenceFile ? (
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                    {evidenceFile.name}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                    {(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>
                    Haz clic o arrastra el PDF aquí
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                    Solo archivos PDF de cotizaciones
                  </p>
                </div>
              )}
            </div>
          </div>

          {evidenceError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>
              <i className="fas fa-exclamation-circle" />
              <span>{evidenceError}</span>
            </div>
          )}
        </div>

        <div className="modal-footer-actions">
          <button
            type="button"
            className="cancel-modal-btn"
            onClick={handleClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="submit-modal-btn"
            style={{ backgroundColor: 'var(--color-brand-primary, #7c3aed)' }}
            disabled={!evidenceFile || isUploadingEvidence}
            onClick={handleValidate}
          >
            {isUploadingEvidence ? 'Analizando...' : 'Validar y Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

EvidenceUploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};
