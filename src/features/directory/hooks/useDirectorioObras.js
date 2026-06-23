import { useState, useEffect, useCallback } from 'react';

/**
 * useDirectorioObras
 * 
 * Hook para encapsular la lógica de fetching de las obras desde la API.
 * Extraído del monolito de `DirectorioObras.jsx`.
 * 
 * @param {string} API_BASE URL base de la API
 * @returns {Object} Estado y funciones para manipular obras
 */
export function useDirectorioObras(API_BASE) {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchObras = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    try {
      let url = `${API_BASE}/api/crm/obras/search?q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setObras(data.obras || []);
      } else {
        setError(data.message || 'Error al cargar obras.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, searchQuery]);

  // Se dispara automáticamente cuando cambia el searchQuery
  useEffect(() => {
    fetchObras();
  }, [fetchObras]);

  return {
    obras,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    fetchObras
  };
}
