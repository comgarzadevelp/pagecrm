import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './MeetingOutcomeModal.css';

export default function MeetingOutcomeModal({ isOpen, reunionAppointment, onClose, onConfirm, loading }) {
  const [meetingOutcome, setMeetingOutcome] = useState('concretada');
  const [meetingComments, setMeetingComments] = useState('');

  if (!isOpen || !reunionAppointment) return null;

  const handleClose = () => {
    setMeetingOutcome('concretada');
    setMeetingComments('');
    onClose();
  };

  const handleConfirm = () => {
    if (!meetingComments.trim()) return;
    onConfirm(meetingOutcome, meetingComments);
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

        <div className="cancel-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(8, 145, 178, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0891b2',
            fontSize: '1.2rem'
          }}>
            <i className="fas fa-handshake" />
          </div>
          <h3 style={{ color: '#0891b2', margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif', fontWeight: '800' }}>REGISTRAR RESULTADO DE REUNIÓN</h3>
        </div>

        <p className="cancel-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>
          La cita con <strong>{reunionAppointment.client_name}</strong> ya ha transcurrido. Registra el resultado comercial para actualizar el prospecto.
        </p>

        <div className="form-body-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group-custom">
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Resultado de la Reunión *</label>
            <select
              value={meetingOutcome}
              onChange={e => setMeetingOutcome(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.9rem',
                color: '#1e293b'
              }}
            >
              <option value="concretada">💼 Cita Concretada (Llevada a cabo exitosamente)</option>
              <option value="no_show_cliente">⚠️ Cliente No-Show (El cliente no asistió)</option>
              <option value="no_show_vendedor">❌ Vendedor No-Show (El vendedor no pudo asistir)</option>
              <option value="pospuesta">⏳ Pospuesta / Reprogramar más adelante</option>
            </select>
          </div>

          <div className="form-group-custom">
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Comentarios y Notas de Seguimiento *</label>
            <textarea
              value={meetingComments}
              onChange={e => setMeetingComments(e.target.value)}
              rows={4}
              required
              placeholder="Escribe un breve resumen de los acuerdos, temas tratados o motivos de inasistencia..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.9rem',
                color: '#1e293b',
                resize: 'vertical'
              }}
            />
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
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif'
            }}
            onClick={handleClose}
          >
            Cancelar Movimiento
          </button>
          <button
            type="button"
            className="btn-cancel-modal-confirm"
            style={{
              background: '#0891b2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'Outfit, sans-serif'
            }}
            disabled={!meetingComments.trim() || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Guardando...' : <><i className="fas fa-save" /> Guardar y Mover</>}
          </button>
        </div>
      </div>
    </div>
  );
}

MeetingOutcomeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  reunionAppointment: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool
};
