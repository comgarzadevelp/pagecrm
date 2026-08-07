import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';
import './VisitasEnFrioPanel.css';

const getLocalDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
};

export default function VisitasEnFrioPanel({ coldVisits, onSaveVisit, onDeleteVisit }) {
  const { showToast, showConfirm } = useUX();
  
  const [form, setForm] = useState(() => {
    const local = getLocalDateTime();
    return { date: local.date, time: local.time, address: '', notes: '' };
  });

  const [coords, setCoords] = useState(null);
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const autocompleteRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // 1. Load Google Maps API script dynamically
  useEffect(() => {
    if (!apiKey) {
      console.warn('[VisitasEnFrio] VITE_GOOGLE_MAPS_API_KEY is not configured');
      return;
    }
    if (window.google && window.google.maps) {
      setIsMapsApiLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleScriptLoad = () => setIsMapsApiLoaded(true);
    script.addEventListener('load', handleScriptLoad);

    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
      }
    };
  }, [apiKey]);

  // 2. Fetch Device Geolocation
  const handleGetLocation = (manual = false) => {
    if (!navigator.geolocation) {
      showToast('La geolocalización no es compatible con este navegador.', 'error');
      return;
    }

    setLoadingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };
        setCoords(latLng);

        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: latLng }, (results, status) => {
            setLoadingGps(false);
            if (status === 'OK' && results[0]) {
              setForm(prev => ({ ...prev, address: results[0].formatted_address }));
              if (manual) showToast('Ubicación actualizada con éxito.', 'success');
            } else {
              setForm(prev => ({ ...prev, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
              if (manual) showToast('Ubicación obtenida (coordenadas de fallback).', 'info');
            }
          });
        } else {
          setLoadingGps(false);
          setForm(prev => ({ ...prev, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
          if (manual) showToast('Coordenadas obtenidas. Google Maps cargando...', 'info');
        }
      },
      (error) => {
        setLoadingGps(false);
        let errorMsg = 'No se pudo acceder al GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Permiso de ubicación denegado en el dispositivo.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Ubicación no disponible.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Tiempo de espera agotado al obtener ubicación.';
        }
        setGpsError(errorMsg);
        showToast(errorMsg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 3. Auto-fetch Geolocation on load
  useEffect(() => {
    handleGetLocation(false);
  }, []);

  // 4. Reverse Geocode coordinates once Google Maps API is loaded
  useEffect(() => {
    if (coords && isMapsApiLoaded && window.google && window.google.maps) {
      // If address is currently empty or just contains coordinates, geocode it
      const isCoordsFormat = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(form.address.trim());
      if (!form.address || isCoordsFormat) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: coords }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setForm(prev => ({ ...prev, address: results[0].formatted_address }));
          }
        });
      }
    }
  }, [coords, isMapsApiLoaded]);

  // 5. Initialize Google Places Autocomplete on Address Input
  useEffect(() => {
    if (!isMapsApiLoaded) return;
    const input = document.getElementById('cold-visit-address-input');
    if (!input) return;

    const preventEnter = (e) => {
      if (e.key === 'Enter') e.preventDefault();
    };
    input.addEventListener('keydown', preventEnter);

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['geocode', 'establishment'],
      fields: ['formatted_address', 'geometry', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        setForm(prev => ({ ...prev, address }));
        setCoords({ lat, lng });
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      input.removeEventListener('keydown', preventEnter);
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(input);
      }
    };
  }, [isMapsApiLoaded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.address) {
      showToast('Por favor completa la fecha y dirección.', 'warning');
      return;
    }
    onSaveVisit({ id: 'visit-' + Date.now(), ...form });
    
    // Reset to current time and clear address/notes
    const local = getLocalDateTime();
    setForm({ date: local.date, time: local.time, address: '', notes: '' });
    setCoords(null);
    showToast('Visita registrada con éxito.', 'success');
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm(
      '¿Eliminar visita?',
      '¿Deseas eliminar este registro de visita?',
      { type: 'danger' }
    );
    if (!confirmed) return;
    onDeleteVisit(id);
  };

  return (
    <div className="visitas-frio-wrapper">
      <div className="agenda-two-columns">
        <form onSubmit={handleSubmit} className="agenda-panel-card glass form-side">
          <h4><i className="fas fa-plus-circle" /> Registrar Visita en Frío</h4>
          
          <div className="form-row-visitas">
            <div className="form-group-agenda">
              <label>Fecha de la visita *</label>
              <div className="input-with-icon">
                <i className="fas fa-calendar-alt icon-field" />
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="form-group-agenda">
              <label>Hora *</label>
              <div className="input-with-icon">
                <i className="fas fa-clock icon-field" />
                <input
                  type="time"
                  required
                  value={form.time}
                  onChange={e => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-group-agenda">
            <label>Dirección / Ubicación *</label>
            <div className="input-with-icon-button">
              <div className="input-with-icon flex-grow">
                <i className="fas fa-map-marker-alt icon-field" />
                <input
                  id="cold-visit-address-input"
                  type="text"
                  required
                  placeholder="Obteniendo ubicación del dispositivo..."
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                className={`btn-gps-locator ${loadingGps ? 'loading' : ''}`}
                onClick={() => handleGetLocation(true)}
                title="Actualizar Ubicación GPS"
              >
                <i className={`fas ${loadingGps ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`} />
              </button>
            </div>
            {gpsError && <span className="gps-error-text"><i className="fas fa-exclamation-triangle" /> {gpsError}</span>}
          </div>

          <div className="form-group-agenda">
            <label>Notas / Evidencia visual</label>
            <div className="input-with-icon textarea-container">
              <i className="fas fa-pen icon-field textarea-icon" />
              <textarea
                placeholder="Ej: Obra cerrada, guardia comenta que regresan a las 3pm..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <button type="submit" className="btn-agenda-action">
            <i className="fas fa-save" /> Guardar Visita
          </button>
        </form>

        <div className="agenda-panel-card glass list-side">
          <h4><i className="fas fa-history" /> Historial de Visitas</h4>
          {coldVisits.length === 0 ? (
            <p className="empty-text">No has registrado visitas en frío todavía.</p>
          ) : (
            <div className="agenda-items-list">
              {coldVisits.map(v => (
                <div className="agenda-item-row" key={v.id}>
                  <div className="item-info">
                    <h5>📍 {v.address}</h5>
                    <span className="item-subtext">📅 {v.date} {v.time && `• ⏰ ${v.time}`}</span>
                    {v.notes && <p className="item-desc">"{v.notes}"</p>}
                  </div>
                  <button type="button" className="btn-delete-item" onClick={() => handleDelete(v.id)}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

VisitasEnFrioPanel.propTypes = {
  coldVisits: PropTypes.array.isRequired,
  onSaveVisit: PropTypes.func.isRequired,
  onDeleteVisit: PropTypes.func.isRequired,
};

