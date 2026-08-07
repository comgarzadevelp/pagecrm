import React, { useState, useEffect } from 'react';
import './LeadPopup.css';

const LeadPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Show after 3 seconds as requested
    const timer = setTimeout(() => {
      // TEMPORARILY DISABLED FOR REVIEW: sessionStorage check
      // const hasSeen = sessionStorage.getItem('garza_popup_seen_v4');
      // if (!hasSeen) {
      setIsVisible(true);
      // }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('garza_popup_seen_v4', 'true');
    // Dispatch event to trigger AI Chat after 3 seconds
    window.dispatchEvent(new CustomEvent('popupClosed'));
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
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
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/leads/popup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar el prospecto.');
      }
      
      console.log('WhatsApp guardado en Supabase exitosamente:', data);
      setIsSent(true);
      alert('¡WhatsApp registrado y enviado con éxito a la base de datos!');
      
      // Después de 2 segundos de mostrar "enviado", cerrar y disparar chat
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Error al enviar el WhatsApp al servidor:', err);
      setErrorMsg(err.message || 'Error de conexión con el servidor Garza.');
      alert('Fallo al registrar el número: ' + (err.message || 'Error de conexión con el servidor.'));
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
