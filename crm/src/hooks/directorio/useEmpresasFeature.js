import { useState, useMemo } from 'react';
import { computeDataQuality } from '../../utils/dataQuality.js';

/**
 * useEmpresasFeature
 * 
 * Maneja EXCLUSIVAMENTE la lógica visual y de filtrado local para las Empresas.
 * Separado del hook de obtención de datos (`useEmpresas` legacy) por Single Responsibility.
 * 
 * @param {Array} companies - Lista de empresas obtenida del backend.
 * @returns {Object} Estados y funciones para búsqueda y filtrado de empresas.
 */
export function useEmpresasFeature(companies) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Sistema de calidad unificado — reemplaza incompleteFilter + invalidEmailFilter
  const [qualityFilter, setQualityFilter] = useState('all');

  // Filtrado optimizado con useMemo para no re-calcular en cada render
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    let result = [...companies];

    // 1. Filtrado por texto (Search)
    if (search.trim()) {
      const t = search.toLowerCase();
      result = result.filter(c => {
        if (
          (c.name && c.name.toLowerCase().includes(t)) ||
          (c.alias && c.alias.toLowerCase().includes(t)) ||
          (c.industry && c.industry.toLowerCase().includes(t)) ||
          (c.city && c.city.toLowerCase().includes(t)) ||
          (c.phone_main && c.phone_main.includes(t)) ||
          (c.email_main && c.email_main.toLowerCase().includes(t)) ||
          (c.rfc && c.rfc.toLowerCase().includes(t))
        ) return true;

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

    // 3. Filtrado por Estado (Status de BD — ciclo de vida, no calidad)
    if (statusFilter !== 'all') {
      result = result.filter(c => (c.status || '').toString().toLowerCase().trim() === statusFilter.toLowerCase());
    }

    // 4. Filtrado por Rango de Fechas (Creado en)
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(c => new Date(c.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(c => new Date(c.created_at) <= end);
    }

    // 5. Filtrado por Calidad de Datos (score unificado de 5 niveles)
    if (qualityFilter !== 'all') {
      result = result.filter(c => {
        const score = c.data_quality?.score || computeDataQuality(c, 'company');
        return score === qualityFilter;
      });
    }

    return result;
  }, [companies, search, typeFilter, statusFilter, startDate, endDate, qualityFilter]);

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    qualityFilter,
    setQualityFilter,
    filteredCompanies
  };
}
