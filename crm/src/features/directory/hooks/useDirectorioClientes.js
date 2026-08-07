import { useState, useEffect, useMemo } from 'react';

/**
 * Hook para gestionar la lógica del Directorio de Clientes.
 * Extrae la lógica de filtrado local para separar la capa visual de la lógica de datos.
 *
 * @param {Array} customers - Lista cruda de clientes obtenida del backend.
 * @returns {Object} Estado y funciones de gestión del directorio.
 */
export function useDirectorioClientes(customers) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos'); // 'todos' | 'prospectos' | 'reactivacion' | 'activos' | 'recontactar' | 'descartados'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Calcular contadores por categoría de forma eficiente
  const categoryCounts = useMemo(() => {
    const counts = { todos: 0, prospectos: 0, reactivacion: 0, activos: 0, recontactar: 0, descartados: 0 };
    if (!customers) return counts;
    
    counts.todos = customers.length;
    customers.forEach(c => {
      const lvl = Number(c.nivel || 1);
      if (lvl === 1) counts.prospectos++;
      else if (lvl === 2) counts.reactivacion++;
      else if (lvl === 3) counts.activos++;
      else if (lvl === 4) counts.recontactar++;
      else if (lvl === 5) counts.descartados++;
    });
    return counts;
  }, [customers]);

  // Filtrado local optimizado usando useMemo
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    // 1. Filtrar por categoría seleccionada
    let list = customers;
    if (selectedCategory !== 'todos') {
      list = customers.filter(c => {
        const lvl = Number(c.nivel || 1);
        if (selectedCategory === 'prospectos') return lvl === 1;
        if (selectedCategory === 'reactivacion') return lvl === 2;
        if (selectedCategory === 'activos') return lvl === 3;
        if (selectedCategory === 'recontactar') return lvl === 4;
        if (selectedCategory === 'descartados') return lvl === 5;
        return true;
      });
    }

    // 2. Filtrar por término de búsqueda
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(c =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.company && c.company.toLowerCase().includes(term))
    );
  }, [customers, selectedCategory, searchTerm]);

  // Prevenir scroll en body al abrir modales
  useEffect(() => {
    if (showAddCustomerModal || selectedCustomer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddCustomerModal, selectedCustomer]);

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    categoryCounts,
    filteredCustomers,
    selectedCustomer,
    setSelectedCustomer,
    showAddCustomerModal,
    setShowAddCustomerModal
  };
}
