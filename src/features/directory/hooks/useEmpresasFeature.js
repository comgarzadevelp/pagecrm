import { useState, useMemo } from 'react';

/**
 * useEmpresasFeature
 * 
 * Este Hook maneja EXCLUSIVAMENTE la lógica visual y de filtrado local para las Empresas.
 * Se separa del hook de obtención de datos (`useEmpresas` legacy) para mantener
 * el principio de Single Responsibility.
 * 
 * @param {Array} companies - Lista de empresas obtenida del backend.
 * @returns {Object} Estados y funciones para búsqueda y filtrado de empresas.
 */
export function useEmpresasFeature(companies) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Filtrado optimizado con useMemo para no re-calcular en cada render
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    let result = [...companies];

    // 1. Filtrado por texto (Search)
    if (search.trim()) {
      const t = search.toLowerCase();
      result = result.filter(c => {
        // Coincidencias directas en la empresa
        if (
          (c.name && c.name.toLowerCase().includes(t)) ||
          (c.alias && c.alias.toLowerCase().includes(t)) ||
          (c.industry && c.industry.toLowerCase().includes(t)) ||
          (c.city && c.city.toLowerCase().includes(t)) ||
          (c.phone_main && c.phone_main.includes(t)) ||
          (c.email_main && c.email_main.toLowerCase().includes(t)) ||
          (c.rfc && c.rfc.toLowerCase().includes(t))
        ) return true;

        // Coincidencias en contactos vinculados
        const linkedContacts = [c.contact_main, c.contact_purchases, c.contact_payments].filter(Boolean);
        return linkedContacts.some(ct =>
          (ct.name && ct.name.toLowerCase().includes(t)) ||
          (ct.phone && ct.phone.includes(t)) ||
          (ct.email && ct.email.toLowerCase().includes(t)) ||
          (ct.position && ct.position.toLowerCase().includes(t))
        );
      });
    }

    // 2. Filtrado por Tipo (Constructora, Contratista, etc.)
    if (typeFilter !== 'all') {
      result = result.filter(c => c.type === typeFilter);
    }

    return result;
  }, [companies, search, typeFilter]);

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filteredCompanies
  };
}
