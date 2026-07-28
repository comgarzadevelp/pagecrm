import React, { useState, useEffect, useRef } from 'react';
import { useFieldFlow } from '../FieldFlowContext';
import EntityResolver from '../engine/EntityResolver';
import Fuse from 'fuse.js';
import { CheckCircle2, ChevronRight, Circle, X, MapPin, Landmark, AlertCircle } from 'lucide-react';

export default function Step3_ObraResolver() {
  const { wizardState, updateEntity, paginate, cache } = useFieldFlow();
  const [query, setQuery] = useState('');
  const [obrasResults, setObrasResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [customerObras, setCustomerObras] = useState([]);
  const [loadingCustomerObras, setLoadingCustomerObras] = useState(false);
  const createInlineSubmitRef = useRef(null);

  // Estado para indicar si se ha marcado el check de "Sin obra / Omitir" (desactivado por defecto)
  const [sinObraChecked, setSinObraChecked] = useState(false);

  // Buscar obras vinculadas al cliente actual (Empresa y Contacto)
  useEffect(() => {
    const fetchCustomerObras = async () => {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || '';
      if (!token) return;

      const companyId = wizardState.empresa?.id;
      const contactId = wizardState.contacto?.id;
      if (!companyId && !contactId) return;

      setLoadingCustomerObras(true);
      try {
        let combined = [];
        const headers = { Authorization: `Bearer ${token}` };

        // Buscar por empresa
        if (companyId && !String(companyId).startsWith('company-ref-')) {
          const res = await fetch(`${API_BASE}/api/crm/obras/company/${companyId}`, { headers });
          const data = await res.json();
          if (data.success && Array.isArray(data.obras)) {
            const mapped = data.obras.map(o => ({ ...o, _source: 'company' }));
            combined = [...combined, ...mapped];
          }
        }

        // Buscar por contacto
        if (contactId) {
          const res = await fetch(`${API_BASE}/api/crm/obras/contact/${contactId}`, { headers });
          const data = await res.json();
          if (data.success && Array.isArray(data.obras)) {
            const mapped = data.obras.map(o => ({ ...o, _source: 'contact' }));
            combined = [...combined, ...mapped];
          }
        }

        // Eliminar duplicados
        const unique = [];
        const seen = new Set();
        combined.forEach(o => {
          if (o && o.id && !seen.has(o.id)) {
            seen.add(o.id);
            unique.push({
              id: String(o.id),
              nombre: o.name || o.nombre || '',
              direccion: o.address || o.direccion || '',
              lat: o.latitude || o.lat,
              lng: o.longitude || o.lng,
              tipo: 'obra',
              estatus: o.status || 'Activo',
              _source: o._source
            });
          }
        });

        setCustomerObras(unique);
      } catch (err) {
        console.error('Error fetching customer specific obras:', err);
      } finally {
        setLoadingCustomerObras(false);
      }
    };

    fetchCustomerObras();
  }, [wizardState.empresa, wizardState.contacto]);

  // Auto-seleccionar la obra si el cliente tiene EXACTAMENTE UNA obra vinculada en total y ninguna seleccionada en el wizard
  useEffect(() => {
    if (customerObras.length === 1 && !wizardState.obra) {
      updateEntity('obra', customerObras[0]);
    }
  }, [customerObras, wizardState.obra]);

  // Búsqueda híbrida para Obras (Local + Deep API)
  useEffect(() => {
    if (query.trim().length < 2) {
      // Ordenar customerObras para que las directas ('contact') aparezcan al principio y las de empresa ('company') abajo
      const sortedCustomerObras = [...customerObras].sort((a, b) => {
        if (a._source === 'contact' && b._source === 'company') return -1;
        if (a._source === 'company' && b._source === 'contact') return 1;
        return 0;
      });
      // Solo mostramos obras que pertenezcan a este cliente. NO mostramos obras ajenas al azar para evitar confusiones.
      setObrasResults(sortedCustomerObras);
      setIsSearching(false);
      return;
    }

    // 1. Capa Local
    const fuse = new Fuse(cache.obras, { keys: ['nombre', 'direccion'], threshold: 0.35 });
    const localRes = fuse.search(query).map(r => r.item);
    setObrasResults(localRes);

    // 2. Capa API Fallback
    if (localRes.length < 3) {
      setIsSearching(true);

      const timer = setTimeout(async () => {
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('token');
        if (!token) {
          setIsSearching(false);
          return;
        }

        try {
          const headers = { Authorization: `Bearer ${token}` };
          const encodedQuery = encodeURIComponent(query.trim());
          const res = await fetch(`${API_BASE}/api/crm/obras/search?q=${encodedQuery}`, { headers });
          const data = await res.json();

          if (data.success && Array.isArray(data.obras)) {
            const apiRes = data.obras.map(o => ({
              id: String(o.id),
              nombre: o.name || '',
              direccion: o.address || '',
              lat: o.latitude || o.lat,
              lng: o.longitude || o.lng,
              tipo: 'obra',
              estatus: o.status || 'Activo'
            }));

            setObrasResults(prev => {
              const combined = [...prev, ...apiRes];
              const uniqueMap = new Map();
              combined.forEach(item => {
                if (!uniqueMap.has(item.id)) {
                  uniqueMap.set(item.id, item);
                }
              });
              return Array.from(uniqueMap.values());
            });
          }
        } catch (err) {
          console.error('Error preloading/searching projects from API:', err);
        } finally {
          setIsSearching(false);
        }
      }, 400); // 400ms debounce

      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [query, cache.obras, customerObras]);

  // Si se selecciona o crea una obra en EntityResolver, desactivamos el check de sin obra
  const handleResolveObra = (entity) => {
    setSinObraChecked(false);
    updateEntity('obra', entity);
  };

  const toggleSinObra = () => {
    const nextVal = !sinObraChecked;
    setSinObraChecked(nextVal);
    if (nextVal) {
      updateEntity('obra', null); // Limpiamos cualquier obra asignada si se activa el check
    }
  };

  const handleProceed = () => {
    // 1. Si ya hay una obra asignada o se marcó explícitamente "Omitir / Sin obra", avanzamos inmediatamente
    if (wizardState.obra || sinObraChecked) {
      paginate(1);
      return;
    }

    // 2. Si el usuario escribió datos de la obra pero no le dio a "Confirmar", auto-confirmamos
    if (createInlineSubmitRef.current) {
      const isSubmitted = createInlineSubmitRef.current();
      if (isSubmitted) {
        setTimeout(() => paginate(1), 100);
        return;
      }
    }
  };

  const isProceedDisabled = false;

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content" style={{ paddingBottom: '7rem' }}>
        <div className="step-title-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3>Obra Relacionada</h3>
              <p>Vincula la ubicación física o proyecto destino de tu interacción.</p>
            </div>
            
            {/* Toggle interactivo en lugar de botón pulsable de acción inmediata */}
            <button
              type="button"
              onClick={toggleSinObra}
              className={`fieldflow-btn-secondary ${sinObraChecked ? 'active-check' : ''}`}
              style={{
                width: 'auto',
                padding: '0 1.25rem',
                height: '42px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '12px',
                border: sinObraChecked ? '2px solid #05393A' : '1px solid rgba(0,0,0,0.12)',
                background: sinObraChecked ? 'rgba(5, 57, 58, 0.05)' : '#ffffff',
                color: '#05393A',
                fontWeight: '700',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              {sinObraChecked ? (
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#05393A' }} />
              ) : (
                <Circle style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
              )}
              Omitir / Sin obra
            </button>
          </div>
        </div>

        {wizardState.obra ? (
          <div 
            style={{
              border: '2px solid #05393A',
              background: 'rgba(5, 57, 58, 0.03)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div 
                style={{ 
                  background: '#05393A', 
                  color: '#ffffff', 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Landmark style={{ width: '20px', height: '20px' }} />
              </div>
              <div style={{ flex: 1, paddingRight: '2rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#05393A', margin: '0 0 0.25rem 0' }}>
                  {wizardState.obra.nombre}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                  {wizardState.obra.direccion}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span 
                    style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 8px', 
                      background: wizardState.obra.isNew ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: wizardState.obra.isNew ? '#2563eb' : '#059669',
                      borderRadius: '6px',
                      fontWeight: '700'
                    }}
                  >
                    {wizardState.obra.isNew ? 'Nueva Obra (Por guardar)' : 'Obra Existente'}
                  </span>
                  {wizardState.obra.lat && wizardState.obra.lng && (
                    <span 
                      style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <MapPin style={{ width: '12px', height: '12px' }} /> GPS Vinculado
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                updateEntity('obra', null);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <X style={{ width: '14px', height: '14px' }} /> Quitar
            </button>
          </div>
        ) : (
          <>
            {customerObras.length > 1 && (
              <div 
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0 }} />
                <span>Obras registradas para este cliente ({customerObras.length}):</span>
              </div>
            )}

            {!loadingCustomerObras && customerObras.length === 0 && query.trim().length < 2 && (
              <div 
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}
              >
                <Landmark style={{ width: '28px', height: '28px', color: '#94a3b8', margin: '0 auto 0.5rem auto' }} />
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#334155', margin: '0 0 0.25rem 0' }}>
                  Este cliente no tiene obras registradas aún
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                  Busca una obra por nombre o dirección abajo, o crea una nueva para vincularla a este cliente.
                </p>
              </div>
            )}

            {/* Barra de búsqueda interna */}
            <div className="fieldflow-input-group" style={{ marginBottom: '1.75rem' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar obra por nombre o dirección..."
                className="fieldflow-input"
                style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', height: '48px' }}
              />
            </div>

            <div style={{ paddingBottom: '2rem' }}>
              {isSearching && (
                <div className="fieldflow-cards-list animate-pulse">
                  <div className="bg-white border border-gray-100 rounded-xl p-4 h-16"></div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 h-16 mt-2"></div>
                </div>
              )}

              {!isSearching && (
                <EntityResolver
                  entityType="obra"
                  searchResults={obrasResults}
                  onResolve={handleResolveObra}
                  submitRef={createInlineSubmitRef}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer Fijo con el Botón "Listo, continuemos" controlado por estado */}
      <div className="fieldflow-footer-fixed" style={{ background: '#ffffff', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          type="button"
          onClick={handleProceed}
          disabled={isProceedDisabled}
          className="fieldflow-btn-primary"
          style={{
            opacity: isProceedDisabled ? 0.5 : 1,
            cursor: isProceedDisabled ? 'not-allowed' : 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: '800'
          }}
        >
          <span>Listo, continuemos</span>
          <ChevronRight style={{ width: '18px', height: '18px' }} />
        </button>
      </div>
    </div>
  );
}
