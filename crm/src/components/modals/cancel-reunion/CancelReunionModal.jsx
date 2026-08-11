import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './CancelReunionModal.css';

export default function CancelReunionModal({ isOpen, reunionAppointment, onClose, onConfirm, loading }) {
  const [cancelReunionReason, setCancelReunionReason] = useState('');

  if (!isOpen || !reunionAppointment) return null;

  const handleClose = () => {
    setCancelReunionReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (cancelReunionReason.length < 150) return;
    onConfirm(cancelReunionReason);
  };

  return (
    <div className="calendar-modal-backdrop" style={{ zIndex: 11000 }}>
      <div className="calendar-modal-card animate-slide-up cancel-modal-custom" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="calendar-modal-close"
          onClick={handleClose}
        >
          <i className="fas fa-times" />
        </button>

        <div className="cancel-modal-title">
          <i className="fas fa-archive notif-alert-ico" style={{ color: '#ef4444' }} />
          <h3 style={{ color: '#b91c1c' }}>CANCELAR REUNIÓN DE VENTAS</h3>
        </div>

        <p className="cancel-subtitle">
          Prospecto: <strong>{reunionAppointment.client_name}</strong> - Cita: <strong>{reunionAppointment.title}</strong>
        </p>

        <div className="cancel-warning-box">
          <div className="warn-title" style={{ color: '#b91c1c' }}>
            <i className="fas fa-exclamation-triangle" />
            <strong>Control de Calidad Comercial:</strong>
          </div>
          <p>
            Para mover este prospecto fuera de "Reunión Agendada", es <strong>obligatorio ingresar una justificación comercial detallada (mínimo 150 caracteres)</strong> explicando los motivos por los cuales se cancela la cita. Esto notificará a tu supervisor de inmediato.
          </p>
        </div>

        <div className="form-group-expert" style={{ marginTop: '1.5rem' }}>
          <label>Explicación de Cancelación *</label>
          <textarea
            value={cancelReunionReason}
            onChange={e => setCancelReunionReason(e.target.value)}
            rows={4}
            placeholder="Redacta detalladamente los motivos aquí... (Mínimo 150 caracteres)"
          />
          <div className="char-count-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px' }}>
            {cancelReunionReason.length < 150 ? (
              <span className="char-error" style={{ color: '#ef4444' }}><i className="fas fa-times-circle" /> Mínimo 150 caracteres</span>
            ) : (
              <span className="char-success" style={{ color: '#10b981' }}><i className="fas fa-check-circle" /> Justificación válida</span>
            )}
            <span className="char-count" style={{ color: '#64748b' }}>{cancelReunionReason.length} / 150</span>
          </div>
        </div>

        <div className="cancel-modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-cancel-modal-close"
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#475569',
              cursor: 'pointer'
            }}
            onClick={handleClose}
          >
            Cancelar Movimiento
          </button>
          <button
            type="button"
            className="btn-cancel-modal-confirm"
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={cancelReunionReason.length < 150 || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Cancelando...' : <><i className="far fa-trash-alt" /> Cancelar y Mover</>}
          </button>
        </div>
      </div>
    </div>
  );
}

CancelReunionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  reunionAppointment: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool
};
