import React, { useState } from 'react';
import './FichaHeader.css';

export default function FichaHeader({
  currentCustomer,
  statusColor,
  isSae,
  clientProfile,
  onClose,
  setShowVentaModal,
  setShowVisitaModal,
  reloadCustomerDetails,
  API_BASE,
  token,
  showToast
}) {
  const [isValidatingWa, setIsValidatingWa] = useState(false);

  const handleWhatsappClick = async () => {
    if (isValidatingWa) return;
    setIsValidatingWa(true);
    showToast('Verificando cuenta de WhatsApp del contacto...', 'info');

    try {
      const res = await fetch(`${API_BASE}/api/crm/whatsapp/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: currentCustomer.id,
          phone: currentCustomer.whatsapp
        })
      });

      if (!res.ok) throw new Error('Error al conectar con el servidor de validación');

      const data = await res.json();

      if (data.success) {
        if (data.isRegistered) {
          showToast('WhatsApp validado con éxito. Redirigiendo a chat interno...', 'success');
          if (reloadCustomerDetails) {
            setTimeout(() => reloadCustomerDetails(), 800);
          }
          setTimeout(() => {
            window.location.href = `/dashboard/whatsapp?phone=${data.normalized}`;
          }, 1500);
        } else {
          showToast('El contacto no tiene una cuenta de WhatsApp activa. Advertencia registrada en el historial.', 'error');
          if (reloadCustomerDetails) {
            reloadCustomerDetails();
          }
        }
      } else {
        showToast(data.message || 'No se pudo verificar el número.', 'error');
      }
    } catch (err) {
      console.error('Error validating WA number:', err);
      showToast('Error de red al intentar verificar el WhatsApp.', 'error');
    } finally {
      setIsValidatingWa(false);
    }
  };
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
          <button
            onClick={handleWhatsappClick}
            disabled={isValidatingWa}
            className="quickbar-btn quickbar-btn-wa"
            style={{ cursor: isValidatingWa ? 'not-allowed' : 'pointer' }}
          >
            {isValidatingWa ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Verificando...
              </>
            ) : (
              <>
                <i className="fab fa-whatsapp" /> WhatsApp
              </>
            )}
          </button>
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
