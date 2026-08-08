import React from 'react';
import './SubModalEditContacto.css';

export default function SubModalEditContacto({
  setShowEditContactModal,
  contactNameInput,
  setContactNameInput,
  contactPositionInput,
  setContactPositionInput,
  contactEmailInput,
  setContactEmailInput,
  contactPhoneInput,
  setContactPhoneInput,
  contactPhoneAltInput,
  setContactPhoneAltInput,
  contactWhatsappInput,
  setContactWhatsappInput,
  contactNotesInput,
  setContactNotesInput,
  handleUpdateContact,
  isSavingContact
}) {
  return (
    <div className="client-submodal-overlay" onClick={() => setShowEditContactModal(false)}>
      <div className="client-submodal-container" onClick={(e) => e.stopPropagation()}>
        <header className="submodal-header">
          <h3>Editar Datos de Contacto</h3>
          <button type="button" className="submodal-close" onClick={() => setShowEditContactModal(false)}>&times;</button>
        </header>
        <form onSubmit={handleUpdateContact} className="submodal-form">
          <div className="form-group-grid">
            <div className="form-group full-width">
              <label>Nombre del Contacto *</label>
              <input
                type="text"
                required
                value={contactNameInput}
                onChange={(e) => setContactNameInput(e.target.value)}
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div className="form-group">
              <label>Cargo / Posición</label>
              <select
                value={contactPositionInput}
                onChange={(e) => setContactPositionInput(e.target.value)}
              >
                <option value="">Selecciona una opción...</option>
                <option value="RH">RH</option>
                <option value="Compras">Compras</option>
                <option value="Director">Director</option>
                <option value="Administración">Administración</option>
                <option value="Gerente">Gerente</option>
                <option value="Residente de Obra">Residente de Obra</option>
                <option value="Representante B2B">Representante B2B</option>
              </select>
            </div>
            <div className="form-group">
              <label className={contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) ? 'invalid-label' : ''}>
                Correo Electrónico {contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) && ' (Inválido)'}
              </label>
              <input
                type="text"
                value={contactEmailInput}
                onChange={(e) => setContactEmailInput(e.target.value)}
                placeholder="correo@empresa.com"
                className={contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) ? 'invalid-input' : ''}
              />
              {contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) && (
                <span className="invalid-text-message">
                  Debe cumplir con el formato estándar (ejemplo@dominio.com).
                </span>
              )}
            </div>
            <div className="form-group">
              <label>Teléfono Principal</label>
              <input
                type="text"
                value={contactPhoneInput}
                onChange={(e) => setContactPhoneInput(e.target.value)}
                placeholder="10 dígitos"
              />
            </div>
            <div className="form-group">
              <label>Teléfono Alternativo (Opcional)</label>
              <input
                type="text"
                value={contactPhoneAltInput}
                onChange={(e) => setContactPhoneAltInput(e.target.value)}
                placeholder="Número secundario"
              />
            </div>
            <div className="form-group full-width">
              <label>WhatsApp (Sin código de país, ej. 8112345678)</label>
              <input
                type="text"
                value={contactWhatsappInput}
                onChange={(e) => setContactWhatsappInput(e.target.value)}
                placeholder="Celular para chat de WhatsApp"
              />
            </div>
            <div className="form-group full-width">
              <label>Notas de Contacto</label>
              <textarea
                rows="3"
                value={contactNotesInput}
                onChange={(e) => setContactNotesInput(e.target.value)}
                placeholder="Información adicional del contacto..."
              />
            </div>
          </div>
          <footer className="submodal-footer">
            <button type="button" className="submodal-btn secondary" onClick={() => setShowEditContactModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="submodal-btn primary" disabled={isSavingContact}>
              {isSavingContact ? 'Guardando...' : 'Guardar Contacto'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
