import React, { useState, useEffect } from 'react';
import {
  generateEventId,
  getMetaBrowserIdentifiers,
  trackLeadConversion
} from '../../lib/metaPixel';
import './LeadPopup.css';

const LeadPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('garza_popup_seen_v4');
    if (hasSeen) return;

    // Mostrar tras 25s de permanencia o al hacer scroll >55% de la página para no bloquear en frío el tráfico de Meta Ads
    let triggered = false;
    const triggerPopup = () => {
      if (triggered) return;
      triggered = true;
      setIsVisible(true);
    };

    const timer = setTimeout(triggerPopup, 25000);

    const handleScroll = () => {
      const scrollRatio =
        (window.scrollY + window.innerHeight) /
        Math.max(document.documentElement.scrollHeight, 1);
      if (scrollRatio > 0.55) {
        triggerPopup();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('garza_popup_seen_v4', 'true');
    window.dispatchEvent(new CustomEvent('popupClosed'));
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPhone(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 10) return;

    setIsSending(true);
    setErrorMsg("");

    try {
      const eventId = generateEventId('lead_popup');
      const { fbp, fbc } = getMetaBrowserIdentifiers();
      const eventSourceUrl = window.location.href;

      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/leads/popup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          eventId,
          fbp,
          fbc,
          eventSourceUrl
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar el prospecto.');
      }

      // Disparar evento Lead en el navegador con el mismo eventId para deduplicación con CAPI
      trackLeadConversion({
        eventId,
        phone,
        contentName: 'Popup WhatsApp Prioritario',
        leadType: 'popup_whatsapp'
      });

      setIsSent(true);

      setTimeout(() => {
        handleClose();
      }, 2200);
    } catch (err) {
      console.error('Error al enviar el WhatsApp al servidor:', err);
      setErrorMsg(err.message || 'Error de conexión con el servidor Garza.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`lead-popup-overlay ${isVisible ? 'active' : ''}`}>
      <div className="lead-popup-content">
        <button className="close-popup" onClick={handleClose}>&times;</button>

        {!isSent ? (
          <div className="popup-body">
            <div className="advisor-badge">
              <i className="fas fa-headset"></i> Atención Prioritaria
            </div>
            <h3>¿Busca materiales específicos?</h3>
            <p>Déjenos su WhatsApp y un asesor técnico le contactará en menos de 10 minutos para apoyarle con su cotización.</p>

            {errorMsg && (
              <div className="popup-error-msg" style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#fca5a5', marginBottom: '12px', fontSize: '12px', textAlign: 'center' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="lead-form">
              <div className="input-group">
                <i className="fab fa-whatsapp"></i>
                <input
                  type="text"
                  placeholder="Número de WhatsApp (10 dígitos)"
                  value={phone}
                  onChange={handleInputChange}
                  maxLength="10"
                  required
                  disabled={isSending}
                />
              </div>
              <button type="submit" className="btn-primary full-width" disabled={isSending}>
                {isSending ? "Enviando..." : "Solicitar Asesoría Ahora"}
              </button>
            </form>
            <span className="privacy-note"><i className="fas fa-shield-alt"></i> Datos protegidos por política de privacidad Garza.</span>
          </div>
        ) : (
          <div className="popup-success">
            <div className="success-icon"><i className="fas fa-check-circle"></i></div>
            <h3>¡Solicitud Enviada!</h3>
            <p>Un especialista Garza se pondrá en contacto con usted en breve.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadPopup;
