import React, { useState, useEffect } from 'react';
import { useFieldFlow } from '../FieldFlowContext';
import EntityResolver from '../engine/EntityResolver';
import Fuse from 'fuse.js';

export default function Step3_ObraResolver() {
  const { wizardState, updateEntity, paginate, cache } = useFieldFlow();
  const [query, setQuery] = useState('');
  const [obrasResults, setObrasResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleSkip = () => {
    updateEntity('obra', null);
    paginate(1);
  };

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content">
        <div className="step-title-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3>Obra Relacionada</h3>
              <p>Opcional: Vincula la ubicación física o proyecto destino de tu interacción.</p>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="fieldflow-btn-secondary"
              style={{ width: 'auto', padding: '0 1.25rem', height: '40px', fontSize: '0.775rem' }}
            >
              Saltar Obra / No aplica
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
              onResolve={(entity) => {
                updateEntity('obra', entity);
                paginate(1);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
