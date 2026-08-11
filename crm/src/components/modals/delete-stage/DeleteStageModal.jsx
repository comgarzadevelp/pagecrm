import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './DeleteStageModal.css';

export default function DeleteStageModal({ stageToDelete, columns, onClose, onConfirm }) {
  const [transferTargetStage, setTransferTargetStage] = useState('nuevo');

  if (!stageToDelete) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(stageToDelete.stageId, transferTargetStage);
  };

  return (
    <div className="modal-overlay-glass" style={{ zIndex: 11500 }}>
      <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2>Eliminar Etapa - Transferir Prospectos</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>
          La etapa <strong>{stageToDelete.label}</strong> tiene prospectos activos. Selecciona a qué etapa reubicarlos:
        </p>

        <form onSubmit={handleSubmit} className="modal-body-form">
          <div className="form-group-custom">
            <label>Reubicar prospectos en:</label>
            <select
              value={transferTargetStage}
              onChange={(e) => setTransferTargetStage(e.target.value)}
            >
              {columns
                .filter(c => c.key !== stageToDelete.key)
                .map(col => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
            </select>
          </div>

          <div className="modal-footer-actions">
            <button type="button" className="cancel-modal-btn" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              className="submit-modal-btn"
              style={{ backgroundColor: '#ef4444' }}
            >
              Transferir y Eliminar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

DeleteStageModal.propTypes = {
  stageToDelete: PropTypes.object,
  columns: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
