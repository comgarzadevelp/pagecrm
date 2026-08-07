import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './CancelEventModal.css';

export default function CancelEventModal({ isOpen, eventToCancel, onClose, onConfirm, loading, error }) {
  const [reason, setReason] = useState('');

  // Limpiar el textarea cada vez que se abre con un nuevo evento
  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen, eventToCancel]);

  if (!isOpen) return null;

  const isValid = reason.length >= 150;

  return (
    <div className="cancel-modal-backdrop">
      <div className="cancel-modal-card">
        <button className="cancel-modal-close-btn" onClick={onClose}>
          <i className="fas fa-times" />
        </button>

        <div className="cancel-modal-title">
          <span className="cancel-modal-alert-ico">
            <i className="fas fa-archive" />
          </span>
          <h3>CANCELAR Y DESCARTAR CITA</h3>
        </div>

        <p className="cancel-modal-subtitle">
          Cita: <strong>{eventToCancel?.summary}</strong>
        </p>

        <div className="cancel-warning-box">
          <div className="warn-title">
            <i className="fas fa-exclamation-triangle" />
            <strong>Control de Calidad Comercial:</strong>
          </div>
          <p>
            Para mantener la integridad de la base de datos de la agenda comercial y evitar la pérdida de
            información de ventas, es <strong>obligatorio redactar una justificación comercial detallada
            (mínimo 150 caracteres)</strong> explicando los motivos por los cuales se descarta esta cita.
          </p>
          <p className="warn-note">
            Esta respuesta se enviará automáticamente de forma directa al Supervisor y a la Dirección General en tiempo real.
          </p>
        </div>

        <div className="cancel-form-group">
          <label>Explicación de Cancelación *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Redacta detalladamente los motivos aquí... (Ej. Se validó con el cliente vía telefónica y no podrá asistir debido a auditoría interna. Se acordó contactarlo nuevamente la próxima semana para reagendar visita técnica...)"
          />
          <div className="cancel-char-row">
            {!isValid ? (
              <span className="cancel-char-error">
                <i className="fas fa-times-circle" /> Justificación demasiado corta (mínimo 150 caracteres)
              </span>
            ) : (
              <span className="cancel-char-success">
                <i className="fas fa-check-circle" /> Justificación válida
              </span>
            )}
            <span className="cancel-char-count">{reason.length} / 150 caracteres</span>
          </div>
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.75rem' }}>{error}</p>
        )}

        <div className="cancel-modal-actions">
          <button className="btn-cancel-close" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-cancel-confirm"
            disabled={!isValid || loading}
            onClick={() => onConfirm(reason)}
          >
            <i className="far fa-trash-alt" /> Cancelar y Descartar Cita
          </button>
        </div>
      </div>
    </div>
  );
}

CancelEventModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  eventToCancel: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
};
