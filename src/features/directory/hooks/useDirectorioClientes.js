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
  const [selectedCategory, setSelectedCategory] = useState('todos'); // 'todos' | 'prospectos' | 'activos' | 'regulares' | 'frios'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Calcular contadores por categoría de forma eficiente
  const categoryCounts = useMemo(() => {
    const counts = { todos: 0, prospectos: 0, activos: 0, regulares: 0, frios: 0 };
    if (!customers) return counts;
    
    counts.todos = customers.length;
    customers.forEach(c => {
      const isPending = (c.status || '').toLowerCase().trim() === 'pendiente_revision';
      const followup = (c.followup_status || 'frio').toLowerCase().trim();
      
      if (isPending) {
        counts.prospectos++;
      } else {
        if (followup === 'activo') counts.activos++;
        else if (followup === 'regular') counts.regulares++;
        else counts.frios++;
      }
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
        const isPending = (c.status || '').toLowerCase().trim() === 'pendiente_revision';
        const followup = (c.followup_status || 'frio').toLowerCase().trim();
        
        if (selectedCategory === 'prospectos') {
          return isPending;
        }
        if (selectedCategory === 'activos') {
          return !isPending && followup === 'activo';
        }
        if (selectedCategory === 'regulares') {
          return !isPending && followup === 'regular';
        }
        if (selectedCategory === 'frios') {
          return !isPending && followup === 'frio';
        }
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
