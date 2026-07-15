import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronRight, PlusCircle, ArrowLeft, Building2, User, Landmark, Briefcase, MapPin, Loader2 } from 'lucide-react';
import { useFieldFlow } from '../FieldFlowContext';
import { auditEntity, COMPLETENESS_SCHEMA } from './MissingFieldsAudit';

// Mapeo humano de nombres técnicos de base de datos a etiquetas legibles
const FIELD_LABELS = {
  nombre: 'Nombre',
  empresa_id: 'Empresa / Constructora Asociada',
  telefono: 'Teléfono de Contacto',
  email: 'Correo Electrónico',
  rfc: 'RFC (Registro Fiscal)',
  tipo: 'Tipo de Contacto',
  direccion: 'Dirección del Proyecto',
  giro: 'Giro de la Empresa',
  cargo: 'Cargo o Puesto'
};

const getFieldLabel = (field, entityType) => {
  if (entityType === 'obra' && field === 'direccion') {
    return 'Ubicación de la obra';
  }
  return FIELD_LABELS[field] || field;
};

/**
 * EntityResolver actúa como router inteligente.
 * Utiliza clases CSS nativas ultra-premium definidas en FieldFlowWizard.css
 * para sobreescribir cualquier estilo global tosco y evadir bugs de Tailwind.
 */
