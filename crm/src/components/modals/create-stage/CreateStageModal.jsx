import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './CreateStageModal.css';

export default function CreateStageModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [rootStage, setRootStage] = useState('nuevo');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color, root_stage: rootStage });
    setName('');
    setColor('#10b981');
    setRootStage('nuevo');
  };

  return (
    <div className="modal-overlay-glass" style={{ zIndex: 11000 }}>
      <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2>Crear Etapa Personalizada</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-form">
          <div className="form-group-custom">
            <label>Nombre de la Etapa *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="Ej: Demo Programada"
              required
            />
          </div>

          <div className="form-group-custom">
            <label>Color de la Etapa</label>
            <div className="color-picker-grid">
              {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#64748b'].map(c => (
                <div
                  key={c}
                  className={`color-option-pill ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ padding: 0, width: '28px', height: '28px', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="form-group-custom">
            <label>Etapa Origen (Para reubicación por defecto)</label>
            <select
              value={rootStage}
              onChange={(e) => setRootStage(e.target.value)}
            >
              <option value="nuevo">Nuevo</option>
              <option value="contactado">Contactado</option>
              <option value="calificado">Calificado</option>
            </select>
          </div>

          <div className="modal-footer-actions">
            <button type="button" className="cancel-modal-btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="submit-modal-btn">Crear Etapa</button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateStageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
