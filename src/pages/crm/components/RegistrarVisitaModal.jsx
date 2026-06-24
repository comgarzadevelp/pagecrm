import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Helper para obtener fecha y hora local en formato YYYY-MM-DDTHH:MM
const getLocalDateString = (daysOffset = 0) => {
  const d = new Date();
  if (daysOffset > 0) {
    d.setDate(d.getDate() + daysOffset);
    d.setHours(10, 0, 0, 0); // Mañana a las 10:00 AM por defecto para actividades
  }
  const tzoffset = d.getTimezoneOffset() * 60000;
  return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
};

export default function RegistrarVisitaModal({ isOpen, onClose, entityType, entityId, entityName, defaultFuture = false }) {
  const { showToast } = useUX();
  const [tipo, setTipo] = useState(defaultFuture ? 'llamada' : 'visita_presencial'); // 'visita_presencial' | 'llamada' | 'reunion_virtual'
  const [fecha, setFecha] = useState(getLocalDateString(defaultFuture ? 1 : 0));
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');
  const [gps, setGps] = useState(null);
  const [gettingGps, setGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFuture = fecha ? new Date(fecha) > new Date() : false;

  // Buscador interactivo de entidades si no hay entityId
  const [chosenEntityType, setChosenEntityType] = useState('company');
  const [chosenEntityText, setChosenEntityText] = useState('');
  const [chosenEntityId, setChosenEntityId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (entityId) return; // Si ya hay entidad de prop, no hacer nada
    if (!chosenEntityText.trim() || chosenEntityText.trim().length < 2 || chosenEntityId) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem('token');
        let endpoint = '';
        if (chosenEntityType === 'company') {
          endpoint = `${API_BASE}/api/crm/companies/search?q=${encodeURIComponent(chosenEntityText.trim())}`;
        } else if (chosenEntityType === 'contact') {
          endpoint = `${API_BASE}/api/crm/contacts/search?q=${encodeURIComponent(chosenEntityText.trim())}`;
        } else if (chosenEntityType === 'obra') {
          endpoint = `${API_BASE}/api/crm/obras/search?q=${encodeURIComponent(chosenEntityText.trim())}`;
        }

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          let items = [];
          if (chosenEntityType === 'company') {
            items = (data.companies || []).map(c => ({ id: c.id, name: c.name }));
          } else if (chosenEntityType === 'contact') {
            items = (data.contacts || []).map(c => ({ id: c.id, name: c.name }));
          } else if (chosenEntityType === 'obra') {
            items = (data.obras || []).map(o => ({ id: o.id, name: o.name }));
          }
          setSearchResults(items);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Error al buscar entidades:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [chosenEntityText, chosenEntityType, entityId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTypeChange = (type) => {
    setChosenEntityType(type);
    setChosenEntityText('');
    setChosenEntityId(null);
    setSearchResults([]);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (isOpen && tipo === 'visita_presencial' && !isFuture) {
      acquireGps();
    } else {
      setGps(null);
    }
  }, [isOpen, tipo, isFuture]);

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
    
    const finalEntityType = entityId ? entityType : chosenEntityType;
    const finalEntityId = entityId ? entityId : chosenEntityId;

    if (!finalEntityId) {
      showToast('Debes buscar y seleccionar una Empresa, Contacto u Obra para registrar la actividad.', 'warning');
      return;
    }

    if (tipo === 'visita_presencial' && !isFuture && !gps) {
      showToast('La ubicación GPS es obligatoria para visitas presenciales en tiempo real.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tipo,
        resultado,
        notas,
        contact_id: finalEntityType === 'contact' ? finalEntityId : null,
        company_id: finalEntityType === 'company' ? finalEntityId : null,
        obra_id: finalEntityType === 'obra' ? finalEntityId : null,
        gps_lat: (!isFuture && gps) ? gps.lat : null,
        gps_lng: (!isFuture && gps) ? gps.lng : null,
        timestamp_servidor: fecha ? new Date(fecha).toISOString() : null
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

      showToast(
        isFuture 
          ? 'Recordatorio de actividad programado con éxito.' 
          : 'Visita registrada con éxito. La hora ha sido grabada correctamente.', 
        'success'
      );
      onClose(true); // pass true to indicate success/reload
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="crm-modal-overlay">
      <div className="crm-modal-content glass" style={{ maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', width: '96%', padding: 0, overflow: 'hidden' }}>
        <div className="crm-modal-header" style={{ flexShrink: 0, padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: 0 }}>{isFuture ? 'Programar Actividad / Recordatorio' : 'Registrar Actividad / Visita'}</h3>
          <button className="crm-close-modal" onClick={() => onClose(false)}><i className="fas fa-times" /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
          
          {/* Contenedor de campos con scroll vertical */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {entityId ? (
              <div className="crm-alert-box info" style={{ marginBottom: 0 }}>
                <i className="fas fa-info-circle" />
                <p>
                  <strong>{entityName}</strong><br/>
                  {isFuture 
                    ? 'Esta actividad se guardará como un recordatorio programado para la fecha seleccionada.' 
                    : 'La actividad se registrará con la fecha y hora seleccionadas (por defecto, ahora).'}
                </p>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: 0 }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--color-brand-primary, #05393a)', fontWeight: 'bold' }}>
                  <i className="fas fa-search" style={{ marginRight: '6px' }} /> Seleccionar Empresa, Contacto u Obra
                </h4>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('company')}
                    style={{
                      flex: 1, padding: '6px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1',
                      background: chosenEntityType === 'company' ? 'var(--color-brand-primary, #05393a)' : '#fff',
                      color: chosenEntityType === 'company' ? '#fff' : '#475569',
                      fontWeight: chosenEntityType === 'company' ? 'bold' : 'normal'
                    }}
                  >
                    🏢 Empresa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('contact')}
                    style={{
                      flex: 1, padding: '6px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1',
                      background: chosenEntityType === 'contact' ? 'var(--color-brand-primary, #05393a)' : '#fff',
                      color: chosenEntityType === 'contact' ? '#fff' : '#475569',
                      fontWeight: chosenEntityType === 'contact' ? 'bold' : 'normal'
                    }}
                  >
                    👤 Contacto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('obra')}
                    style={{
                      flex: 1, padding: '6px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1',
                      background: chosenEntityType === 'obra' ? 'var(--color-brand-primary, #05393a)' : '#fff',
                      color: chosenEntityType === 'obra' ? '#fff' : '#475569',
                      fontWeight: chosenEntityType === 'obra' ? 'bold' : 'normal'
                    }}
                  >
                    🏗️ Obra
                  </button>
                </div>

                <div style={{ position: 'relative' }} ref={searchContainerRef}>
                  {!chosenEntityId ? (
                    <>
                      <input
                        type="text"
                        className="crm-login-input"
                        style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                        placeholder={`Buscar ${chosenEntityType === 'company' ? 'empresa' : chosenEntityType === 'contact' ? 'contacto' : 'obra'} (mínimo 2 letras)...`}
                        value={chosenEntityText}
                        onChange={(e) => {
                          setChosenEntityText(e.target.value);
                          setChosenEntityId(null);
                        }}
                        required
                      />
                      {searching && (
                        <div style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                          <i className="fas fa-spinner fa-spin" />
                        </div>
                      )}
                      {showSuggestions && searchResults.length > 0 && (
                        <ul className="crm-autocomplete-dropdown glass" style={{
                          position: 'absolute', top: '100%', left: 0, width: '100%', background: '#fff',
                          border: '1px solid #cbd5e1', borderRadius: '8px', listStyle: 'none', padding: 0, margin: '4px 0 0 0',
                          zIndex: 9999, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          {searchResults.map((item) => (
                            <li
                              key={item.id}
                              onClick={() => {
                                setChosenEntityId(item.id);
                                setChosenEntityText(item.name);
                                setShowSuggestions(false);
                              }}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <strong>{item.name}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                      {showSuggestions && searchResults.length === 0 && chosenEntityText.trim().length >= 2 && !searching && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, width: '100%', background: '#fff',
                          border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', margin: '4px 0 0 0',
                          zIndex: 9999, fontSize: '0.8rem', color: '#64748b', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          No se encontraron resultados para su búsqueda.
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px' }}>
                      <span style={{ fontWeight: '600', color: '#065f46', fontSize: '0.85rem' }}>
                        <i className="fas fa-check-circle" style={{ marginRight: '6px' }} />
                        {chosenEntityText}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setChosenEntityId(null);
                          setChosenEntityText('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                      >
                        <i className="fas fa-times-circle" /> Cambiar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="crm-input-group">
              <label className="crm-input-label">Tipo de Actividad</label>
              <select
                className="crm-login-input"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
              >
                <option value="visita_presencial">📍 Visita Presencial</option>
                <option value="llamada">📞 Llamada Telefónica</option>
                <option value="reunion_virtual">💻 Reunión Virtual / Teams / Zoom</option>
              </select>
            </div>

            <div className="crm-input-group">
              <label className="crm-input-label">Fecha y Hora de la Actividad / Recordatorio</label>
              <input
                type="datetime-local"
                className="crm-login-input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>

            {tipo === 'visita_presencial' && !isFuture && (
              <div className={`crm-alert-box ${gps ? 'success' : gpsError ? 'danger' : 'warning'}`} style={{ marginBottom: 0 }}>
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

            {tipo === 'visita_presencial' && isFuture && (
              <div className="crm-alert-box info" style={{ marginBottom: 0, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
                <i className="fas fa-calendar-check" />
                <p>Visita presencial agendada a futuro. No se requiere geolocalización (GPS) para su programación.</p>
              </div>
            )}

            <div className="crm-input-group">
              <label className="crm-input-label">Resultado / Acuerdos</label>
              <textarea
                className="crm-login-input"
                style={{ minHeight: '100px', resize: 'vertical' }}
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                placeholder={isFuture ? "Ej. Se acordó visitar para presentar catálogo de transformadores..." : "Ej. Se acordó enviar cotización de material eléctrico para el proyecto X..."}
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
          </div>

          {/* Pie de página fijo */}
          <div className="crm-modal-footer" style={{ flexShrink: 0, borderTop: '1px solid rgba(0,0,0,0.06)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(5px)', margin: 0 }}>
            <button type="button" className="btn-secondary" onClick={() => onClose(false)} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn-primary-golden" disabled={isSubmitting || (tipo === 'visita_presencial' && !isFuture && !gps)}>
              {isSubmitting ? 'Guardando...' : isFuture ? 'Programar Recordatorio' : 'Registrar Actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
