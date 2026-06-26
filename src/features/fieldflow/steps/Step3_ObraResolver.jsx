import React, { useState, useEffect } from 'react';
import { useFieldFlow } from '../FieldFlowContext';
import EntityResolver from '../engine/EntityResolver';
import Fuse from 'fuse.js';
import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';

export default function Step3_ObraResolver() {
  const { wizardState, updateEntity, paginate, cache } = useFieldFlow();
  const [query, setQuery] = useState('');
  const [obrasResults, setObrasResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Estado para indicar si se ha marcado el check de "Sin obra / Omitir"
  const [sinObraChecked, setSinObraChecked] = useState(wizardState.obra === null && cache.obras.length > 0);

  // Búsqueda híbrida para Obras (Local + Deep API)
  useEffect(() => {
    if (query.trim().length < 2) {
      setObrasResults(cache.obras.slice(0, 5));
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
  }, [query, cache.obras]);

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
    // Solo avanzamos si hay obra seleccionada/creada, o si el check de Sin Obra está activo
    if (wizardState.obra || sinObraChecked) {
      paginate(1);
    }
  };

  const isProceedDisabled = !wizardState.obra && !sinObraChecked;

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
            />
          )}
        </div>
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
