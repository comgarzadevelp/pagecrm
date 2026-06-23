import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function RegistrarVisitaModal({ isOpen, onClose, entityType, entityId, entityName }) {
  const { showToast } = useUX();
  const [tipo, setTipo] = useState('visita_presencial'); // 'visita_presencial' | 'llamada' | 'reunion_virtual'
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');
  const [gps, setGps] = useState(null);
  const [gettingGps, setGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && tipo === 'visita_presencial') {
      acquireGps();
    }
  }, [isOpen, tipo]);

  const acquireGps = () => {
    setGettingGps(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización.');
      setGettingGps(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGettingGps(false);
      },
      (error) => {
        setGpsError('Permiso denegado o error al obtener ubicación. Obligatorio para visitas presenciales.');
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resultado.trim()) {
      showToast('Debes ingresar un resultado o resumen de la visita/llamada.', 'warning');
      return;
    }
    if (tipo === 'visita_presencial' && !gps) {
      showToast('La ubicación GPS es obligatoria para visitas presenciales.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tipo,
        resultado,
        notas,
        contact_id: entityType === 'contact' ? entityId : null,
        company_id: entityType === 'company' ? entityId : null,
        obra_id: entityType === 'obra' ? entityId : null,
        gps_lat: gps ? gps.lat : null,
        gps_lng: gps ? gps.lng : null
      };

      const res = await fetch(`${API_BASE}/api/crm/visitas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar la visita');

      showToast('Visita registrada con éxito. La hora ha sido verificada por el servidor.', 'success');
      onClose(true); // pass true to indicate success/reload
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="crm-modal-overlay">
      <div className="crm-modal-content glass" style={{ maxWidth: '500px' }}>
        <div className="crm-modal-header">
          <h3>Registrar Actividad / Visita</h3>
          <button className="crm-close-modal" onClick={() => onClose(false)}><i className="fas fa-times" /></button>
        </div>
        <form onSubmit={handleSubmit} className="crm-modal-body">
          
          <div className="crm-alert-box info" style={{ marginBottom: '1rem' }}>
            <i className="fas fa-info-circle" />
            <p><strong>{entityName}</strong><br/>La fecha y hora de este registro será asignada de manera segura por el servidor al momento de guardar.</p>
          </div>

          <div className="crm-input-group">
            <label className="crm-input-label">Tipo de Actividad</label>
            <select
              className="crm-login-input"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              required
            >
              <option value="visita_presencial">📍 Visita Presencial (Requiere GPS)</option>
              <option value="llamada">📞 Llamada Telefónica</option>
              <option value="reunion_virtual">💻 Reunión Virtual / Teams / Zoom</option>
            </select>
          </div>

          {tipo === 'visita_presencial' && (
            <div className={`crm-alert-box ${gps ? 'success' : gpsError ? 'danger' : 'warning'}`} style={{ marginBottom: '1rem' }}>
              {gettingGps ? (
                <><i className="fas fa-spinner fa-spin" /> <p>Obteniendo ubicación...</p></>
              ) : gps ? (
                <><i className="fas fa-map-marker-alt" /> <p>Ubicación capturada: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p></>
              ) : (
                <><i className="fas fa-exclamation-triangle" /> <p>{gpsError || 'Esperando ubicación GPS...'}</p>
                <button type="button" className="btn-secondary" style={{ marginTop: '0.5rem', padding: '0.3rem 0.6rem' }} onClick={acquireGps}>
                  <i className="fas fa-sync" /> Reintentar GPS
                </button></>
              )}
            </div>
          )}

          <div className="crm-input-group">
            <label className="crm-input-label">Resultado / Acuerdos</label>
            <textarea
              className="crm-login-input"
              style={{ minHeight: '100px', resize: 'vertical' }}
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              placeholder="Ej. Se acordó enviar cotización de material eléctrico para el proyecto X..."
              required
            />
          </div>

          <div className="crm-input-group">
            <label className="crm-input-label">Notas Internas (Opcional)</label>
            <textarea
              className="crm-login-input"
              style={{ minHeight: '60px', resize: 'vertical' }}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles adicionales para ti..."
            />
          </div>

          <div className="crm-modal-footer">
            <button type="button" className="btn-secondary" onClick={() => onClose(false)} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary-golden" disabled={isSubmitting || (tipo === 'visita_presencial' && !gps)}>
              {isSubmitting ? 'Guardando...' : 'Registrar Actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
