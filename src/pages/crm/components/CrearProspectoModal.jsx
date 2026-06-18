import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import useDebounce from '../hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import './CrearProspectoModal.css';

export default function CrearProspectoModal({
  isOpen,
  onClose,
  onSuccess,
  API_BASE,
  initialNotes = ''
}) {
  const { showToast } = useUX();

  // Form state
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: ''
  });
  const [phoneWarning, setPhoneWarning] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Debounce phone input for duplicate checking
  const debouncedPhone = useDebounce(createForm.phone, 500);

  // Check for duplicate phone numbers
  useEffect(() => {
    const checkPhoneDuplicate = async () => {
      if (!debouncedPhone || debouncedPhone.trim().length < 10) {
        setPhoneWarning('');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/api/crm/leads/check-duplicate?phone=${encodeURIComponent(debouncedPhone.trim())}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await res.json();
        if (data.success && data.duplicate) {
          setPhoneWarning(data.message || 'Este número ya está asignado a otro ejecutivo.');
        } else {
          setPhoneWarning('');
        }
      } catch (err) {
        console.error('Error checking duplicate phone:', err);
      }
    };

    if (isOpen) {
      checkPhoneDuplicate();
    }
  }, [debouncedPhone, API_BASE, isOpen]);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setCreateForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        notes: initialNotes || ''
      });
      setPhoneWarning('');
      setIsSubmittingLead(false);
    }
  }, [isOpen, initialNotes]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.phone.trim()) {
      showToast('Nombre y teléfono son requeridos.', 'error');
      return;
    }
    if (phoneWarning) {
      showToast(phoneWarning, 'error');
      return;
    }

    setIsSubmittingLead(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/crm/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          phone: createForm.phone.trim(),
          email: createForm.email.trim(),
          company: createForm.company.trim(),
          notes: createForm.notes.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('¡Prospecto registrado exitosamente!', 'success');
        onSuccess(data.lead);
        onClose();
      } else {
        showToast(data.message || 'Error al registrar prospecto.', 'error');
      }
    } catch (err) {
      console.error('Create manual lead error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '96%' }}>
        <button type="button" className="close-modal-btn" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-brand-primary, #05393a)', margin: 0 }}>Registrar Nuevo Prospecto</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Ingresa los datos del prospecto para iniciar el seguimiento.
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
            <div className="modal-form-grid">
              <div className="modal-input-group">
                <label>Nombre del Prospecto *</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="modal-input-group">
                <label>Teléfono / WhatsApp *</label>
                <input
                  type="tel"
                  placeholder="Ej. 8112345678"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  required
                />
                {phoneWarning && (
                  <span className="phone-warning-message">
                    <i className="fas fa-exclamation-circle"></i> {phoneWarning}
                  </span>
                )}
              </div>
              
              <div className="modal-input-group">
                <label>Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  placeholder="juan.perez@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              
              <div className="modal-input-group">
                <label>Empresa / Obra (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Constructora Garza"
                  value={createForm.company}
                  onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                />
              </div>
              
            </div>

            <div className="modal-input-group" style={{ marginBottom: '1rem' }}>
              <label>Notas / Requerimiento Inicial</label>
              <textarea
                rows="3"
                placeholder="Detalla qué material o suministro está buscando el prospecto..."
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>
          </div>
          
          <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmittingLead || !!phoneWarning}
              style={{ background: 'linear-gradient(135deg, var(--color-brand-accent, #d4a359) 0%, #c2781b 100%)', borderColor: 'var(--color-brand-accent, #d4a359)' }}
            >
              {isSubmittingLead ? 'Guardando...' : 'Registrar Prospecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CrearProspectoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  API_BASE: PropTypes.string.isRequired,
  initialNotes: PropTypes.string
};
