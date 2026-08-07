import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import { 
  Search, 
  User, 
  Briefcase, 
  Calendar, 
  MapPin, 
  Clock, 
  Check, 
  AlertTriangle, 
  X, 
  Phone, 
  Video, 
  Map, 
  Navigation,
  FileText,
  Activity
} from 'lucide-react';

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

  // Selector de entidad alineado con la nueva app (Clientes o Negociaciones)
  const [activeTab, setActiveTab] = useState('cliente'); // 'cliente' | 'obra'
  const [searchText, setSearchText] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [customersCache, setCustomersCache] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchContainerRef = useRef(null);

  // Cargar Clientes para la pestaña "Cliente / Prospecto" (Capa B: Local 0ms)
  useEffect(() => {
    if (entityId) return;
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.customers)) {
          // Mapear al formato unificado
          const mapped = data.customers.map(c => {
            let actualCompanyId = c.company_id;
            if (c.notes) {
              try {
                const parsed = JSON.parse(c.notes);
                if (parsed.company_id) actualCompanyId = parsed.company_id;
              } catch(e) {}
            }
            return {
              id: String(c.id),
              nombre: c.name || '',
              company: c.company || '',
              company_id: actualCompanyId,
              email: c.email || '',
              phone: c.phone || '',
              type: 'cliente'
            };
          });
          setCustomersCache(mapped);
        }
      } catch (err) {
        console.error('Error al precargar clientes:', err);
      }
    };
    fetchCustomers();
  }, [entityId]);

  // Manejo de búsqueda en tiempo real
  useEffect(() => {
    if (entityId) return;
    if (!searchText.trim() || searchText.trim().length < 2 || selectedEntity) {
      setSearchResults([]);
      return;
    }

    if (activeTab === 'cliente') {
      // Búsqueda local inmediata en Clientes (0ms)
      const query = searchText.toLowerCase();
      const filtered = customersCache.filter(c => 
        c.nombre.toLowerCase().includes(query) || 
        c.company.toLowerCase().includes(query)
      );
      setSearchResults(filtered.slice(0, 10));
      setShowSuggestions(true);
    } else if (activeTab === 'obra') {
      // Búsqueda en API para Obras/Negociaciones con debounce
      const delayDebounce = setTimeout(async () => {
        setSearching(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/crm/obras/search?q=${encodeURIComponent(searchText.trim())}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.obras)) {
            const mapped = data.obras.map(o => ({
              id: o.id,
              nombre: o.name || 'Sin nombre',
              company: o.empresa_nombre || '',
              company_id: o.empresa_id,
              type: 'obra'
            }));
            setSearchResults(mapped);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error('Error al buscar obras:', err);
        } finally {
          setSearching(false);
        }
      }, 400);

      return () => clearTimeout(delayDebounce);
    }
  }, [searchText, activeTab, customersCache, selectedEntity, entityId]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchText('');
    setSelectedEntity(null);
    setSearchResults([]);
    setShowSuggestions(false);
  };

  // Autocaptura de GPS para visitas presenciales en tiempo real
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
    
    // Resolver IDs de entidad
    let finalContactId = null;
    let finalCompanyId = null;
    let finalObraId = null;

    if (entityId) {
      if (entityType === 'contact') finalContactId = entityId;
      else if (entityType === 'company') finalCompanyId = entityId;
      else if (entityType === 'obra') finalObraId = entityId;
    } else {
      if (!selectedEntity) {
        showToast('Debes buscar y seleccionar un Cliente o Negociación para programar la actividad.', 'warning');
        return;
      }
      if (selectedEntity.type === 'cliente') {
        finalContactId = selectedEntity.id;
        finalCompanyId = selectedEntity.company_id || null;
      } else if (selectedEntity.type === 'obra') {
        finalObraId = selectedEntity.id;
        finalCompanyId = selectedEntity.company_id || null;
      }
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
        contact_id: finalContactId,
        company_id: finalCompanyId,
        obra_id: finalObraId,
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
      onClose(true); // Indica éxito
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="crm-modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(5, 57, 58, 0.4)' }}>
      <div className="crm-modal-content glass" style={{ 
        maxWidth: '520px', 
        maxHeight: '92vh', 
        display: 'flex', 
        flexDirection: 'column', 
        width: '96%', 
        padding: 0, 
        overflow: 'hidden',
        border: '1px solid rgba(5, 57, 58, 0.15)',
        boxShadow: '0 20px 40px rgba(5, 57, 58, 0.15)',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.95)'
      }}>
        {/* Cabecera del modal premium */}
        <div className="crm-modal-header" style={{ 
          flexShrink: 0, 
          padding: '1.5rem', 
          borderBottom: '1px solid rgba(5, 57, 58, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to right, rgba(5, 57, 58, 0.02), rgba(224, 146, 43, 0.02))'
        }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontFamily: "'Roc Grotesk', sans-serif", 
              fontSize: '1.25rem', 
              color: '#05393A', 
              fontWeight: '850',
              letterSpacing: '-0.02em',
              textTransform: 'uppercase'
            }}>
              {isFuture ? 'Programar Actividad / Recordatorio' : 'Registrar Actividad / Visita'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.775rem', color: '#738787', fontFamily: "'Public Sans', sans-serif" }}>
              Agenda tareas futuras o reporta acciones inmediatas en campo.
            </p>
          </div>
          <button 
            className="crm-close-modal" 
            onClick={() => onClose(false)}
            style={{ 
              background: 'rgba(5, 57, 58, 0.05)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#05393A',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(5, 57, 58, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(5, 57, 58, 0.05)'}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
          {/* Cuerpo con Scroll */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem',
            scrollbarWidth: 'thin'
          }}>
            {entityId ? (
              // Vista si ya viene pre-asociado
              <div style={{ 
                padding: '1rem 1.25rem', 
                background: 'rgba(5, 57, 58, 0.04)', 
                border: '1px solid rgba(5, 57, 58, 0.12)', 
                borderRadius: '14px', 
                color: '#05393A', 
                fontFamily: "'Public Sans', sans-serif", 
                fontSize: '0.825rem', 
                display: 'flex', 
                gap: '10px', 
                alignItems: 'center' 
              }}>
                <Activity size={18} style={{ color: '#E0922B', flexShrink: 0 }} />
                <p style={{ margin: 0, lineHeight: '1.4' }}>
                  Vinculado a: <strong>{entityName}</strong><br/>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    {isFuture 
                      ? 'La actividad se guardará como un recordatorio para este cliente.' 
                      : 'La actividad se registrará directamente en su historial.'}
                  </span>
                </p>
              </div>
            ) : (
              // Selector interactivo alineado con la nueva arquitectura
              <div style={{ 
                background: 'rgba(5, 57, 58, 0.02)', 
                border: '1px solid rgba(5, 57, 58, 0.08)', 
                borderRadius: '16px', 
                padding: '1.25rem', 
                fontFamily: "'Public Sans', sans-serif" 
              }}>
                <h4 style={{ 
                  margin: '0 0 0.85rem 0', 
                  fontSize: '0.825rem', 
                  color: '#05393A', 
                  fontWeight: '800', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  fontFamily: "'Roc Grotesk', sans-serif"
                }}>
                  <Search size={14} style={{ color: '#E0922B' }} /> VINCULAR ACTIVIDAD A:
                </h4>
                
                {/* Tabs Modernos */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', background: 'rgba(5, 57, 58, 0.04)', padding: '4px', borderRadius: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleTabChange('cliente')}
                    style={{
                      flex: 1, 
                      padding: '8px 12px', 
                      fontSize: '0.75rem', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      border: 'none',
                      background: activeTab === 'cliente' ? '#05393A' : 'transparent',
                      color: activeTab === 'cliente' ? '#fff' : '#738787',
                      fontWeight: '700',
                      transition: 'all 0.2s',
                      fontFamily: "'Public Sans', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <User size={12} /> Cliente / Prospecto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('obra')}
                    style={{
                      flex: 1, 
                      padding: '8px 12px', 
                      fontSize: '0.75rem', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      border: 'none',
                      background: activeTab === 'obra' ? '#05393A' : 'transparent',
                      color: activeTab === 'obra' ? '#fff' : '#738787',
                      fontWeight: '700',
                      transition: 'all 0.2s',
                      fontFamily: "'Public Sans', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Briefcase size={12} /> Negociación / Obra
                  </button>
                </div>

                {/* Caja de Búsqueda */}
                <div style={{ position: 'relative' }} ref={searchContainerRef}>
                  {!selectedEntity ? (
                    <>
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ 
                          fontSize: '0.85rem', 
                          padding: '10px 14px 10px 36px', 
                          height: '42px', 
                          border: '1px solid rgba(5, 57, 58, 0.15)', 
                          borderRadius: '10px', 
                          width: '100%', 
                          boxSizing: 'border-box', 
                          fontFamily: "'Public Sans', sans-serif",
                          background: '#fff',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        placeholder={activeTab === 'cliente' ? 'Buscar cliente o empresa (mínimo 2 letras)...' : 'Buscar negociación u obra...'}
                        required
                      />
                      <Search size={14} style={{ position: 'absolute', left: '12px', top: '14px', color: '#738787' }} />
                      
                      {searching && (
                        <div style={{ position: 'absolute', right: '12px', top: '14px', fontSize: '0.75rem', color: '#738787' }}>
                          <i className="fas fa-spinner fa-spin" />
                        </div>
                      )}
                      
                      {/* Dropdown de Autocomplete */}
                      {showSuggestions && searchResults.length > 0 && (
                        <ul style={{
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          width: '100%', 
                          background: '#fff',
                          border: '1px solid rgba(5, 57, 58, 0.12)', 
                          borderRadius: '12px', 
                          listStyle: 'none', 
                          padding: '0.25rem', 
                          margin: '6px 0 0 0',
                          zIndex: 999, 
                          maxHeight: '180px', 
                          overflowY: 'auto', 
                          boxShadow: '0 12px 30px rgba(5, 57, 58, 0.1)'
                        }}>
                          {searchResults.map((item) => (
                            <li
                              key={item.id}
                              onClick={() => {
                                setSelectedEntity(item);
                                setSearchText(item.nombre);
                                setShowSuggestions(false);
                              }}
                              style={{ 
                                padding: '10px 12px', 
                                cursor: 'pointer', 
                                fontSize: '0.8rem', 
                                borderRadius: '8px', 
                                fontFamily: "'Public Sans', sans-serif", 
                                color: '#334155',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(5, 57, 58, 0.04)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <span style={{ fontWeight: '700', color: '#05393A' }}>{item.nombre}</span>
                              {item.company && (
                                <span style={{ fontSize: '0.7rem', color: '#738787', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🏢 {item.company}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {showSuggestions && searchResults.length === 0 && searchText.trim().length >= 2 && !searching && (
                        <div style={{
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          width: '100%', 
                          background: '#fff',
                          border: '1px solid rgba(5, 57, 58, 0.12)', 
                          borderRadius: '12px', 
                          padding: '12px', 
                          margin: '6px 0 0 0',
                          zIndex: 999, 
                          fontSize: '0.775rem', 
                          color: '#738787', 
                          boxShadow: '0 12px 30px rgba(5, 57, 58, 0.1)', 
                          fontFamily: "'Public Sans', sans-serif"
                        }}>
                          No se encontraron resultados para su búsqueda.
                        </div>
                      )}
                    </>
                  ) : (
                    /* Entidad seleccionada Badge Premium */
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '10px 14px', 
                      background: 'rgba(16, 185, 129, 0.06)', 
                      border: '1px solid rgba(16, 185, 129, 0.25)', 
                      borderRadius: '10px',
                      fontFamily: "'Public Sans', sans-serif"
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={16} style={{ color: '#10b981' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '750', color: '#065f46', fontSize: '0.825rem' }}>
                            {selectedEntity.nombre}
                          </span>
                          {selectedEntity.company && (
                            <span style={{ fontSize: '0.7rem', color: '#047857' }}>
                              🏢 {selectedEntity.company}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEntity(null);
                          setSearchText('');
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#ef4444', 
                          cursor: 'pointer', 
                          fontSize: '0.75rem', 
                          fontWeight: '800', 
                          fontFamily: "'Public Sans', sans-serif",
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inputs Tipo, Fecha, y Hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontFamily: "'Public Sans', sans-serif", fontWeight: '750', fontSize: '0.775rem', color: '#738787', textTransform: 'uppercase' }}>
                  Tipo de Actividad
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  style={{ 
                    height: '42px', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(5, 57, 58, 0.15)', 
                    fontSize: '0.825rem', 
                    padding: '0 10px', 
                    fontFamily: "'Public Sans', sans-serif", 
                    fontWeight: '600',
                    outline: 'none',
                    background: '#fff'
                  }}
                  required
                >
                  <option value="visita_presencial">📍 Visita Presencial</option>
                  <option value="llamada">📞 Llamada Telefónica</option>
                  <option value="reunion_virtual">💻 Reunión Virtual / Teams</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontFamily: "'Public Sans', sans-serif", fontWeight: '750', fontSize: '0.775rem', color: '#738787', textTransform: 'uppercase' }}>
                  Fecha y Hora
                </label>
                <input
                  type="datetime-local"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={{ 
                    height: '42px', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(5, 57, 58, 0.15)', 
                    fontSize: '0.825rem', 
                    fontFamily: "'Public Sans', sans-serif", 
                    fontWeight: '600', 
                    padding: '0 10px',
                    outline: 'none',
                    background: '#fff'
                  }}
                  required
                />
              </div>
            </div>

            {/* GPS Alertas Integradas */}
            {tipo === 'visita_presencial' && !isFuture && (
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center',
                gap: '10px', 
                fontSize: '0.775rem', 
                fontFamily: "'Public Sans', sans-serif", 
                border: '1px solid',
                backgroundColor: gps ? 'rgba(16, 185, 129, 0.06)' : gpsError ? 'rgba(239, 68, 68, 0.06)' : 'rgba(245, 158, 11, 0.06)',
                borderColor: gps ? 'rgba(16, 185, 129, 0.25)' : gpsError ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                color: gps ? '#065f46' : gpsError ? '#991b1b' : '#92400e'
              }}>
                {gettingGps ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <p style={{ margin: 0 }}>Obteniendo ubicación GPS obligatoria...</p>
                  </>
                ) : gps ? (
                  <>
                    <MapPin size={16} style={{ color: '#10b981' }} />
                    <p style={{ margin: 0, fontWeight: '600' }}>Ubicación capturada: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>
                  </>
                ) : (
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      <p style={{ margin: 0 }}>{gpsError || 'Esperando ubicación GPS...'}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={acquireGps}
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '0.7rem', 
                        borderRadius: '6px', 
                        border: '1px solid', 
                        borderColor: 'inherit',
                        background: 'transparent',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Resultado / Acuerdos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontFamily: "'Public Sans', sans-serif", fontWeight: '750', fontSize: '0.775rem', color: '#738787', textTransform: 'uppercase' }}>
                Resumen / Acuerdos
              </label>
              <textarea
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                placeholder={isFuture ? "Ej. Se acordó visitar al cliente para presentar catálogo de transformadores..." : "Ej. Se conversó sobre los precios de conductores y se agendó cotización..."}
                style={{ 
                  minHeight: '85px', 
                  resize: 'vertical', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(5, 57, 58, 0.15)', 
                  fontSize: '0.825rem', 
                  padding: '10px 12px', 
                  fontFamily: "'Public Sans', sans-serif", 
                  lineHeight: '1.4',
                  outline: 'none',
                  background: '#fff'
                }}
                required
              />
            </div>

            {/* Notas Internas Opcionales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontFamily: "'Public Sans', sans-serif", fontWeight: '750', fontSize: '0.775rem', color: '#738787', textTransform: 'uppercase' }}>
                Notas Internas (Opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas de control interno visible solo para ti..."
                style={{ 
                  minHeight: '55px', 
                  resize: 'vertical', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(5, 57, 58, 0.15)', 
                  fontSize: '0.825rem', 
                  padding: '10px 12px', 
                  fontFamily: "'Public Sans', sans-serif", 
                  lineHeight: '1.4',
                  outline: 'none',
                  background: '#fff'
                }}
              />
            </div>
          </div>

          {/* Pie de página fijo */}
          <div className="crm-modal-footer" style={{ 
            flexShrink: 0, 
            borderTop: '1px solid rgba(5, 57, 58, 0.08)', 
            padding: '1.25rem 1.5rem', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px', 
            background: 'rgba(255,255,255,0.8)', 
            backdropFilter: 'blur(10px)', 
            margin: 0 
          }}>
            <button 
              type="button" 
              onClick={() => onClose(false)}
              disabled={isSubmitting}
              style={{ 
                height: '40px', 
                padding: '0 1.25rem', 
                borderRadius: '10px', 
                fontSize: '0.8rem', 
                fontWeight: '700', 
                border: '1px solid rgba(5, 57, 58, 0.15)', 
                background: '#fff', 
                color: '#738787',
                cursor: 'pointer', 
                fontFamily: "'Public Sans', sans-serif",
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(5, 57, 58, 0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || (tipo === 'visita_presencial' && !isFuture && !gps)}
              style={{ 
                height: '40px', 
                padding: '0 1.5rem', 
                borderRadius: '10px', 
                fontSize: '0.8rem', 
                fontWeight: '800', 
                border: 'none', 
                background: '#E0922B', 
                color: '#fff', 
                fontFamily: "'Public Sans', sans-serif", 
                boxShadow: '0 4px 14px rgba(224, 146, 43, 0.25)',
                transition: 'all 0.2s',
                opacity: (isSubmitting || (tipo === 'visita_presencial' && !isFuture && !gps)) ? 0.5 : 1, 
                cursor: (isSubmitting || (tipo === 'visita_presencial' && !isFuture && !gps)) ? 'not-allowed' : 'pointer' 
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !(tipo === 'visita_presencial' && !isFuture && !gps)) {
                  e.currentTarget.style.background = '#c97e20';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && !(tipo === 'visita_presencial' && !isFuture && !gps)) {
                  e.currentTarget.style.background = '#E0922B';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              {isSubmitting ? 'Guardando...' : isFuture ? 'Programar Recordatorio' : 'Registrar Actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
