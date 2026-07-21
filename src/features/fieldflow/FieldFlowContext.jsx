import React, { createContext, useContext, useState, useEffect } from 'react';

// Constante centralizada de colores, iconos y etiquetas para los tipos de interacción.
// Esta constante se puede importar en cualquier parte de la aplicación para mantener la consistencia visual.
export const INTERACTION_COLORS = {
  field_visit: {
    color: '#059669',       // Verde esmeralda oscuro (institucional/campo)
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.2)',
    label: 'Visita en Obra',
    icon: 'fa-map-marker-alt'
  },
  call: {
    color: '#2563eb',       // Azul (comunicación/llamadas)
    bg: 'rgba(37, 99, 235, 0.08)',
    border: 'rgba(37, 99, 235, 0.2)',
    label: 'Llamada / WhatsApp',
    icon: 'fa-phone-alt'
  },
  office: {
    color: '#7c3aed',       // Púrpura (junta formal/oficina)
    bg: 'rgba(124, 58, 237, 0.08)',
    border: 'rgba(124, 58, 237, 0.2)',
    label: 'Junta en Oficina',
    icon: 'fa-building'
  }
};

const FieldFlowContext = createContext(null);

export function FieldFlowProvider({ children }) {
  // Manejo de paginación
  const [[step, direction], setPage] = useState([0, 0]);

  // Estado del Wizard
  const [wizardState, setWizardState] = useState({
    prospecto: null,
    empresa: null,
    contacto: null,
    contactosAdicionales: [],
    client_profile: 'b2b', // 'b2b' o 'b2c'
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
        
        // Carga únicamente de los clientes asignados/propios (incluye locales crm_customer y SAE)
        const [customersRes, obrasRes] = await Promise.all([
          fetch(`${API_BASE}/api/crm/customers`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`${API_BASE}/api/crm/obras/search`, { headers }).then(r => r.json()).catch(() => ({ success: false }))
        ]);

        const newCache = {
          prospectos: [], // crm_customers mapped here for compatibility or future use
          empresas: [],   // mapped from customers
          contactos: [],  // mapped from customers
          obras: []
        };

        if (customersRes.success && Array.isArray(customersRes.customers)) {
          // El endpoint /api/crm/customers ya aplica aislamiento de vendedor (role === 'sales')
          // Mapeamos los clientes para el buscador de Step0
          newCache.prospectos = customersRes.customers.map(c => ({
            id: String(c.id),
            nombre: c.name || '',
            tipo: 'prospecto',
            estatus: c.status || 'Activo',
            company: c.company || '',
            company_id: c.company_id ? String(c.company_id) : null,
            contact_id: c.contact_id ? String(c.contact_id) : null,
            phone: c.phone || '',
            email: c.email || '',
            entityType: 'prospecto'
          }));

          // Mapeamos empresas únicas de estos clientes
          const uniqueCompanies = new Map();
          customersRes.customers.forEach(c => {
            if (c.company) {
              const compName = c.company.trim();
              if (!uniqueCompanies.has(compName)) {
                uniqueCompanies.set(compName, {
                  id: c.company_id ? String(c.company_id) : `company-ref-${c.id}`,
                  nombre: compName,
                  tipo: 'empresa',
                  rfc: c.rfc || '',
                  estatus: c.status || 'Activo',
                  entityType: 'empresa'
                });
              }
            }
          });
          newCache.empresas = Array.from(uniqueCompanies.values());

          // Mapeamos contactos REALES de estos clientes (solo los que tienen un contact_id real).
          // IMPORTANTE: contact_id es el UUID del contacto en la tabla 'contacts', no el ID del lead.
          // Esto permite que Step0_SmartSearch encuentre el contacto titular por su ID real.
          const contactosSeen = new Set();
          newCache.contactos = customersRes.customers
            .filter(c => c.contact_id) // Solo clientes con contacto titular real vinculado
            .map(c => {
              const cid = String(c.contact_id);
              if (contactosSeen.has(cid)) return null; // Evitar duplicados
              contactosSeen.add(cid);
              return {
                id: cid,                   // UUID REAL del contacto (tabla contacts)
                nombre: '',                // getCustomers no devuelve el nombre real del contacto; Step1 lo resolverá
                tipo: 'contacto',
                cargo: c.position || c.clasific || 'Cliente',
                company: c.company || '',
                phone: c.phone || '',
                email: c.email || '',
                entityType: 'contacto'
              };
            })
            .filter(Boolean);
        }

        if (obrasRes.success && Array.isArray(obrasRes.obras)) {
          newCache.obras = obrasRes.obras.map(o => ({
            id: String(o.id),
            nombre: o.name || '',
            direccion: o.address || '',
            lat: o.latitude || o.lat,
            lng: o.longitude || o.lng,
            tipo: 'obra',
            estatus: o.status || 'Activo'
          }));
        }

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
    setWizardState,
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
