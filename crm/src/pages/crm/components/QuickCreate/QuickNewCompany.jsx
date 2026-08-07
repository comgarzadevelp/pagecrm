import React, { useState } from 'react';
import { useUX } from '../../../../components/common/UXProvider';

export default function QuickNewCompany({ API_BASE, onClose }) {
  const { showToast } = useUX();
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [type, setType] = useState('empresa');
  const [rfc, setRfc] = useState('');
  const [phoneMain, setPhoneMain] = useState('');
  const [emailMain, setEmailMain] = useState('');
  const [city, setCity] = useState('Monterrey');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !type) {
      showToast('Por favor completa los campos obligatorios (*).', 'warning');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/api/crm/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          alias: alias.trim() || null,
          type,
          rfc: rfc.trim() || null,
          phone_main: phoneMain.trim() || null,
          email_main: emailMain.trim() || null,
          city: city.trim() || 'Monterrey',
          state: 'Nuevo León',
          status: 'activo',
          notes: 'Registrada vía móvil rápido'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al crear la empresa.');
      }

      showToast('¡Empresa registrada exitosamente!', 'success');
      onClose(); // Cerrar modal

    } catch (err) {
      console.error('QuickNewCompany error:', err);
      showToast(err.message || 'Error de conexión con el servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-modal-fullscreen">
      <div className="quick-modal-header">
        <h3>Nueva Empresa / Obra</h3>
        <button type="button" className="quick-modal-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="quick-modal-body">
        <form onSubmit={handleSubmit} className="quick-form">
          <div className="quick-input-group">
            <label className="quick-input-label">Nombre de la Empresa / Obra *</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Ej: RUBA Desarrollos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Alias / Nombre Corto</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Ej: RUBA"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Tipo de Empresa *</label>
            <select
              className="quick-input"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="empresa">Empresa</option>
              <option value="constructora">Constructora</option>
              <option value="desarrolladora">Desarrolladora</option>
              <option value="contratista">Contratista</option>
              <option value="distribuidor_minorista">Distribuidor</option>
            </select>
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">RFC</label>
            <input
              type="text"
              className="quick-input"
              placeholder="RDE123456XXX"
              value={rfc}
              onChange={(e) => setRfc(e.target.value)}
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Teléfono Principal</label>
            <input
              type="tel"
              className="quick-input"
              placeholder="Ej: 81 1234 5678"
              value={phoneMain}
              onChange={(e) => setPhoneMain(e.target.value)}
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Email Principal</label>
            <input
              type="email"
              className="quick-input"
              placeholder="ventas@empresa.com"
              value={emailMain}
              onChange={(e) => setEmailMain(e.target.value)}
            />
          </div>

          <div className="quick-input-group">
            <label className="quick-input-label">Ciudad</label>
            <input
              type="text"
              className="quick-input"
              placeholder="Pre-fill: Monterrey"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
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
              <i className="fas fa-building"></i>
              <span>Crear Empresa</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
