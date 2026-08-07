import { useState, useEffect, useMemo, useCallback } from 'react';
import { computeDataQuality } from '../../utils/dataQuality';

/**
 * useMisContactos
 * 
 * Centraliza la lógica de obtención, filtrado y estado global
 * para los contactos. Extraído de MisContactos.jsx.
 * 
 * @param {string} API_BASE URL base de la API
 * @returns {Object} Estado y funciones de manipulación
 */
export function useMisContactos(API_BASE) {
  const [contacts, setContacts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [qualityFilter, setQualityFilter] = useState('all');

  const token = useCallback(() => localStorage.getItem('token'), []);

  // Obtener todos los contactos
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al obtener contactos');
      setContacts(data.contacts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token]);

  // Obtener listas de precios (utilizado para colorear badges o info extra)
  const fetchPriceLists = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/price-lists`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (res.ok) setPriceLists(data.priceLists || []);
    } catch { /* silent */ }
  }, [API_BASE, token]);

  // Obtener lista de empresas (para el modal de vincular)
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (res.ok) setCompanies(data.companies || []);
    } catch { /* silent */ }
  }, [API_BASE, token]);

  // Inicialización
  useEffect(() => {
    fetchContacts();
    fetchPriceLists();
  }, [fetchContacts, fetchPriceLists]);

  // Lógica de filtrado en cliente
  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (qualityFilter !== 'all') {
      result = result.filter(c => {
        const score = c.data_quality?.score || computeDataQuality(c, 'contact');
        return score === qualityFilter;
      });
    }

    if (!search.trim()) return result;
    const t = search.toLowerCase();
    
    return result.filter(c => {
      // Búsqueda directa en los campos del contacto
      if (
        (c.name && c.name.toLowerCase().includes(t)) ||
        (c.email && c.email.toLowerCase().includes(t)) ||
        (c.phone && c.phone.includes(t)) ||
        (c.position && c.position.toLowerCase().includes(t)) ||
        (c.whatsapp && c.whatsapp.includes(t))
      ) {
        return true;
      }

      // Búsqueda profunda en empresas vinculadas a este contacto
      const linkedCompanies = (c.contact_companies || []).map(cc => cc.company).filter(Boolean);
      return linkedCompanies.some(co =>
        (co.name && co.name.toLowerCase().includes(t)) ||
        (co.industry && co.industry.toLowerCase().includes(t))
      );
    });
  }, [contacts, search, qualityFilter]);

  return {
    contacts,
    filteredContacts,
    priceLists,
    companies,
    loading,
    error,
    search,
    setSearch,
    qualityFilter,
    setQualityFilter,
    fetchContacts,
    fetchCompanies,
    token
  };
}
