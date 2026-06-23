import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import '../styles/MisContactos.module.css';

const emptyForm = { name: '', position: '', email: '', phone: '', phone_alt: '', whatsapp: '', notes: '' };

/**
 * ContactoFormModal
 * 
 * Modal para creación y edición de contactos.
 * Extraído para reducir la complejidad de la vista principal.
 */
export default function ContactoFormModal({ editMode, selectedContact, onClose, refetch, API_BASE, token }) {
  const { showToast } = useUX();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editMode && selectedContact) {
      setForm({
        name: selectedContact.name || '',
        position: selectedContact.position || '',
        email: selectedContact.email || '',
        phone: selectedContact.phone || '',
        phone_alt: selectedContact.phone_alt || '',
        whatsapp: selectedContact.whatsapp || '',
        notes: selectedContact.notes || ''
      });
    } else {
      setForm(emptyForm);
    }
  }, [editMode, selectedContact]);

  const inputChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editMode ? `${API_BASE}/api/crm/contacts/${selectedContact.id}` : `${API_BASE}/api/crm/contacts`;
      const method = editMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(editMode ? 'Contacto actualizado.' : 'Contacto creado.', 'success');
      refetch();
      onClose();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="crm-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="crm-modal-content" onClick={e => e.stopPropagation()} style={{ zIndex: 10001, margin: 'auto', maxWidth: '600px', width: '96%' }}>
        <button className="close-modal-btn" onClick={onClose}>×</button>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2>{editMode ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body crm-form-grid" style={{ flex: 1, overflowY: 'auto', padding: '10px 4px', margin: 0, minHeight: 0 }}>
            <div className="form-group full-width">
              <label>Nombre Completo *</label>
              <input required value={form.name} onChange={inputChange('name')} placeholder="Nombre del contacto" />
            </div>
            <div className="form-group">
              <label>Cargo / Posición</label>
              <input value={form.position} onChange={inputChange('position')} placeholder="Ej: Director de Compras" />
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input type="email" value={form.email} onChange={inputChange('email')} placeholder="correo@empresa.com" />
            </div>
            <div className="form-group">
              <label>Teléfono Principal</label>
              <input value={form.phone} onChange={inputChange('phone')} placeholder="81 1234 5678" />
            </div>
            <div className="form-group">
              <label>Teléfono Alternativo</label>
              <input value={form.phone_alt} onChange={inputChange('phone_alt')} placeholder="Número alternativo" />
            </div>
            <div className="form-group">
              <label>WhatsApp</label>
              <input value={form.whatsapp} onChange={inputChange('whatsapp')} placeholder="81 1234 5678 (sin código país)" />
            </div>
            <div className="form-group full-width">
              <label>Notas</label>
              <textarea value={form.notes} onChange={inputChange('notes')} placeholder="Información adicional del contacto..." rows={3} />
            </div>
          </div>
          <div className="modal-footer form-actions full-width" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary-golden" disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Contacto</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
