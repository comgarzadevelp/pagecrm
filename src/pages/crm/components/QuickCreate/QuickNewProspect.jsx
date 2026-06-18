import React, { useState, useEffect } from 'react';
import { useUX } from '../../../../components/common/UXProvider';
import useDebounce from '../../hooks/useDebounce';

export default function QuickNewProspect({ API_BASE, onClose }) {
  const { showToast } = useUX();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');
  const [saving, setSaving] = useState(false);

  const debouncedPhone = useDebounce(phone, 500);

  // Validar duplicados de teléfono celular
  useEffect(() => {
    const checkPhoneDuplicate = async () => {
      if (!debouncedPhone || debouncedPhone.trim().length < 10) {
        setPhoneWarning('');
        return;
      }
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE}/api/crm/leads/check-duplicate?phone=${encodeURIComponent(debouncedPhone.trim())}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data && data.success && data.duplicate) {
          setPhoneWarning(data.message || 'Este número ya está asignado a otro ejecutivo.');
        } else {
          setPhoneWarning('');
        }
      } catch (err) {
        console.error('Error checking duplicate phone:', err);
      }
    };
    checkPhoneDuplicate();
  }, [debouncedPhone, API_BASE]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Por favor completa los campos obligatorios (*).', 'warning');
      return;
    }
    if (phoneWarning) {
      showToast(phoneWarning, 'error');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/api/crm/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          company: company.trim() || null,
          notes: notes.trim() || 'Registrado vía creación rápida.'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al crear el prospecto.');
      }

      showToast('¡Prospecto registrado exitosamente!', 'success');
      
      // Disparar evento personalizado para actualizar los listados/tableros activos
      window.dispatchEvent(new CustomEvent('crm-lead-created'));

      onClose(); // Cerrar modal

    } catch (err) {
      console.error('QuickNewProspect error:', err);
      showToast(err.message || 'Error de conexión con el servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-modal-fullscreen">
      <div className="quick-modal-header">
        <h3>Nuevo Prospecto (Rápido)</h3>
        <button type="button" className="quick-modal-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="quick-modal-body">
        <form onSubmit={handleSubmit} className="quick-form">
          <div className="quick-input-group">
            <label className="quick-input-label">Nombre Completo *</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Ej: Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Teléfono Celular *</label>
            <input
              type="tel"
              className="quick-input"
              placeholder="Ej: 8112345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {phoneWarning && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600', marginTop: '2px' }}>
                <i className="fas fa-exclamation-triangle"></i> {phoneWarning}
              </span>
            )}
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Correo Electrónico</label>
            <input
              type="email"
              className="quick-input"
              placeholder="Ej: juan@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Empresa / Constructora</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Ej: Constructora Garza"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>



          <div className="quick-input-group">
            <label className="quick-input-label">Requerimientos Iniciales</label>
            <textarea
              className="quick-input"
              placeholder="Especifica productos o servicios solicitados..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
            />
          </div>

          <div className="quick-tip-card">
            <i className="fas fa-info-circle"></i>
            <span>
              <strong>Nota:</strong> Este registro creará un <strong>Prospecto</strong> en la columna "Nuevo" de tu tablero Kanban.
            </span>
          </div>
        </form>
      </div>

      <div className="quick-modal-footer">
        <button type="button" className="quick-btn-cancel" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="quick-btn-submit" onClick={handleSubmit} disabled={saving || !!phoneWarning}>
          {saving ? (
            <>
              <div className="spinner-mini-fab"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <i className="fas fa-user-plus"></i>
              <span>Crear Prospecto</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
