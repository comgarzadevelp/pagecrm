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

  // Preparar datos consolidados para Fuse.js (Clientes propios únicamente)
  const searchIndex = useMemo(() => {
    return [
      ...cache.prospectos.map(p => ({ ...p, entityType: 'prospecto', searchKey: `${p.nombre} ${p.company || ''}` }))
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
      keys: ['nombre', 'company'],
      threshold: 0.3,
      minMatchCharLength: 2
    });
    const localResults = fuse.search(query).map(res => res.item);

    // Actualizamos la UI inmediatamente con lo que encontremos localmente
    setResults(localResults);

    // Capa C: Fallback a API si hay pocos resultados y query largo (Búsqueda en endpoint aislado de clientes)
    if (query.trim().length >= 2) {
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

          // Consultamos el endpoint de clientes con soporte para búsqueda global q
          const res = await fetch(`${API_BASE}/api/crm/customers?q=${encodedQuery}`, { headers }).then(r => r.json()).catch(() => ({ success: false }));

          if (res.success && Array.isArray(res.customers)) {
            const queryLower = query.toLowerCase();
            const apiResults = res.customers
              .map(c => ({
                id: String(c.id),
                nombre: c.name || '',
                tipo: 'prospecto',
                estatus: c.status || 'Activo',
                company: c.company || '',
                company_id: c.company_id || null,
                contact_id: c.contact_id || null,
                phone: c.phone || '',
                email: c.email || '',
                entityType: 'prospecto',
                searchKey: `${c.name || ''} ${c.company || ''}`,
                is_foreign: c.is_foreign,
                assigned_to_name: c.assigned_to_name
              }));

            // Combinamos resultados evitando duplicados
            setResults(prev => {
              const combined = [...(prev || []), ...apiResults];
              const uniqueMap = new Map();
              combined.forEach(item => {
                const key = `prospecto-${item.id}`;
                if (!uniqueMap.has(key)) {
                  uniqueMap.set(key, item);
                }
              });
              return Array.from(uniqueMap.values());
            });
          }

        } catch (err) {
          console.error('Error during customer search fallback:', err);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms de debounce

      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [query, searchIndex]);

  const handleSelectEntity = async (entity) => {
    // Cuando seleccionamos un cliente existente, mapeamos su empresa y contacto correspondientes
    const resolvedEmpresa = entity.company ? {
      id: entity.company_id || (entity.id.startsWith('sae-') ? entity.id : `company-ref-${entity.id}`),
      nombre: entity.company,
      tipo: 'empresa',
      rfc: entity.rfc || ''
    } : null;

    let contactId = entity.contact_id || null;
    let contactNombre = entity.contact_name || '';
    let contactCargo = entity.position || entity.cargo || 'Representante B2B';
    let contactTelefono = entity.contact_phone || entity.phone || '';
    let contactEmail = entity.contact_email || entity.email || '';

    // 1. Intentar resolver por contact_id en caché local
    if (contactId) {
      const contactoReal = cache.contactos.find(c => String(c.id) === String(contactId));
      if (contactoReal) {
        contactNombre = contactoReal.nombre || contactNombre;
        contactCargo = contactoReal.cargo || contactCargo;
        contactTelefono = contactoReal.phone || contactTelefono;
        contactEmail = contactoReal.email || contactEmail;
      }
    }

    // 2. Si aún no hay contacto titular pero la empresa coincide, buscar en caché por empresa
    if (!contactId && entity.company) {
      const compNameClean = entity.company.toLowerCase().trim();
      const contactoEmp = cache.contactos.find(c => c.company && c.company.toLowerCase().trim() === compNameClean);
      if (contactoEmp) {
        contactId = contactoEmp.id;
        contactNombre = contactoEmp.nombre || contactNombre;
        contactCargo = contactoEmp.cargo || contactCargo;
        contactTelefono = contactoEmp.phone || contactTelefono;
        contactEmail = contactoEmp.email || contactEmail;
      }
    }

    // 3. Fallback de Red: Si aún no tenemos contacto y la empresa tiene un ID válido, consultar backend (soporta empresas locales y SAE)
    if (!contactNombre && resolvedEmpresa && resolvedEmpresa.id && !resolvedEmpresa.id.startsWith('company-ref-')) {
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_URL || '';
        if (token) {
          const compRes = await fetch(`${API_BASE}/api/crm/companies/${resolvedEmpresa.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (compRes.ok) {
            const compData = await compRes.json();
            if (compData.success) {
              const rawContacts = Array.isArray(compData.linkedContacts) ? compData.linkedContacts.map(lc => lc.contact || lc).filter(Boolean) : [];
              if (rawContacts.length === 0 && compData.company?.contact_main) {
                rawContacts.push(compData.company.contact_main);
              }
              if (rawContacts.length > 0) {
                const primary = rawContacts[0];
                contactId = primary.id || primary.contact_id || contactId;
                contactNombre = primary.name || primary.nombre || contactNombre;
                contactCargo = primary.position || primary.cargo || contactCargo;
                contactTelefono = primary.phone || primary.telefono || contactTelefono;
                contactEmail = primary.email || contactEmail;
              }
            }
          }
        }
      } catch (err) {
        console.warn('No se pudo resolver contacto por empresa:', err);
      }
    }

    const resolvedContacto = (contactId || contactNombre) ? {
      id: contactId || `contact-ref-${entity.id}`,
      nombre: contactNombre,
      tipo: 'contacto',
      cargo: contactCargo,
      telefono: contactTelefono,
      email: contactEmail
    } : null;

    // Actualizamos el estado consolidado en el wizard
    updateEntity('cliente', entity);
    updateEntity('empresa', resolvedEmpresa);
    updateEntity('contacto', resolvedContacto);

    paginate(1);
  };

  const handleCreateNew = () => {
    // Al crear un nuevo prospecto de campo, no asumimos nada.
    // Inicializamos tanto empresa como contacto en null para que el usuario pueda
    // buscar o registrar de forma manual e independiente cada entidad (evitando falsas suposiciones).
    updateEntity('cliente', { isNew: true, nombre: query });
    updateEntity('empresa', null);
    updateEntity('contacto', null);
    paginate(1); // Redirige al Paso 1 para que resuelva ambos libremente
  };

  const renderIcon = (type) => {
    return <User className="w-5 h-5" />;
  };

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content">
        <div className="step-title-block">
          <h3>¿Con quién interactuaste? ¿Quien te va a comprar?</h3>
          <p>Busca por nombre de cliente o empresa propia para registrar tu visita.</p>
        </div>

        {/* Search Input Group */}
        <div className="fieldflow-input-group">
          <i className="fas fa-search"></i>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre de cliente o empresa..."
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
              {results.map((entity) => {
                if (entity.is_foreign) {
                  return (
                    <div
                      key={entity.id}
                      className="fieldflow-result-card foreign-blocked-card"
                      style={{
                        cursor: 'not-allowed',
                        background: 'rgba(239, 68, 68, 0.02)',
                        borderLeft: '4px solid #ef4444',
                        opacity: 0.9,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '12px',
                        textAlign: 'left'
                      }}
                    >
                      <div className="result-icon-box" style={{ background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', shrink: 0 }}>
                        <i className="fas fa-ban"></i>
                      </div>
                      <div className="result-info" style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#64748b', margin: 0 }}>
                          {entity.nombre} <span style={{ fontSize: '0.65rem', fontWeight: '850', background: '#fee2e2', color: '#ef4444', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px', textTransform: 'uppercase' }}>DUPLICADO</span>
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', margin: '2px 0 0 0' }}>
                          {entity.company ? `${entity.company} • ` : ''}Asignado a: {entity.assigned_to_name}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: '#64748b', margin: '4px 0 0 0', lineHeight: '1.25' }}>
                          Este Cliente Pertenece A Otro Vendedor. Para Evitar Duplicidades, No Puedes Usarlo. Comunícate Con Administración.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => handleSelectEntity(entity)}
                    className="fieldflow-result-card"
                  >
                    <div className="result-icon-box contacto">
                      {renderIcon(entity.entityType)}
                    </div>
                    <div className="result-info">
                      <h4>{entity.nombre}</h4>
                      <p style={{ fontSize: '0.775rem', color: '#6b7280' }}>
                        {entity.company ? `${entity.company} • ` : ''}{entity.estatus || 'Cliente'}
                      </p>
                    </div>
                    <div className="result-arrow">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!isSearching && results !== null && results.length === 0 && (
            <div className="fieldflow-fallback-screen" style={{ padding: '2.5rem 1rem' }}>
              <div className="fieldflow-fallback-icon" style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444' }}>
                <i className="fas fa-search-minus"></i>
              </div>
              <h4 style={{ fontWeight: '800', fontSize: '1.1rem', color: '#111827' }}>Sin coincidencias encontradas</h4>
              <p style={{ maxWidth: '280px', margin: '0.5rem auto 1.5rem', color: '#6b7280' }}>
                No detectamos clientes con "{query}" en todo el CRM. Registra uno completamente nuevo para iniciar su ciclo comercial.
              </p>

              <button
                type="button"
                onClick={handleCreateNew}
                className="fieldflow-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  background: '#05393A',
                  color: '#ffffff',
                  fontWeight: '700',
                  boxShadow: '0 4px 14px rgba(5, 57, 58, 0.25)',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '280px',
                  margin: '0 auto'
                }}
              >
                <PlusCircle className="w-5 h-5" />
                Crear Nuevo Prospecto
              </button>
            </div>
          )}

          {!isSearching && results === null && (
            <div className="fieldflow-fallback-screen" style={{ padding: '3rem 1.5rem' }}>
              <div className="fieldflow-fallback-icon" style={{ background: 'rgba(5, 57, 58, 0.04)', color: '#05393A' }}>
                <i className="fas fa-search"></i>
              </div>
              <h4 style={{ fontWeight: '800', color: '#111827' }}>Búsqueda de Prospectos</h4>
              <p style={{ maxWidth: '320px', color: '#6b7280' }}>
                Escribe un nombre o empresa para buscar en tiempo real dentro de tu cartera de prospectos y clientes asignados.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botón flotante inferior optimizado */}
      {!isSearching && results !== null && results.length > 0 && (
        <div className="fieldflow-footer-fixed" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 20%)', paddingTop: '1.5rem' }}>
          <button
            type="button"
            onClick={handleCreateNew}
            className="fieldflow-btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.85rem',
              borderRadius: '14px',
              border: '2px dashed rgba(5, 57, 58, 0.25)',
              background: 'rgba(5, 57, 58, 0.02)',
              color: '#05393A',
              fontWeight: '750',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <PlusCircle className="w-4.5 h-4.5" />
            Ninguno coincide, crear nuevo prospecto
          </button>
        </div>
      )}
    </div>
  );
}