export default function EntityResolver({
  entityType,
  searchResults = [],
  onResolve
}) {
  // Si hay resultados, entramos en modo select, si no, directo a create
  const [mode, setMode] = useState(searchResults.length > 0 ? 'select' : 'create');

  // Sincronizar el modo cuando los resultados de búsqueda se actualicen asíncronamente (ej. tras cargar de la API)
  useEffect(() => {
    setMode(searchResults.length > 0 ? 'select' : 'create');
  }, [searchResults]);

  if (mode === 'select') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {searchResults.map(entity => (
            <CardMatch
              key={entity.id}
              entityType={entityType}
              entity={entity}
              onSelect={(patchedEntity) => onResolve({ ...patchedEntity, isNew: false })}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMode('create')}
          className="w-full h-13 mt-4 flex items-center justify-center gap-2 text-[#05393A] font-bold text-sm border-2 border-dashed border-gray-200 rounded-xl hover:border-[#05393A]/30 hover:bg-[#05393A]/5 active:bg-[#05393A]/10 transition-all shadow-sm"
          style={{ height: '50px', background: 'transparent', cursor: 'pointer' }}
        >
          <PlusCircle className="w-4.5 h-4.5" />
          No está en la lista, crear nuevo registro
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <CreateInline
        entityType={entityType}
        onCancel={searchResults.length > 0 ? () => setMode('select') : null}
        onCreate={(newEntity) => onResolve({ ...newEntity, isNew: true })}
      />
    </motion.div>
  );
}

/**
 * Micro-vista: CardMatch
 * Muestra una entidad encontrada y audita sus campos en tiempo real.
 * Si faltan campos requeridos, habilita edición inline sutil.
 */
function CardMatch({ entityType, entity, onSelect }) {
  const { cache } = useFieldFlow();
  const [localData, setLocalData] = useState(entity);
  const audit = auditEntity(entityType, localData);

  // Guardamos si inicialmente faltaban datos para mantener el formulario abierto mientras escribe
  const [forceShowFields] = useState(!audit.isValid);
  
  // Guardamos los campos faltantes iniciales de forma estática para que no desaparezcan del DOM mientras se escriben
  const [missingFields] = useState(() => auditEntity(entityType, entity).missing || []);

  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(!!(window.google && window.google.maps));
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsMapsApiLoaded(true);
      return;
    }
    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps) {
        setIsMapsApiLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);
    return () => clearInterval(checkInterval);
  }, []);

  // Autocomplete para dirección de obra en CardMatch usando ref callback (seguro ante montados asíncronos y animaciones)
  const initAutocomplete = (node) => {
    if (!node || !isMapsApiLoaded || entityType !== 'obra') return;
    if (node.dataset.autocompleteInitialized) return;
    node.dataset.autocompleteInitialized = 'true';

    const preventEnter = (e) => {
      if (e.key === 'Enter') e.preventDefault();
    };
    node.addEventListener('keydown', preventEnter);

    const autocomplete = new window.google.maps.places.Autocomplete(node, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'mx' },
      fields: ['formatted_address', 'geometry', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        setLocalData(prev => ({
          ...prev,
          direccion: address,
          lat,
          lng
        }));
      }
    });

    node._autocompleteInstance = autocomplete;
    node._preventEnterHandler = preventEnter;
  };

  // Limpiar escuchas al desmontar
  useEffect(() => {
    return () => {
      const node = document.getElementById(`cardmatch-obra-direccion-input-${localData.id}`);
      if (node) {
        if (node._preventEnterHandler) {
          node.removeEventListener('keydown', node._preventEnterHandler);
        }
        if (window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.clearInstanceListeners(node);
        }
      }
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
    };
  }, [localData.id]);

  const handlePatch = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };

        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: latLng }, (results, status) => {
            setIsLocating(false);
            if (status === 'OK' && results[0]) {
              setLocalData(prev => ({
                ...prev,
                direccion: results[0].formatted_address,
                lat: latitude,
                lng: longitude
              }));
            } else {
              setLocalData(prev => ({
                ...prev,
                direccion: `Coordenadas: ${latitude}, ${longitude}`,
                lat: latitude,
                lng: longitude
              }));
            }
          });
        } else {
          setIsLocating(false);
          setLocalData(prev => ({
            ...prev,
            direccion: `Coordenadas: ${latitude}, ${longitude}`,
            lat: latitude,
            lng: longitude
          }));
        }
      },
      (error) => {
        console.error(error);
        setIsLocating(false);
        alert('No se pudo obtener tu ubicación actual.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    if (!audit.isValid) return;

    let finalData = { ...localData };

    // 1. Si es obra y no tiene coordenadas lat/lng, geocodificar antes de continuar
    if (entityType === 'obra' && (!localData.lat || !localData.lng) && window.google && window.google.maps) {
      setIsLocating(true);
      const geocoder = new window.google.maps.Geocoder();
      
      const geocodePromise = new Promise((resolve) => {
        geocoder.geocode({ address: localData.direccion }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            resolve({
              direccion: results[0].formatted_address || localData.direccion,
              lat: loc.lat(),
              lng: loc.lng()
            });
          } else {
            resolve({});
          }
        });
      });

      const coords = await geocodePromise;
      setIsLocating(false);
      finalData = { ...finalData, ...coords };
    }

    // 2. Si se trata de una obra ya existente y se completaron datos faltantes, guardar inmediatamente en la DB
    if (entityType === 'obra' && forceShowFields) {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || '';
      
      if (token) {
        setIsLocating(true);
        try {
          const res = await fetch(`${API_BASE}/api/crm/obras/${finalData.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: finalData.nombre || finalData.name,
              address: finalData.direccion,
              latitude: finalData.lat,
              longitude: finalData.lng,
              status: finalData.status || finalData.estatus
            })
          });
          const data = await res.json();
          if (res.ok && data.success && data.obra) {
            finalData = {
              ...finalData,
              nombre: data.obra.name,
              direccion: data.obra.address,
              lat: data.obra.latitude,
              lng: data.obra.longitude,
              status: data.obra.status
            };
          }
        } catch (err) {
          console.error('Error saving updated obra fields to DB:', err);
        } finally {
          setIsLocating(false);
        }
      }
    }

    onSelect(finalData);
  };

  const renderCardIcon = () => {
    switch (entityType) {
      case 'prospecto': return <Briefcase />;
      case 'empresa': return <Building2 />;
      case 'contacto': return <User />;
      case 'obra': return <Landmark />;
      default: return <Building2 />;
    }
  };

  return (
    <div className={`fieldflow-resolver-card ${!audit.isValid ? 'invalid' : ''}`}>
      {/* Header de la Tarjeta */}
      <div className="resolver-card-header">
        <div className="resolver-card-header-left">
          <div className={`resolver-card-avatar ${entityType}`}>
            {renderCardIcon()}
          </div>
          <div>
            <h4 className="resolver-card-title">
              {localData.nombre || localData.searchKey}
            </h4>
            <div className="resolver-card-meta">
              <span className="resolver-card-type-label">
                {entityType}
              </span>
              {localData._source && entityType === 'obra' && (
                <span className={`resolver-badge ${localData._source === 'company' ? 'company-source' : 'contact-source'}`} style={{
                  background: localData._source === 'company' ? '#f1f5f9' : '#dcfce7',
                  color: localData._source === 'company' ? '#475569' : '#156534',
                  fontWeight: '700',
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {localData._source === 'company' ? 'De la empresa' : 'Directo'}
                </span>
              )}
              {localData.estatus && (
                <span className={`resolver-badge ${localData.estatus.toLowerCase().includes('activo') ||
                  localData.estatus.toLowerCase().includes('cliente') ||
                  localData.estatus.toLowerCase().includes('ganado')
                  ? 'activo-status'
                  : localData.estatus.toLowerCase().includes('inactivo')
                    ? 'inactivo-status'
                    : 'prospecto-status'
                  }`}>
                  {localData.estatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {audit.isValid ? (
          <span className="resolver-badge valid-data-badge">
            <CheckCircle2 style={{ marginRight: '4px' }} /> Verificado
          </span>
        ) : (
          <span className="resolver-badge missing-data-badge">
            <AlertCircle style={{ marginRight: '4px' }} /> Faltan datos
          </span>
        )}
      </div>

      {/* Renderizado de campos faltantes inline */}
      <AnimatePresence>
        {(forceShowFields || !audit.isValid) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="resolver-alert-box">
              <AlertCircle />
              <span>Para completar el registro de esta actividad en campo, completa la siguiente información obligatoria:</span>
            </div>

            {missingFields.map(field => (
              <div key={field} className="resolver-field-group">
                <label className="resolver-field-label">
                  {getFieldLabel(field)} <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <div className="resolver-field-input-wrapper">
                  {field === 'empresa_id' ? (
                    <select
                      value={localData[field] || ''}
                      onChange={(e) => handlePatch(field, e.target.value)}
                      className="resolver-inline-select"
                    >
                      <option value="">-- Seleccionar Empresa / Constructora --</option>
                      {cache.empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre} {emp.rfc ? `(${emp.rfc})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : field === 'tipo' ? (
                    <select
                      value={localData[field] || ''}
                      onChange={(e) => handlePatch(field, e.target.value)}
                      className="resolver-inline-select"
                    >
                      <option value="">-- Seleccionar Tipo --</option>
                      <option value="oficina">Oficina (Administrativo / Compras)</option>
                      <option value="campo">Campo (Residente / Ingeniero en Obra)</option>
                    </select>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        ref={initAutocomplete}
                        id={entityType === 'obra' && field === 'direccion' ? `cardmatch-obra-direccion-input-${localData.id}` : undefined}
                        type={field === 'telefono' ? 'tel' : field === 'email' ? 'email' : 'text'}
                        placeholder={
                          entityType === 'obra' && field === 'direccion'
                            ? 'Escribe para buscar en Google Maps...'
                            : `Ingresar ${getFieldLabel(field).toLowerCase()}...`
                        }
                        value={localData[field] || ''}
                        onChange={(e) => handlePatch(field, e.target.value)}
                        className="resolver-inline-input"
                        style={{ paddingRight: field === 'direccion' ? '2.5rem' : '1rem' }}
                        autoComplete="off"
                      />
                      {entityType === 'obra' && field === 'direccion' && (
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          title="Obtener ubicación por GPS"
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: isLocating ? '#9ca3af' : '#05393A',
                            cursor: isLocating ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px'
                          }}
                        >
                          {isLocating ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {(!localData[field] || (entityType === 'obra' && field === 'direccion' && (!localData.lat || !localData.lng))) && (
                    <AlertCircle className="resolver-inline-icon" />
                  )}
                </div>
                {entityType === 'obra' && field === 'direccion' && (
                  <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Busca y selecciona una dirección de Google Maps o pulsa el icono de GPS.
                  </p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!audit.isValid}
        className={`resolver-confirm-btn ${audit.isValid ? 'valid' : 'invalid'}`}
        style={{ marginTop: '0.75rem' }}
      >
        {audit.isValid ? 'Confirmar Selección' : 'Completa los datos requeridos para continuar'}
        {audit.isValid && <ChevronRight style={{ width: '16px', height: '16px' }} />}
      </button>
    </div>
  );
}

/**
 * Micro-vista: CreateInline
 * Formulario mínimo absoluto para alta rápida en campo.
 */
function CreateInline({ entityType, onCancel, onCreate }) {
  const { cache } = useFieldFlow();
  const schema = COMPLETENESS_SCHEMA[entityType]?.required || ['nombre'];
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState([]);
  const [isLocating, setIsLocating] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);

  // Cargar Google Maps API dinámicamente
  useEffect(() => {
    if (!apiKey) {
      console.warn('[EntityResolver] VITE_GOOGLE_MAPS_API_KEY is not configured');
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

  // Inicializar Google Places Autocomplete en el input de Dirección de Obra
  useEffect(() => {
    if (!isMapsApiLoaded || entityType !== 'obra') return;
    const input = document.getElementById('obra-direccion-input');
    if (!input) return;

    const preventEnter = (e) => {
      if (e.key === 'Enter') e.preventDefault();
    };
    input.addEventListener('keydown', preventEnter);

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'mx' },
      fields: ['formatted_address', 'geometry', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        setFormData(prev => ({
          ...prev,
          direccion: address,
          lat: lat,
          lng: lng
        }));
      }
    });

    return () => {
      input.removeEventListener('keydown', preventEnter);
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(input);
      }
      // Limpiar sugerencias flotantes al desmontar
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
    };
  }, [isMapsApiLoaded, entityType, formData.direccion === undefined]); // Se ejecuta al montar/cargar

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };

        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: latLng }, (results, status) => {
            setIsLocating(false);
            if (status === 'OK' && results[0]) {
              setFormData(prev => ({
                ...prev,
                direccion: results[0].formatted_address,
                lat: latitude,
                lng: longitude
              }));
            } else {
              setFormData(prev => ({
                ...prev,
                direccion: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                lat: latitude,
                lng: longitude
              }));
            }
          });
        } else {
          setFormData(prev => ({
            ...prev,
            direccion: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            lat: latitude,
            lng: longitude
          }));
          setIsLocating(false);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSelectSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      direccion: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    }));
    setAddressSuggestions([]);
  };

  const handleSubmit = () => {
    const newErrors = schema.filter(field => !formData[field] || String(formData[field]).trim() === '');
    if (newErrors.length > 0) {
      setErrors(newErrors);
      setTimeout(() => setErrors([]), 600);
      return;
    }

    // Limpiar sugerencias flotantes antes de avanzar
    const pacContainers = document.querySelectorAll('.pac-container');
    pacContainers.forEach(container => container.remove());

    // Si es obra y no tiene coordenadas lat/lng, intentamos geocodificar la dirección escrita
    if (entityType === 'obra' && (!formData.lat || !formData.lng) && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      setIsLocating(true);
      geocoder.geocode({ address: formData.direccion }, (results, status) => {
        setIsLocating(false);
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          onCreate({
            ...formData,
            direccion: results[0].formatted_address || formData.direccion,
            lat: loc.lat(),
            lng: loc.lng()
          });
        } else {
          onCreate(formData);
        }
      });
    } else {
      onCreate(formData);
    }
  };

  return (
    <div className="resolver-create-container">
      <div className="resolver-create-header">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-resolver-back"
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
          </button>
        )}
        <h4>
          Registrar {entityType === 'prospecto' ? 'Prospecto' : entityType === 'empresa' ? 'Empresa / Constructora' : entityType === 'contacto' ? 'Contacto' : 'Obra'}
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {schema.map(field => {
          const isError = errors.includes(field);
          return (
            <motion.div
              key={field}
              animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="resolver-field-group"
            >
              <label className="resolver-field-label">
                {getFieldLabel(field, entityType)} <span style={{ color: '#dc2626' }}>*</span>
              </label>

              <div className="resolver-field-input-wrapper">
                {field === 'empresa_id' ? (
                  <select
                    value={formData[field] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                    className="resolver-inline-select"
                    style={isError ? { borderColor: '#dc2626', background: '#fef2f2' } : {}}
                  >
                    <option value="">-- Seleccionar Empresa / Constructora --</option>
                    {cache.empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre} {emp.rfc ? `(${emp.rfc})` : ''}
                      </option>
                    ))}
                  </select>
                ) : field === 'tipo' ? (
                  <select
                    value={formData[field] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                    className="resolver-inline-select"
                    style={isError ? { borderColor: '#dc2626', background: '#fef2f2' } : {}}
                  >
                    <option value="">-- Seleccionar Tipo --</option>
                    <option value="oficina">Oficina (Administrativo / Compras)</option>
                    <option value="campo">Campo (Residente / Ingeniero en Obra)</option>
                  </select>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      id={entityType === 'obra' && field === 'direccion' ? 'obra-direccion-input' : undefined}
                      type={field === 'telefono' ? 'tel' : field === 'email' ? 'email' : 'text'}
                      value={formData[field] || ''}
                      placeholder={
                        entityType === 'obra' && field === 'nombre'
                          ? 'Ej: Residencial los parajes'
                          : entityType === 'obra' && field === 'direccion'
                          ? 'Escribe para buscar en Google Maps...'
                          : `Ej: ${field === 'telefono' ? '8112345678' : field === 'rfc' ? 'XAXX010101000' : 'Escribe aquí...'}`
                      }
                      onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                      className="resolver-inline-input"
                      style={isError ? { borderColor: '#dc2626', background: '#fef2f2', paddingRight: field === 'direccion' ? '2.5rem' : '1rem' } : { paddingRight: field === 'direccion' ? '2.5rem' : '1rem' }}
                      autoComplete="off"
                    />

                    {field === 'direccion' && (
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        title="Obtener ubicación por GPS"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: isLocating ? '#9ca3af' : '#05393A',
                          cursor: isLocating ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px'
                        }}
                      >
                        {isLocating ? (
                          <Loader2 className="animate-spin w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p style={{
        fontSize: '0.725rem',
        color: '#6b7280',
        background: '#f9fafb',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        margin: '0 0 1.25rem 0',
        lineHeight: '1.4',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem'
      }}>
        <AlertCircle style={{ width: '16px', height: '16px', color: '#6b7280', flexShrink: 0, marginTop: '2px' }} />
        <span>
          Confirmar esta información no crea el registro en la base de datos inmediatamente. Los datos se guardarán automáticamente de forma unificada al finalizar todo el proceso del registro.
        </span>
      </p>

      <button
        type="button"
        onClick={handleSubmit}
        className="resolver-confirm-btn valid"
      >
        Confirmar información de obra
        <ChevronRight style={{ width: '16px', height: '16px' }} />
      </button>
    </div>
  );
}
