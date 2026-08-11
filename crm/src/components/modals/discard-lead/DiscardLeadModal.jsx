import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './DiscardLeadModal.css';

export default function DiscardLeadModal({ isOpen, onClose, onSubmit, lead }) {
  const [reason, setReason] = useState('Sin presupuesto / Muy caro');
  const [comment, setComment] = useState('');

  if (!isOpen || !lead) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ reason, comment });
    setReason('Sin presupuesto / Muy caro');
    setComment('');
  };

  return (
    <div className="modal-overlay-glass" style={{ zIndex: 11000 }}>
      <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2>Descartar Prospecto</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>
          Indica por qué no se dará seguimiento a <strong>{lead.name}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="modal-body-form">
          <div className="form-group-custom">
            <label>Motivo de Descarte</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Sin presupuesto / Muy caro">Sin presupuesto / Muy caro</option>
              <option value="Datos de contacto falsos / incorrectos">Datos de contacto falsos / incorrectos</option>
              <option value="No responde llamadas / correos">No responde llamadas / correos</option>
              <option value="Compró con la competencia">Compró con la competencia</option>
              <option value="No interesado en los productos">No interesado en los productos</option>
              <option value="Otro (Especificar en comentarios)">Otro (Especificar en comentarios)</option>
            </select>
          </div>

          <div className="form-group-custom">
            <label>Comentarios adicionales</label>
            <textarea
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Detalles sobre el descarte..."
            />
          </div>

          <div className="modal-footer-actions">
            <button type="button" className="cancel-modal-btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="submit-modal-btn" style={{ backgroundColor: '#ef4444' }}>Confirmar Descarte</button>
          </div>
        </form>
      </div>
    </div>
  );
}

DiscardLeadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  lead: PropTypes.object,
};
