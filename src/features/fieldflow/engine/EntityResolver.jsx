import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronRight, PlusCircle, ArrowLeft, Building2, User, Landmark, Briefcase, MapPin, Loader2 } from 'lucide-react';
import { useFieldFlow } from '../FieldFlowContext';
import { auditEntity, COMPLETENESS_SCHEMA } from './MissingFieldsAudit';

// Mapeo humano de nombres técnicos de base de datos a etiquetas legibles
const FIELD_LABELS = {
  nombre: 'Nombre o Razón Social',
  empresa_id: 'Empresa / Constructora Asociada',
  telefono: 'Teléfono de Contacto',
  email: 'Correo Electrónico',
  rfc: 'RFC (Registro Fiscal)',
  tipo: 'Tipo de Contacto',
  direccion: 'Dirección del Proyecto',
  giro: 'Giro de la Empresa',
  cargo: 'Cargo o Puesto'
};

const getFieldLabel = (field) => FIELD_LABELS[field] || field;

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
  
  const handlePatch = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (audit.isValid) {
      onSelect(localData);
    }
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
              {localData.estatus && (
                <span className={`resolver-badge ${
                  localData.estatus.toLowerCase().includes('activo') || 
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
        {!audit.isValid && (
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

            {audit.missing.map(field => (
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
                    <input
                      type={field === 'telefono' ? 'tel' : field === 'email' ? 'email' : 'text'}
                      placeholder={`Ingresar ${getFieldLabel(field).toLowerCase()}...`}
                      value={localData[field] || ''}
                      onChange={(e) => handlePatch(field, e.target.value)}
                      className="resolver-inline-input"
                      autoComplete="off"
                    />
                  )}
                  {!localData[field] && <AlertCircle className="resolver-inline-icon" />}
                </div>
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        // Reverse geocoding gratis con OpenStreetMap
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await res.json();
        if (data && data.display_name) {
          setFormData(prev => ({ ...prev, direccion: data.display_name }));
        } else {
          setFormData(prev => ({ ...prev, direccion: `${latitude}, ${longitude}` }));
        }
      } catch (err) {
        setFormData(prev => ({ ...prev, direccion: `${position.coords.latitude}, ${position.coords.longitude}` }));
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      alert('No se pudo obtener la ubicación: ' + error.message);
      setIsLocating(false);
    });
  };

  const handleSubmit = () => {
    // Validación de temblor (shake)
    const newErrors = schema.filter(field => !formData[field] || String(formData[field]).trim() === '');
    if (newErrors.length > 0) {
      setErrors(newErrors);
      // Limpiar errores después de la animación de shake
      setTimeout(() => setErrors([]), 600);
      return;
    }
    onCreate(formData);
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
                {getFieldLabel(field)} <span style={{ color: '#dc2626' }}>*</span>
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
                      type={field === 'telefono' ? 'tel' : field === 'email' ? 'email' : 'text'}
                      value={formData[field] || ''}
                      placeholder={`Ej: ${field === 'telefono' ? '8112345678' : field === 'rfc' ? 'XAXX010101000' : 'Escribe aquí...'}`}
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
                        {isLocating ? <Loader2 className="animate-spin w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="resolver-confirm-btn valid"
      >
        Guardar y Continuar
        <ChevronRight style={{ width: '16px', height: '16px' }} />
      </button>
    </div>
  );
}
