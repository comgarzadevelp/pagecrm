import React, { createContext, useContext, useState, useEffect } from 'react';

const FieldFlowContext = createContext(null);

export function FieldFlowProvider({ children }) {
  // Manejo de paginación
  const [[step, direction], setPage] = useState([0, 0]);

  // Estado del Wizard
  const [wizardState, setWizardState] = useState({
    prospecto: null,
    empresa: null,
    contacto: null,
    obra: null,
    visita: null
  });

  // Caché para la búsqueda inicial (preload de entidades reales desde la DB)
  const [cache, setCache] = useState({
    prospectos: [
      { id: 'mock-1', nombre: 'Constructora Garza (Mock)', tipo: 'prospecto', estatus: 'Activo' },
      { id: 'mock-2', nombre: 'Desarrollos del Norte (Mock)', tipo: 'prospecto', estatus: 'Caliente' }
    ],
    empresas: [
      { id: 'mock-101', nombre: 'Garza S.A. de C.V. (Mock)', tipo: 'empresa', rfc: 'GARZ990101' }
    ],
    contactos: [
      { id: 'mock-201', nombre: 'Felipe Garza (Mock)', tipo: 'contacto', cargo: 'Director' },
      { id: 'mock-202', nombre: 'Carlos Ríos (Mock)', tipo: 'contacto', cargo: 'Gerente Compras' }
    ],
    obras: []
  });

  const [isLoadingCache, setIsLoadingCache] = useState(false);

  useEffect(() => {
    const preloadCache = async () => {
      setIsLoadingCache(true);
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoadingCache(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Carga paralela de entidades
        const [leadsRes, companiesRes, contactsRes, obrasRes] = await Promise.all([
          fetch(`${API_BASE}/api/crm/leads`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`${API_BASE}/api/crm/companies`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`${API_BASE}/api/crm/contacts`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`${API_BASE}/api/crm/obras/search`, { headers }).then(r => r.json()).catch(() => ({ success: false }))
        ]);

        const newCache = {
          prospectos: [],
          empresas: [],
          contactos: [],
          obras: []
        };

        if (leadsRes.success && Array.isArray(leadsRes.leads)) {
          newCache.prospectos = leadsRes.leads.map(l => ({
            id: String(l.id),
            nombre: l.name || '',
            tipo: 'prospecto',
            estatus: l.status || 'Activo'
          }));
        }

        if (companiesRes.success && Array.isArray(companiesRes.companies)) {
          newCache.empresas = companiesRes.companies.map(c => ({
            id: String(c.id),
            nombre: c.name || c.alias || '',
            tipo: 'empresa',
            rfc: c.rfc || '',
            estatus: c.status || 'Activo'
          }));
        }

        if (contactsRes.success && Array.isArray(contactsRes.contacts)) {
          newCache.contactos = contactsRes.contacts.map(co => ({
            id: String(co.id),
            nombre: co.name || '',
            tipo: 'contacto',
            cargo: co.position || 'Contacto'
          }));
        }

        if (obrasRes.success && Array.isArray(obrasRes.obras)) {
          newCache.obras = obrasRes.obras.map(o => ({
            id: String(o.id),
            nombre: o.name || '',
            direccion: o.address || '',
            tipo: 'obra',
            estatus: o.status || 'Activo'
          }));
        }

        // Solo actualizamos el caché local si obtuvimos resultados exitosos de la base de datos
        setCache(prev => ({
          prospectos: newCache.prospectos.length > 0 ? newCache.prospectos : prev.prospectos,
          empresas: newCache.empresas.length > 0 ? newCache.empresas : prev.empresas,
          contactos: newCache.contactos.length > 0 ? newCache.contactos : prev.contactos,
          obras: newCache.obras.length > 0 ? newCache.obras : prev.obras
        }));

      } catch (err) {
        console.error('Error preloading CRM cache for FieldFlow:', err);
      } finally {
        setIsLoadingCache(false);
      }
    };

    preloadCache();
  }, []);

  const paginate = (newDirection) => {
    setPage([step + newDirection, newDirection]);
  };

  const updateEntity = (entityKey, data) => {
    setWizardState(prev => ({
      ...prev,
      [entityKey]: data
    }));
  };

  const value = {
    step,
    direction,
    paginate,
    wizardState,
    updateEntity,
    cache,
    setCache,
    isLoadingCache
  };

  return (
    <FieldFlowContext.Provider value={value}>
      {children}
    </FieldFlowContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useFieldFlow() {
  const context = useContext(FieldFlowContext);
  if (!context) {
    throw new Error('useFieldFlow debe usarse dentro de un FieldFlowProvider');
  }
  return context;
}
