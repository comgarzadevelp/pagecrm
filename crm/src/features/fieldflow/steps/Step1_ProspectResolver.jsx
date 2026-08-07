import React, { useState } from 'react';
import { useFieldFlow } from '../FieldFlowContext';
import EntityResolver from '../engine/EntityResolver';
import Fuse from 'fuse.js';

export default function Step1_ProspectResolver() {
  const { wizardState, updateEntity, paginate, cache } = useFieldFlow();
  const [query, setQuery] = useState('');

  // Lógica de búsqueda local para alimentar el EntityResolver
  const searchResults = React.useMemo(() => {
    if (wizardState.prospecto && !wizardState.prospecto.isNew && query === '') {
      const found = cache.prospectos.find(p => p.id === wizardState.prospecto.id);
      return found ? [found] : [];
    }
    
    if (wizardState.prospecto?.isNew && query === '') {
        return []; // Obliga a mostrar CreateInline
    }

    if (query.length < 2) return cache.prospectos.slice(0, 5); // Mostrar sugerencias iniciales

    const fuse = new Fuse(cache.prospectos, { keys: ['nombre'], threshold: 0.3 });
    return fuse.search(query).map(r => r.item);
  }, [query, wizardState.prospecto, cache.prospectos]);

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content">
        <div className="step-title-block">
          <h3>Validar Cliente / Prospecto</h3>
          <p>Confirma el expediente del cliente o prospecto principal para esta interacción.</p>
        </div>

        {/* Barra de búsqueda interna */}
        <div className="fieldflow-input-group" style={{ marginBottom: '1.75rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar otro prospecto por nombre..."
            className="fieldflow-input"
            style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', height: '48px' }}
          />
        </div>

        <div style={{ paddingBottom: '2rem' }}>
          <EntityResolver
            entityType="prospecto"
            searchResults={searchResults}
            onResolve={(entity) => {
              updateEntity('prospecto', entity);
              paginate(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
