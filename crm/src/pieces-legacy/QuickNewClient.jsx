import React, { useState } from 'react';
import { useUX } from '../../../components/common/UXProvider';

export default function QuickNewClient({ API_BASE, onClose, fetchCustomers, setActiveTab }) {
  const { showToast, showConfirm } = useUX();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [projectType, setProjectType] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Por favor completa los campos obligatorios (*).', 'warning');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('token');

    // Mapear los campos del formulario a la estructura de un Contacto en el CRM
    const notesStr = [
      company.trim() ? `Empresa: ${company.trim()}` : '',
      'Registrado vía móvil rápido'
    ].filter(Boolean).join('. ');

    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          position: projectType.trim() || 'Contacto General',
          notes: notesStr
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al crear el contacto.');
      }

      showToast('¡Contacto registrado exitosamente!', 'success');
      
      // Actualizar listados
      if (typeof fetchCustomers === 'function') {
        fetchCustomers();
      }

      onClose(); // Cerrar modal

      // Preguntar si desea ver el listado de contactos
      const viewDetails = await showConfirm(
        'Contacto Creado',
        '¿Deseas abrir el listado de contactos para ver su ficha?',
        { confirmText: 'Ir a Contactos', cancelText: 'Permanecer aquí' }
      );
      if (viewDetails && typeof setActiveTab === 'function') {
        setActiveTab('directory');
      }

    } catch (err) {
      console.error('QuickNewContact error:', err);
      showToast(err.message || 'Error de conexión con el servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-modal-fullscreen">
      <div className="quick-modal-header">
        <h3>Nuevo Contacto (Rápido)</h3>
        <button type="button" className="quick-modal-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="quick-modal-body">
        <form onSubmit={handleSubmit} className="quick-form">
          <div className="quick-input-group">
            <label className="quick-input-label">Nombre del Contacto *</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Nombre completo del contacto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Teléfono *</label>
            <input
              type="tel"
              className="quick-input"
              placeholder="Ej: 81 2000 1000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Correo Electrónico</label>
            <input
              type="email"
              className="quick-input"
              placeholder="correo@contacto.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Empresa / Obra</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Nombre de la empresa que representa"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Puesto / Cargo</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Ej: Compras, Residente, Director..."
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
            />
          </div>

          <div className="quick-tip-card">
            <i className="fas fa-info-circle"></i>
            <span>
              <strong>Nota:</strong> Siguiendo la lógica del CRM, este registro creará un <strong>Contacto (prospecto/persona física)</strong> en tu listado. El directorio de Clientes es exclusivo para clientes con facturas.
            </span>
          </div>
        </form>
      </div>

      <div className="quick-modal-footer">
        <button type="button" className="quick-btn-cancel" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="quick-btn-submit" onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <div className="spinner-mini-fab"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <i className="fas fa-user-plus"></i>
              <span>Crear Contacto</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
