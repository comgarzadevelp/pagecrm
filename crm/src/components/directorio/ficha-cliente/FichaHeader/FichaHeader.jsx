import React from 'react';
import './FichaHeader.css';

export default function FichaHeader({
  currentCustomer,
  statusColor,
  isSae,
  clientProfile,
  onClose,
  setShowVentaModal,
  setShowVisitaModal
}) {
  return (
    <header className="client-modal-header">
      <div className="client-modal-header-top">
        <span className="ficha-header-tag">
          Ficha de cliente
        </span>

        <span
          className="ficha-header-status-badge"
          style={{
            background: statusColor.bg,
            color: statusColor.color,
            border: `1px solid ${statusColor.color}40`
          }}
        >
          {currentCustomer.nivel_label || 'Prospecto'}
        </span>

        {isSae && (
          <span className="ficha-header-sae-badge">
            <i className="fas fa-database" style={{ fontSize: '0.6rem' }} /> OBTENIDO DESDE SAE
          </span>
        )}
      </div>

      <h2 className="client-modal-title">
        {clientProfile === 'b2b' ? (currentCustomer.company || currentCustomer.name) : currentCustomer.name}
      </h2>

      <div className={`ficha-header-profile-tag ${clientProfile === 'b2b' ? 'ficha-header-profile-b2b' : 'ficha-header-profile-b2c'}`}>
        <i className={clientProfile === 'b2b' ? "fas fa-building" : "fas fa-user"} />
        {clientProfile === 'b2b' ? 'Perfil: B2B Corporativo' : 'Perfil: B2C Individual'}
      </div>

      <p className="client-modal-subtitle">
        {currentCustomer.company ? (
          <>
            <i className="fas fa-building" style={{ color: 'var(--color-brand-accent)' }} />
            <span>Empresa vinculada: <strong>{currentCustomer.company}</strong></span>
          </>
        ) : (
          <>
            <i className="fas fa-user" style={{ color: '#64748b' }} />
            <span>Particular / Consumidor final</span>
          </>
        )}
      </p>

      {/* ACCIONES RÁPIDAS COMERCIALES */}
      <div className="client-modal-quickbar">
        {currentCustomer.whatsapp ? (
          <a
            href={`https://wa.me/52${currentCustomer.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="quickbar-btn quickbar-btn-wa"
          >
            <i className="fab fa-whatsapp" /> WhatsApp
          </a>
        ) : (
          <button
            disabled
            className="quickbar-btn quickbar-btn-wa-disabled"
            title="Sin número de WhatsApp registrado. Edite el contacto para agregarlo."
          >
            <i className="fab fa-whatsapp" /> WhatsApp
          </button>
        )}
        {currentCustomer.phone && (
          <a href={`tel:${currentCustomer.phone}`} className="quickbar-btn quickbar-btn-phone">
            <i className="fas fa-phone-alt" /> Llamar por teléfono
          </a>
        )}
        {currentCustomer.email && (
          <a
            href={`mailto:${(() => {
              const emailStr = currentCustomer.email.trim();
              const match = emailStr.match(/<([^>]+)>/);
              if (match && match[1]) return match[1].trim();
              const tokens = emailStr.replace(/[,;]/g, ' ').split(/\s+/);
              const firstEmail = tokens.find(t => t.includes('@'));
              return firstEmail ? firstEmail.trim() : emailStr;
            })()}`}
            className="quickbar-btn quickbar-btn-email"
          >
            <i className="fas fa-envelope" /> Enviar Correo
          </a>
        )}
        <button
          className="quickbar-btn quickbar-btn-action"
          onClick={() => setShowVentaModal(true)}
        >
          <i className="fas fa-handshake" /> Iniciar negociación
        </button>
        <button
          className="quickbar-btn quickbar-btn-schedule"
          onClick={() => setShowVisitaModal(true)}
        >
          <i className="fas fa-calendar-alt" /> Programar Evento
        </button>
      </div>
    </header>
  );
}
