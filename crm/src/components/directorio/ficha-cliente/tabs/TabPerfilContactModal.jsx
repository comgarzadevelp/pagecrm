import React from 'react';

export default function TabPerfilContactModal({ selectedContact, onClose }) {
  if (!selectedContact) return null;

  return (
    <div className="contact-detail-modal-overlay" onClick={onClose}>
      <div className="contact-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header del modal */}
        <div className="contact-detail-modal-header">
          <div className="contact-detail-modal-header-left">
            <div className="contact-detail-modal-avatar">
              {selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <h4 className="contact-detail-modal-title">{selectedContact.name}</h4>
              <span className="contact-detail-modal-subtitle">
                {selectedContact.position || 'Contacto'}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="contact-detail-modal-close-btn"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="contact-detail-modal-body">
          {selectedContact.phone && (
            <div className="contact-detail-field-group">
              <span className="contact-detail-field-label">Teléfono Principal</span>
              <div className="contact-detail-field-value-box">
                <span className="contact-detail-field-value">{selectedContact.phone}</span>
                <div className="contact-detail-actions">
                  <a href={`tel:${selectedContact.phone}`} className="contact-detail-call-link" title="Llamar">
                    <i className="fas fa-phone-alt"></i>
                  </a>
                  <a 
                    href={`https://wa.me/52${selectedContact.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="contact-detail-wa-link" 
                    title="Enviar WhatsApp"
                  >
                    <i className="fab fa-whatsapp"></i>
                  </a>
                </div>
              </div>
            </div>
          )}

          {selectedContact.email && (
            <div className="contact-detail-field-group">
              <span className="contact-detail-field-label">Correo Electrónico</span>
              <div className="contact-detail-field-value-box">
                <span className="contact-detail-field-value-ellipsis">{selectedContact.email}</span>
                <a href={`mailto:${selectedContact.email}`} className="contact-detail-email-link" title="Enviar Correo">
                  <i className="fas fa-envelope"></i>
                </a>
              </div>
            </div>
          )}

          {selectedContact.notes && (
            <div className="contact-detail-field-group">
              <span className="contact-detail-field-label">Notas de Registro</span>
              <div className="contact-detail-notes-box">
                {selectedContact.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
