import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Building2, User, Briefcase, PlusCircle, ChevronRight } from 'lucide-react';
import Fuse from 'fuse.js';
import { useFieldFlow } from '../FieldFlowContext';

export default function Step0_SmartSearch() {
  const { cache, updateEntity, paginate } = useFieldFlow();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null); // null significa sin búsqueda, [] sin resultados

  // Preparar datos consolidados para Fuse.js (Empresas y Contactos únicamente, excluyendo negociaciones)
  const searchIndex = useMemo(() => {
    return [
      ...cache.empresas.map(e => ({ ...e, entityType: 'empresa', searchKey: e.nombre })),
      ...cache.contactos.map(c => ({ ...c, entityType: 'contacto', searchKey: c.nombre }))
    ];
  }, [cache]);

  // Motor híbrido: Capa B (Fuse.js) + Capa C (Fallback API debounce)
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    // Capa B: Búsqueda Síncrona Local (0ms latencia)
    const fuse = new Fuse(searchIndex, {
      keys: ['searchKey'],
      threshold: 0.35,
      minMatchCharLength: 2
    });
    const localResults = fuse.search(query).map(res => res.item);

    // Actualizamos la UI inmediatamente con lo que encontremos localmente
    setResults(localResults);

    // Capa C: Fallback a API si hay pocos resultados y query largo
    if (localResults.length < 3 && query.trim().length >= 3) {
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
          
          // Búsqueda en paralelo en el backend
          const [companiesRes, contactsRes] = await Promise.all([
            fetch(`${API_BASE}/api/crm/companies/search?q=${encodedQuery}`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
            fetch(`${API_BASE}/api/crm/contacts/search?q=${encodedQuery}`, { headers }).then(r => r.json()).catch(() => ({ success: false }))
          ]);

          const apiResults = [];

          if (companiesRes.success && Array.isArray(companiesRes.companies)) {
            companiesRes.companies.forEach(c => {
              apiResults.push({
                id: String(c.id),
                nombre: c.name || '',
                entityType: 'empresa',
                searchKey: c.name || '',
                rfc: c.rfc || 'Verificado'
              });
            });
          }

          if (contactsRes.success && Array.isArray(contactsRes.contacts)) {
            contactsRes.contacts.forEach(co => {
              apiResults.push({
                id: String(co.id),
                nombre: co.name || '',
                entityType: 'contacto',
                searchKey: co.name || '',
                cargo: co.position || 'Contacto'
              });
            });
          }

          // Combinamos resultados evitando duplicados
          setResults(prev => {
            const combined = [...(prev || []), ...apiResults];
            const uniqueMap = new Map();
            combined.forEach(item => {
              const key = `${item.entityType}-${item.id}`;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
              }
            });
            return Array.from(uniqueMap.values());
          });

        } catch (err) {
          console.error('Error during deep search fallback:', err);
        } finally {
          setIsSearching(false);
        }
      }, 400); // 400ms de debounce exactos

      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [query, searchIndex]);

  const handleSelectEntity = (entity) => {
    const isEmpresa = entity.entityType === 'empresa';
    
    let resolvedEmpresa = isEmpresa ? entity : null;
    let resolvedContacto = !isEmpresa ? entity : null;

    if (isEmpresa) {
      // Intentar buscar un contacto asociado a esta empresa en el caché local
      const associatedContact = cache.contactos.find(c => {
        if (Array.isArray(c.contact_companies)) {
          return c.contact_companies.some(cc => String(cc.company?.id) === String(entity.id));
        }
        return false;
      });
      if (associatedContact) {
        resolvedContacto = {
          id: String(associatedContact.id),
          nombre: associatedContact.nombre || associatedContact.name,
          tipo: 'contacto',
          cargo: associatedContact.cargo || associatedContact.position || 'Contacto'
        };
      }
    } else {
      // Intentar buscar la empresa asociada a este contacto
      const contactData = cache.contactos.find(c => String(c.id) === String(entity.id));
      if (contactData && Array.isArray(contactData.contact_companies) && contactData.contact_companies.length > 0) {
        const primaryCompany = contactData.contact_companies[0].company;
        if (primaryCompany) {
          resolvedEmpresa = {
            id: String(primaryCompany.id),
            nombre: primaryCompany.name || primaryCompany.nombre,
            tipo: 'empresa',
            rfc: primaryCompany.rfc || ''
          };
        }
      }
    }

    // Actualizamos el estado consolidado en el wizard
    updateEntity('cliente', entity);
    updateEntity('empresa', resolvedEmpresa);
    updateEntity('contacto', resolvedContacto);

    // Auditoría de completitud para ver si saltamos directamente a la obra
    const isEmpresaComplete = resolvedEmpresa && resolvedEmpresa.nombre && resolvedEmpresa.id && !String(resolvedEmpresa.id).startsWith('mock');
    const isContactoComplete = resolvedContacto && resolvedContacto.nombre && resolvedContacto.id && !String(resolvedContacto.id).startsWith('mock');

    if (isEmpresaComplete && isContactoComplete) {
      // Ambos resueltos y reales -> Saltamos directo a la Obra (avanzamos 2 pasos)
      paginate(2);
    } else {
      // Falta vincular o completar -> Avanzamos al Paso 1 (Resolver)
      paginate(1);
    }
  };

  const handleCreateNew = () => {
    updateEntity('cliente', { isNew: true, nombre: query });
    updateEntity('empresa', null);
    updateEntity('contacto', null);
    paginate(1);
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'prospecto': return <Briefcase className="w-5 h-5" />;
      case 'empresa': return <Building2 className="w-5 h-5" />;
      case 'contacto': return <User className="w-5 h-5" />;
      default: return <Search className="w-5 h-5" />;
    }
  };

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content">
        <div className="step-title-block">
          <h3>¿Con quién interactuaste?</h3>
          <p>Busca por nombre de cliente, empresa o contacto para evitar duplicidades en la base de datos.</p>
        </div>

        {/* Search Input Group */}
        <div className="fieldflow-input-group">
          <i className="fas fa-search"></i>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Constructora Ríos..."
            className="fieldflow-search-input"
            autoComplete="off"
          />
        </div>

        {/* Resultados y Esqueletos */}
        <div>
          {isSearching && (
            <div className="fieldflow-cards-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-100 rounded-full shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSearching && results !== null && results.length > 0 && (
            <div className="fieldflow-cards-list">
              {results.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => handleSelectEntity(entity)}
                  className="fieldflow-result-card"
                >
                  <div className={`result-icon-box ${entity.entityType}`}>
                    {renderIcon(entity.entityType)}
                  </div>
                  <div className="result-info">
                    <h4>{entity.searchKey}</h4>
                    <p>
                      {entity.entityType} • {entity.estatus || entity.rfc || entity.cargo || 'Verificado'}
                    </p>
                  </div>
                  <div className="result-arrow">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isSearching && results !== null && results.length === 0 && (
            <div className="fieldflow-fallback-screen">
              <div className="fieldflow-fallback-icon">
                <i className="fas fa-search"></i>
              </div>
              <h4>No se encontraron coincidencias</h4>
              <p>No detectamos registros existentes con ese nombre en la base de datos.</p>
              
              <button
                type="button"
                onClick={handleCreateNew}
                className="fieldflow-btn-primary"
              >
                <PlusCircle className="w-4 h-4" />
                Crear Nuevo Registro
              </button>
            </div>
          )}

          {!isSearching && results === null && (
            <div className="fieldflow-fallback-screen">
              <div className="fieldflow-fallback-icon" style={{ background: 'rgba(5, 57, 58, 0.04)', color: '#05393A' }}>
                <i className="fas fa-search"></i>
              </div>
              <h4>Búsqueda Rápida</h4>
              <p>Escribe un nombre para buscar en tiempo real en la base de datos de prospectos, constructoras e ingenieros del CRM.</p>
            </div>
          )}
        </div>
      </div>

      {/* Botón flotante inferior fijo */}
      {!isSearching && results !== null && results.length > 0 && (
        <div className="fieldflow-footer-fixed">
          <button
            type="button"
            onClick={handleCreateNew}
            className="fieldflow-btn-secondary"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            Ninguno coincide, crear nuevo
          </button>
        </div>
      )}
    </div>
  );
}
